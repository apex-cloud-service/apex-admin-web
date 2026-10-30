# 总体架构

> 适用版本：1.2.0（[package.json](../../package.json)）。本文与代码实现保持对齐，若发现偏差以代码为准并请回改本文。

## 1. 技术栈

| 层次 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 视图层 | Vue | ^3.5.13 | `<script setup lang="ts">` 单文件组件 |
| 构建 | Vite | ^6.0.7 | 开发代理 + 生产构建（terser 压缩、manualChunks 分包） |
| 类型 | TypeScript | ~5.7.2 | `strict` 全开，`vue-tsc --noEmit` 前置于构建 |
| 路由 | vue-router | ^4.5.0 | 静态路由 + 菜单驱动动态路由 |
| 状态 | Pinia | ^2.3.0 | Setup Store 写法，localStorage 持久化走 `utils/storage.ts` |
| UI | Element Plus | ^2.9.1 | 中文语言包 + 全量图标注册（[main.ts](../../src/main.ts)） |
| 图表 | ECharts | ^5.6.0 | 监控大盘、图表管理页 |
| HTTP | Axios | ^1.7.9 | 统一封装于 [src/utils/request.ts](../../src/utils/request.ts) |
| 图片处理 | cropperjs | ^1.6.3 | FileUploadEnhanced 裁剪 |
| 测试 | Vitest | ^5.0.1 | happy-dom 环境（[vitest.config.ts](../../vitest.config.ts)） |
| Mock | mockjs | ^1.1.0 | 仅开发环境动态加载（[src/mock/index.ts](../../src/mock/index.ts)） |
| E2E | Playwright | 已安装 | **尚无 `playwright.config` 与 E2E 用例**，不构成浏览器端自动化覆盖 |

运行环境要求：Node >= 18。

## 2. 系统总体架构

前端为独立 SPA 工程，与后端 Apex Scaffold（Spring Boot 3 WebFlux）前后端分离，通过网关/代理按前缀分流。

```mermaid
flowchart TB
    subgraph Browser["浏览器"]
        SPA["Apex Admin Web SPA<br/>(Vue 3 + Vite 构建产物)"]
    end

    subgraph Gateway["开发代理 (Vite) / 生产反代 (Nginx)"]
        P0["WS 升级 /api/v1/messages/ws"]
        P1["/api/**"]
        P2["/admin-api/**"]
        P3["/oauth2/authorize、/oauth2/token"]
    end

    subgraph Backend["Apex Scaffold 后端 (Spring Boot 3 WebFlux, :8080)"]
        B1["业务接口 /api/v1/**<br/>认证 · 当前用户 · 文件 · Office 接入 · 站内信"]
        B2["管理接口 /admin-api/v1/**<br/>系统管理 · 监控 · 日志 · SSO · 代码生成器 · 认证配置 · 消息模板"]
        B3["办公业务 /api/office/**<br/>消息 · 审批 · 日历 · 文档操作"]
        B4["工作流高级操作 /api/workflow/**<br/>回退 · 转办 · 委派 · 挂起 · 恢复"]
        B5["平台与新增域<br/>/api/v2/** 租户 · 工作流定义 · 运维健康<br/>/api/mfa/** · /api/ip-access-control/**"]
        B6["全文搜索服务"]
        B7["第三方: 飞书 / 钉钉 / 企微 · OAuth2 提供商"]
    end

    SPA --> P0 & P1 & P2 & P3
    P0 --> B1
    P1 --> B1 & B3 & B4 & B7
    P2 --> B2 & B5 & B6
    P3 --> B7
```

站内信 WebSocket 需要专用代理：Vite 开发代理 `/api` 已设 `ws: true`；Nginx 必须为 `= /api/v1/messages/ws` 单独配置 `Upgrade`/`Connection` 且置于 `/api/` 之前，否则实时推送会退化为 60 秒轮询兜底。详见 [部署指南](../guides/deployment.md) §6.2/§6.3。

## 3. 前端分层架构

```mermaid
flowchart TB
    subgraph Views["视图层 src/views"]
        V1["system / monitor / data / office / workflow<br/>(动态路由，VIEW_REGISTRY 解析)"]
        V2["login / dashboard / oauth2 / office-callback<br/>(静态路由)"]
    end

    subgraph Layout["布局与通用组件"]
        L1["layouts/AdminLayout.vue<br/>侧边栏 · 顶栏 · 面包屑 · 主题切换"]
        L2["components/<br/>Pagination · FileUpload(Enhanced)<br/>GlobalSearch · EmptyState"]
    end

    subgraph State["状态层"]
        S1["stores/user.ts 用户会话"]
        S2["stores/permission.ts 按钮权限"]
        S3["stores/app.ts UI 偏好"]
        S4["stores/office.ts 办公平台状态"]
    end

    subgraph Compose["组合式函数 src/composables"]
        C1["useCrud · useTableConfig<br/>useFormDraft · useBreakpoint"]
    end

    subgraph Api["接口层 src/api"]
        A1["按业务域拆分的类型化模块<br/>auth/user/system/monitor/office/workflow<br/>tenant/mfa/operations/masking/message/..."]
    end

    subgraph Infra["基础设施"]
        I1["utils/request.ts<br/>Axios 封装 + Token 刷新"]
        I2["utils/auth.ts 会话存取"]
        I3["types/ 与后端 DTO 对齐"]
        I4["settings.ts 常量收敛"]
        I5["directives/permission.ts<br/>v-permission 指令"]
    end

    V1 & V2 --> L2
    V1 & V2 --> S1 & S2 & S3 & S4
    V1 & V2 --> C1
    V1 & V2 & L2 & C1 --> A1
    A1 --> I1
    I1 --> I2 & I4
    S1 & S2 --> I2
    I1 --> I3
```

## 4. 请求处理时序

所有接口调用统一经过 [src/utils/request.ts](../../src/utils/request.ts)，禁止裸写 axios。

```mermaid
sequenceDiagram
    autonumber
    participant View as 页面/组件
    participant Api as api 层函数
    participant Req as utils/request.ts
    participant BE as 后端服务

    View->>Api: 调用类型化函数（如 listMenuTree()）
    Api->>Req: get/post/put/del(url, params)
    Req->>Req: 请求拦截：注入 Authorization: Bearer <token>
    Req->>BE: 发起 HTTP 请求（超时 30s）
    BE-->>Req: Result{code, msg, data, traceId}

    alt code === 0（业务成功）
        Req-->>Api: 解包返回 data
        Api-->>View: Promise<T> 业务数据
    else code !== 0（业务失败）
        Req--xView: 抛出 ApiError(message, code, traceId)
        Note over View: showError() 展示 msg + traceId
    else HTTP 401 且存在 refreshToken
        Note over Req: 见《认证与路由架构》Token 无感刷新时序
    else 网络/超时错误
        Req--xView: 抛出 ApiError(msg, status)
    end
```

补充规则（见 request.ts 实现）：

- 响应头携带 `x-new-access-token` 时自动更新本地访问令牌。
- 非 `Result` 标准结构（如文件流 Blob）原样返回。
- `baseURL` 取自 `VITE_API_BASE_URL`（生产同域部署留空）。

## 5. 构建与产物

`npm run build` = `vue-tsc --noEmit && vite build`（类型检查是构建前置条件，失败即终止）。

| 配置项 | 值 | 出处 |
|--------|-----|------|
| 产物目录 | `dist/`，按 js/css/images/fonts/media 分目录 | vite.config.ts |
| 分包策略 | manualChunks：vue/pinia、element-plus、@element-plus/icons-vue、echarts、axios、@vueuse、其余 vendor | vite.config.ts:59-88 |
| 压缩 | terser，生产移除 `console`/`debugger` | vite.config.ts:119-125 |
| Chunk 警告阈值 | 1000 KB | vite.config.ts:117 |
| 产物分析 | rollup-plugin-visualizer → `dist/stats.html`（`npm run analyze` 打开） | vite.config.ts:20-27 |
| 路径别名 | `@` → `src/` | vite.config.ts:32 |

## 6. 部署架构

三种形态，详细操作见 [部署指南](../guides/deployment.md)。

```mermaid
flowchart LR
    subgraph Dev["开发环境 npm run dev (:5173)"]
        V["Vite Dev Server<br/>host 0.0.0.0"] -->|proxy /api /admin-api /oauth2| D["VITE_API_PROXY_TARGET<br/>(默认 http://127.0.0.1:8080)"]
    end

    subgraph Prod["生产环境（同域部署，推荐）"]
        U["用户浏览器"] --> N["Nginx (前端静态资源 + 反代)"]
        N -->|/ try_files → index.html| SPA["SPA 静态产物"]
        N -->|/api/ /admin-api/ ^/oauth2/(authorize\|token)| BE2["API_PROXY_PASS<br/>(默认 http://apex-scaffold:8080)"]
        N -->|= /api/v1/messages/ws<br/>Upgrade + 3600s| BE2
        N -->|/assets/ 30 天 immutable| U
    end

    subgraph Docker["Docker 部署"]
        DC["docker-compose.yml"] --> IMG["apex-admin-web 镜像<br/>两阶段: node:18 构建产物 → nginx:1.27 运行"]
        IMG --> NET["外部网络 apex-scaffold_apex_network<br/>按服务名访问后端"]
    end
```

要点：

- **同域部署**：`VITE_API_BASE_URL` 留空走相对路径，Nginx 按前缀反代后端，无 CORS 问题。
- **Nginx 长缓存**：`/assets/` 30 天 immutable；`location /` try_files 回退 index.html 支撑 history 路由。
- **构建参数注入**：`scripts/build/build-image.sh --api-base-url <url>` 可在镜像构建时覆盖 `.env.production` 的 `VITE_API_BASE_URL`；运行时 `API_PROXY_PASS` 通过 envsubst 注入 nginx.conf 模板。
- **健康检查**：容器内 HEALTHCHECK wget `/`。

## 7. 质量保障体系

| 手段 | 命令/位置 | 说明 |
|------|-----------|------|
| 类型检查 | `vue-tsc --noEmit`（build 前置） | tsconfig `strict` + `noUnusedLocals` + `noUnusedParameters` |
| 单元测试 | `npm run test`（Vitest + happy-dom） | 用例分布于 `src/utils/__tests__/`（工具/契约）与 `src/api/`（业务 API 契约），详见 [测试指南](../reference/testing.md) |
| 产物分析 | `npm run analyze` | rollup-plugin-visualizer |
| 性能审计 | `scripts/performance/lighthouse-test.sh` | Lighthouse desktop preset，报告输出 `./reports/lighthouse` |
| 依赖安全 | `scripts/security-scan.sh`、`npm run audit` | npm audit（JSON + HTML 报告输出 `./reports/audit.html`），脚本内的 npm-check-updates / snyk 为可选步骤 |
| API 契约 | `npm run generate:api` | openapi-generator-cli（typescript-axios）；当前 `src/api/*.ts` 为手写封装，生成目录不参与运行时 |

> 仓库当前**未配置** ESLint/Prettier/Husky/CI 流水线；代码风格靠 [AGENTS.md](../../AGENTS.md) 约定与 `.editorconfig` 约束。

## 8. 关联文档

- [认证与路由架构](auth-and-routing.md) — 登录、令牌刷新、OAuth2、动态路由全流程图
- [API 接口目录](../api/README.md) — 与代码对齐的全量接口清单
- [测试指南](../reference/testing.md) · [工具库参考](../reference/toolkit.md)
- [部署指南](../guides/deployment.md) · [前后端集成](../guides/frontend-backend-integration.md)

---

**最后更新**：2026-10-30（依据 src/ 与 package.json 当前实现核对：技术栈补 E2E 边界、系统图补 WS 与新增业务域、部署图补 WS location 与静态缓存、质量保障表按实际 script 改写）
