# 项目任务大盘 · apex-admin-web

> **唯一可信源**。仅主控智能体（默认 Trae）可编辑；WorkBuddy / ZCode / Qoder / Codex 只读，完成后回报主控更新状态。
> 优先级：`P0` 线上阻断 · `P1` 当期必做 · `P2` 后续排期 · `P3` 技术债/优化
> 状态：`待规划｜执行中｜待复核｜已完成｜搁置`
> 记录日期：2026-11-16（治理基线建立）

## 1. 活跃任务

| ID | 优先级 | 任务 | 状态 | 负责 | 验收标准 | 关联 |
| --- | --- | --- | --- | --- | --- | --- |

（2026-11-16：本轮 7 张卡 `FE-001`~`FE-007` 已全部完成并移入 §2；新增任务须先立卡再动手。）

## 2. 本期已完成（治理基线）

| ID | 优先级 | 任务 | 状态 | 完成日期 | 产出 |
| --- | --- | --- | --- | --- | --- |
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
| FE-005 | P3 | `any` 收敛：统计业务代码中 `any` 使用点，分批替换为显式类型 | 已完成 | 2026-11-16 | `src/mock/index.ts` 增 `MockRequestOptions`（13 处 `any` 清零）、`src/utils/xss-protection.ts` 3 处改 `unknown`；全仓 `: any` 51 → 29（两批）；`npm run build` 通过 |
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