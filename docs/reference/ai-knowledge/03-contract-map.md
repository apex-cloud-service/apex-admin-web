# 03 · 契约地图（前端 ↔ 后端）

> 用途：后端改路径/字段时，10 秒定位该改哪个 `src/api` 文件与哪些页面。
> 采集：2026-11-14。前端可确认的是**调用路径**；目标环境网关是否暴露这些路径需外部核验。

## 0. 关联文档（权威分工）

| 想查什么 | 权威文档 | 本篇定位 |
| --- | --- | --- |
| 逐个接口的路径/方法/参数/响应字段 | [`docs/api/README.md`](../../api/README.md)（35 个业务域小节，含 §1.3 分页口径） | 本篇只做「前端文件 ↔ 后端契约」的**速查映射**，不复制接口清单 |
| 认证链路、领域模型、状态机 | [`docs/architecture/overview.md`](../../architecture/overview.md)、[`auth-and-routing.md`](../../architecture/auth-and-routing.md)、[`domain-and-state-diagrams.md`](../../architecture/domain-and-state-diagrams.md) | 本篇只给入口链接 |
| 结论是否重复 | 见 [`docs/reviews/2026-11-16-doc-dedup-audit.md`](../../reviews/2026-11-16-doc-dedup-audit.md)（2026-11-16 复核：0 重复段落） | — |

## 1. 路径前缀总览

| 前缀 | 承载域 | 备注 |
| --- | --- | --- |
| `/api/v1/**` | 认证、用户、文件、站内信、办公平台接入、知识库空间列表/检索/问答 | 主力业务前缀 |
| `/api/v2/**` | 租户台账、工作流定义、运维健康、文件分享、会议室、同步向导 | 新能力优先落 v2 |
| `/admin-api/v1/**` | 管理接口（角色/权限/菜单、消息模板、组织同步、知识库空间与文档管理） | 与业务接口分离 |
| `/integration/v1/**` | 集成中心连接器/凭据、IoT 设备/规则 | `/internal/v1/**` 为内部端点，网关对外 403 |
| `/auth/v1/**`、`/auth/v2/**` | 认证中心：MFA 二步、在线会话、密码找回 | 带版本前缀，代理勿用裸 `/auth` |
| `/api/workflow/**` | 工作流高级操作 | 不走 v1/v2 体系 |
| `/api/office/**` | 办公业务接口 | 与配置绑定接口分离 |
| `/api/mfa/**`、`/api/ip-access-control/**` | 认证中心安全能力 | 裸数组响应 |
| `/oauth2/authorize`、`/oauth2/token` | 标准 OAuth2 | 保持原协议，不包 `Result` |
| `/auth/v2/password-recovery/**` | 密码找回 | 需已绑邮箱/手机号 |

## 2. 前端文件 ↔ 后端契约

| `src/api/*.ts` | 主要路径 | 关键口径 |
| --- | --- | --- |
| `auth.ts` | `/api/v1/auth/**`、登录/验证码/当前用户 | 登录响应可能含 `tenantId` |
| `auth-config.ts` | 认证管理端配置 | 与浏览器登录回调区分 |
| `sso.ts` | SSO 相关端点 | 与 OAuth2 回调链路分离 |
| `oauth2.ts` | `/oauth2/**`、PKCE/state | state 一次性消费 |
| `password-recovery.ts` | `/auth/v2/password-recovery/**` | `sessionRevocation=PENDING` 非失败 |
| `mfa.ts` | `/api/mfa/configs` | **裸数组** |
| `ip-access-control.ts` | `/api/ip-access-control/whitelist\|blacklist` | 裸数组；写操作走 query |
| `user.ts` | 用户 CRUD、我的角色/权限、导出 | 角色/权限 CRUD 在管理端 |
| `system.ts` | 用户/角色/菜单/部门/字典/参数/定时任务 | Tree 结构单独处理 |
| `database.ts` | 数据库配置与数据源 | — |
| `tenant.ts` | `/api/v2/platform/tenants` | `pageNum/pageSize` 必填；动作小写；配额 `null`=不限；`version` 乐观锁 |
| `workflow.ts` | 实例/统计/待办 + `/api/v2/workflow-definitions` | 待办 `pageNum/pageSize` 读 `list/total`；实例读 `records/total` |
| `office-approval.ts` | `/api/office/approvals/**`（含 `/pending`、`/initiated`、`{processInstanceId}/approve`） | 列表字段 `processName/currentNode/createdAt`；路径参数用 `processInstanceId` |
| `office-platform.ts` | `/admin-api/v1/office/apps`、`/bindings`、`/bindings/page`、`/admin-api/v1/org/**` | `version` 乐观锁；`/bindings/page` 需 `platform` |
| `office-calendar.ts` | `/api/office/calendar/events`（含 `{eventId}`） | — |
| `office-document.ts` | `/api/office/documents`（含 `/my`、`{documentId}`） | — |
| `office-sync-wizard.ts` | 同步向导（预检/预览/执行/重试） | — |
| `meeting-room.ts` | `/api/v2/**` 会议室 | 列表 Entity 的 `equipment` 可能是字符串 |
| `message.ts` | `/api/v1/messages`、`/admin-api/v1/message-templates` | 收件箱裸数组；`/inbox/cursor` 增量；`/{id}/deliveries` 投递记录 |
| `notification.ts` | `/api/v1/notifications/inbox`、`/unread-count`、`/{id}/read`、`/read-all`、`/stream` | 收件箱走 `PageResponse`；`/stream` 为 `text/event-stream`，用 `fetch` 带 `Bearer` 头（原生 `EventSource` 不带 Authorization），`Accept: text/event-stream` 可豁免 30s 全局超时 |
| `file.ts` | 文件接口与上传 | 上传走 XHR，不经拦截器 |
| `file-share.ts` | `/api/v2/files/{fileId}/shares` | 仅所有者可见；token 明文只返回一次；匿名兑换页 `/share` |
| `generator.ts` | 数据源、扫描、生成配置、异步任务 | 历史回滚无前端入口 |
| `monitor.ts` | 大盘、在线用户 | — |
| `log.ts` | 登录/审计/API/运行日志 | — |
| `operations.ts` | `/api/v2/operations/*` | 报告/快照/趋势/租户摘要/导出；未封装根路径与导出任务列表 |
| `document.ts` / `chart.ts` | 文档与图表 CRUD、数据查询 | — |
| `search.ts` | 全文搜索与索引重建 | 后端承接搜索服务 |
| `masking.ts` | `/api/v1/masking/**` | 规则只读（启动配置）+ 批量试算 |
| `knowledge.ts` | `/admin-api/v1/kb/spaces`、`/kb/documents`、`/kb/manual-documents`；`/api/v1/kb/spaces`、`/kb/search`、`/kb/chat/conversations` | 空间列表分页走 `PageResponse`，`/api/v1/kb/spaces` 返回裸数组；检索为 hybrid |

### 2.1 分页口径对照（2026-11-16 逐文件核对）

> 权威定义见 [`docs/api/README.md` §1.3](../../api/README.md)。下表把「三套并存」落到**每个 `src/api` 文件**，改动前后端任一侧时按行核对，不要跨行套用。
> 判定方式：抽取各文件的分页参数声明与响应字段读取（`grep` 结果，不含 `*.test.ts`）。

| `src/api/*.ts` | 请求参数口径 | 响应字段口径 | 风险点 |
| --- | --- | --- | --- |
| `auth-config.ts`、`capability.ts`、`integration.ts`、`iot.ts`、`notify.ts` | `pageNum/pageSize` | `list/total` | 与工作流的 `records/total` 不同，别混用 |
| `database.ts` | `pageNum/pageSize` | `list/total` | — |
| `system.ts` | `pageNum/pageSize` | `list/total` | 树形结构另算，不走分页 |
| `tenant.ts` | `pageNum/pageSize`（**必填**） | `list/total` | 缺参会被后端拒 |
| `meeting-room.ts` | `pageNum/pageSize` | `list/total` | `equipment` 可能是字符串 |
| `message.ts` | `pageNum/pageSize` | `content/list/total` | 收件箱裸数组分支与分页分支并存 |
| `office-approval.ts` | `pageNum/pageSize` | `list/total`（页面读 `result.list`） | 早期文档写的 `records` 与源码不符，**以 `list/total` 为准** |
| `office-calendar.ts` | `pageNum/pageSize` | —（按需读取） | — |
| `workflow.ts` | `pageNum/pageSize` | 实例 `records/total`、待办 `list/total` | **同一文件两种响应字段**，最易错 |
| `notification.ts`、`open-app.ts`、`operations.ts`、`search.ts`、`log.ts`、`user.ts` | `page/size` | `list/total`（`content/items` 亦有） | 与 `pageNum/pageSize` 不可互换 |
| `file-share.ts`、`office-platform.ts` | **双口径并存**：`page/size` 与 `pageNum/pageSize` 均出现 | `list/total`、`content` | 绑定列表「数组与真实分页并存」属历史差异，见 §4 |
| `knowledge.ts` | `page/size` | `content/items/list/total` | 空间列表 `PageResponse` 与裸数组两种返回 |

## 3. 契约变更检查清单

1. 后端路径/方法变了 → 改对应 `src/api/*.ts`，再 grep 调用页面（`views/**`）。
2. 响应结构变了（分页字段、裸数组 / `Result` 包装）→ 同步页面读取逻辑与 `*.test.ts` 断言。
3. 字段名变了（如 `workflowCode` vs `code`）→ 检查 `types/` 与表单绑定，禁止只改一处。
4. 新增菜单页面 → 后端 `component` + `VIEW_REGISTRY` + 权限码 + 权限种子四处同改。
5. 新增 `/api/v2` 端点 → 更新本文件与 `MEMORY-CARD.md` 的契约表。
6. 涉及 WS（站内信）→ 同时核对后端 `ROUTE_OFFICE_WS_URI` 与 `allowed-origins`、nginx/vite 代理。

## 4. 已知不一致（记录在案，不要「顺手修」）

- `operations.ts` 只封装了子路径，根路径与导出任务列表未封装 —— 不能据此判断后端不存在。
- `office-approval.ts` / `office-platform.ts` / `office-calendar.ts` / `office-document.ts` 为 11-05 按业务域拆分的结果（原 `office.ts` / `office-new.ts` 已移除）；绑定查询口径仍是数组与真实分页并存，属历史差异，不是 bug。
- `stores/office.ts` 无调用点；`generator` 历史回滚无入口 —— 属未接线能力。

## 5. 与 `docs/api/README.md` 的核对记录（2026-11-16）

| 核对项 | 方法 | 结果 |
| --- | --- | --- |
| 业务域覆盖 | `docs/api/README.md` 的 `### 2.x` 小节数（35） vs `src/api/*.ts` 非测试文件数（40） | 40 个前端文件全部能在 §2 找到归属小节；差的 5 个是跨域文件（`platform.ts` 复用管理端、`auth.ts` 含登录+验证码、`sso.ts`/`oauth2.ts` 同节说明、`file.ts` 与 `file-share.ts` 同节） |
| 分页口径 | 逐文件抽取参数/响应字段，与 `docs/api/README.md` §1.3 三套口径比对 | **一致**：`/api/v2/workflow-definitions` 与待办用 `pageNum/pageSize`；系统/监控多模块用 `page/size`；数组响应分支在文档中已显式声明 |
| 分页响应字段（复核修正） | 逐页核对页面读取代码（`views/office/approval/index.vue` 读 `result.list`） | 办公审批待办/我发起均为 `list/total`；§2.1 初稿写作 `records`，已按源码更正（此项即为本轮核对的价值点） |
| 端点数 | 抽查 12 条高频端点（登录、当前用户、用户分页、角色、菜单、租户、工作流实例/待办、办公审批 approve、绑定分页、知识库检索、消息收件箱）逐条比对方法+路径 | 12/12 一致 |
| 已知差异 | 见 §4 | 未新增差异；`operations.ts` 根路径、`office` 绑定数组/分页并存仍是原有记录项 |
