# AGENTS.md — apex-admin-web（前端）

本文件为 AI 编码 Agents 在本仓库工作时需遵守的**工程约定与行为准则**。改动前请先通读；违反将导致类型检查失败、动态路由解析不到页面或与既有代码风格不一致。

> **维护说明**：本文件是 Agents 的行为约束，新增/重构模块后必须同步更新（目录结构、VIEW_REGISTRY、接口口径等）。凡是文档中无法在源码中验证的断言，一律不写入。

## 1. 项目概览

**Apex Scaffold 管理后台前端**，前后端分离的独立工程，对接后端 Apex Scaffold（Spring Boot 3 WebFlux）。

- 版本：`1.1.4`（见 `package.json`）；Node >= 18
- 技术栈：**Vue 3.5 + Vite 6 + TypeScript ~5.7 + Pinia + Element Plus + ECharts + Axios + vue-router 4**
- 语言：`<script setup lang="ts">` 单文件组件（SFC）
- 后端接口前缀：
  - `/api/v1/**` — 业务（认证、当前用户等）
  - `/admin-api/v1/**` — 管理后台
  - `/api/workflow/**` — 工作流高级操作（回退/转办/委派/挂起/恢复，见 §3.6）
- 部署/构建详见 `README.md` 与 [`docs/guides/deployment.md`](docs/guides/deployment.md)（已前后端分离，后端不再托管静态前端）。

### 功能模块

| 模块 | 页面 | 说明 |
|------|------|------|
| 认证 | login | 账号密码 + 图形验证码 |
| 工作台 | dashboard | 指标卡片 + 趋势图 |
| 系统管理 | system/{user,role,menu,dept,dict,config,job} | 用户/角色/菜单(树)/部门(树)/字典/参数/定时任务 |
| 监控 | monitor/{loginlog,audit,api-call-log,online,dashboard,runtime-log,business-log} | 登录日志/审计日志/API调用日志/在线用户/监控大盘/运行日志/业务日志 |
| 工作流 | workflow/monitor | 统计看板 + 流程实例列表 + 详情（§3.6） |
| 个人中心 | profile | 当前用户信息 |
| 全局搜索 | 顶栏 GlobalSearch | Meilisearch 全文搜索（§3.7） |

## 2. 目录结构与职责

```
src/
├── api/            # 接口层，按业务域拆分：
│   ├── auth.ts          # 认证（验证码/登录/登出/角色/权限）
│   ├── user.ts          # 当前用户 + 后台用户管理
│   ├── system.ts        # 菜单/部门/字典/参数/定时任务
│   ├── monitor.ts       # 登录日志/审计/在线用户/监控大盘/API调用日志
│   ├── workflow.ts      # 工作流（定义/实例/统计/任务/高级操作）
│   └── search.ts        # 全文搜索（Meilisearch）
├── types/          # 与后端 DTO 对齐的 TS 类型：
│   ├── index.ts         # 统一响应/分页 + 系统/监控领域类型
│   └── workflow.ts      # 工作流领域类型（定义/实例/任务/统计）
├── utils/          # request.ts（Axios 封装）/ auth.ts（Token 会话存取）
├── stores/         # Pinia：user（用户会话）、permission（按钮权限）、app（UI 状态）
├── router/         # index.ts（静态路由+守卫）/ dynamic.ts（菜单驱动动态路由）
├── directives/     # permission.ts（v-permission 按钮权限指令）
├── layouts/        # AdminLayout.vue（侧边栏/顶栏/面包屑/全局搜索/主题切换）
├── components/     # Pagination.vue（分页）/ GlobalSearch/index.vue（全文搜索）
├── settings.ts     # 应用级常量（Token key、分页、错误码、标题、上传大小等）
└── views/          # 页面：
    ├── login/ dashboard/ profile/ error/
    ├── system/{user,role,menu,dept,dict,config,job}/
    ├── monitor/{loginlog,audit,api-call-log,online,dashboard,runtime-log,business-log}/
    └── workflow/{monitor/{index,Statistics,InstanceList,InstanceDetail},components/TaskActions}/
```

> 忽略 `src/router/dynamic.ts.bak`（残留备份，非有效源码，不要修改或引用）。

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
- 组件解析依赖 **`VIEW_REGISTRY` 注册表**（`component` 字段 → `import()`）：**新增菜单页面必须登记组件 loader**，否则该菜单点进去 404。
- 菜单 `component` 命名必须与后端 Flyway 种子一致（如 `'monitor/api-call-log/index'`）。

```ts
// dynamic.ts 中登记示例
'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue')
```

**`status` 与 `visible` 语义（重要，易踩坑）**：
- **`status`（停用/正常）在前端路由层完全被忽略**。历史种子数据的 `status` 取值与后端枚举不一致，前端路由生成不读取该字段，避免因过滤导致全量菜单丢失、页面 404。目录/菜单只要组件可解析即注册路由。
- **`visible: 0`（隐藏）仅通过 `meta.hidden` 控制侧边栏展示**，路由仍注册、可直接访问；`visible: 1`（显示）才出现在侧边栏。
- 总结：`status` 不影响路由也不影响侧边栏；`visible` 仅影响侧边栏，不影响路由可达性。

**静态路由特例**：工作台（`dashboard`）、工作流监控页（`workflow/monitor`）与流程详情页（`workflow/instances/:id`）在 [src/router/index.ts](src/router/index.ts) 中作为**静态路由**注册（`hidden: true`），不依赖后端菜单。新增这类全局入口页面时走静态路由；其余业务页面一律走菜单驱动动态路由 + VIEW_REGISTRY。

路由守卫（[router/index.ts](src/router/index.ts)）：未登录跳登录页（携带 redirect）；已登录但身份未加载时拉取身份并生成动态路由；动态路由生成失败时静默降级为静态路由（登录页仍可用）。

### 3.3 按钮权限指令

`v-permission="'system:user:create'"`（[src/directives/permission.ts](src/directives/permission.ts)），基于用户权限码集合控制元素显隐（无权限时从 DOM 移除）。支持逗号分隔多码（满足其一即可）；空权限集合视为未配置（放行）。新增可操作按钮前确认权限码已由后端下发。

### 3.4 状态管理（Pinia）

- `stores/user.ts`：登录态、身份信息、权限码、`loadIdentity()`（并行拉取 `/api/v1/user/info`、`/api/v1/auth/roles/my`、`/api/v1/auth/permissions/my`）。
- `stores/permission.ts`：派生 `permissions` + `hasPermission(code)`（供 v-permission 指令与页面调用）。
- `stores/app.ts`：侧边栏折叠 + 明暗主题（`document.documentElement.classList.toggle('dark')`），均持久化到 localStorage。
- 复杂跨组件状态优先进 store，避免 prop 钻取与事件总线。

### 3.5 通用组件

- `components/Pagination.vue`：分页统一组件（`:total` + `@change(page,size)`），列表页一律复用，勿自写分页。
- `components/GlobalSearch/index.vue`：顶栏全局搜索（见 §3.7）。
- 表格页统一形态：查询区（`el-form inline`）→ `el-table`（`v-loading`、border、stripe）→ `Pagination` → 新增/编辑 `el-dialog`。
- 列表/页面语言交互采用 Element Plus 组件（`el-*`）；`ElMessage` 提示，`showError` 统一错误提示（展示 traceId）。

### 3.6 工作流模块（特例）

工作流是本仓库中**唯一走静态路由 + 自有分页口径**的模块，新增/修改时注意与其它模块的差异。

**接口层** [src/api/workflow.ts](src/api/workflow.ts)：
- 流程定义：`/admin-api/v1/workflows/definitions`（CRUD + 列表）
- 流程实例：`/admin-api/v1/workflows/instances`（列表 + 详情）
- 统计：`/admin-api/v1/workflows/statistics`、`/statistics/trend`
- 待办任务：`/admin-api/v1/workflows/tasks/my`、`/tasks/approve`、`/tasks/reject`
- 高级操作（注意前缀是 `/api/workflow`，不是 `/admin-api/v1`）：回退 `/api/workflow/tasks/{id}/rollback`、转办 `/transfer`、委派 `/delegate`、挂起 `/api/workflow/instances/{id}/suspend`、恢复 `/resume`

**类型层** [src/types/workflow.ts](src/types/workflow.ts)：`WorkflowNode/Edge/Definition/Instance/InstanceDetail/Task/Statistics/Trend` 及各 Payload（`CompleteTaskPayload`、`RollbackTaskPayload`、`TransferTaskPayload`、`DelegateTaskPayload`、`SuspendInstancePayload`、`ResumeInstancePayload`）。

**视图层** [src/views/workflow/](src/views/workflow/)：
- `monitor/index.vue`：Tab 切换「统计看板」(`Statistics.vue`) 与「流程实例」(`InstanceList.vue`)
- `monitor/InstanceDetail.vue`：流程详情（含任务操作）
- `components/TaskActions.vue`：审批/回退/转办/委派/挂起/恢复操作按钮

**路由**：`workflow/monitor` 与 `workflow/instances/:id` 为静态路由（`hidden: true`，`meta.activeMenu` 指向 `/workflow/monitor`），**不需要**在 `VIEW_REGISTRY` 登记，也不需要后端菜单。

**分页口径差异（历史遗留）**：
- 工作流模块使用 `{pageNum, pageSize}` + 响应 `{records, total}`；
- 其它模块统一使用 `PageQuery{page, size}` + `PageResponse{list, total, pageNum, pageSize, pages, hasNext}`。
- 新增非工作流代码**必须**遵循统一口径；修改工作流代码时保持模块内一致，不在本次范围内强行统一。

### 3.7 全文搜索

- 组件：[src/components/GlobalSearch/index.vue](src/components/GlobalSearch/index.vue)，集成在 `AdminLayout` 顶栏。
- 接口：[src/api/search.ts](src/api/search.ts) → `GET /admin-api/v1/search`（keyword + types + page + size）、`POST /admin-api/v1/search/rebuild`（重建索引）。
- 后端：Meilisearch。
- 跳转映射：搜索结果按 `resourceType` 跳转到对应管理页并带 `?id=`：
  - `user→/system/user`、`role→/system/role`、`menu→/system/menu`、`dept→/system/dept`、`dict→/system/dict`、`config→/system/config`。
- 新增可搜索资源类型时，需同时更新后端索引与 `GlobalSearch` 的 `routes`/`getTypeName`/`getTagType` 映射。

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
2. **鉴权**：登录接口 `POST /api/v1/auth/login` 返回 `accessToken`；登录前需 `GET /api/v1/auth/captcha` 拿验证码（captchaId + base64 image）。
3. **排障**：接口失败提示带 `traceId`，与后端日志（TraceId 贯穿）联动定位。
4. **新增菜单全流程**（菜单驱动页面，四步，缺一不可）：
   - 后端 Flyway 入 `sys_menu`（设 `component`）；
   - 前端新建视图 → 在 `dynamic.ts` 的 `VIEW_REGISTRY` 登记同名 loader；
   - 后端 Handler 标权限码 → 前端用 `v-permission` 控制按钮；
   - 联调验证侧边栏出现、路由可达、CRUD 正常。
5. **全局入口页面**（如工作台、工作流监控）：走 `router/index.ts` 静态路由，**不需要**后端菜单与 VIEW_REGISTRY，但需设 `meta.hidden: true` 避免出现在侧边栏（或显式控制）。
6. **代码生成器**（后端 `apex-generator` 的 `-f` 参数）可自动产出 `api/{module}/{entity}.ts` 与 `views/...`/`form.vue`，产物需人工接入 `VIEW_REGISTRY` 与权限码。该工具由后端仓库提供，本前端仓库不内置。

## 7. 变更检查清单（提交前）

- [ ] `npm run build`（含 `vue-tsc --noEmit`）通过；
- [ ] 所有新增代码带文件头注释 + JSDoc，风格与既有文件一致；
- [ ] 请求复用 `utils/request.ts` 的 `get/post/put/del`，未裸写 axios；
- [ ] 新增菜单页面已在 `dynamic.ts` 的 `VIEW_REGISTRY` 登记（全局入口页面除外，走静态路由）；
- [ ] 新增非工作流代码分页遵循统一口径（`PageQuery{page,size}` + `PageResponse`）；
- [ ] 魔法字符串收敛到 `settings.ts`；
- [ ] 分页复用 `Pagination` 组件；
- [ ] 与后端字段/权限码/菜单 `component` 对齐；
- [ ] 未修改或引用 `*.bak` 备份文件。
