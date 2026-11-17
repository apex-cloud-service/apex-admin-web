# 2026-11-17 前后端真实联调与契约修复记录（FE-026 / BE-036）

## 1. 范围

本记录覆盖 2026-11-16 晚至 2026-11-17 的前后端真实联调：环境恢复、后端契约缺陷修复、前端契约适配与页面回归。任务卡 FE-026（前端）与 BE-036（后端）由用户于 2026-11-17 授权 ZCode 补登记为本项主控；方案为同日补记（`docs/specs/2026-11-17-integration-contract-repair.md`），**不表示事前评审**。

## 2. 环境口径（继续 podman-compose）

- 基础设施沿用 `podman-compose.infra.yml` 起的 MySQL/Redis/Nacos 容器与本地 Meilisearch；`/tmp` 被系统清理后重建 `/tmp/apex-dev`（密钥、TLS 自签证书与 nginx TLS 终结器 `apex-dev-auth-tls`）。
- 后端用已构建 JAR + `SPRING_PROFILES_ACTIVE=dev` 本地启动；网关路由因本地未注册 Nacos 全部改直连。
- 已发现的本地环境坑：`zellij web` 占用 IPv4 8082，system 走 IPv6 回环；网关访问日志用独立 `GATEWAY_DB_PASSWORD`；网关熔断 TimeLimiter 默认 1s 需放宽；`clean` 构建会删运行中 JAR 导致类加载失败，需重启。

## 3. 修复清单

### 后端（BE-036，未提交）

| 文件 | 修复 |
| --- | --- |
| `apex-office/.../ApprovalProcessRepositoryImpl.java` | 新增 `withTenantScoped`：租户从 Reactor Context 解析并在 JDBC callable 内安装/恢复；显式租户须一致；`findById` 增租户限定；无租户 fail-closed |
| `apex-system/.../MenuService.java` | 空 `menuIds` 按既有契约表示「该维度全量」，修复菜单树为空；受限父链与 denied 不变 |
| `apex-{office,integration,workflow,knowledge}-service` 权限客户端 | `Snapshot` 加 `ignoreUnknown`，容忍认证中心新增 `roles` 等字段（严格反序列化曾导致全域 403） |

### 前端（FE-026，未提交）

| 文件 | 修复 |
| --- | --- |
| `src/api/office-approval.ts` | pending/initiated 裸数组适配；只上送 `approverId`/`initiatorId`；平台/状态筛选 + 客户端真分页；新增 `listMyInitiatedApprovals` |
| `src/api/office-calendar.ts` | 改调真实 `/range`；空格转 `T`、带时区时间换算本地墙钟；默认当前月；客户端筛选分页；平台归一 |
| `src/views/office/calendar/index.vue` | 状态映射对齐 `CONFIRMED/TENTATIVE/CANCELLED` |
| `src/views/office/approval/index.vue` | 已办区块从「我发起的」全量派生 |
| `src/views/system/user/index.vue` | 状态映射修正为 1=正常、0=禁用 |

## 4. 验证证据（实测）

- 前端：`npx vue-tsc --noEmit` 退出 0；`npx vitest run` 68 文件 / 533 用例全绿；`npm run build` 成功（31.64s）。
- 后端（固定 JDK 21.0.13.0+9-tem + mvnd）：
  - `:apex-system -am test` BUILD SUCCESS；
  - `:apex-office -am test` 189 用例 0 失败 BUILD SUCCESS；
  - `:apex-office-service,:apex-workflow-service,:apex-integration-service,:apex-knowledge-service -am test` BUILD SUCCESS，无失败用例。
- 真实链路：网关 `GET /api/office/calendar/events/range` 200；浏览器 `/office/calendar` 渲染真实数据（2 条，平台「飞书」、状态「已确认」）、`/office/approval` 显示 `共 0 条` 无 `undefined`；`/system/user` 状态显示「正常」。
- 测试数据：为验证有数据渲染曾插入 2 条本地日历记录，验证后已删除（`platform_event_id` 前缀 `itest-20261117-`，剩余 0）。

## 5. 未验证边界

- 日历/审批的**写操作**（创建、更新、删除、同意、撤销）与外部办公平台投递未做真实端到端验证。
- 审批仓储的真实 MySQL 租户行锁语义、并发写冲突未覆盖；仅单测 + H2 级验证。
- 真实对端数据为空（审批、工作流实例等），列表「有数据」路径仅在日历用测试数据验证。
- 网关熔断在本地高负载下仍需 15s 放宽配置，生产超时策略未复核。
- 浏览器登录态 2 小时 TTL 会周期性失效，联调需重新登录；未调整产品配置。

## 6. 回滚

全部改动均在工作区未提交；如需回退按文件 `git checkout --` 单文件恢复。本地数据库的授权/套餐等修补仅限本机联调环境，不是生产迁移。

## 7. 追加（2026-11-17 第二轮：写操作联调）

补做写路径真实联调后，新增修复与发现如下。

### 7.1 已修复（前端）

| 问题 | 证据 | 修复 |
| --- | --- | --- |
| 日历创建缺后端必填字段 | 真实 `POST /api/office/calendar/events` 返回 `事件类型不能为空, 组织者姓名不能为空, 组织者ID不能为空`（HTTP 400） | `CreateEventRequest` 补 `eventType`/`organizerId`/`organizerName`；日历页新增事件类型下拉，组织者取当前登录用户 |
| 日历写路径平台大小写不匹配 | 传 `FEISHU` 返回 `不支持的办公平台: FEISHU`；后端按 `<platform>CalendarClient` Bean 名（小写）查找 | 写请求统一 `toLowerCase()` 转换平台标识 |

### 7.2 新发现的外部/既有缺陷（未修复，超出本任务范围）

| 缺陷 | 证据 | 归属 |
| --- | --- | --- |
| 日历写操作不可用（已修复，见 §9） | `OfficeCalendarService.createEvent` 首行调用 `getCalendarClient(platform)`，但此前仓库内 `feishu/dingtalk/wecom` 下只有 `*ApprovalClient`，**没有任何 `*CalendarClient` 实现**，创建/更新/删除恒返回「不支持的办公平台」 | 已由后端 BE-037 补齐三平台客户端（`1731b622`）；仍受端口签名限制，详见 §9 |
| 审批发起依赖真实办公平台应用 | `POST /api/office/approvals` 返回 `飞书 appId未配置`；`office_platform_app` 表为空，发起需真实飞书应用凭据与外部 API | 外部依赖，需部署环境提供 |
| 审批列表关键字段恒为 null | 插入合法数据后 `GET /api/office/approvals/pending` 返回 `processName/currentNode/createdAt` 均为 null，而库中 `process_name/current_node/created_at` 有值。根因：领域实体 `ApprovalProcess` 只有 `title`/`initiateTime`/`createTime`，PO 与响应 DTO 用 `processName`/`currentNode`/`createdAt`，MapStruct 静默丢字段 | 后端既有缺陷，影响审批页标题/节点/时间展示 |

### 7.3 已真实验证

- 审批租户隔离：插入租户 1 与租户 2 各一条审批后，以租户 1 身份调用 `pending?approverId=1001` 仅返回租户 1 记录；查询租户 2 的 `processInstanceId` 返回「审批流程不存在」。说明 BE-036 修复的租户上下文传播在生产路径生效。
- 验证用测试数据已全部清理（`itest-` 前缀记录数 0）。

## 8. 最终回归（2026-11-17 全量真实链路）

环境完全重建后（容器 + 9 个后端服务 + 网关 + Vite），经网关跑 18 条真实接口，结果 **18/18 通过**：

user-info、menus、overview、calendar-range、approval-pending、approval-initiated、kb-spaces、connectors、iot-devices、masking、tenants、capabilities、operations、wf-instances、notifications、messages、sessions、permissions 全部 200。

补充确认：
- 时区转换独立校验：`2026-11-17 09:30:00`、`T09:30`、`T09:30:00`、`01:30:00.000Z`、`09:30:00+08:00` 五种输入均正确产出无时区本地时间（`01:30Z` 与 `09:30+08` 都换算为 `09:30`）。
- 客户端分页独立校验：4 条数据 / size=2 时第 1 页 hasNext=true、第 2 页 false、第 3 页越界返回空且 hasNext=false、空列表 total=0。
- 租户作用域 `withTenantScoped` 经复核：`callWithTenant` 在 `finally` 恢复，`fromCallable` 异常路径同样经过，无租户在触达 mapper 前拒绝。

### 环境搭建注意事项（避免重复踩坑）

- 构建会覆盖运行中服务的 JAR：`mvnd package` 后会触发 `NoClassDefFoundError`，必须重启对应服务（网关最敏感）。
- 同一用户登录会顶替旧会话，导致服务注入的 reader token 失效返回 403；改完配置后需用当前 token 重启对应服务。
- Redis 密钥轮换在每日 02:00，跨该时点后旧 token 验签失败属预期。

## 9. 后续修复（BE-037：三平台日历客户端）

§7.2 记的「日历写操作不可用」已由后端补齐，前端无需改动。

- 新增 `feishuCalendarClient` / `dingtalkCalendarClient` / `wecomCalendarClient`，Bean 名与 `getCalendarClient` 查找口径一致。
- 真实网关验证：`POST /api/office/calendar/events` 传 `platform=feishu|dingtalk|wecom` 分别返回「飞书 appId未配置 / 钉钉 appKey未配置 / 企业微信 corpid未配置」，**不再返回「不支持的办公平台」**，说明客户端已正确路由、凭据校验链已生效。
- 仍存在的限制（后端端口签名所致，非本节修复范围）：
  - 飞书/钉钉事件以组织者**主日历**为父资源，`organizerId` 需传平台侧用户标识（open_id/unionId），而非系统用户 ID；
  - `getEventDetail`/`updateEvent` 只接收 `platformEventId`，无法定位父日历，后端显式拒绝；
  - 会议室可用性查询三平台均未实现。
- 真实创建闭环仍需平台凭据（appId/appKey/corpid + 对应密钥环境变量），本地未提供，故未做端到端创建验证。
