# 前后端路由端点评审（2026-11-08）— 修复与优化方案

## Context（评审结论）

对照前端 HEAD `d381de0`（基线 v1.2.0）与后端 apex-scaffold HEAD `68e8cfe1`（评审基准 953426d0 以来 9 个提交），完成「前端调用面 × 网关路由 × 开发/生产代理」三跳核对。

**核实为缺陷（2 项）：**
1. **后端网关死角**：office-domain 路由谓词只登记精确路径 `/admin-api/v1/message-templates`（无 `/**`），`PUT/DELETE /{templateId}` 落入 system 兜底 → 404。前端站内信模板 Tab 的编辑/删除（`views/office/message/index.vue` → `api/message.ts`）在此环境下必然失败。
2. **前端代理缺口**：vite 开发代理与 nginx 同域反代均只覆盖 `/api`、`/admin-api`、`/oauth2/(authorize|token)`，漏掉：`/auth/v1|v2/**`（登录 MFA 二步验证、在线会话页、密码找回页）、`/integration/v1/**`（集成中心、IoT 页）、`/oauth2/consent` POST（授权同意提交）。默认同域部署/开发联调下这些请求打回 SPA 壳。

**其余前后端契约全部一致**（匿名分享 exchange/download 已在网关白名单、ws-ticket 端点存在、分片状态路径已修、租户/套餐/能力/开放平台/IoT/会话/MFA/IP/审计/运维/工作流/办公各域方法路径分页口径逐项对应、V89 菜单种子与 VIEW_REGISTRY 对齐）。11-06 后端代理报告中的"匿名分享被网关拦截"说法经亲自核验为误报（`SystemConstants.PUBLIC_PATHS:218-219` 已含白名单）。

## 一、缺陷修复

### A1. 后端网关补 message-templates 子路径（apex-scaffold）
谓词追加 `/admin-api/v1/message-templates/**`，三个配置源 + 契约测试：
- `apex-gateway/src/main/resources/application.yml:159`
- `apex-gateway/src/main/resources/application-prod.yml:69`
- `config/nacos/apex-gateway.yaml:80`
- `apex-gateway/src/test/java/com/apex/scaffold/gateway/GatewayRouteProfileConfigTest.java:197`（断言同步）
- 同步检查 apex-scaffold 的 AGENTS.md/MEMORY-CARD.md 是否有对应路由描述，有则更新

### A2. 前端代理补齐（apex-admin-web）
**`vite.config.ts`** proxy 增加：
```ts
'/auth/v1': { target, changeOrigin: true },
'/auth/v2': { target, changeOrigin: true },
'/integration/v1': { target, changeOrigin: true },
'/oauth2/consent': { target, changeOrigin: true, bypass(req) { if (req.method === 'GET') return '/index.html' } },
```
（前缀用 API 版本限定，避开 V86 菜单目录 SPA 路径 `/integration` 冲突；consent GET 是 SPA 页面须回退，POST 才反代）

**`docker/nginx.conf`** 增加（复用现有 proxy 头与 `${API_PROXY_PASS}`）：
```nginx
location /auth/v1/ { proxy_pass ${API_PROXY_PASS}; …现有头… }
location /auth/v2/ { … }
location /integration/v1/ { … }
location = /oauth2/consent {
    if ($request_method = POST) { proxy_pass ${API_PROXY_PASS}; }
    try_files /index.html =404;
}
```

## 二、功能小项修复

### B1. console 绑定统计修复
`views/office/console/index.vue:202` 每平台固定 `listBindings(platform, 1, 100)` 前端计数（>100 截断失真）→ 改用 `listBindingsPage`（不传 status 取总数 total；若页面还分状态统计则按 status 分别取 total）。

### B2. 后端幽灵白名单清理（apex-scaffold）
`apex-common/…/SystemConstants.java:192` 删除 `/api/v1/onboarding/policies`（无对应路由）；删除前 grep 全仓确认无引用。

## 三、构建优化（前端）

### C1. Element Plus 按需引入
- 安装 `unplugin-auto-import`、`unplugin-vue-components`（ElementPlusResolver，importStyle: 'css'）
- `main.ts` 移除 `import ElementPlus` + `app.use(ElementPlus)` + 全量 `dist/index.css`；中文 locale 改为 `App.vue` 挂 `<el-config-provider :locale="zhCn">`
- 函数式组件（`ElMessage`/`ElMessageBox` 等 90+ 处手动 import）保留显式 import，`main.ts` 补 `element-plus/es/components/{message,message-box,notification,loading}/style/css` 按需样式；确认 v-loading 指令解析与暗色主题 css-vars 引入点
- **保留全局图标注册**（`element-icons` chunk 不动）：动态菜单图标依赖 `<component :is>` 全局解析，收敛为显式映射风险大于收益
- 验证：build + vue-tsc + vitest + dev 冒烟（登录、用户管理、带 v-loading 与 ElMessageBox 的页面）

### C2. ECharts 按需注册
新建 `src/utils/echarts.ts`（`echarts/core` + 按需 charts/components/CanvasRenderer），替换 4 处 `import * as echarts from 'echarts'`：`dashboard/index.vue`、`workflow/monitor/Statistics.vue`、`data/chart/index.vue`、`monitor/dashboard/index.vue`。注册集合先 grep 四页用到的 type/组件取并集；`data/chart` 若支持任意图表类型则该页保留全量引入并在注释说明。

### C3. 错误提示统一（91 处 / 43 文件，分批）
API 调用失败分支的散落 `ElMessage.error(error.message || '…')` → `showError(e, '默认提示')`（`utils/request.ts:175`，自动带 traceId）；表单校验/交互提示保留 ElMessage。按目录分批（system → office → monitor → 其余），每批跑 vue-tsc + vitest。

## 四、文档（含用户要求的方案文档）

- **新建 `docs/archived/project-reports/frontend-backend-review-2026-11-08.md`**（沿用 11-06 报告 11 节结构，配 Mermaid）：结论摘要、三跳评审方法、后端基线变化（9 提交）、调用面×网关×代理核对、P1 缺陷与修复记录、核实无误清单（含误报更正）、构建优化前后体积对比（stats.html）、验证记录
- **`AGENTS.md`**：核对日期改 2026-11-08 并链接新报告；§3.1/§3.3 代理描述更新（补 /auth/v1|v2、/integration/v1、/oauth2/consent POST）；§10 排障表加"集成/IoT/会话/找回页 404 → 代理前缀"与"站内信模板编辑删除 404 → 网关 office 路由须含 message-templates/**"
- **`MEMORY-CARD.md`**：在其**未提交修改基础上**追加本次基线（不回退既有改动）
- **通知中心 SSE 接入方案（仅方案，不动工）**写入报告：`api/notification.ts`（stream/inbox/unread-count/read/read-all 五端点）+ EventSource 客户端（复用 message-socket 的退避重连骨架）+ AdminLayout 通知入口与现有站内信 WS 的关系、工作量评估

## 五、验证

1. 前端：`npx vue-tsc --noEmit` → `npx vitest run`（185 用例全绿）→ `npm run build`（记录 stats.html 优化前后对比）→ dev server 冒烟（登录页、集成/IoT 页、consent 页 GET/POST、模板编辑对话框）
2. 后端：`mvn -pl apex-common,apex-gateway test`（SystemConstants 与网关契约测试；如本地构件缺失则 -am 全量构建）
3. 端到端（网关实际转发 message-templates PUT）依赖运行环境，报告中标注为待环境验证项
4. 遵守约束：不提交 Git commit；除上述列明文档外不新建文档

## 执行顺序

A1 后端网关（含测试） → A2 前端代理 → B1/B2 小项 → C1 EP 按需 → C2 ECharts → C3 错误提示分批 → 文档与报告 → 全量验证