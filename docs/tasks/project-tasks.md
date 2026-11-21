# 项目任务大盘 · apex-admin-web

> **唯一可信源**。仅主控智能体（默认 Trae）可编辑；WorkBuddy / ZCode / Qoder / Codex 只读，完成后回报主控更新状态。
> 优先级：`P0` 线上阻断 · `P1` 当期必做 · `P2` 后续排期 · `P3` 技术债/优化
> 状态：`待规划｜执行中｜待复核｜已完成｜搁置`
> 记录日期：2026-11-16（治理基线建立）

## 1. 活跃任务

| ID | 优先级 | 任务 | 状态 | 负责 | 验收标准 | 关联 |
| --- | --- | --- | --- | --- | --- | --- |
| FE-029 | P1 | 【P1】联调-全量前后端功能核对与 Podman 联调基线 | 执行中 | R0/执行：Codex（用户 2026-11-18 授权，串行单写者） | R3 方案评审 `integration_plan_review`：最终结论 APPROVE（2026-11-18，确认移除不存在的 integration profile、显式唯一 Compose 入口及拓扑边界）；逐项核对全部 `src/api/` 导出函数与后端路由；Podman Compose 真实验证登录/鉴权/核心读写链路并逐项记录未验证项；修复前端契约问题并关联 BE-043；同步文档、配置、脚本、测试与报告；类型、单测、构建、E2E、治理检查通过；R5 独立复核通过后关闭 | [方案](../specs/2026-11-18-fullstack-integration.md)；FE 基线 `f03bb6883a0f05be9cb4fda836062db55f6e4460`；BE-043；FE-026 历史基线 |

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

## 2. 本期已完成（治理基线）

| ID | 优先级 | 任务 | 状态 | 完成日期 | 产出 |
| --- | --- | --- | --- | --- | --- |
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
| FE-001 | P2 | `docs/reference/ai-knowledge` 与 `docs/api`、`docs/architecture` 去重收敛：同源结论只保留一份，其余改为交叉链接 | 已完成 | 2026-11-16 | `docs/notes/2026-11-16-doc-dedup-audit.md`（段落级/行级复核 0 重复）；`03-contract-map.md` 增 §0 关联文档、`ai-knowledge/README.md` 增权威边界 |
| FE-002 | P2 | 契约映射表核对：`03-contract-map.md` 中的后端端点与 `docs/api/` 逐条对照，补 `page/size` 与 `pageNum/pageSize` 口径标注 | 已完成 | 2026-11-16 | `03-contract-map.md` 增 §2.1 分页口径逐文件对照 + §5 与 `docs/api/README.md` 核对记录（含 1 处按源码更正：办公审批为 `list/total`） |
| FE-003 | P2 | E2E 覆盖扩展：现有 4 个 spec（auth / dynamic-menu / token-refresh）之外，补工作流、租户、办公审批主链路 | 已完成 | 2026-11-16 | 新增 `e2e/workflow.spec.ts`、`tenant.spec.ts`、`office-approval.spec.ts`（helpers 增 MENUS_FULL/MENUS_WITH_TENANT）；并行与串行均 **12 passed**（config 放宽 expect 15s + retries 1） |
| FE-004 | P3 | 孤儿页面盘点：75 个 `.vue` 中未在 `src/router/dynamic.ts#VIEW_REGISTRY` 注册的页面清单化 | 已完成 | 2026-11-16 | `docs/notes/2026-11-16-orphan-views.md`：66 页面中 5 未注册（均为子组件）；未接线页 `PlatformSelector.vue` 已删除（0 引用、git 可恢复） |
| FE-005 | P3 | `any` 收敛：统计业务代码中 `any` 使用点，分批替换为显式类型 | 已完成 | 2026-11-16 | `src/mock/index.ts` 增 `MockRequestOptions`（13 处 `any` 清零）、`src/utils/xss-protection.ts` 3 处改 `unknown`；全仓 `: any` 51 → **0**（三批）；每批 `npm run build` 通过 |
| FE-006 | P3 | AI 私有目录指针桩清理：`docs` 迁移完成后，`.workbuddy/knowledge`、`.zcode/plans` 中的指针文件在无引用时可移除 | 已完成 | 2026-11-16 | 移除私有目录 2 个指针桩（`.workbuddy/knowledge`、`.zcode/plans`）；全仓无指向私有目录的链接 |
| FE-007 | P3 | 文档图表资产体检：确认 `docs/architecture` 中的时序图/状态机图源文件与导出件成对存在 | 已完成 | 2026-11-16 | `docs/notes/2026-11-16-chart-assets.md`：docs 内 0 个 `.mmd`/`.svg`，27 处 Mermaid 内嵌，无孤立资产 |

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
