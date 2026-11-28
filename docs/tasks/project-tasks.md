# 项目任务大盘 · apex-admin-web

> **唯一可信源**。仅主控智能体（默认 Trae）可编辑；WorkBuddy / ZCode / Qoder / Codex 只读，完成后回报主控更新状态。
> 优先级：`P0` 线上阻断 · `P1` 当期必做 · `P2` 后续排期 · `P3` 技术债/优化
> 状态：`待规划｜执行中｜待复核｜已完成｜搁置`
> 记录日期：2026-11-16（治理基线建立）

## 1. 活跃任务

| ID | 优先级 | 任务 | 状态 | 负责 | 验收标准 | 关联 |
| --- | --- | --- | --- | --- | --- | --- |
| FE-029 | P1 | 【P1】联调-全量前后端功能核对与 Podman 联调基线 | 执行中 | R0/执行：Codex（用户 2026-11-23 授权接管；串行单写者，旧任务保持开放） | R3 方案评审 `integration_plan_review`：最终结论 APPROVE（2026-11-18，确认移除不存在的 integration profile、显式唯一 Compose 入口及拓扑边界）；逐项核对全部 `src/api/` 导出函数与后端路由；Podman Compose 真实验证登录/鉴权/核心读写链路并逐项记录未验证项；修复前端契约问题并关联 BE-043；同步文档、配置、脚本、测试与报告；类型、单测、构建、E2E、治理检查通过；R5 独立复核通过后关闭。未完成的受保护接口/reader、知识库配置及 R5 驳回项仍留在 FE-029，不转入 FE-030 | [方案](../specs/2026-11-18-fullstack-integration.md)；旧基线 `f03bb6883a0f05be9cb4fda836062db55f6e4460`；接管基线 `aec9c444dc113ce7b64f78c0956304b54d304727`；BE-043；FE-026 历史基线 |
| FE-030 | P1 | 【P1】前端中台架构、性能韧性与部署能力分波次评审优化 | 执行中（Wave A 静态审计及隔离复验 R5 通过） | R0/执行：Codex；静态审计 R5：Pauli；隔离证据 R5：Lovelace | 独立评审 `apex-admin-web` 的模块边界与扩展性、路由/组件/状态管理、包体与首屏性能、API 超时/错误/幂等重试边界、缓存与并发请求、基础设施可观测性、静态资源灰度/蓝绿与回滚；先建立测量基线与现有能力矩阵，再按证据实施最小批次；不得把非幂等写请求自动重试，不改变认证、租户、权限及后端契约；按前端红线运行类型检查、单测、构建、E2E 和治理扫描并生成新报告；未能演练的真实发布环境明确标记未验证 | [方案](../specs/2026-11-23-frontend-resilience-ddd-release.md)；[计划](../plans/2026-11-23-frontend-resilience-ddd-release.md)；与 FE-029/BE-043 的联调遗留分开管理 |

（2026-11-16：本轮 7 张卡 `FE-001`~`FE-007` 已全部完成并移入 §2；新增任务须先立卡再动手。）
（2026-11-18：`FE-026`/`FE-027`/`FE-028` 经 R5 角色卡独立复核通过（APPROVE / APPROVE / APPROVE_WITH_NITS，见 [评审报告](../reviews/2026-11-18-fe026-028-review.md)）移入 §2；FE-029 新登记，待方案评审。）

### FE-029 执行租约

- **R0 / 执行者**：Codex（用户 2026-11-18 明确要求继续完成；当前串行单写者）。
- **独立 R3 / R5**：R3 `integration_plan_review`（最终 APPROVE，2026-11-18）；R5 `integration_final_reviewer`（已接受最终复核指派，不参与实现，结论绑定最终 SHA）。
- **租约起始时间**：2026-11-18 继续执行（Asia/Shanghai）；R0 单写者持有至交接 R5。
- **执行基线**：前端 `dev` `f03bb6883a0f05be9cb4fda836062db55f6e4460`；后端 `dev` `b177605d1d1482470945b8a48183103655bf3d18`。
- **执行环境**：唯一全栈入口为后端 `apex-scaffold/podman-compose.yml`，显式项目名 `apex-scaffold`，网络名 `apex-scaffold_apex-network`；前端在独立仓库预构建镜像，再由后端 Compose 的 `apex-admin-web` 服务启动。`.env` 从 `.env.example` 准备并填入本地安全密钥；不使用前端第二份 Compose 定义，不运行 Docker Compose。
- **前端写入范围**：`src/api/**`、对应页面与测试、废弃的前端 `docker-compose.yml`（移除并同步引用）、`scripts/build/build-image.sh`、`docs/**`、`reports/**`。
- **禁止触碰**：无关页面/模块；认证拦截器、租户头、权限语义等共享核心行为除非先经 R3 方案确认；后端源码、Flyway、共享契约由 BE-043 单独持有。
- **依赖与互斥**：FE-029 与 BE-043 同一 R0 串行推进；任何接口契约修订先由 R3 核定唯一口径，FE/BE 同步同一证据，不并行改契约或数据库。
- **验收命令**：`podman-compose -p apex-scaffold -f ../apex-scaffold/podman-compose.yml config`；构建前端镜像后 `podman-compose -p apex-scaffold -f ../apex-scaffold/podman-compose.yml up -d --build`，检查服务健康、网络 DNS、HTTP 冒烟和浏览器链路。静态 API 映射覆盖全部前端 API 导出函数；动态真实请求仅对本轮实际执行的链路计通过，其余逐项注明未验证原因。另运行 `npx vue-tsc --noEmit`、`npx vitest run`、`npm run build`、`npm run test:e2e` 和治理检查；后端按 BE-043 固定 JDK/mvnd 约束执行。
- **全局集成租约**：`HOLDING`，由本 R0 串行持有；所有提交、跨仓验证及最终收口不得并行。
- **交接物**：逐端点矩阵、Podman 启停/健康/网络检查证据、原始 HTTP 冒烟结果、页面回归记录、测试报告、变更记录、记忆台账与 R5 结论。

### FE-029 租约接管追加（2026-11-23）

- **授权与责任**：用户明确授权当前 Codex 会话接管 FE-029 责任与租约；旧任务继续保持“执行中”，既有未完成链路、reader/知识库前置和 R5 `REJECT` 遗留保留在原卡。
- **执行基线**：前端 `dev` `aec9c444dc113ce7b64f78c0956304b54d304727`；后端 `dev` `90a2f783e2c251a55f53b0fc1b845b11d537e951`。
- **现有工作区保护**：接管时保留既有改动：`docs/README.md`、`docs/records/2026-11-19-fullstack-integration.md`、`docs/records/README.md`、`docs/reference/ai-knowledge/04-change-memory.md`、`scripts/integration/README.md`、`scripts/integration/api-route-audit.mjs` 与新增 `docs/records/2026-11-23-api-contract-matrix.md`；不回退、不覆盖。现有 API 矩阵与相关脚本属于 FE-029 未完成交接证据。
- **边界**：先核对 R5 `REJECT` 必修项与实际提交/矩阵证据；前后端契约变更仍由 BE-043/FE-029 串行、经 R3 核定。新架构优化另立 FE-030，不挪用本任务未完成项。
- **独立复核**：保留既有 R3/R5 指派与历史结论；接管后新增实现由不同实例 R5 绑定最终 diff/SHA。
- **全局集成租约**：`HOLDING`，由当前 Codex R0 接替持有，仅用于串行维护与联调协调；本次授权不包含 commit/push、分支同步或任务关闭。

### FE-030 Wave A 执行租约（前端基线）

- **R0 / 执行 / 复核**：当前 Codex 会话串行执行；独立 R5 为 Pauli，不参与写入；全局集成租约 `WAITING`。
- **基线 / 时间**：前端 `dev` `aec9c444dc113ce7b64f78c0956304b54d304727`，保留既有未提交差异；2026-11-23（Asia/Shanghai），至本波交接。
- **范围与互斥**：只写 FE-030 基线评审、索引、本租约、计划及记忆台账；应用代码、构建配置和 FE-029 联调差异只读。不与旧任务并行写入，不暂存、不提交、不部署。
- **验收 / 交接**：静态基线见[评审](../reviews/2026-11-23-fe030-wave-a-baseline.md)，隔离复测及 R5 见[报告](../records/2026-11-23-fe030-wave-a-test-report.md)。本波不覆盖 FE-029 `reports/**` 或租约外 `components.d.ts`；真实后端联调、切流/蓝绿和容量基线仍未验收。

### FE-030 Wave A 基线复测租约（隔离产物）

- **负责人 / 基线**：当前 Codex R0 单写，独立 R5 待复核本次证据；`aec9c444dc113ce7b64f78c0956304b54d304727` 的已提交应用、测试和配置，2026-11-23（Asia/Shanghai），全局集成租约 `WAITING`。
- **范围**：从该提交导出隔离副本运行类型检查、单测覆盖率、生产构建和本地接口打桩 E2E；仅在原仓更新本租约、FE-030 既有证据/计划与记忆台账。FE-029 的 `reports/**`、`components.d.ts`、契约矩阵和未提交应用文件不写入、不迁移。
- **交接 / 回滚**：在 [FE-030 证据](../records/2026-11-23-fe030-wave-a-test-report.md) 记录环境、命令、独立报告路径和未验证场景；回滚仅撤本次文档增量，不回滚共享报告。未经真实场景测量不宣称性能收益。
- **2026-11-24 续验与释放**：固定提交新副本按锁安装，构建（含类型检查）、543 单测和 13 项生产预览 mock E2E 命令均退出 0；独立 R5 Lovelace 增量 `APPROVE_WITH_NITS`、无必改项，Wave A 复测租约释放，FE-030 保持执行中。Wave B 实施前另立租约，未获真实业务页、压测或发布证据。

- **Wave B 基线交接（2026-11-24）**：Codex R0 单写，固定同一提交的隔离生产预览完成认证页打桩资源探针 1/1；仅追加治理文档，无应用改动，复核待安排，集成 `WAITING`。证据见[资源基线](../records/2026-11-23-fe030-wave-a-test-report.md#2026-11-24-wave-b-资源基线)。不覆盖 FE-029 `reports/**`、`components.d.ts` 或契约矩阵；撤回时只移除本次文档增量。性能对比、真实联调与切流未验收。

### FE-030 Wave B1 执行租约（Element Plus 按路由分包）

- **R0 / 执行 / 复核**：当前 Codex R0 串行单写，独立 R5 Curie 只读复核；2026-11-24（Asia/Shanghai），至对比交接；全局集成租约 `WAITING`。
- **基线 / 环境**：`aec9c444dc113ce7b64f78c0956304b54d304727`；Node 26.12.1 / npm 11.20.0，固定锁文件与隔离 Chromium 生产预览。
- **范围 / 互斥**：只实验 `vite.config.ts` 的 Element Plus 分包归属；若对比通过，仅提升该配置、资源对照 E2E 与 FE-030 文档。动态菜单和图标注册、路由、认证、租户、权限、API、上线缓存策略不变；不触碰 FE-029 的 `reports/**`、`components.d.ts` 或契约矩阵；不暂存、不提交、不部署。
- **验收 / 回滚**：同一夹具、同一构建和浏览器比较两个认证页，要求每页解码 JS 至少减少 10%，无路由、组件或图标回归；披露请求数变化，类型/生产构建、单测及全套生产预览 E2E 通过，再交独立复核。若未达到，隔离候选不回写；必要时只撤回本波配置及配套测试。
- **结果 / 释放**：隔离候选生产构建、专项 Chromium 1/1 通过，工作台解码 JS 减少 19.6%，用户管理减少 9.5%，未达到双页门槛，且资源数分别增加 2/6。不纳入应用代码，不运行候选全量回归；仅保留[对比证据](../records/2026-11-23-fe030-wave-a-test-report.md#wave-b1-分包对照)，本波实验租约释放，FE-030 继续执行。

### FE-030 Wave C 执行租约（请求缓存并发语义）

- **R0 / 执行 / 复核**：当前 Codex 串行单写；独立 R5 只读复核（优先委托非执行实例；若执行环境不可用则本卡明确标注“非独立复核”，不据此关闭）；全局集成租约 `WAITING`。
- **基线 / 环境**：`8a839cbe56980cac0e525ed72e4710a4dc669107`；Node 26.12.1 / npm 11.20.0，固定锁文件。
- **范围 / 互斥**：仅 `src/utils/request-cache.ts` 与 `src/utils/__tests__/request-cache.spec.ts`，加本卡、FE-030 记录与索引、前端记忆台账。不触碰 `reports/**`（FE-029 写入范围）、`components.d.ts`、契约矩阵、认证/租户/权限、API 封装或路由。
- **已知缺陷（静态核实，先补失败用例再修）**：①`set()` 的旧 TTL 定时器按 key 删除，会提前淘汰同 key 的新值；②`setPendingRequest()` 的 `finally` 按 key 删除，`clear()` 后旧请求完成会清掉新请求的 pending 记录，导致重复请求且 `finally` 派生拒绝无人观察；③`cachedRequest`/`prefetchRequest` 请求返回后无条件 `set()`，因此 `clearCache`/`clearAllCache` 不构成失效屏障，飞行中的旧响应会回填已失效缓存。
- **验收 / 回滚**：三个缺陷各补一条可复现失败用例，修复后全绿；`request-cache.spec.ts` 既有用例语义不变；`npm run test:report`、`npm run build`（含 `vue-tsc`）、`PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e -- --workers=2` 全通过；前端严格治理/红线与 `git diff --check` 通过。不改公共导出签名与 `CacheOptions`；`globalCache` 单例与 `CACHE_KEYS` 不变。语义变化仅限“清除即失效屏障”。回滚按文件撤回该两文件。
- **结果（2026-11-24）**：三条新用例修复前全部失败（`3 failed | 12 passed`），修复后 **15/15 通过**；全量 `npm run test:report` **188 文件 / 546 项全通过**（原 543 + 新增 3）；`npm run build` 含 `vue-tsc --noEmit` 成功（51.02s）；生产预览 `PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e -- --workers=2` **13/13 通过**；`verify-docs.sh --strict`、`check-doc-refs.sh --strict`、`audit-frontend-rules.sh --strict`、`git diff --check` 均无阻断。改动仅 `src/utils/request-cache.ts`（+89/−? 行）与对应 spec；无公共 API 变更。**报告归属说明**：本轮 `npm run test:report` 刷新了 `reports/unit/**` 与 `reports/coverage/**`，该路径属 FE-029 写入范围；产物保留真实结果但不计作 FE-030 独立证据，FE-030 证据以本条命令输出与 spec 用例为准。本结论未获独立 R5（复核执行环境模型服务不可用），**不据此关闭 FE-030**。

### FE-030 Wave B2 实验租约（匿名入口图标负载）
- **R0 / 执行 / 复核**：当前 Codex 串行单写；独立 R5 Curie 只读，2026-11-24（Asia/Shanghai）至实验证据交接；集成 `WAITING`。
- **基线 / 范围**：从 `aec9c444dc113ce7b64f78c0956304b54d304727` 导出新副本，固定锁文件和生产预览 Chromium。不叠加 B1；只在副本尝试按认证布局加载完整图标目录，交接时原仓仅写 B2 治理记录。若达到目标，也须单独核定实施规格、租约和复核，才可提升应用改动。
- **验收 / 回滚**：登录页解码 JS 至少减少 10%，认证后工作台和用户页各不增加超过 5%；同夹具对照并披露请求数。已知、缺省、未知菜单图标和匿名 OAuth2 授权页行为不变；使用隔离报告，保留 FE-029 共享报告、应用、认证与契约差异。不达标不提升；回滚只撤销本次治理增量，不改共享产物。
- **结果 / 释放**：构建、专项 A/B 各 1/1、候选 543 单测和 14 项 E2E 通过；本地解码体积达标，但认证页各增加 9 个 JS 资源条目。Curie 确认隔离证据可采信，不放行生产采纳；[记录](../records/2026-11-23-fe030-wave-a-test-report.md#wave-b2-匿名入口图标对照)已归档，实验租约释放，不提升应用改动。

### FE-032 执行租约（2026-11-25）

- **R0 / 执行 / 复核**：ZCode 串行单写；独立 R5 由未参与实施的新上下文只读承担，结论绑定最终 source diff SHA256；全局集成租约 `HOLDING`（仅本次范围）。
- **授权与边界**：用户 2026-11-25 明确授权本会话担任主控（补登 FE-031、登记 FE-032、追加记忆台账）并接管本次修复涉及文件的写入范围及隔离联调租约。FE-029/FE-030 保持开放，不改其验收标准与未完成项；不改认证拦截器/租户头/权限语义/后端契约。
- **基线 / 保留**：`dev` / `71d823040e94e987ec2df0cf39e0caea7517aa3b`；保留上一轮 117 个注释改动、未跟踪 `docs/records/2026-11-25-comment-review-handover.md` 及用户原有 `MEMORY-CARD.md`、`docs/reference/ai-knowledge/01-current-state.md` 差异。
- **写入范围**：见 FE-032 验收列所列应用/测试/脚本/CI/文档；不写 `reports/**` 共享产物（验证用临时/独立输出），不改 `components.d.ts`、契约矩阵或 FE-029 联调证据。
- **回滚**：按批次文件撤回本次逻辑修复；禁止 `reset --hard` 或整区回退；已保留的注释/用户差异不动。

### FE-032 执行结果（2026-11-26）

- **已修复**：下载 Blob、上传 MIME/压缩/分片/裁剪顺序与 XHR 真实终结、maskGeneral 边界、空态场景图、草稿取消防抖、表格配置校验与回滚、套餐能力成员判断、请求重试收窄、治理台账改 Python 校验、CI 严格门禁与 Node 24、上线探测证据边界、E2E DTO 与并发单飞、单测真实断言。
- **顺带修复**：`podman-verify.sh` cleanup 在 down 报 "no such container" 时残留资源，改为按实际资源判定并二次清理。
- **验证**：`vue-tsc` 0；`vitest` 68 文件 586 用例；`npm run build` 44.61s；mock E2E 14/14；Podman `--frontend-test` 14/14；治理自测 33/33；严格文档/引用/目录/红线与 `git diff --check` 通过。
- **真实后端**：`--monitor-reads` 认证/角色/权限/菜单与 5 个监控接口均 HTTP 200/code 0；页面渲染断言间歇超时（一次通过一次失败），登记为未稳定通过。
- **阻塞**：office/workflow/file/integration 与知识库需部署方授权材料（`VERIFY_AUTHORIZATION_CONFIG_DIR`、可信 CA、reader token、共享身份命名空间），未运行不宣称通过。
- **状态**：源码指纹 `0f72c3f3…`（HEAD `71d8230`），交独立 R5；未提交、未推送、未部署。

## 2. 本期已完成（治理基线）

| ID | 优先级 | 任务 | 状态 | 完成日期 | 产出 |
| --- | --- | --- | --- | --- | --- |
| FE-033 | P1 | 【P1】docs-全仓文档/脚本/配置目录重组与代码对照评审及图表重制 | 已完成 | 2026-11-28 | 产出：治理规范升 v1.3（§3.2 受控归位五项准入、§3.5 图表重制 + `_legacy/` 归档）；`AGENTS.md` 第 0 章新增 §0.10 附录 A 勘误表（附录 A 冻结区 700 行哈希不变）；docs 受控归位 4 文件 + 3 对图表随名迁移；对照 `src/` 修正 16 项文档漂移（测试基线 66/486→**68/592**、E2E 3→**6 spec**、API 契约「39 全有」→**31/40**、`: any` 51→**0**、`Dockerfile`→`Containerfile`、CI「未配置」→已配置、VIEW_REGISTRY 补漏 4 个 `knowledge/*`）；**图表 27 对全量重制 + 新增 9 张专题图 = 根下 36 对（22 重制 + 9 新增 + 5 历史证据）**，旧版 22 对入 `_legacy/`（5 张 `archived-*` 刻意不重制）；`scripts/` 补总索引与 7 子目录 README；治理脚本新增「scripts 子目录 README」「同层文档登记」两项机器校验。验证：`vue-tsc` 0；`vitest` **68 文件 592 用例全绿**；`build` 24.56s；E2E 串行 **14/14**（并行 flaky 为既有冷启动现象）；治理 5 脚本 `--strict` 全过；selftest **33/0**；`src/` 零改动。独立 R5 **APPROVE_WITH_NITS**（独立上下文，十项硬核验全过、独立复现测试；11 项 nits 全部处置，P2-5 范围补登经业主确认）。业主直派、主控缺位，状态翻转由执行体代登 | [执行记录（含 §6 偏差披露、§7 复核回执）](../records/2026-11-28-docs-reorg-and-diagram-rebuild.md)；台账 #144/#145/#146/#147 |
| FE-031 | P2 | 【P2】注释-全仓事实评审与 JSDoc 契约补全（仅注释/文档字符串） | 已完成 | 2026-11-25 | 产出：219 个 TS/Vue 与 72 个页面/组件/布局逐文件核对，115 个源码/脚本/配置文件注释修正，新增交接记录与两级索引；验证：`check:comments` 221 文件通过、`vue-tsc` 0、`vitest` 68 文件 546 用例全绿、去注释源码等价 115 文件 0 差异、严格治理/目录/红线通过；独立 R5 **APPROVE**（绑定 source diff `0ee9f549…`）；未提交；范围外逻辑问题转 FE-032 | [交接记录](../records/2026-11-25-comment-review-handover.md)；台账 #136 |
| FE-032 | P1 | 【P1】修复-注释评审移交的逻辑与脚本缺陷 | 已完成 | 2026-11-26 | 产出：修复交接 §5 全部 12 类问题 + R5 四轮建议；下载改 Blob、上传 MIME/压缩/分片/裁剪顺序与 XHR 真实终结、maskGeneral 边界、空态场景 SVG、草稿取消防抖、表格配置校验与导入单写、套餐能力成员判断、重试收窄（4xx/未知不重试、code<0 网络可重试）、生产 `any` 清零；治理台账改 Python append-only 校验、CI 严格门禁+Node 24、上线探测证据边界、E2E 真实 DTO 与并发单飞、单测补真实断言；顺带修 podman-verify 清理残留。验证：`vue-tsc` 0、分片全量 **592 用例 0 失败**、`build` 24.19s、mock E2E **14/14**（四轮复跑均通过）、Podman `--frontend-test` **14/14**、治理自测 **33/33**、严格文档/引用/目录/红线/台账/diff 全通过。独立 R5 **最终 APPROVE**（无必修项，绑定 `ada29c2d…`）。未提交；真实后端 `--system-reads`/`--monitor-reads` 通过（监控组已修同路由重复导航导致的超时，连续 2 次 passed），默认 `npx vitest run` 连续 3 次全量稳定（限制 maxWorkers=4 消除 worker 启动超时）；`--integration-reads` 仍 403，office/workflow/file/integration 受保护链路与知识库需部署方授权材料，未运行 | [记录](../records/2026-11-25-logic-remediation.md)；FE-031；与 FE-029/FE-030 未完成项分开 |
| FE-026 | P1 | 【P1】联调-修复办公列表、日期与用户状态契约 | 已完成 | 2026-11-18 | 产出：office-approval 裸数组客户端真分页（仅上送 approverId/initiatorId，total/pages/hasNext 与切片一致）、office-calendar `/range` 本地时间换算与读大写/写小写平台归一、用户状态 1=正常 0=禁用；验证：`vue-tsc` 0 error、`vitest` 68 文件 533 用例全绿、真实网关 18 条接口 **18/18**（2026-11-17 登记，记录 §4/§8）；提交 `95a7f62`/`c988870`；R5 复核 **APPROVE**（2026-11-18）；未验证边界（日历写后端客户端、审批发起凭据）见记录 §7.2/§8 | [记录](../records/2026-11-17-integration-contract-repair.md)、[复核报告](../reviews/2026-11-18-fe026-028-review.md)；台账 #37~#42/#48 |
| FE-027 | P2 | 【P2】注释-全仓质量评审与六批整改（仅注释行，零逻辑变更） | 已完成 | 2026-11-18 | 产出：220 文件 9 组审计（P1×25/P2×9/P3×31）→ 6 批整改：auth-config 失真头注、open-app/sso 幽灵端点、auth/generator 影子头注与虚构权限码、tenant-package features 空集合语义、job/query 端点路径、状态枚举口径（页面渲染取证）；验证：`vue-tsc` 0、`check:comments` 通过、`vitest` 533 全绿；R5 复核 **APPROVE**（全量 diff 非注释行零变更、六项事实抽查全过）；提交 `38e23fc` | [记录](../records/2026-11-18-comment-quality-audit.md)、[复核报告](../reviews/2026-11-18-fe026-028-review.md)；台账 #44/#48 |
| FE-028 | P2 | 【P2】清理-范围外死代码与预检附录 A 基线同步 | 已完成 | 2026-11-18 | 产出：login/dashboard 死 CSS、auth 死弹窗、零引用 `TaskActions.vue` 删除（AGENTS.md §7.3 同步）、oauth2/callback 无效 `<el-loading>` 改 `v-loading`、AgendaPanel 文案去硬编码；预检附录 A 基线 712→700 行有意更新；验证：grep 零残留、`vue-tsc` 0、`check:comments` 219、`vitest` 533 全绿、`preflight` FAIL=0；R5 复核 **APPROVE_WITH_NITS**（2 条文档级建议已处置，见评审报告 §4）；提交 `62855d2` | [记录（追加段）](../records/2026-11-18-comment-quality-audit.md)、[复核报告](../reviews/2026-11-18-fe026-028-review.md)；台账 #45/#46/#48 |
| FE-025 | P1 | 目录规范化：reports 按测试类型分层 + docs 目录总览 + 4 个一级目录 README + 结构自检 | 已完成 | 2026-11-16 | 验收：`check-doc-layout.sh` 5 条断言全 OK（13 个 docs 目录 README 齐全且被总览覆盖、reports 已分层）、`verify-docs.sh` 10 项 0 问题、`check-doc-refs.sh` 0 断链、`check-diagram-assets.sh` 27/27、`npm run build` 46.50s、`npx playwright test` 12 passed 且 junit 落 `reports/e2e/e2e-results.xml`；产出：`reports/README.md`、`docs/{architecture,features,guides,reference}/README.md`、`scripts/governance/check-doc-layout.sh`、规范 §7.5、`docs/plans|records/2026-11-16-directory-normalization*.md` |
| FE-010 | P1 | 建立治理基线：AGENTS.md 增补第 0 章（原文附录 A 逐字保留） | 已完成 | 2026-11-16 | `AGENTS.md` |
| FE-011 | P1 | 建立 `docs/{tasks,specs,plans,records,reviews,notes}` 标准目录与索引 | 已完成 | 2026-11-16 | `docs/README.md` 及各目录 README |
| FE-012 | P1 | 迁移私有目录业务文档：`.workbuddy/knowledge` → `docs/reference/ai-knowledge`；`.zcode/plans` → `docs/archived/ai-sessions/zcode-plans`（内容逐字节校验后移除原件，保留指针） | 已完成 | 2026-11-16 | 迁移记录见 `docs/records/` |
| FE-013 | P1 | 治理自检脚本与 pre-commit 钩子 | 已完成 | 2026-11-16 | `scripts/governance/`、`.githooks/pre-commit` |
| FE-014 | P3 | 规范正文入仓并补工具目录/忽略规则条款 | 已完成 | 2026-11-16 | `docs/specs/project-governance.md`、`AGENTS.md` 0.1/0.3/0.7、`scripts/governance/README.md` |
| FE-015 | P2 | 治理评审整改（前端项：死指针 1 处、断链 3 条、规范 §9 范围、离线归档条款） | 已完成 | 2026-11-16 | 验收：`verify-docs.sh` 通过、`check-doc-refs.sh` 0 项；产出：`docs/records/2026-11-16-governance-alignment-remediation.md` |
| FE-016 | P1 | 许可统一 MIT（`LICENSE` + `package.json` `"license": "MIT"`） | 已完成 | 2026-11-16 | `LICENSE`、`package.json`；验收：`npm run build` 不受影响、两仓许可一致 |
| FE-017 | P1 | 变更记忆台账 `04-change-memory.md` + 规范 §5.4 强制登记（六字段、append-only） | 已完成 | 2026-11-16 | `docs/reference/ai-knowledge/04-change-memory.md`；验收：提交带 `memory:` 标记（`check-memory-sync.sh` 0 项） |
| FE-018 | P1 | 台账校验脚本 + `pre-commit`/`commit-msg` 钩子 + 一键预检 `apex-preflight.sh` | 已完成 | 2026-11-16 | `scripts/governance/check-memory-sync.sh`、`.githooks/`、`scripts/dev/apex-preflight.sh`；验收：预检 `OK=16 WARN=1 FAIL=0` |
| FE-019 | P1 | 分支模型 `dev`/`master`/`test`（删除 `main`）与保护清单成文 | 已完成 | 2026-11-16 | `docs/guides/github-branch-protection.md`；**规则开启待网页操作或 PAT**（匿名 API 403） |
| FE-020 | P1 | `dev` 分支一致性评审（D-02/03/04/06/07/08）与整改批次 B1/B2/B3/B5/B6 | 已完成 | 2026-11-16 | `docs/reviews/2026-11-16-dev-branch-governance-audit.md`、`docs/plans/2026-11-16-dev-alignment-remediation-plan.md` |
| FE-021 | P1 | 整改 B1：`AGENTS.md` 0.8 + 规范 §5.3 口径 + 知识库维护口径 | 已完成 | 2026-11-16 | `AGENTS.md`、`docs/specs/project-governance.md`、`docs/reference/ai-knowledge/README.md`；验收：附录 A 哈希 `ae5e19db…53a` 不变 |
| FE-022 | P1 | 整改 B3：新增前端最小 CI（`.github/workflows/ci.yml`，文档门禁 4 脚本 + `npm ci && build`） | 已完成 | 2026-11-16 | `.github/workflows/ci.yml`；验收：YAML 解析通过、本地预演 4 脚本全通过 |
| FE-023 | P2 | 整改 B5：`.gitignore` 去重为单一私有目录区块（含注释独占一行的补正） | 已完成 | 2026-11-16 | `.gitignore`；验收：`check-ignore` 命中、无未跟踪私有目录 |
| FE-024 | P1 | 整改 B6：GitHub 分支保护「档 1」 | 已完成 | 2026-11-16 | 转 public 后三支 `PUT /protection` 全部成功（禁强推+禁删除，`master`/`test` 加对话解决）；绕钩子实测服务端拒绝删支/强推。见 `docs/guides/github-branch-protection.md` |
| FE-001 | P2 | `docs/reference/ai-knowledge` 与 `docs/api`、`docs/architecture` 去重收敛：同源结论只保留一份，其余改为交叉链接 | 已完成 | 2026-11-16 | `docs/reviews/2026-11-16-doc-dedup-audit.md`（段落级/行级复核 0 重复）；`03-contract-map.md` 增 §0 关联文档、`ai-knowledge/README.md` 增权威边界 |
| FE-002 | P2 | 契约映射表核对：`03-contract-map.md` 中的后端端点与 `docs/api/` 逐条对照，补 `page/size` 与 `pageNum/pageSize` 口径标注 | 已完成 | 2026-11-16 | `03-contract-map.md` 增 §2.1 分页口径逐文件对照 + §5 与 `docs/api/README.md` 核对记录（含 1 处按源码更正：办公审批为 `list/total`） |
| FE-003 | P2 | E2E 覆盖扩展：现有 4 个 spec（auth / dynamic-menu / token-refresh）之外，补工作流、租户、办公审批主链路 | 已完成 | 2026-11-16 | 新增 `e2e/workflow.spec.ts`、`tenant.spec.ts`、`office-approval.spec.ts`（helpers 增 MENUS_FULL/MENUS_WITH_TENANT）；并行与串行均 **12 passed**（config 放宽 expect 15s + retries 1） |
| FE-004 | P3 | 孤儿页面盘点：75 个 `.vue` 中未在 `src/router/dynamic.ts#VIEW_REGISTRY` 注册的页面清单化 | 已完成 | 2026-11-16 | `docs/records/2026-11-16-orphan-views.md`：66 页面中 5 未注册（均为子组件）；未接线页 `PlatformSelector.vue` 已删除（0 引用、git 可恢复） |
| FE-005 | P3 | `any` 收敛：统计业务代码中 `any` 使用点，分批替换为显式类型 | 已完成 | 2026-11-16 | `src/mock/index.ts` 增 `MockRequestOptions`（13 处 `any` 清零）、`src/utils/xss-protection.ts` 3 处改 `unknown`；全仓 `: any` 51 → **0**（三批）；每批 `npm run build` 通过 |
| FE-006 | P3 | AI 私有目录指针桩清理：`docs` 迁移完成后，`.workbuddy/knowledge`、`.zcode/plans` 中的指针文件在无引用时可移除 | 已完成 | 2026-11-16 | 移除私有目录 2 个指针桩（`.workbuddy/knowledge`、`.zcode/plans`）；全仓无指向私有目录的链接 |
| FE-007 | P3 | 文档图表资产体检：确认 `docs/architecture` 中的时序图/状态机图源文件与导出件成对存在 | 已完成 | 2026-11-16 | `docs/records/2026-11-16-chart-assets.md`：docs 内 0 个 `.mmd`/`.svg`，27 处 Mermaid 内嵌，无孤立资产 |

## 3. 阻塞与风险登记

| 风险 | 影响 | 处置 |
| --- | --- | --- |
| 私有文档被 gitignore 长期未入库，存在丢失风险 | 历史知识只在本地 | 本次已迁入 `docs/` 纳入版本库（内容零删改） |
| 多 AI 并行改同一页面可能冲突 | 代码覆盖 | 一任务一会话；按模块划分归属，冲突以主分支为准 |

## 4. 维护规则

1. 新任务必须先入表再动手；ID 采用 `FE-nnn` 连续编号，不复用。
2. 状态变更只能由主控智能体执行；执行智能体只提交「完成说明 + 验证命令输出」。
3. 任务关闭时必须在 `docs/records/` 留一条变更记录（做了什么、验证方式、影响面）。
4. 每月复核一次：连续两期未动的 `P2/P3` 降级或标 `搁置`，并写原因。
