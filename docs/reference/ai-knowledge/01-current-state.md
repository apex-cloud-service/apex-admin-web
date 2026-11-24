# 01 · 前端现状（2026-11-21）

> 采集：2026-11-21，`package.json` + `src/` 实测 + `git log`。数字会漂移，结论比数字寿命长。

## 1. 技术与规模

| 维度 | 实测值 |
| --- | --- |
| 版本 / 运行时 | `1.2.0`；Node `>=18`（实际还须满足依赖 engines） |
| 主栈 | Vue 3.5 · Vite 6 · TypeScript ~5.7 · Vue Router 4 · Pinia 2 · Element Plus 2 · Axios · ECharts 5 · CropperJS 1 |
| 页面 | `src/views` 下 **65 个 `.vue`**，15 个业务目录（11-16 删除 0 引用遗留页 `office/components/PlatformSelector.vue`；11-18 `62855d2` 删除 0 引用 `workflow/components/TaskActions.vue`） |
| 接口层 | `src/api` **40 个业务文件**（另有 31 个 `*.test.ts` 契约测试），无统一 `index.ts` |
| 状态 | `src/stores` 4 个：`user` / `permission` / `app` / `office` |
| 复用 | `src/composables` 5 个（`useCrud` / `useTableConfig` / `useFormDraft` / `useBreakpoint` / `useAgenda`）+ `src/components`（分页、全局搜索、空态、上传） |
| 测试 | 单元 **66 个**：`src/api/` **31 个** `*.test.ts` 契约测试（40 个 API 模块全覆盖），另有 35 个 `*.spec.ts` 单测（`utils/__tests__` 18、`stores` 4、`composables` 5、`components` 6、`directives`/`router` 各 1）；另 3 个 Playwright E2E 文件（`e2e/`）；Vitest + happy-dom，11-13 实测 475 用例全绿（11-14 未复跑） |
| 文档 | `docs/` 下 **98 个 Markdown**（11-21 全栈联调登记后含 `api/`、`architecture/`、`features/`、`guides/`、`reference/`、`archived/`、`notes/`、`plans/`、`records/`、`reviews/`、`specs/`、`tasks/`、`diagrams/`） |
| 工作树 | 23 项在途（11-21 实测：17 项已跟踪文件修改 + 6 项未跟踪新增文档，含 11-23 前端韧性/契约矩阵方案与记录）；最后提交 2026-11-21 `aec9c44` |

## 2. 启动与验证

```bash
npm install
npm run dev            # 0.0.0.0:5173，代理 VITE_API_PROXY_TARGET（缺省 http://127.0.0.1:8080）
npx vue-tsc --noEmit   # 类型检查
npm run build          # 类型检查 + 生产构建（dist/）
npx vitest run         # 单次测试
```

- **无** `npm run lint`、**无**独立 typecheck 脚本 —— 汇报中不得出现不存在的命令。
- 覆盖率无阈值；Playwright 已装但**无配置、无 E2E 用例**。
- 开发代理覆盖 `/api`、`/admin-api` 与 OAuth2 授权/令牌路径，`/api` 已开 `ws: true`。

## 3. 构建与部署

- Podman 镜像两阶段：Node 22 Alpine 构建（`npm ci`）→ Nginx 运行；前后端容器联调由后端 `podman-compose.yml` 唯一编排。
- 构建期注入 `VITE_*`（`VITE_API_BASE_URL` 会写死进产物，运行期改不了）；运行期 `API_PROXY_PASS` 只影响 Nginx upstream。
- Nginx 有 `/api/v1/messages/ws` 专用 location（转发 Upgrade，读超时 3600s，置于 `/api/` 之前）；`assets` 缓存 30 天 immutable；前端路由回退 `index.html`。
- 前端与网关共享后端 Compose 项目的 `apex-network`，默认 upstream 为 `http://apex-gateway:8080`；首页健康检查只证明静态服务可达，**不证明接口可用**。

## 4. 能力覆盖（可指到代码）

| 业务域 | 源码 | 覆盖情况 |
| --- | --- | --- |
| 登录 / OAuth2 | `api/auth.ts`、`api/oauth2.ts`、`stores/user.ts`、`utils/auth.ts` | 密码登录、验证码、授权码 + PKCE、state 一次性消费、回调上下文 |
| 令牌刷新 | `utils/request.ts` | 401 单飞刷新 + 单次重放，认证端点排除 |
| 权限 | `stores/permission.ts`、`directives/permission.ts` | 空列表放行、多码任一满足、移除 DOM；**不是安全边界** |
| 系统管理 | `api/system.ts`、`api/database.ts` | 用户/角色/菜单/部门/字典/参数/定时任务 + 数据源 |
| 租户 | `api/tenant.ts`、`views/system/tenant/` | 平台侧台账、生命周期、配额（`/api/v2/platform/tenants`） |
| 账号安全 | `api/mfa.ts`、`api/ip-access-control.ts` | MFA 配置、IP 白/黑名单 |
| 工作流 | `api/workflow.ts`、`views/workflow/` | 发起、实例、待办办理、定义管理（`/api/v2/workflow-definitions`） |
| 办公平台 | `api/office*.ts`、`api/meeting-room.ts` | 绑定、组织同步与向导、会议室、审批 |
| 站内信 | `api/message.ts`、`utils/message-socket.ts` | 收件箱/已发送/模板、游标增量、WS 推送、渠道投递记录 |
| 文件与分享 | `api/file.ts`、`api/file-share.ts` | 上传、分享创建/撤销/兑换（匿名 `/share` 页） |
| 生成器 | `api/generator.ts` | 数据源、扫描、预检、预览、异步任务与产物下载 |
| 监控运维 | `api/monitor.ts`、`api/log.ts`、`api/operations.ts` | 日志、在线用户、大盘、健康报告/快照/趋势/导出 |
| 数据与搜索 | `api/document.ts`、`api/chart.ts`、`api/search.ts` | 文档图表 CRUD、顶栏全文搜索与索引重建 |
| 脱敏 | `api/masking.ts` | 规则只读 + 批量试算 |
| 租户套餐 | `api/tenant-package.ts`、`views/system/tenant-package/` | 套餐 CRUD、菜单/能力勾选（`menuIds` 须含父链） |
| 能力运营 | `api/capability.ts`、`views/system/capability/` | 能力目录与租户用量 |
| 开放平台 | `api/open-app.ts`、`views/system/open-app/` | 开放应用、scope 目录（同源注册表） |
| 集成中心 | `api/integration.ts`、`views/integration/connector.vue` | 连接器、租户凭据、出站调用记录 |
| 物联网 | `api/iot.ts`、`views/iot/device.vue`、`device-rule.vue` | 设备台账、影子（desired/reported）、遥测、命令下发、规则分页 |
| 统一通知 | `api/notify.ts`、`views/office/notify/` | 模板、渠道、发送记录 |
| 通知中心（SSE） | `api/notification.ts`、`utils/notification-stream.ts`、`components/NotificationCenter/index.vue` | 收件箱分页、未读数、单条/全部已读；实时流 `GET /api/v1/notifications/stream`（`text/event-stream`，用 `fetch` 带 `Bearer` 头，不用原生 `EventSource`） |
| 在线会话 | `api/session.ts`、`views/monitor/session.vue` | 会话列表、强制下线 |
| 知识库 | `api/knowledge.ts`、`views/knowledge/{space,document,search,chat}` | 空间管理（`/admin-api/v1/kb/spaces`）、文档摄取与手动录入（`/admin-api/v1/kb/documents`、`/manual-documents`）、混合检索（`/api/v1/kb/search`）、RAG 问答会话（`/api/v1/kb/chat/conversations`） |
| 授权同意 | `views/oauth2/consent.vue` | 匿名同意页 + 未登录先登录回跳 |
| MFA 二步 | `api/mfa.ts`、`views/login/index.vue`、`stores/user.ts` | 登录返回 `mfaRequired` 时走 `POST /auth/v1/mfa/verify` 交换令牌 |

## 5. 已知缺口（不要对外宣称已支持）

1. **业务侧无租户切换器**：登录态绑定单一租户，前端仅在登录响应含 `tenantId` 时记录并附 `X-Tenant-Id`。
2. `stores/office.ts` 定义平台与绑定状态，**无调用点**。
3. `generator` 历史**回滚无前端入口**。
4. IoT **影子 desired 写接口**后端未实现（页面只读 desired/reported）；开放平台与能力目录页面已于 11-03 补齐。
5. `utils/` 下的缓存、XSS、性能监控工具**不是全局生效**，是否执行要看调用点。
6. Mock 仅 `import.meta.env.DEV` 动态加载，不得当生产数据源。

## 6. 近期交付（2026-11-19）

- 11-18（注释评审 + 死代码清理 + 复核收口）：`38e23fc` 全仓注释质量评审整改（仅注释行，零逻辑变更）；`62855d2` 删除 0 引用页 `views/workflow/components/TaskActions.vue`，`src/views` 66→**65**（业务目录仍 15、`src/api` 仍 40、`*.test.ts` 仍 31）；`c611f56`～`93bd38f` 登记 FE-026/027/028 复核要点并置「已完成」，新增 `docs/reviews/2026-11-18-fe026-028-review.md`、`docs/records/2026-11-18-comment-quality-audit.md`，`docs/` Markdown 93→**95**。

- 11-17（联调契约修复）：`8ab7d22` 登记 FE-026 联调任务/方案/记录与契约口径，`docs/` Markdown 91→**93**（`docs/specs/`、`docs/records/` 各 1 篇 `2026-11-17-integration-contract-repair.md`）；`331158d` 按真实后端契约对齐办公审批/日历与用户状态（`api/office-approval.ts`、`api/office-calendar.ts` 及对应 `*.test.ts`、`views/office/{approval,calendar}`、`views/system/user`），`src/views`、`src/api`、`*.test.ts` 计数未变。
- 11-16（治理批次 + 目录规范化）：`856e370` 测试报告分层 + `docs/` 目录总览 + 结构自检脚本，`docs/` Markdown 46→**91**（新增 `notes/`、`plans/`、`records/`、`reviews/`、`specs/`、`tasks/` 等治理目录）；`548d1c2` 删除 0 引用遗留页 `views/office/components/PlatformSelector.vue`，`src/views` 67→**66**（业务目录仍 15）；同批 `7d46a81`/`02421f4`/`16af104` 收敛 TypeScript `any` 至 0，`0bdcf6e` 补工作流/租户/办公审批三条 E2E 主链路用例，`fc544e1` 27 张 Mermaid 落地为 `.mmd` + 同名 `.svg`。

- 11-14：`1efc3cf` 知识库前端——新增 `api/knowledge.ts`（238 行，空间/文档/检索/问答四组）、`views/knowledge/` 四页、`types/index.ts` 88 行类型、`router/dynamic.ts` 4 条路由注册；`src/views` 63→67、`src/api` 39→40、`*.test.ts` 30→31，业务目录 14→15。`b67a152` 补 11-13 会话备注（`docs/` 44→46 的计数与用途说明）。
- 11-12：`595bee8` 数据总览与我的事项——概览卡 `FIELD_LABELS` 三源字段中文映射（未登记 key 回退原名）+ 字节格式化，聚合失败改区块级失败态可重试，图表改分类统计柱状图；新增 `composables/useAgenda.ts`（五域并行加载、失败隔离、单域重试）与 `views/dashboard/components/AgendaPanel.vue`（`src/views` 62→63）；办公控制台绑定统计改走 `/bindings/page` 读真实 total；`docs/` Markdown 41→44（聚合评审、优化方案、字段映射方案三篇归档）。
- 11-11：`c75622b` 以 `696dd00` 代码为基线对齐全仓文档、脚本与配置（`docs/` Markdown 38→41，新增 11-10 中台整改三篇归档：调整方案、上线检查清单、评审报告）；`696dd00` 落地套餐语义、统一出口与验证脚本。
- 11-08：`c1d5ae7` 接入通知中心 SSE（`api/notification.ts` + `utils/notification-stream.ts` + `components/NotificationCenter/`）并完成后端路由缺口修复与构建优化；`src/api` 接口文件 38→39、测试 22→24、`docs/` Markdown 37→38。
- 11-07：`d381de0` 修正分片状态查询路径并落地前后端对照评审文档（`docs/` 新增评审记录，Markdown 总数 36→37）。
- 11-05：`a1d46eb` 办公平台 API 层按业务域拆分——`office.ts` / `office-new.ts` 拆为 `office-platform.ts`（平台标识+登录回调+应用配置+绑定审批+组织同步）、`office-approval.ts`、`office-calendar.ts`、`office-document.ts`，并做全仓注释整改；`2602e7f` 补齐前端测试（新增 `office-platform.test.ts` 等契约用例，`*.spec.ts` 覆盖组件/组合式函数/指令/路由/Store/工具），`7abb1ec` 将测试机器可读结果纳入版本管理。
- `d839a04`（29 文件 / +5140）：租户套餐、能力运营、开放平台、集成中心、IoT 设备与规则、统一通知、在线会话、OAuth2 consent 页，登录页接入 MFA 二步。
- 新增 `src/api` 模块：`tenant-package` / `capability` / `open-app` / `integration` / `iot` / `notify` / `session`，并补 `platform.test.ts` 契约用例。
- 11-02 已交付：MFA 二步、consent 匿名页、租户套餐页、开放应用页、能力目录、统一通知、集成中心、IoT 页面、工作台数据总览。

## 7. 待跟进

- 业务侧租户切换器（登录态目前绑定单一租户）。
- IoT 影子 desired 写入依赖后端接口；`office` Store 仍无调用点。
- 补齐 `/api/v2`、`/integration/v1` 新端点封装时同步 `03-contract-map.md`。
