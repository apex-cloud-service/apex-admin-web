# AGENT.md — apex-admin-web（前端）

本文件为 AI 编码 Agent 在本仓库工作时需遵守的**工程约定与行为准则**。改动前请先通读；违反将导致类型检查失败、动态路由解析不到页面或与既有代码风格不一致。

## 1. 项目概览

**Apex Scaffold 管理后台前端**，前后端分离的独立工程，对接后端 Apex Scaffold（Spring Boot 3 WebFlux）。

- 版本：`1.1.4`（见 `package.json`）；Node >= 18
- 技术栈：**Vue 3.5 + Vite 6 + TypeScript ~5.7 + Pinia + Element Plus + ECharts + Axios + vue-router 4**
- 语言：`<script setup lang="ts">` 单文件组件（SFC）
- 与后端接口分组：
  - `/api/v1/**` — 业务（认证、当前用户等）
  - `/admin-api/v1/**` — 管理后台
- 部署/构建详见 `README.md` 与 `DEPLOYMENT.md`（已前后端分离，后端不再托管静态前端）。

## 2. 目录结构与职责

```
src/
├── api/            # 接口层，按业务域拆分：auth.ts / user.ts / system.ts / monitor.ts
├── types/          # index.ts：与后端 DTO 对齐的 TS 类型定义
├── utils/          # request.ts（Axios 封装）/ auth.ts（Token 会话存取）
├── stores/         # Pinia：user（用户会话）、permission、app（UI 状态）
├── router/         # index.ts（静态路由+守卫）/ dynamic.ts（菜单驱动动态路由）
├── directives/     # permission.ts（v-permission 按钮权限指令）
├── layouts/        # AdminLayout.vue（侧边栏/顶栏/面包屑）
├── components/     # Pagination.vue 等通用组件
├── settings.ts     # 应用级常量（Token key、分页、错误码、标题等）
└── views/          # 页面：login / dashboard / system/* / monitor/* / profile / error
```

## 3. 核心机制与约定

### 3.1 请求封装（必须复用，禁止裸写 axios）

统一走 [src/utils/request.ts](src/utils/request.ts) 暴露的 `request` / `get` / `post` / `put` / `del`：

- 自动注入 `Authorization: Bearer <token>`；
- 统一解包后端 `Result{code,msg,data,traceId}`，**`code === 0` 才返回 `data`**，否则 `throw ApiError`（携带 code + traceId）；
- HTTP 401 自动清理会话并跳转登录页（保留 redirect 回跳地址）；
- 超时 30s（与后端全局响应超时对齐）。

> 新增接口时，在本工具函数上再包一层类型化函数并写 JSDoc，**不要**在页面里直接调用 `axios`。

示例（见 [src/api/system.ts](src/api/system.ts)）：
```ts
export function listMenuTree(): Promise<MenuNode[]> {
  return get<MenuNode[]>('/admin-api/v1/menus')
}
```

### 3.2 动态路由（菜单驱动）

- 后端菜单树 `/admin-api/v1/menus` → [src/router/dynamic.ts](src/router/dynamic.ts) 的 `buildDynamicRoutes()`。
- 菜单类型（`menuType`）：`0=目录`（分组）、`1=菜单`（挂到 AdminLayout）、`2=按钮`（不生成路由，仅权限码）。
- 组件解析依赖 **`VIEW_REGISTRY` 注册表**（`component` 字段 → `import()`）：**新增页面必须登记组件 loader**，否则该菜单点进去 404。
- 菜单 `component` 命名必须与后端 Flyway 种子一致（如 `'monitor/api-call-log/index'`），路由鉴权见守卫逻辑（[router/index.ts](src/router/index.ts)）。

```ts
// dynamic.ts 中登记示例
'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue')
```

### 3.3 按钮权限指令

`v-permission="'system:user:create'"`（[src/directives/permission.ts](src/directives/permission.ts)），基于用户权限码集合控制元素显隐。新增可操作按钮前确认权限码已由后端下发。

### 3.4 状态管理（Pinia）

- `stores/user.ts`：登录态、身份信息、权限码、`loadIdentity()`。
- `stores/permission.ts` / `stores/app.ts`：权限与 UI 状态（如明暗主题，localStorage 持久化）。
- 复杂跨组件状态优先进 store，避免 prop 钻取与事件总线。

### 3.5 通用组件

- `components/Pagination.vue`：分页统一组件（`:total` + `@change`），列表页一律复用，勿自写分页。
- 表格页统一形态：查询区（`el-form inline`）→ `el-table`（`v-loading`、border、stripe）→ `Pagination` → 新增/编辑 `el-dialog`。
- 列表/页面语言交互采用 Element Plus 组件（`el-*`）；`ElMessage` 提示，`showError` 统一错误提示（展示 traceId）。

## 4. 注释与代码风格规范（强制）

遵循 README「标准前端注释规范」：

- **文件头注释**：每个 `.ts/.vue` 顶部用 `/**` 块说明文件职责与关联接口；`.vue` 也可用 `<!-- 注释块 -->` 开头。
- **JSDoc**：函数/方法均以 `/** ... */` 说明用途、参数（`@param`）与返回值（参照 `request.ts`、`api/*.ts`）。
- **区块注释**：模板与 `script` 内用 `<!-- ... -->` / `/** ... */` 划分功能区块（如「查询区/列表区/分页区」）。
- **常量收敛**：魔法字符串（Token key、分页、错误码、标题、上传大小）统一放 `src/settings.ts` 并附注释，不散落各文件。
- **命名**：类型用 `interface` / `type`（见 `types/index.ts`），组件/文件大驼峰，目录小写（新增视图目录用短横线小写对齐后端 `component`，如 `api-call-log`）。

## 5. 构建与质量

```bash
npm install          # 安装依赖
npm run dev          # 开发，默认 http://localhost:5173（代理 /api、/admin-api → 后端 8080）
npm run build        # 类型检查 + 构建：vue-tsc --noEmit && vite build
npm run preview      # 预览构建产物
```

- **`npm run build` 必须通过**（含 `vue-tsc --noEmit` 严格类型检查）。新增/修改代码务必跑一遍。
- 开发代理目标在 `.env.development`（`VITE_API_PROXY_TARGET`）；生产网关在 `.env.production`（`VITE_API_BASE_URL`，同域部署留空）。
- 触发页面前需后端 `apex-scaffold` 已启动（接口模块 8080）。

## 6. 前后端联调须知

1. **接口契约**：字段名 camelCase，与后端 DTO 对齐；统一响应 `Result` 结构勿破坏。
2. **鉴权**：登录接口 `POST /api/v1/auth/*` 返回 `accessToken`；登录前需 `GET /api/v1/auth/captcha` 拿验证码（captchaId + base64 image）。
3. **排障**：接口失败提示带 `traceId`，与后端日志（TraceId 贯穿）联动定位。
4. **新增菜单全流程**（四步，缺一不可）：
   - 后端 Flyway 入 `sys_menu`（设 `component`）；
   - 前端新建视图 → 在 `dynamic.ts` 的 `VIEW_REGISTRY` 登记同名 loader；
   - 后端 Handler 标权限码 → 前端用 `v-permission` 控制按钮；
   - 联调验证侧边栏出现、路由可达、CRUD 正常。
5. 代码生成器（后端 `apex-generator` 的 `-f` 参数）可自动产出 `api/{module}/{entity}.ts` 与 `views/...`/`form.vue`，产物需人工接入 `VIEW_REGISTRY` 与权限码。

## 7. 变更检查清单（提交前）

- [ ] `npm run build`（含 `vue-tsc --noEmit`）通过；
- [ ] 所有新增代码带文件头注释 + JSDoc，风格与既有文件一致；
- [ ] 请求复用 `utils/request.ts` 的 `get/post/put/del`，未裸写 axios；
- [ ] 新增页面已在 `dynamic.ts` 的 `VIEW_REGISTRY` 登记；
- [ ] 魔法字符串收敛到 `settings.ts`；
- [ ] 分页复用 `Pagination` 组件；
- [ ] 与后端字段/权限码/菜单 `component` 对齐。
