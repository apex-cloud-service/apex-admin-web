# 统一权限认证与多租户前端适配评审

> 评审日期：2026-10-26。评审依据：后端仓库 `/Users/work/apex-scaffold` 工作区改动（未提交变更约 956 个文件）与已提交代码；前端仓库本仓库。

## 1. 评审背景

后端新增/完善了两类能力：

1. **统一权限认证（auth-center）**：认证中心统一签发令牌（含 `tenantId` claim），提供授权快照查询端点 `GET /auth/v1/authorization/users/{userId}`（仅供服务间专用 reader 账号调用，租户取自已认证主体，不可通过参数或请求头覆盖）；`ResourcePermission` 资源维度权限切面在后端方法级生效。
2. **多租户（Tenant）**：租户作用域完全由 JWT `tenantId` claim 决定；网关剥离客户端原始 `X-Tenant-Id` 并从校验后的令牌重建该头；服务端 `TenantAspect` 仅校验请求头与认证租户的一致性（不一致返回 403“无权访问指定租户”），不能用于切换租户。

## 2. 评审结论

### 2.1 无需前端适配的事项（明确不做）

| 事项 | 结论 | 依据 |
| --- | --- | --- |
| 租户管理页（CRUD/列表/配额） | **已实施**（2026-10-30 更新） | 后端已装配 `PlatformTenantRouter`（`/api/v2/platform/tenants`：分页/详情/创建/生命周期/配额，权限码 `tenant:read|create|lifecycle|quota`）。前端页面 `views/system/tenant/`，契约要点：分页参数为 pageNum/pageSize 且必填；生命周期动作仅接受小写 `disable/enable/freeze/unfreeze/deactivate/archive`；配额以 null 表示不限；写操作携带 `expectedVersion` 乐观锁 |
| 租户切换器（选租户再登录） | **不做** | 平台租户端点面向平台运维账号，不供普通登录用户枚举；业务令牌仍绑定唯一租户 |
| 强制携带 `X-Tenant-Id` 请求头 | **不做** | 网关（`JwtSignatureFilter`）先剥离再从 JWT 重建该头，浏览器携带与否不影响下游；携带错误值反而触发 403 |
| 权限码模型 / `stores/permission` / `v-permission` | **无需改动** | 权限码格式仍为 `模块:资源:操作`；`/api/v1/auth/permissions/my` 返回结构不变；`ResourcePermission` 是后端切面级校验，前端无感知 |
| 调用认证中心授权快照端点 | **禁止** | `GET /auth/v1/authorization/users/{userId}` 仅限专用 reader 账号，普通用户调用返回 403 |
| 管理端角色/权限 CRUD 接口 | **无需改动** | 前端使用 `/api/v1/auth/roles|permissions`，本次无契约变化（auth-center 侧 `/auth/v1/roles` 不供前端调用） |

### 2.1.1 后端实现补充（2026-10-30 复核）

| 能力 | 后端实现 | 前端影响 |
| --- | --- | --- |
| 统一权限解析 | `PermissionService.getPermissionsByUserId`：开关 `apex.features.auth-center-permission`（默认 false）为 true 时走 `UnifiedAuthorizationService`（认证中心授权快照，缓存 TTL 0~30s），否则走本地 `user→role→permission` RBAC 查询 | 无；`/permissions/my` 返回口径不变 |
| 方法级权限校验 | `@RequirePermission` + `RequirePermissionAspect`：权限码**精确匹配**（无通配符），`value()` 逗号分隔多码按 `Logical.OR`/`AND` 组合；要求主体带非空 `tenantId` | 无；核对权限码可用个人中心「权限明细」 |
| 租户上下文 | `TenantAspect` 拦截 `@TenantAware`（当前仅 workflow-service 三个 Handler 使用）：从可信主体取租户，校验 `X-Tenant-Id` 一致性（不一致 403），写入 `TenantContext` | 无；请求层已按登录响应记录值附带该头 |
| 数据隔离 | 提供 `TenantContext` 装配机制；`TenantLineInnerInterceptor` 未作为全局强制启用（仅 `application-enterprise.yml` 与测试涉及） | 无 |

### 2.2 已补充的前端功能（本仓库变更）

后端契约中与前端相关、且当前即可安全接入的能力为：**登录时的租户声明（可选）**与**租户标识的会话记录**。对应补充如下：

| 变更文件 | 内容 |
| --- | --- |
| `src/settings.ts` | 新增会话存储键 `TENANT_ID_KEY`（`apex.admin.tenant-id`） |
| `src/utils/auth.ts` | 新增 `getTenantId/setTenantId/removeTenantId`；`clearSession` 一并清理租户记录 |
| `src/api/auth.ts` | `LoginPayload` 新增可选 `tenantId`（仅作租户匹配声明，认证中心链路生效，单体后端忽略） |
| `src/types/index.ts` | `LoginResult`、`UserIdentity` 新增可选 `tenantId` |
| `src/stores/user.ts` | 登录时透传 `tenantId`；登录响应返回 `tenantId` 时写入会话并合并进 identity |
| `src/utils/request.ts` | 请求拦截器在会话存在租户 ID 时附带 `X-Tenant-Id`（值来自登录响应，与令牌签发一致，不会触发 403；未记录时不发送，单体部署零影响） |
| `src/views/login/index.vue` | 登录页新增可选“租户标识”输入框，仅当 `VITE_AUTH_TENANT_ENABLED=true` 时渲染，格式校验与后端一致（`[A-Za-z0-9._-]{1,64}`） |
| `src/views/profile/index.vue` | 新增“我的权限明细”对话框：按权限码首段（模块）分组、支持搜索，用于核对后端 `@RequirePermission` 精确匹配所需的权限码 |
| `src/env.d.ts` / `.env.example` | 声明并说明 `VITE_AUTH_TENANT_ENABLED` |

## 3. 部署配置说明

### 3.1 单体部署（现状，默认）

- 不设置 `VITE_AUTH_TENANT_ENABLED`（或设为 `false`）。
- 登录页无租户输入框；登录响应不含 `tenantId`；请求头不携带 `X-Tenant-Id`。
- 行为与改造前完全一致。

### 3.2 多租户部署（认证中心链路）

1. 设置 `VITE_AUTH_TENANT_ENABLED=true` 并重新构建。
2. 登录页出现“租户标识”输入框；留空时后端使用 `default` 租户，填写时仅作匹配校验（与用户归属租户不一致将返回 403“租户不匹配”）。
3. 登录响应返回 `tenantId` 后，前端将其记录到会话，并在后续请求中附带 `X-Tenant-Id` 请求头（可用于网关按租户灰度等场景；网关仍以令牌为准重建该头）。

### 3.3 当前边界

- 平台租户管理已提供：前端 `views/system/tenant/` 对接 `/api/v2/platform/tenants`，支持分页、详情、创建、生命周期和配额管理。
- 前端不提供业务侧租户切换界面。当前登录态绑定单一租户，租户管理端点面向具备平台运维权限的管理人员，不用于让普通业务用户枚举或切换租户。

## 4. 后续触发点（重新评审条件）

出现以下任一情况时需重新评审本方案：

1. ~~后端为 `TenantApplicationService` 装配 HTTP Router~~ → 已于 2026-10-30 交付 `/api/v2/platform/tenants`，租户管理页已落地（见 §2.1）。
2. 统一权限认证计划进入实施（登录切换到 `/auth/v1/login`、令牌改由认证中心签发），需核对 `accountId`/`clientType` 等新增字段。
3. 权限码格式或 `/api/v1/auth/permissions/my` 返回结构变化（影响 `stores/permission` 与 `v-permission`）。
4. `apex.features.auth-center-permission` 默认开启或授权缓存 TTL 上限调整（影响权限变更生效时延，可提示用户重新登录）。
5. 租户端点扩展为支持业务侧租户切换（届时评估切换器与租户上下文刷新）。
