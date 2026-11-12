# 记忆卡 · apex-admin-web（管理后台前端）

> **用法**：接手前端或需要改页面时先读本卡（约 3 分钟），细节按文末指针进入 `AGENTS.md` 与 `docs/`。
> **基线**：2026-11-13 实测（`package.json` + 源码 + `git log`）· 版本 1.2.0 · 工作树干净（`f6ecb49` 已提交）
> **权威优先级**：执行代码与类型定义 > `AGENTS.md`（核对日 2026-11-10）> `docs/` > 本卡。文档与实现冲突时以代码为准并回改文档。

## 1. 一句话

Apex Scaffold 的管理后台（前后端分离独立工程），消费 `apex-scaffold` 的 HTTP 契约。**只做前端**：不改后端契约、不改其他仓库。

## 2. 技术栈与命令

- Vue 3.5 / Vite 6 / TypeScript ~5.7 / Vue Router 4 / Pinia 2 / Element Plus 2（**unplugin-vue-components 深路径按需引入**，11-08 起）/ Axios / ECharts 5（`utils/echarts.ts` 按需注册）/ CropperJS，Node `>=18`。
- 页面统一 `<script setup lang="ts">`；路径别名 `@` → `src/`。

| 命令 | 用途 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 开发服务（默认 `0.0.0.0:5173`，代理目标 `VITE_API_PROXY_TARGET`，缺省 `http://127.0.0.1:8080`） |
| `npx vue-tsc --noEmit` | 类型检查 |
| `npm run build` | 类型检查 + 生产构建（`dist/`） |
| `npx vitest run` | 单次测试（happy-dom，无覆盖率阈值） |

> **没有** `npm run lint`，也没有 typecheck 脚本 —— 不得在汇报里写不存在的命令。Playwright 已装但**无配置、无 E2E 用例**，不能宣称有浏览器端自动化覆盖。

## 3. 工程结构

```text
src/
├── api/          39 个按业务域拆分的类型化接口文件（无统一 index.ts）
├── router/       index.ts 静态路由 + dynamic.ts 菜单转路由 + VIEW_REGISTRY
├── views/        63 个 .vue 页面，14 个业务目录
├── stores/       user / permission / app / office
├── layouts/      AdminLayout（菜单、顶栏、面包屑、未读角标、权限码告警）
├── composables/  useCrud / useTableConfig / useFormDraft / useBreakpoint / useAgenda
├── directives/   permission
├── utils/        request.ts（统一 Axios）、auth.ts（会话）、storage、校验、XSS
├── mock/         仅 DEV 动态加载
└── test/         Vitest 全局准备
```

业务目录：`dashboard` `system` `monitor` `data` `office` `workflow` `integration` `iot` `oauth2` `profile` `public` `login` `demo` `error`。测试文件 **65 个**（2026-11-13 实测 475 用例全绿）：`src/api/` 30 个业务 API 契约（39 个模块全部覆盖），其余 35 个为 `*.spec.ts` 单测（`utils/__tests__` 18、`stores/__tests__` 4、`composables/__tests__` 5、`components/__tests__` 6、`directives`/`router` 各 1）。另有 Playwright E2E 3 文件 6 用例（`npm run test:e2e`，接口层打桩）、Lighthouse（`test:perf`）与 autocannon 压测（`test:stress`）。

## 4. 契约前缀（后端改路径必查这里）

| 前缀 | 承载 |
| --- | --- |
| `/api/v1/**` | 认证、用户、文件、站内信、办公平台接入、开放应用管理 |
| `/api/v2/**` | 租户管理与套餐、能力目录/用量、工作流定义、运维健康、文件分享、会议室与同步向导、统一通知 |
| `/admin-api/v1/**` | 管理接口（角色/权限/菜单、消息模板、组织同步、开放应用 scope 目录） |
| `/integration/v1/**` | 集成中心连接器/凭据与物联网设备/规则（`/internal/v1/**` 为内部端点，网关拒绝外部访问） |
| `/auth/v1/**`、`/auth/v2/**` | 认证中心：MFA 登录二步验证、在线会话管理（`/auth/v1/sessions`）、密码找回（`/auth/v2/password-recovery`） |
| `/api/workflow/**` | 工作流高级操作 |
| `/api/office/**` | 办公业务接口 |
| `/api/mfa/**`、`/api/ip-access-control/**` | 认证中心安全能力 |
| `/oauth2/authorize`、`/oauth2/token`、`/oauth2/consent` | 标准 OAuth2 与授权同意 |

同域部署用相对路径；设了绝对 `VITE_API_BASE_URL` 会绕过本地代理，**不能假定所有请求都过 Nginx**。

## 5. 硬约束

1. 新增菜单驱动页面必须同步 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 与后端菜单 `component` 字段 —— **文件存在 ≠ 路由已注册**。
2. 接口一律走 `src/api/` + `src/utils/request.ts`，页面**不新建 Axios 实例**；Element Plus 上传走 XHR，不经拦截器（401 行为不同属正常）；原生 XHR/SSE 需拼基地址时用 `src/utils/api-base.ts` 的 `apiUrl()`，不要各自拼 `VITE_API_BASE_URL`。
3. 会话读写只用 `src/utils/auth.ts`，不得自造 `access_token` 等存储键。
4. 分页口径**按接口而定**：常规 `page/size` + `list/total`；工作流实例 `pageNum/pageSize` + `records/total`；工作流待办 `pageNum/pageSize` 但响应 `PageResponse` 读 `list/total`；租户分页 `pageNum/pageSize` 且**必填**。不可全局替换。
5. 菜单可见、按钮可见、后端鉴权是三层：前端隐藏**不是**安全边界。
6. `VITE_*` 会进前端产物，**不得**放客户端密钥、数据库口令。

## 6. 高频陷阱

| 现象 | 优先核对 |
| --- | --- |
| 菜单页 404 | 后端 `component`、`VIEW_REGISTRY`、有效 children、动态注册是否成功 |
| 有 URL 但侧边栏无菜单 | `visible=0` / `meta.hidden`，不是路由缺失 |
| 401 后未恢复 | refreshToken、认证端点排除、`authRetried`、刷新结果是否含 `accessToken` |
| 工作流待办空或 404 | 必须是 `/api/v1/workflows/tasks/pending`；办理仅 `complete` + `comment` |
| 站内信收件箱分页异常 | inbox/sent 返回**纯数组**（total 取 length）；接收人须为绑定办公员工的系统用户 ID |
| 站内信无实时推送 | WS 升级（vite `ws: true` / nginx 专用 location）、`office.messages.allowed-origins` 含当前 Origin、`ROUTE_OFFICE_WS_URI` 与 HTTP 路由同实例 |
| 租户页空列表或 400 | `pageNum/pageSize` 必填；生命周期动作只收小写 `disable/enable/freeze/unfreeze/deactivate/archive` |
| 租户配额清空失败 | 后端以 `null` 表示不限，前端须提交 `null` 而非 `0` |
| MFA / IP 页无数据 | `/api/mfa/configs`、`/api/ip-access-control/whitelist\|blacklist` 返回**裸数组**；IP 写操作走 query 参数 |
| 工作流定义编辑无数据 | 写接口返回领域对象（`workflowCode/workflowName/dagJson/enabled:number`），查询返回 DTO（`code/name/enabled:boolean`），字段名不可混用 |
| 办公审批列表空白 / 400 | 列表字段为 `processName/currentNode/createdAt`；路径参数用 `processInstanceId`；`approverId` 不能是空串 |
| 会议室设备为空 | 列表返回 Entity，`equipment` 可能是 JSON 字符串，详情接口才是数组 |
| 密码找回不可用 | 依赖 `/auth/v2/password-recovery/**` 与已绑邮箱/手机号；`sessionRevocation=PENDING` 不等于失败 |
| 组织部门保存后无 ID | createDepartment 响应不含生成 id（需刷新列表）；`deptLevel/deptPath` 后端照抄不计算 |
| 授权同意提交 401 | consent 页是 public 匿名页（方案口径），但同意提交须登录主体——页面已做「未登录先登录后回跳」 |
| 登录报缺 accessToken | 登录响应 `mfaRequired=true` 时不签发令牌，须 `POST /auth/v1/mfa/verify` 二步交换 |
| 套餐保存后菜单缺父级 | `menuIds` 须含父链；`menuIds`/`permissionCodes` 空集合 = 该维度**全量放行**（不是无权限），`features` 空集合 = **未订阅**（全量须显式提交能力目录全部编码） |
| 套餐/能力/集成页 404 | 网关已显式覆盖（dev/prod/Nacos + 契约测试）；仍 404 核验目标环境配置是否滚动 |
| 数据总览无数据 | 页面走 `GET /api/v2/overview`（权限 `system:monitor:view`）；单源 DEGRADED 属正常，勿改调内部端点 |
| IoT 规则 404 / 影子空 | 规则分页与影子查询端点已补（V85/V86 种子）；存量环境需执行迁移；未上报过遥测的设备影子为空属正常 |
| 集成/IoT/在线会话/密码找回页 404 或返回 HTML | 代理须覆盖 `/integration/v1`、`/auth/v1\|v2`（带版本前缀，勿用裸 `/integration` 撞菜单路由）；`/oauth2/consent` 仅 POST 反代 |
| 站内信模板编辑/删除 404 | 网关 office 路由须含 `/admin-api/v1/message-templates/**`（后端已修，环境需滚动新配置） |

## 7. 当前状态（2026-11-13）

- 11-13（四任务整改：文档对齐 + 测试体系 + 图谱 + 注释）：**文档**清理幽灵端点（api/README MFA 5 项、同步向导 2 函数、IP `removeIpRuleByAddress`、`/inbox/cursor` 口径、CHANGELOG TraceQuery）；**测试** 28→**65** 文件 / 221→**475** 用例（39 个 API 模块契约全覆盖 + utils/stores/composables/组件补齐），首建 Playwright E2E（`playwright.config.ts` + `e2e/`，6 条打桩用例，`npm run test:e2e`）、Lighthouse（`test:perf`，静态基线 perf 95）与 autocannon 压测（`test:stress`，devDep 新增 autocannon）；**图谱**新增 `docs/architecture/domain-and-state-diagrams.md`（类图 + 工作流/租户/绑定三状态机 + 我的事项与数据总览时序图）；**注释**补 `useAgenda.ts` 头注等 3 处，`check:comments` 213 文件全绿。报告见 [测试报告（2026-11-13）](docs/archived/project-reports/test-report-2026-11-13.md)。
- 11-12（`595bee8` 数据总览与我的事项）：数据总览登记三源字段中文映射 `FIELD_LABELS` 与字节格式化、聚合失败改区块级失败态可重试、图表改分类统计柱状图；新增 `composables/useAgenda.ts` + `views/dashboard/components/AgendaPanel.vue`（五域并行加载、失败隔离、单域重试），`src/views` 62→**63**；办公控制台绑定统计改走 `/bindings/page` 读真实 total；`docs/` Markdown 41→**44**（聚合评审、优化方案、字段映射方案三篇归档）。
- 11-11（`c75622b` 文档对齐）：以 `696dd00` 代码为基线，对齐全仓 `docs/`、脚本与配置；`docs/` Markdown 38→41（新增 11-10 中台整改调整方案、上线检查清单、评审报告三篇归档）。代码无功能变更。
- 11-10（`696dd00` 中台整改与上线前校验）：**套餐 features 空集合改「未订阅」语义**（全量须显式提交目录全部编码，租户开通套餐必选、去掉手输编码）；**上传组件与通知 SSE 统一经 `api-base.ts#apiUrl` 拼接**（跨域部署正确指向网关）；`showError` 对授权类 403 追加能力运营页引导、AdminLayout 顶栏加「未获得权限码」告警；Nginx 补 20m 请求体上限、产物目录缓存与安全头、consent 仅 POST 反代、SSE/WS 精确匹配；新增 `scripts/verify/post-deploy-check.sh`（C1–C13，`npm run verify:deploy`）。详见 [上线检查清单](docs/archived/project-reports/frontend-middle-platform-go-live-checklist-2026-11-10.md)。
- 11-08（二批）：**通知中心 SSE 接入**（api/notification.ts + utils/notification-stream.ts fetch 流式客户端 + NotificationCenter 面板）；E2E 拉起真实环境验证并修复后端三处 SSE 阻断（Sinks autoCancel、网关 notification-stream 路由、NettyConfig 读超时边界，均 apex-scaffold）；`nginx -t` 容器内通过。SSE 请求必须带 `Accept: text/event-stream`。
- 11-08：前后端路由端点评审落地——修复代理缺口（vite/nginx 补 `/auth/v1|v2`、`/integration/v1`、`/oauth2/consent` POST）与后端网关死角（`/admin-api/v1/message-templates/**`，apex-scaffold）；构建优化：EP 按需引入 + ECharts 按需注册（JS 2988→2236 KB，-25%）、79 处错误提示统一 `showError`。详见 [评审报告](docs/archived/project-reports/frontend-backend-review-2026-11-08.md)。
- 11-07：`d381de0` 修正分片状态查询路径，落地前后端对照评审文档。
- 11-05：办公平台 API 层重构——`office.ts` / `office-new.ts` 拆为 `office-platform.ts`（平台标识+登录回调+应用配置+绑定审批+组织同步）、`office-approval.ts`、`office-calendar.ts`、`office-document.ts`；`OfficePlatform` 与 `PLATFORM_NAMES` 收敛为单一定义。同步全仓注释整改、清理死类型与连续空行。
- 11-03 提交 `d839a04`（29 文件 / +5140）：新增租户套餐、能力运营、开放平台、集成中心、物联网、统一通知、在线会话、OAuth2 授权同意页，并接入 MFA 二步登录。
- 11-02 交付（已在库）：MFA 二步登录、OAuth2 consent 匿名页（public + 登录回跳）、在线会话页、租户套餐页、开放应用页、能力目录与用量页、统一通知页、集成中心（连接器+凭据）、IoT 设备页（影子/遥测/命令下发与历史）与规则页、工作台数据总览。
- 后端同批补齐（apex-scaffold）：网关路由（integration 独立路由 + `/api/v2/**` 逐前缀显式覆盖，dev/prod/Nacos + 契约测试）、`GET /api/v1/open-apps/scopes`、`GET /api/v2/overview`、IoT 规则分页/影子/命令端点、V85 权限种子与 V86/V87 菜单与业务种子。
- 已知能力缺口：**业务侧无租户切换器**（登录态绑定单一租户，仅平台侧有租户台账页）；`office` Store 无调用点；`generator` 历史回滚无前端入口；IoT 影子 desired 写接口后端未实现。

## 8. 指针

| 想知道 | 去哪 |
| --- | --- |
| 开发入口与全部约束 | `AGENTS.md`（§1 约束、§10 排障表） |
| 项目知识库 | `.workbuddy/knowledge/README.md` |
| 后端契约源 | `/Users/work/apex-scaffold` 的 Router/Handler 与 `docs/03-api/API_ROUTES.md` |
| 认证与路由详解 | `docs/architecture/auth-and-routing.md` |
| 接口文档索引 | `docs/api/README.md` |
| 部署与代理 | `docs/guides/deployment.md`、`vite.config.ts`、`docker/nginx.conf` |

## 9. 维护规则

- 结构变化（新增业务目录、契约前缀变更、新增构建/校验脚本）当天更新本卡。
- 与后端契约相关的结论，必须能指到具体 Router 或 `src/api/*.ts`。
- 本卡只留结论与指针，细节写 `AGENTS.md` 与 `docs/`。
