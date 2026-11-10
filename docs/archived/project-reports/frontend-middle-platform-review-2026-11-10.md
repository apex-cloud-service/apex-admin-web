# 前端「通过中台调用后端」需求评审报告

- 评审日期：2026-11-10
- 评审对象：apex-admin-web（前端仓库，当前工作区）
- 对照基线：apex-scaffold 后端「中台」整改（`docs/08-project-management/reports/middle-platform-architecture-review.md`、`docs/08-project-management/plans/middle-platform-remediation-plan.md`）
- 评审方式：静态代码核对（未执行真实环境联调）

## 0. 评审口径（先对齐定义）

本报告中：

- **中台** = apex-gateway（统一入口）+ 租户套餐/能力门禁（`TenantPackageService#resolveScope`、`PackageScope`、`CapabilityGate`）+ 开放平台（`/open-api/**`）。
- **后端项目** = 网关背后的各领域服务（system/workflow/office/file/integration/auth 等）。
- **「通过中台调用后端」** = 前端所有后端交互都必须满足：
  1. 只访问中台暴露的统一路径（不直连服务端口、不调用内部端点）；
  2. 身份与租户上下文由中台裁决（前端不自行构造可信上下文）；
  3. 受中台「套餐 → 菜单/权限/能力」授权裁剪约束，前端配置面必须能正确表达该语义。

若贵方对「中台」另有定义（例如指某个具体业务中台项目），本报告第 3 节的传输层结论仍然成立，第 4 节的授权语义部分需要按实际口径重新校准。

## 1. 结论

**部分满足，不建议按当前状态直接发布。**

| 维度 | 结论 |
| --- | --- |
| 传输层（是否只经中台调用） | **满足**：唯一 Axios 出口 + 同源反代 + 网关前缀全覆盖；未发现直连服务地址、第二 Axios 实例或 `/internal/v1/**` 调用 |
| 身份/租户上下文 | **满足**：令牌由请求层统一注入，租户头仅回传登录响应中的 `tenantId`，可信上下文由网关重建 |
| 套餐/能力授权语义 | **不满足**：前端仍按旧口径「features 空集合 = 全量订阅」实现与展示，与后端已落地的 fail-closed 语义冲突，会把套餐配置写坏 |
| 租户开通约束 | **不满足**：开通向导允许「套餐留空不裁剪」，而后端对无套餐租户拒绝全部菜单/权限/能力 |
| 长连接与非 Axios 通道 | **部分满足**：SSE 与上传双通道不识别 `VITE_API_BASE_URL`，nginx 缺少流式转发配置 |

问题统计：P1 × 2、P2 × 3、P3 × 2。详见第 4 节，整改方案见 [调整优化方案](./frontend-middle-platform-adjustment-plan-2026-11-10.md)。

## 2. 已满足项与证据

### 2.1 单一请求出口

- 全部业务 API 集中在 `src/api/*.ts`，统一使用 [request.ts](../../../src/utils/request.ts) 的 `request/get/post/put/del`；全仓检索未发现 `axios.create`、第二个 `fetch(`、手写 `http://` 绝对地址（SSE 为唯一例外，见 P2-2）。
- 请求层统一注入 `Authorization: Bearer`，仅在会话记录 `tenantId` 时附带 `X-Tenant-Id`；401 走单飞刷新 + 单次重放，认证端点排除规则完整。

### 2.2 部署链路：前端 → 反代 → 网关

- 生产部署为同源：`dist` 静态资源由 nginx 提供，`/api`、`/admin-api`、`/auth/v1|v2`、`/integration/v1`、OAuth2 相关路径统一反代到单一 upstream `API_PROXY_PASS`（[nginx.conf](../../../docker/nginx.conf#L60-L96)）。前端不持有任何服务级地址。
- 开发态由 vite 代理承担同一职责，`/api` 开启 `ws: true`，同时覆盖站内信 WebSocket。

### 2.3 网关前缀覆盖对照

前端实际调用的前缀与网关路由逐条比对，全部命中（网关 `application.yml` 路由表）：

| 前端调用前缀 | 网关路由 | 结果 |
| --- | --- | --- |
| `/api/v1/**` | system-domain（含通知 SSE 专线） | 覆盖 |
| `/api/v2/operations|platform|tenant-packages|capabilities|capability-usage|overview` | system-domain 显式列举 | 覆盖 |
| `/admin-api/v1/**`（含 workflows/office/org/message-templates/jobs） | system / workflow / office | 覆盖 |
| `/api/v1/workflows/**`、`/api/workflow/**`、`/api/v2/workflow-definitions/**` | workflow-domain | 覆盖 |
| `/api/office/**`、`/api/v1/office/**`（含 organization）、`/api/v2/office/**` | office-domain | 覆盖 |
| `/api/v1/messages/ws` | office-domain WS 专线 | 覆盖 |
| `/api/v1/file(s)/**`、`/api/v1/documents/**`、`/api/v2/file-shares/**` | file-domain | 覆盖 |
| `/auth/v1/**`、`/auth/v2/**`、`/oauth2/**`、`/api/mfa/**`、`/api/ip-access-control/**` | auth-domain | 覆盖 |
| `/integration/v1/**` | integration-domain | 覆盖 |
| `/api/v1/masking/**` | system-domain | 覆盖 |

### 2.4 上下文与内部端点

- 前端未调用任何 `/internal/v1/**` 内部端点（含 `/internal/v1/overview`、`/internal/v1/tenants/{code}/capabilities`）。
- 前端不自行拼装租户上下文，`X-Tenant-Id` 仅作声明，符合「可信上下文由网关重建」的约定。

## 3. 不满足项（问题清单）

### P1-1 套餐「全量能力」空集合语义与后端冲突，会把套餐写成「零能力」

- 后端语义（`apex-system` `TenantPackageService.PackageScope`，`docs` 中记为 G6 整改）：`menuIds`/`permissionCodes` 空集合仍表示对应维度全量，但 **`features` 空集合表示「未订阅任何能力」**；真正的「全量」只由 `PackageScope.full()`（`unbounded=true`）表达，且仅平台默认租户可获得。
- 前端实现仍为旧口径：
  - [tenant-package/index.vue#L117-L120](../../../src/views/system/tenant-package/index.vue#L117-L120)：「全量能力」开关，提示「开启表示订阅全部能力（features 留空）」；
  - [tenant-package/index.vue#L314-L316](../../../src/views/system/tenant-package/index.vue#L314-L316)：`features: allFeatures ? [] : [...]`，全量时提交空数组；
  - [tenant-package/index.vue#L294-L296](../../../src/views/system/tenant-package/index.vue#L294-L296)：回填时 `allFeatures = !row.features.length`。
- 直接后果：运营在页面上把套餐设为「全量能力」并保存后，该套餐租户实际订阅 0 项能力，`/api/v2/capabilities/subscribed` 返回空，开放平台 `/open-api/**` 请求被 `CapabilityGate` 全部拒绝（403「能力未开通」）。
- 破坏面：套餐是所有租户授权的唯一配置面，该缺陷会静默影响线上租户，属于必修项。

### P1-2 开通向导「套餐留空不裁剪」与 fail-closed 冲突，可能开出「无菜单无权限」租户

- 前端：[tenant/index.vue#L96-L112](../../../src/views/system/tenant/index.vue#L96-L112) 套餐字段 placeholder 为「选择套餐（留空不裁剪）」，且 `packageCode` 无必填校验（仅 `tenantCode`/`tenantName` 必填，见 [tenant/index.vue#L223-L232](../../../src/views/system/tenant/index.vue#L223-L232)）。
- 后端：`TenantApplicationService#createTenant` 仅在「同时提供管理员账号」时校验套餐非空；其余路径允许 `packageCode` 为空。而 `TenantPackageService#resolveScope` 对非平台租户的空白套餐一律返回 `deniedScope()`，并记录「租户未绑定套餐，拒绝其全部菜单、权限与能力」。
- 直接后果：新建后该租户用户登录只能看到空菜单（动态路由由菜单生成）、无任何权限码，且页面仍提示「留空不裁剪」，误导运营以为拿到的是全量授权。

### P2-1 语义声明漂移（会持续误导后续开发）

同一旧口径散布在 5 处，仅改实现不改声明会再次回归：

| 位置 | 现有表述 |
| --- | --- |
| [types/index.ts#L1188](../../../src/types/index.ts#L1188) | 「features … 空集合 = 全量订阅」 |
| [api/tenant-package.ts#L10](../../../src/api/tenant-package.ts#L10) | 「menuIds / permissionCodes / features 的空集合语义均为『全量放行』」 |
| [api/capability.ts#L36-L38](../../../src/api/capability.ts#L36-L38) | 「套餐 features 为空表示全量订阅」 |
| [capability/index.vue#L6](../../../src/views/system/capability/index.vue#L6)、[#L47](../../../src/views/system/capability/index.vue#L47) | 「套餐 features 为空表示全量订阅」 |
| [AGENTS.md#L35](../../../AGENTS.md#L35) | 「menuIds/permissionCodes/features 空集合 = 全量放行」 |

### P2-2 通知 SSE 未走统一出口，且 nginx 缺少流式转发配置

- [notification-stream.ts#L95](../../../src/utils/notification-stream.ts#L95) 直接用 `window.location.origin` 拼 `…/api/v1/notifications/stream`，忽略 `VITE_API_BASE_URL`。当 API 与静态站点不同源部署时，SSE 会打到静态站点而 404；其余请求走 Axios baseURL，行为不一致。
- [nginx.conf#L81-L88](../../../docker/nginx.conf#L81-L96) 的 `location /api/` 未关闭 `proxy_buffering`、未延长 `proxy_read_timeout`。后端为 SSE 设了 30s 心跳、网关为该路由配置了免熔断与超时，nginx 这一跳仍使用默认缓冲与 60s 读超时，长连接稳定性依赖心跳恰好落点，属于未闭环环节。
- 对比：WebSocket 已有 `= /api/v1/messages/ws` 专用 location（[nginx.conf#L68-L80](../../../docker/nginx.conf#L68-L80)），SSE 缺同类配置。

### P2-3 上传双通道不识别统一 baseURL

- [FileUpload.vue#L94](../../../src/components/FileUpload.vue#L94) 与 [FileUploadEnhanced.vue#L240](../../../src/components/FileUploadEnhanced.vue#L240) 的 `uploadUrl` 为硬编码相对路径；裁剪/粘贴分支的 XHR 同样走相对路径。
- 同源部署无影响；一旦启用 `VITE_API_BASE_URL` 跨域部署，上传与 SSE 会同时失效，而普通接口正常，排障成本高。

### P3-1 `v-permission` 空权限放行在 fail-closed 下的误导

- [permission.ts](../../../src/directives/permission.ts) 与权限 Store 的既有语义是「权限列表为空时直接放行」。在后端 fail-closed 之后，这种状态通常意味着「该租户未绑定套餐或套餐未授予该权限码」，前端仍渲染全部按钮，用户点击后得到 403。
- 该行为属于既有设计（便于权限中心未启用的环境），本次不擅自变更，列为本报告决策点（见方案文档 D2）。

### P3-2 403 授权类错误缺少专有提示

- 能力门禁与 scope 断言的 403 目前只走通用 `showError`，用户看不到「能力未开通 / scope 不足」的定位与后续动作（去能力运营页查看订阅）。

## 4. 影响评估

| 场景 | 现状 | 影响 |
| --- | --- | --- |
| 运营把套餐设为「全量能力」 | 实际写入「零能力」 | 该套餐下所有租户开放平台调用失败，属静默配置错误 |
| 新建租户不选套餐 | 允许提交，开通后无菜单无权限 | 客户开通即不可用，需人工排障 |
| 生产为同域部署 | 传输链路完整 | 无影响，P2-2/P2-3 为潜在风险 |
| 跨域部署（自定义 `VITE_API_BASE_URL`） | 上传、SSE 断裂 | 功能级不可用 |
| 权限中心/套餐异常 | 前端按钮全显、后端全拒 | 体验差，但具备后端兜底，不构成越权 |

## 5. 未覆盖与待确认

未覆盖：真实环境联调、网关在目标环境的实际路由版本、nginx 长连接实测。以上结论均基于仓库源码静态核对，后端语义以 `apex-scaffold` 当前源码为准。

待确认（详见方案文档「决策点」）：

1. 「全量能力」由前端显式枚举全部能力编码，还是由后端新增显式全量标志；
2. 是否仍允许「仅登记、不绑套餐」的租户；
3. `v-permission` 空集合是否改为 fail-closed；
4. nginx 流式配置与跨域 baseURL 是否纳入本轮整改。

## 6. 参考

- 后端中台评审：[middle-platform-architecture-review.md](../../../../apex-scaffold/docs/08-project-management/reports/middle-platform-architecture-review.md)
- 后端整改计划：[middle-platform-remediation-plan.md](../../../../apex-scaffold/docs/08-project-management/plans/middle-platform-remediation-plan.md)
- 前后端对照（上一轮）：[frontend-backend-review-2026-11-08.md](./frontend-backend-review-2026-11-08.md)
- 项目约束：[AGENTS.md](../../../AGENTS.md)
