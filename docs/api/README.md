# API 接口目录

> 本文与 [src/api/](../../src/api/) 当前实现逐一对齐（2026-09-27 核对）。新增/修改接口后必须同步更新本文，否则视为文档缺陷。

## 1. 通用约定

### 1.1 统一响应与解包

所有接口返回后端统一结构 `Result{code, msg, data, traceId}`，由 [src/utils/request.ts](../../src/utils/request.ts) 统一解包：

- `code === 0`：返回 `data`；
- `code !== 0`：抛出 `ApiError(message, code, traceId)`；
- 非 `Result` 结构（如文件流）原样返回；
- 超时 30s；`baseURL` 取 `VITE_API_BASE_URL`（生产同域部署留空）。

### 1.2 接口前缀对照

| 前缀 | 用途 | 代理（开发/生产） |
|------|------|-------------------|
| `/api/v1/**` | 业务接口：认证、当前用户、文件、OAuth2、办公平台登录/回调 | Vite proxy `/api`、Nginx `/api/` |
| `/admin-api/v1/**` | 管理后台接口：系统管理、监控、日志、SSO、生成器、认证配置等 | Vite proxy `/admin-api`、Nginx `/admin-api/` |
| `/api/workflow/**` | 工作流高级操作（回退/转办/委派/挂起/恢复） | 同 `/api` |
| `/api/office/**` | 办公平台业务操作（消息/审批/日历/文档） | 同 `/api` |
| `/oauth2/token`、`/oauth2/authorize`、`/oauth2/userinfo` | OAuth2 标准端点 | Vite `^/oauth2/(authorize\|token)`、Nginx 同规则 |

### 1.3 分页口径（两套并存）

| 口径 | 请求 | 响应 | 使用范围 |
|------|------|------|---------|
| **统一口径** | `PageQuery{page, size}` | `PageResponse{list, total, pageNum, pageSize, pages, hasNext}` | 除工作流外的全部模块 |
| **工作流口径** | `{pageNum, pageSize}` | `{records, total}` | 仅 [src/api/workflow.ts](../../src/api/workflow.ts) |

### 1.4 认证

- 请求拦截自动注入 `Authorization: Bearer <accessToken>`；
- 401 时自动触发**令牌无感刷新并重放一次**（详见 [认证与路由架构](../architecture/auth-and-routing.md)）；
- 响应头 `x-new-access-token` 自动更新本地令牌。

## 2. 接口清单（按业务域）

### 2.1 认证 [src/api/auth.ts](../../src/api/auth.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/api/v1/auth/captcha` | `getCaptcha()` | 图形验证码（captchaId + base64） |
| POST | `/api/v1/auth/login` | `login(payload)` | 账号密码登录（附带 deviceId/platform） |
| POST | `/api/v1/auth/logout` | `logout()` | 登出 |
| POST | `/api/v1/auth/refresh` | `refreshToken(rt)` | 刷新令牌（request.ts 401 时自动调用） |
| GET | `/api/v1/auth/roles/my` | `getMyRoles()` | 当前用户角色码 |
| GET | `/api/v1/auth/permissions/my` | `getMyPermissions()` | 当前用户权限码 |

### 2.2 当前用户与后台用户 [src/api/user.ts](../../src/api/user.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/api/v1/user/info` | `getCurrentUserInfo()` | 当前用户信息（UserIdentity） |
| GET | `/admin-api/v1/users` | `listUsers(query)` | 用户分页列表 |
| GET | `/admin-api/v1/users/{id}` | `getUserDetail(id)` | 用户详情（含 roles） |
| POST | `/admin-api/v1/users` | `createUser(payload)` | 创建用户 |
| PUT | `/admin-api/v1/users/{id}` | `updateUser(id, payload)` | 更新用户 |
| PUT | `/admin-api/v1/users/{id}/status` | `updateUserStatus(id, enabled)` | 启停用户 |
| POST | `/admin-api/v1/users/{id}/sessions/revoke` | `revokeUserSessions(id)` | 强退用户会话 |
| PUT | `/admin-api/v1/users/{id}/roles` | `assignUserRoles(id, roleIds)` | 分配角色（整体替换） |
| GET | `/admin-api/v1/staff-roles` | `listStaffRoles()` | 可分配角色列表 |
| DELETE | `/admin-api/v1/users/{id}` | `deleteUser(id)` | 删除用户（预留，后端当前未暴露） |

### 2.3 系统管理 [src/api/system.ts](../../src/api/system.ts)

**菜单**（`/admin-api/v1/menus`）：`listMenuTree`（GET 树）、`getMenuDetail`、`createMenu`、`updateMenu`、`deleteMenu`、`updateMenuStatus`。

**部门**（`/admin-api/v1/depts`）：`listDeptTree`、`createDept`、`updateDept`、`deleteDept`。

**字典**（`/admin-api/v1/dict/types`、`/dict/data`）：类型与数据的 CRUD + `updateDictTypeStatus`/`updateDictDataStatus`；数据列表按 `dictType` 查询。

**参数配置**（`/admin-api/v1/configs`）：`listConfigs`、`createConfig`、`updateConfig`、`deleteConfig`、`updateConfigStatus`。

**定时任务**（`/admin-api/v1/jobs`）：`listJobs`、`pageJobs`（GET `/jobs/page`，统一分页口径）、`createJob`、`updateJob`、`deleteJob`、`updateJobStatus`、`runJobOnce`、`listJobLogs(id, limit)`。

### 2.4 数据库配置 [src/api/database.ts](../../src/api/database.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| POST | `/admin-api/v1/database/test` | `testDatabaseConnection(config)` | 连接测试 |
| POST | `/admin-api/v1/database/generate-config` | `generateDeploymentConfig(config)` | 生成部署配置（密码不落库，一次性采集） |
| GET | `/admin-api/v1/database/current` | `getCurrentDatabaseInfo()` | 当前数据库信息 |

### 2.5 文件管理 [src/api/file.ts](../../src/api/file.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| POST | `/api/v1/files/generic` | `uploadFile(file, sex)` | 通用上传（FormData；sex: 0=男/AM 1=女/AF） |
| GET | `/api/v1/files/url` | `getFileUrl(bucket, fileName)` | 获取访问 URL |
| DELETE | `/api/v1/files` | `deleteFile(bucket, fileName)` | 删除文件 |
| GET | `/api/v1/files/exists` | `checkFileExists(bucket, fileName)` | 存在性检查 |
| GET | `/api/v1/files/content` | `getFileContent(fileName)` | 读取内容（返回预签名 URL，非异步） |

> 上传结果字段是 `objectName`（不是 `fileName`）；删除需同时传 `bucketName` + `objectName`。

### 2.6 监控 [src/api/monitor.ts](../../src/api/monitor.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/admin-api/v1/login-logs` | `listLoginLogs(q)` | 登录日志分页 |
| GET | `/admin-api/v1/audit-logs` | `listAuditLogs(q)` | 审计日志分页 |
| GET | `/admin-api/v1/online-users` | `listOnlineUsers(q)` | 在线用户分页 |
| GET | `/admin-api/v1/monitor/overview` | `getMonitorOverview()` | 监控大盘总览 |
| GET | `/admin-api/v1/monitor/system` | `getMonitorSystem()` | 系统指标 |
| GET | `/admin-api/v1/monitor/middleware` | `getMonitorMiddleware()` | 中间件指标 |
| GET | `/admin-api/v1/monitor/governance` | `getMonitorGovernance()` | 治理指标 |
| GET | `/admin-api/v1/monitor/business` | `getMonitorBusiness()` | 业务指标 |
| GET | `/admin-api/v1/monitor/trace/{traceId}` | `getTraceById(traceId)` | 链路追踪查询 |
| GET | `/admin-api/v1/api-call-logs` | `listApiCallLogs(q)` | API 调用日志分页 |

### 2.7 日志查询 [src/api/log.ts](../../src/api/log.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/admin-api/v1/logs/runtime` | `queryRuntimeLogs(q)` | 运行时日志（无分页，返回数组） |
| GET | `/admin-api/v1/logs/runtime/count` | `countRuntimeLogs(q)` | 运行时日志计数 |
| GET | `/admin-api/v1/logs/business` | `queryBusinessLogs(q)` | 业务日志（统一分页口径） |
| GET | `/admin-api/v1/logs/business/count` | `countBusinessLogs(q)` | 业务日志计数 |

### 2.8 工作流 [src/api/workflow.ts](../../src/api/workflow.ts)（⚠️ 工作流分页口径）

**流程定义**（`/admin-api/v1/workflows/definitions`）：`getWorkflowDefinition`、`createWorkflowDefinition`、`updateWorkflowDefinition`、`listWorkflowDefinitions`。

**流程实例**：`listWorkflowInstances`（GET `/instances`）、`getWorkflowInstanceDetail`（GET `/instances/{id}`）。

**统计**：`getWorkflowStatistics`（GET `/statistics`）、`getWorkflowTrend(days)`（GET `/statistics/trend`）。

**任务**：`getMyPendingTasks`（GET `/tasks/my`）、`approveTask`（POST `/tasks/approve`）、`rejectTask`（POST `/tasks/reject`）、`getTaskDetail`（GET `/tasks/{id}`）。

**高级操作**（注意前缀是 `/api/workflow`，不是 `/admin-api/v1`）：

| 方法 | 路径 | 函数 |
|------|------|------|
| POST | `/api/workflow/tasks/{id}/rollback` | `rollbackTask` |
| POST | `/api/workflow/tasks/{id}/transfer` | `transferTask` |
| POST | `/api/workflow/tasks/{id}/delegate` | `delegateTask` |
| POST | `/api/workflow/instances/{id}/suspend` | `suspendInstance` |
| POST | `/api/workflow/instances/{id}/resume` | `resumeInstance` |

### 2.9 文档管理 [src/api/document.ts](../../src/api/document.ts)

`/admin-api/v1/documents`：`listDocuments`（GET 分页）、`getDocumentDetail`、`createDocument`、`updateDocument`、`deleteDocument`、`updateDocumentStatus`（PUT `/{id}/status`）、`downloadDocument`（GET `/{id}/download`，返回 Blob）。

### 2.10 图表管理 [src/api/chart.ts](../../src/api/chart.ts)

`/admin-api/v1/charts`：`listCharts`（GET 分页）、`getChartDetail`、`getChartData`（GET `/{id}/data`）、`createChart`、`updateChart`、`deleteChart`、`updateChartStatus`（PUT `/{id}/status`）。

### 2.11 全文搜索 [src/api/search.ts](../../src/api/search.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/admin-api/v1/search` | `search(params)` | Meilisearch 检索（keyword + types + page + size） |
| POST | `/admin-api/v1/search/rebuild` | `rebuildIndex(type?)` | 重建索引 |

### 2.12 OAuth2 [src/api/oauth2.ts](../../src/api/oauth2.ts)

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| — | — | `buildAuthUrl(config)` | 前端构建授权 URL（S256 PKCE + 一次性 state） |
| POST | `/oauth2/token` | `exchangeToken(request)` | 表单编码换取令牌 |
| — | — | `consumeAuthorization(state)` | 一次性取出授权上下文（取出即失效） |
| GET | `/oauth2/userinfo` | `getUserInfo()` | 获取用户信息 |
| POST | `/api/v1/auth/social/{provider}` | `socialLogin(request)` | 社交登录（微信/GitHub 等，body 携带 code + state） |
| — | — | `verifyState(state)` | state 校验 |

回调处理页面：`/oauth2/callback`（静态路由，public）。

### 2.13 认证配置管理 [src/api/auth-config.ts](../../src/api/auth-config.ts)（前缀 `/admin-api/v1/auth/config`）

| 子域 | 路径 | 函数 |
|------|------|------|
| JWT 配置 | GET/PUT `/admin-api/v1/auth/config/jwt` | `getJwtConfig` / `updateJwtConfig` |
| OAuth2 客户端 | GET `/admin-api/v1/auth/config/oauth2/clients`、POST/PUT/DELETE `/admin-api/v1/oauth2/clients[/{id}]`（写接口无 `auth/config` 前缀） | `listOAuth2Clients` 等；写前经 `validateOAuth2Settings` 前端校验 |
| 权限码 | GET `/admin-api/v1/auth/config/permissions`（全量拉取后**前端分页/筛选**）；写接口走 `/api/v1/auth/permissions`：POST 创建、POST `/update` 更新、DELETE `/{id}` 删除；POST `/admin-api/v1/auth/config/permissions/sync` 同步 | `listPermissions` / `createPermission` / `updatePermission` / `deletePermission` / `syncPermissions`（返回新增/移除清单） |
| 在线会话 | GET `/admin-api/v1/auth/config/sessions`；强退复用用户接口 POST `/admin-api/v1/users/{sessionId}/sessions/revoke`（批量在前端循环调用，无批量端点） | `listOnlineUsers` / `forceLogout` / `batchForceLogout` |
| 会话配置 | GET/PUT `/admin-api/v1/auth/config/session` | `getSessionConfig` / `updateSessionConfig` |
| 安全策略 | GET/PUT `/admin-api/v1/auth/config/security` | `getSecurityPolicy` / `updateSecurityPolicy` |
| 登录尝试 | GET `/admin-api/v1/auth/config/login-logs` | `listLoginAttempts` |

### 2.14 SSO 单点登录 [src/api/sso.ts](../../src/api/sso.ts)（前缀 `/admin-api/v1/sso`）

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET/POST | `/providers` | `listSSOProviders` / `createSSOProvider` | 提供商 CRUD |
| GET/PUT/DELETE | `/providers/{id}` | `getSSOProvider` / `updateSSOProvider` / `deleteSSOProvider` | |
| POST | `/providers/{id}/test` | `testSSOConnection` | 连接测试 |
| PUT | `/providers/{id}/toggle` | `toggleSSOProvider(id, enabled)` | 启停 |
| GET | `/providers/{id}/metadata` | `getSSOMetadata` | 元数据（SAML 等） |
| GET | `/sessions` | `listSSOSessions` | SSO 会话分页 |
| DELETE | `/sessions/{sessionId}` | `terminateSSOSession` | 强制终止 |
| POST | `/sessions/batch-terminate` | `batchTerminateSSOSessions` | 批量终止 |
| GET | `/audit-logs` | `listSSOAuditLogs` | 审计日志分页 |
| GET | `/statistics` | `getSSOStatistics` | 统计信息 |

支持协议：SAML 2.0 / CAS / LDAP / OAuth2 / OIDC。

### 2.15 代码生成器 [src/api/generator.ts](../../src/api/generator.ts)（前缀 `/admin-api/v1/generator`）

| 子域 | 路径 | 函数 |
|------|------|------|
| 数据源 | GET/POST `/datasources`、PUT/DELETE `/datasources/{id}`、POST `/datasources/test` | `listDataSources` 等 |
| 表扫描 | GET `/datasources/{id}/tables`、GET `/datasources/{id}/tables/{name}/columns` | `listTables` / `getTableColumns` |
| 生成配置 | GET/POST `/configs`、PUT/DELETE `/configs/{id}` | `listGeneratorConfigs` 等（统一分页口径） |
| 代码生成 | POST `/generate`、POST `/preview` | `generateCode` / `previewCode` |
| 模板 | GET/POST `/templates`、PUT/DELETE `/templates/{id}` | `listTemplates` 等 |
| 历史 | GET `/history`、POST `/history/{id}/rollback` | `listGenerateHistory` / `rollbackGenerate` |

### 2.16 办公平台（两套 API 并存，按页面引用）

**[src/api/office-new.ts](../../src/api/office-new.ts)**（品牌应用/绑定管理 + 登录，被 `office/callback`、`office/config`、`office/bindings`、`office/console`、`PlatformSelector` 引用）：

| 方法 | 路径 | 函数 | 说明 |
|------|------|------|------|
| GET | `/api/v1/office/status` | `getPlatformStatus()` | 已启用平台列表（返回平台标识数组） |
| GET | `/api/v1/office/login?platform=` | `startOfficeLogin(platform)` | 获取平台 OAuth2 授权跳转地址（query 传 platform） |
| GET | `/api/v1/office/callback?platform=&code=&state=` | `officeCallback(platform, code, state)` | 授权回调换会话（query 传参） |
| GET | `/admin-api/v1/office/apps` | `listApps()` | 应用配置列表 |
| GET | `/admin-api/v1/office/apps/{platform}` | `getApp(platform)` | 查询单平台配置 |
| POST | `/admin-api/v1/office/apps/{platform}` | `createApp(platform, req)` | 新建平台配置 |
| PUT | `/admin-api/v1/office/apps/{platform}` | `updateApp(platform, version, req)` | 更新配置（version 乐观锁随 body 回传） |
| DELETE | `/admin-api/v1/office/apps/{platform}?version=` | `deleteApp(platform, version)` | 删除配置（version 乐观锁） |
| GET | `/admin-api/v1/office/bindings` | `listBindings(platform, page, size)` | 账号绑定列表（数组响应，向后兼容） |
| GET | `/admin-api/v1/office/bindings/page` | `listBindingsPage(platform, status, page, size)` | 账号绑定分页（真实 total，支持 status 过滤） |
| POST | `/admin-api/v1/office/bindings/{id}/review` | `reviewBinding(id, req)` | 审批绑定（approved=true 通过 / false 驳回） |
| DELETE | `/admin-api/v1/office/bindings/{id}/unbind?version=` | `unbindBinding(id, version)` | 解绑（version 乐观锁） |

**[src/api/office.ts](../../src/api/office.ts)**（综合接口，被 `office/message`、`office/approval`、`office/calendar`、`office/document`、`office/organization` 引用）：

| 子域 | 前缀 | 代表函数 |
|------|------|---------|
| 状态/登录/回调 | `/api/v1/office` | `getPlatformStatus` / `startOfficeLogin` / `officeCallback` |
| 平台配置/连通性 | `/admin-api/v1/office/config/{platform}`、`/test` | `getPlatformConfig` / `savePlatformConfig` / `testConnectivity` |
| 绑定/组织同步 | `/admin-api/v1/office/bindings`、`/sync/{platform}/**` | `getBindings` / `approveBinding` / `rejectBinding` / `unbindBinding` / `getSyncStatus` / `triggerSync` |
| 消息（管理） | POST `/admin-api/v1/office/messages/send` | `sendMessage` |
| 审批/日历/文件（管理查询） | `/admin-api/v1/office/approvals`、`/calendar/events`、`/files` | `getApprovals` / `getAdminCalendarEvents` / `getFiles` |
| 消息（业务） | `/api/office/messages/**`（text/image/file/card/sent/{id}） | `sendTextMessage` 等 |
| 审批（业务） | `/api/office/approvals/**`（发起/详情/同意/撤销/pending/initiated） | `initiateApproval` 等 |
| 日历（业务） | `/api/office/calendar/events/**`（CRUD/查询/my） | `createCalendarEvent` 等 |
| 文档（业务） | `/api/office/documents/**`（CRUD/copy/move/share/my） | `createDocument` 等 |

> 两套 API 并存是过渡状态：`office-new.ts` 覆盖应用配置与绑定管理新版接口（带乐观锁 version），`office.ts` 覆盖消息/审批/日历/文档业务操作。新增办公页面时优先查看页面实际 import 的模块，不要凭前缀猜测。

### 2.17 自动生成接口

`npm run generate:api`（openapi-generator-cli 7.2.0，typescript-axios，配置见 [openapitools.json](../../openapitools.json)）依据 `glob: "openapi.json"` 从根目录 `openapi.json` 生成代码到 `src/api/generated/`。该 OpenAPI 规范文件由后端接口导出提供，当前仓库未内置（`.gitignore` 也未忽略），执行前须先将其放到根目录；`src/api/generated/` 亦为生成目录，当前仓库不存在。生成物为辅助参考，业务代码仍以手写 [src/api/](../../src/api/) 模块为准。

## 3. 错误处理约定

```typescript
import { showError, ApiError } from '@/utils/request'

try {
  await someApi()
} catch (error) {
  // ApiError：展示 message + traceId，便于与后端日志联动
  showError(error, '操作失败，请稍后重试')
}
```

- `ApiError` 携带 `code` 与 `traceId`；`showError()` 统一以 `ElMessage.error` 展示；
- 401（刷新失败后）自动清会话跳登录并携带 redirect；
- 表单校验失败由 Element Plus 自行提示，catch 中勿重复弹错。

## 4. 新增接口规范

1. 在对应业务域文件（或新建 `src/api/{domain}.ts`）中封装**类型化函数**，禁止页面直接调用 axios；
2. 复用 `get/post/put/del`，泛型标注返回类型（禁止 `Promise<any>`）；
3. 非工作流模块分页一律使用 `PageQuery{page, size}` / `PageResponse`；
4. 写 JSDoc（含 `@param`/`@returns`），文件头注释列出后端接口；
5. 同步更新本文与 [AGENTS.md](../../AGENTS.md) 的模块清单。

---

**最后更新**：2026-09-27（依据 src/api/ 逐文件核对）
