# Apex Admin Web

Apex Scaffold 管理后台前端（**前后端分离独立工程**）。

基于 **Vue 3.5 + Vite 6 + TypeScript + Pinia + Element Plus + ECharts**，与后端
[Apex Scaffold](https://github.com/your-org/apex-scaffold)（Spring Boot 3 WebFlux 函数式端点）通过
`/api/v1`（业务）与 `/admin-api/v1`（管理后台）两组 REST 接口对接。

## 功能清单

| 模块 | 页面 | 后端接口前缀 |
|------|------|-------------|
| 认证 | 登录（账号密码 + 图形验证码）、登出 | `/api/v1/auth` |
| 工作台 | 仪表盘（指标卡片 + 趋势图） | 身份派生 / 预留统计接口 |
| 系统管理 | 用户 / 角色 / 菜单（树）/ 部门（树）/ 字典（两级）/ 参数 / 定时任务 | `/admin-api/v1/*` |
| 监控 | 登录日志 / 操作审计日志 / 在线用户（强退） | `/admin-api/v1/*` |
| 个人中心 | 当前用户信息 | `/api/v1/user/info` |

核心机制：

- **动态路由**：登录后拉取后端菜单树（`/admin-api/v1/menus`），按 `component` 字段映射到视图并注册路由，侧边栏同步渲染。
- **按钮权限**：`v-permission="'system:user:create'"` 指令，基于用户权限码集合控制元素显隐。
- **请求封装**：统一解包 `Result{code,msg,data,traceId}`；401 自动清理会话并跳转登录页；业务错误提示携带 traceId。
- **主题**：浅色/深色一键切换（localStorage 持久化）。

## 快速开始

```bash
# 1. 安装依赖（Node ≥ 18）
npm install

# 2. 配置环境变量（首次运行必须）
cp .env.example .env.development

# 3. 启动开发服务器（默认 http://localhost:5173，代理 /api、/admin-api 到后端 8080）
npm run dev

# 4. 生产构建（输出 dist/）
npm run build
```

> 开发代理目标可在 `.env.development` 中通过 `VITE_API_PROXY_TARGET` 调整；
> 生产网关地址在 `.env.production` 的 `VITE_API_BASE_URL` 配置（同域部署留空即可）。

## 环境变量配置

### 配置文件说明

本项目使用环境变量文件管理不同环境的配置，**所有 `.env.*` 文件（除 `.env.example`）都不会被提交到 Git 仓库**。

| 文件 | 用途 | 是否提交到 Git |
|------|------|---------------|
| `.env.example` | 配置模板，包含所有可用的环境变量说明 | ✅ 是 |
| `.env.development` | 开发环境配置（本地开发使用） | ❌ 否 |
| `.env.production` | 生产环境配置（部署时使用） | ❌ 否 |

### 首次配置步骤

1. **复制配置模板**：
   ```bash
   cp .env.example .env.development
   ```

2. **编辑 `.env.development`**，根据实际情况修改：
   ```env
   # 后端服务地址（开发环境）
   VITE_API_PROXY_TARGET=http://127.0.0.1:8080
   
   # OAuth2 客户端 ID（需与后端配置一致）
   VITE_OAUTH2_CLIENT_ID=apex-admin-web-dev
   ```

3. **生产环境配置**（部署前）：
   ```bash
   cp .env.example .env.production
   ```
   
   编辑 `.env.production`：
   ```env
   # 生产环境后端网关地址（同域部署可留空）
   VITE_API_BASE_URL=
   
   # OAuth2 客户端 ID（生产环境）
   VITE_OAUTH2_CLIENT_ID=apex-admin-web-prod
   ```

### 可用环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `VITE_API_PROXY_TARGET` | 开发环境后端代理目标地址 | `http://127.0.0.1:8080` | 开发环境必填 |
| `VITE_API_BASE_URL` | 生产环境后端网关地址，同域部署留空 | `''` | 生产环境可选 |
| `VITE_OAUTH2_CLIENT_ID` | OAuth2 客户端 ID，用于第三方登录 | `apex-admin-web` | 可选 |

### 注意事项

⚠️ **安全提醒**：
- 不要将包含敏感信息的 `.env.development` 或 `.env.production` 文件提交到 Git 仓库
- 团队成员需要从后端团队获取正确的 OAuth2 客户端 ID
- 生产环境的配置应该通过 CI/CD 流程或环境变量注入，不要硬编码在代码中

💡 **团队协作**：
- 新成员加入时，参考 `.env.example` 创建自己的 `.env.development`
- 如果添加了新的环境变量，务必同步更新 `.env.example` 文件
- 配置变更应在团队内及时沟通

## 目录结构

```
apex-admin-web/
├── src/
│   ├── api/            # 接口层（按业务域拆分：auth/user/system/monitor）
│   ├── types/          # 与后端 DTO 对齐的类型定义
│   ├── utils/          # 请求封装 / 会话存取 / 错误提示
│   ├── stores/         # Pinia：用户会话 / 权限 / 应用 UI 状态
│   ├── router/         # 静态路由 + 菜单驱动动态路由
│   ├── directives/     # v-permission 按钮权限指令
│   ├── layouts/        # 管理后台主布局（侧边栏/顶栏/面包屑）
│   ├── components/     # 通用组件（Pagination）
│   └── views/          # 页面（登录/工作台/系统管理/监控/个人中心）
├── vite.config.ts      # 构建与开发代理配置
├── tsconfig.json       # TypeScript 配置
└── package.json
```

## 与后端联调约定

1. **接口契约**：字段命名遵循后端 DTO camelCase；统一响应结构见 `src/types/index.ts`。
2. **鉴权**：登录接口返回 `accessToken`，后续请求自动携带 `Authorization: Bearer <token>`。
3. **验证码**：登录前先调 `GET /api/v1/auth/captcha` 获取 `captchaId` + `image(base64)`，提交时回传。
4. **错误排查**：接口失败提示中携带 `traceId`，与后端日志（TraceId 贯穿）联动定位。
5. **菜单驱动路由**：后端新增菜单时，需在 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 注册对应 `component` 名。

## 部署方式

> 本工程已与后端 Apex Scaffold 完成**前后端分离**：后端不再托管 `static/admin/` 静态前端，
> 也不再提供 `/admin` 短入口重定向。完整构建与部署说明见 **[`docs/guides/deployment.md`](docs/guides/deployment.md)**。

- **独立部署（推荐生产）**：`npm run build` 后将 `dist/` 交给 Nginx/静态服务器，反向代理 `/api`、`/admin-api` 到后端（详见 [`docs/guides/deployment.md`](docs/guides/deployment.md) §6）。
- **与后端网关同域**：前端走相对路径（`VITE_API_BASE_URL` 留空），由 Nginx 按 `/api/`、`/admin-api/` 前缀分流到后端（详见 [`docs/guides/deployment.md`](docs/guides/deployment.md) §7）。

## 标准前端注释规范

本工程源码遵循统一注释规范：

- **文件头注释**：每个 `.ts/.vue` 文件顶部以 `/**` 块说明文件职责与关联接口。
- **JSDoc**：函数/方法均以 `/** ... */` 说明用途、参数（`@param`）与返回值。
- **区块注释**：模板与脚本内用 `<!-- ... -->` / `/** ... */` 划分功能区块。
- **常量说明**：魔法字符串收敛到 `src/settings.ts` 并附注释。
