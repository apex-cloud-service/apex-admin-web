# 全仓文档/脚本/配置目录重组 + 图表全量重制 + 代码对照评审（FE-033 计划）

| 项 | 值 |
| --- | --- |
| 任务号 | FE-033 |
| 计划日期 | 2026-11-28 |
| 执行基线 | `dev` `d4db4d1` |
| 状态 | 已批准，执行中 |
| 执行记录 | [2026-11-28-docs-reorg-and-diagram-rebuild](../records/2026-11-28-docs-reorg-and-diagram-rebuild.md) |

> 本文件原为 AI 工具会话计划缓存（私有目录），按治理规范 §0.3「计划正文须进 `docs/plans/`」迁入；正文保留批准时原文。

## Context

你要求：按开发规范、交付要求、文档管理要求，调整所有文档/脚本/配置的保存目录；并按代码实现评审全部文档、脚本、配置、架构图、UML图、数据流程图、时序图，把与实现不一致的内容改为以代码为准；同时增强所有图表。硬约束是**业务功能零影响**。

现状盘点结论（已实测）：

**已合规**：`docs/` 13 个一级目录全部有 README；`docs/diagrams/` 27 对 `.mmd`+`.svg` 完整；根目录仅 5 个门面 md；`.gitignore` 无忽略 `docs` 规则；`src/` 对 `docs/`、`scripts/` **零引用**（重组不影响应用）。

**确认的漂移（代表性）**：
| 位置 | 与实现不符 |
| --- | --- |
| `AGENTS.md:166` | 写 `Dockerfile`、`docker/nginx.conf`，实际为 `Containerfile`、`container/nginx.conf` |
| `AGENTS.md` §9 | 写「66 文件/486 用例、E2E 3 文件」，实测 68 文件（31 test + 37 spec）、E2E **6** spec |
| `README.md:189` | 写 `POST /api/v1/auth/login`，实现为 `POST /auth/v1/login` |
| `docs/specs/project-governance.md:130` | 「本仓现状：`docs/` 无独立 SVG/MMD」——与 27 对实际矛盾 |
| `docs/reference/ai-knowledge/04-change-memory.md:32` | 图表基线 `.mmd 0 / .svg 0` |
| `docs/README.md` §项目结构/§文档分类 | 停在 2026-11-13，缺 tasks/specs/plans/records/reviews/notes/diagrams 七目录 |
| `docs/reference/README.md` §索引 | 表格缺表头分隔行，markdown 渲染破损 |
| `docs/features/`、`docs/guides/` 的 README 索引 | 内容列全为 `—` 占位 |
| `docs/notes/` 3 篇 | 实为记录/评审，错位于 notes |
| `scripts/` 7 个子目录 | 无 README；`scripts/README.md` 总索引缺失 |

**图表缺口**（无图域）：分片上传、KB SSE 问答、站内信 WS、工作流发起/待办办理、租户套餐与能力运营、通知中心 SSE 流；`AGENTS.md:303` 登录时序缺 MFA 分支。

---

## 决策与冲突处理

1. **不重命名 docs 的 13 个一级目录**。原因：目录名被 `verify-docs.sh`、`check-doc-layout.sh`(EXPECTED 白名单)、`check-diagram-assets.sh`、`ci.yml` 硬编码；重命名需同步改 4 个治理脚本 + CI，收益为零、断链风险最大。改做**目录内全量归位**（错分类文件搬迁 + 命名纠正 + 索引重建），这是「重组」的实质内容。
2. **图表「全面重制」与原 §3.5「禁止覆盖重绘」冲突** → 按规范 §4.7「规则冲突须向主控提交规则修订建议」，先升版规范 `project-governance.md` v1.3，把 §3.2 改为「允许受控归位（逐文件登记、引用全量更新、断链归零）」，§3.5 改为「允许重制：旧文件整体移入 `docs/diagrams/_legacy/` 保留，新版同名重生成」。**既不删历史，也满足重制要求。**
3. **scripts/ 移动必须同步的硬引用**（已定位）：`package.json:15,17,18,19,20`、`.github/workflows/ci.yml`(7 处)、`.githooks/pre-commit`(3 处)、`.githooks/commit-msg`、`scripts/integration/*` 内部互引、`scripts/governance/__tests__/governance-selftest.sh`。

---

## 执行批次（顺序执行，每批后过验证门）

### 批次 0 · 基线与保护
- 记录 `git rev-parse HEAD`、备份工作区；`mmdc` 可用性确认（已确认全局可用）。
- 建任务卡：`docs/tasks/project-tasks.md` 增 FE-033（本次治理任务），`docs/records/` 建本次执行记录骨架。

### 批次 1 · 治理规范升版 v1.3
- 改 `docs/specs/project-governance.md`：§3.2 受控归位、§3.5 图表重制与 `_legacy/` 归档、§3.4 命名补充、§9 执行记录改成「指向最优口径」而非矛盾陈述；同步 `AGENTS.md` 第 0.2 节。
- 修 `check-diagram-assets.sh`：允许 `_legacy/` 子目录（旧件不参与配对校验但仍需 `.mmd`+`.svg` 成对）。
- 修 `check-doc-layout.sh` 的 EXPECTED 若新增目录则同步；`docs/README.md` 总览表登记。

### 批次 2 · docs 全量归位（搬迁 + 引用更新）
搬迁清单（逐条登记到 `docs/records/`）：
- `docs/notes/2026-11-16-chart-assets.md` → `docs/records/`（是执行记录）
- `docs/notes/2026-11-16-doc-dedup-audit.md` → `docs/reviews/`（是审计结论）
- `docs/notes/2026-11-16-orphan-views.md` → `docs/records/`
- `docs/guides/database-config-verification.md` → `docs/features/`（是功能说明非操作指南）
- `docs/guides/frontend-backend-integration.md` → 重命名为 `database-config-integration.md`（内容只讲数据库，现名误导），并在 `docs/README.md` 去掉「历史文件名」注记
- `MEMORY-CARD.md` 保留根位（规范 §5.4 明确其在根，且已入 ROOT_ALLOW 白名单）——不搬，仅补「正文指针」说明
搬迁后：全量 grep 更新所有相对链接 → `check-doc-refs.sh` 必须归 0。

### 批次 3 · docs 逐篇对照代码评审与修正
按域分批读代码后改文档（40 个 `src/api/*.ts`、51 个 `VIEW_REGISTRY` key、`router/index.ts`、`utils/request.ts`、`stores/*`、`vite.config.ts`、`package.json` 为事实基线）：
- `docs/architecture/overview.md`、`auth-and-routing.md`、`domain-and-state-diagrams.md`
- `docs/api/README.md`（579 行，逐端点核对方法/路径/分页口径）
- `docs/features/` 4 篇、`docs/guides/` 7 篇、`docs/reference/` 3 篇
- `AGENTS.md` 附录 A + 第 0 章、`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`
修正范围含上面列出的 9 类漂移，并补：MFA 二步、分片上传、KB SSE、站内信 WS、通知 SSE、租户套餐空集合语义等易失口径。

### 批次 4 · 图表全量重制 + 缺口补齐
- 27 张既有图：原文件整体移入 `docs/diagrams/_legacy/`（`.mmd`+`.svg` 成对保留），按代码重写同名新 `.mmd`，`mmdc` 重导出 `.svg`。
- 新增约 9 张：`chunk-upload-flow`、`knowledge-sse-chat`、`message-websocket`、`workflow-start-and-task`、`tenant-package-capability`、`notification-sse-stream`、`request-authz-layers`（菜单/按钮/接口三层）、`upload-transport-paths`（Axios vs ElementPlus/XHR）、`state-machine-overview`。
- 更新 `docs/diagrams/README.md` 清单（新增 `_legacy/` 说明与重导出命令）。
- `AGENTS.md` / `README.md` 内嵌 mermaid 块：抽取为资产，正文改引 SVG + 留图源链接（README 3 块、AGENTS 14 块）；`AGENTS.md:303` 补 MFA 分支。

### 批次 5 · scripts 与配置规范化
- 新增 `scripts/README.md` 总索引；`build/database/dev/governance/integration/performance/quality/security/verify` 各补 README（用途/入口/被谁调用/退出码）。
- `scripts/database/`：明确标注 `menu-init.sql` 为「前端配置页手动补充，非后端种子」，`archive/` 为历史增量。
- 移动/改名后同步改：`package.json`(5 处)、`ci.yml`(7 处)、`.githooks/pre-commit`+`commit-msg`、`scripts/integration/*` 互引、`scripts/governance/__tests__/governance-selftest.sh`、`scripts/governance/README.md`、`doc-refs-allowlist.txt`。
- 配置核查：`openapitools.json`、`.env.example`/`.env.*`、`components.d.ts`、`Containerfile`、`.containerignore`、`container/*`、`tsconfig*`、`vite/vitest/playwright.config.ts` 逐项确认位置与内容正确，`AGENTS.md:166` 改为 `Containerfile`+`container/nginx.conf`。

### 批次 6 · 索引与记忆同步
- `docs/README.md` 重建「目录总览」与「项目结构」两节，覆盖 13 目录 + scripts 结构 + reports 分层。
- 补全 `docs/features/`、`docs/guides/`、`docs/reference/` README 索引内容列与破损表格。
- `docs/reference/ai-knowledge/`：`01-current-state.md`、`02-conventions-and-pitfalls.md`、`03-contract-map.md`、`04-change-memory.md` 追加本次条目（图表基线从 0 改为 36 对、文档数、脚本结构）；`MEMORY-CARD.md` §2/§3 同步。

---

## 验证（每批结束跑，最终全跑）

```bash
npx vue-tsc --noEmit                    # 类型 0 error
npm run build                           # 生产构建通过
npx vitest run                          # 68 文件全绿
npx playwright test                     # 6 spec 全绿（打桩）
bash scripts/governance/verify-docs.sh --strict
bash scripts/governance/check-doc-refs.sh --strict   # 必须 0 项
bash scripts/governance/check-diagram-assets.sh --strict
bash scripts/governance/check-doc-layout.sh --strict
bash scripts/governance/check-memory-sync.sh
bash scripts/governance/audit-frontend-rules.sh
bash scripts/governance/__tests__/governance-selftest.sh
npm run check:comments
```

功能零影响的判定依据：`git status` 中 `src/`、`index.html`、`vite.config.ts`、`tsconfig*.ts` 零改动（除批次 4 抽取 README/AGENTS 内嵌图不涉及 src）；`npm run build` + 单测 + E2E 全绿。

---

## 风险与回滚

| 风险 | 处置 |
| --- | --- |
| 搬迁造成断链 | 每搬一文件同批改全引用；`check-doc-refs.sh --strict` 为硬门禁 |
| scripts 移动漏改引用 | 已列出全部引用点；`governance-selftest.sh` + CI 配置复跑兜底 |
| 图表重制丢历史 | 旧件整体入 `docs/diagrams/_legacy/`，不删除 |
| 治理规范与你的要求冲突 | 先升版 v1.3 再执行，不静默违规 |
| 一次性改动过大 | 拆 7 批，每批可独立 `git revert`；记录写入 `docs/records/` |

不提交 Git commit（按规范默认），除非你明确要求。