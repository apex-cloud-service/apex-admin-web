# 2026-11-16 · 文档治理与任务体系落地记录（apex-admin-web）

## 1. 目标与边界

| 项 | 说明 |
| --- | --- |
| 目标 | 按《项目治理与任务管理规范》改造文档结构、任务体系与自检机制 |
| 硬约束 | ① 不改业务代码，`src/` 零改动 ② 既有文档内容一字不少（含图表）③ 多个 AI 工具目录并存时业务文档统一收口 |
| 允许动作 | 新增/迁移文档、调整链接、新增脚本与钩子、扩展 AGENTS.md |

## 2. 基线取证

| 项 | 值 |
| --- | --- |
| docs 文件数（改造前） | 46（全为 `.md`，无 SVG/MMD） |
| 基线哈希清单 | `baseline/apex-admin-web-docs-baseline.sha256`（46 条） |
| AGENTS.md 原文 | 712 行 / 61703 字节 / `ae5e19db9675ad33556faae36ea7007fa2011fefa7cdb35ee703bccec49db53a` |
| git 状态 | main 分支，动手前 working tree 干净 |

## 3. 执行动作

### 3.1 AGENTS.md 增补（原文零删改）

- 前置新增「第 0 章 项目治理与任务管理规范」（0.1 范围与优先级 / 0.2 文档收口与六目录 / 0.3 多智能体隔离 / 0.4 任务体系 / 0.5 前端编码红线 / 0.6 变更纪律 / 0.7 自检命令）。
- 原文整体下移为「附录 A：原始仓库开发规范（原文完整保留，未删改）」。
- 复核：`tail -n 712 AGENTS.md | shasum -a 256` = `ae5e19db…53a`，与原文件逐字节一致。新文件 793 行。

### 3.2 文档结构收口

- 新建 `docs/{tasks,specs,plans,records,reviews,notes}/` 六标准目录，各配 `README.md`（用途、命名、准入、索引）。
- 新建任务大盘 `docs/tasks/project-tasks.md`：活跃 7 项（FE-001~007）、已完成 4 项（FE-010~013）、风险登记与维护规则。
- `docs/README.md` 尾部追加「🏛 项目治理与任务管理（2026-11-16 增补）」索引区块，原文未动。

### 3.3 私有目录正文迁移（含哈希校验）

| 原位置 | 目标位置 | 数量 | 校验结果 |
| --- | --- | --- | --- |
| `.workbuddy/knowledge/` | `docs/reference/ai-knowledge/` | 4 | 逐文件 SHA-256 全一致 |
| `.zcode/plans/` | `docs/archived/ai-sessions/zcode-plans/` | 6 | 逐文件 SHA-256 全一致 |

- 迁移后仅修 1 处相对链接：`README.md` 中 `../MEMORY-CARD.md` → `../../../MEMORY-CARD.md`。
- 同步回改 `MEMORY-CARD.md` 第 117 行知识库指针为 `docs/reference/ai-knowledge/README.md`。
- 原目录删除正文，留 `MIGRATED.md` 指针（见对应目录）。

### 3.4 治理脚本

| 脚本 | 检查项 | 结果 |
| --- | --- | --- |
| `scripts/governance/verify-docs.sh` | 六目录与索引、任务大盘口径、治理章节、私有目录边界、规模快照、链接可达 | 0 问题通过 |
| `scripts/governance/audit-frontend-rules.sh` | 越权 Axios 实例、绕过 `utils/auth.ts` 的会话键读写、`: any` 规模、`<script setup>` 覆盖 | 无阻断项通过 |
| `.githooks/pre-commit` | 治理范围改动时跑自检 + 图表删除告警 + 大文件提醒，**永不阻断提交** | 自测通过（exit 0） |

- 启用方式：`git config core.hooksPath .githooks`（本地配置，需每人执行一次）。

## 4. 红线扫描实测指标（仅报告，未改代码）

| 指标 | 值 | 处置 |
| --- | --- | --- |
| `axios.create(` 越权实例 | 0 | — |
| 绕过 `auth.ts` 直读直写 `access_token` | 0 | `api/oauth2.ts` 中的 `access_token` 为 OAuth2 协议字段名，非会话键，不计入 |
| `: any` 命中 | 51 处 | 登记 FE-005，分批替换 |
| 未使用 `<script setup>` 的 `.vue` | 0 | — |

## 5. 改造后规模

| 项 | 改造前 | 改造后 |
| --- | --- | --- |
| docs 文件数 | 46 | 65 |
| 其中 `.md` | 46 | 65 |
| SVG / MMD | 0 / 0 | 0 / 0（本仓无图表资产，无需保护） |

## 6. 不影响功能的验证

- `src/` 下 0 个文件被修改（`git status` 中无 `src/` 路径）。
- 未执行 `npm run build`（本轮不改代码，构建结果不受影响）；建议提交前跑一次 `npm run build && npx playwright test` 作为回归确认。
- 配置类改动仅 `.gitignore` 追加忽略块，不影响构建与运行。

## 7. 回滚方案

```bash
# 全部回滚（未提交状态）
cd /Users/work/apex-admin-web
git restore AGENTS.md docs/README.md MEMORY-CARD.md .gitignore
rm -rf docs/tasks docs/specs docs/plans docs/records docs/reviews docs/notes docs/reference docs/archived scripts/governance .githooks
git config --unset core.hooksPath
# 私有目录正文如需恢复，按 baseline 清单核对后从对应 MIGRATED.md 指回的目标目录拷回
```

## 8. 遗留与后续

| 项 | 状态 |
| --- | --- |
| FE-001~007 | 待规划，按 P0→P3 逐项推进 |
| `: any` 51 处 | FE-005 跟踪，按模块分批替换，每批跑 `vue-tsc --noEmit` |
| 多工具目录（qoder/codex 等） | `.gitignore` 已预留，接入后按 0.3 规则直接生效，无需再改文档 |

---

## 9. 二次增补（同日 v1.1：规范正文入仓 + 工具目录/忽略规则条款）

| # | 动作 | 文件 |
| --- | --- | --- |
| 1 | 新建**规范正文**（可独立阅读的完整版） | `docs/specs/project-governance.md`（289 行） |
| 2 | `AGENTS.md` 0.1 增「完整规范正文」指针；0.3 增「工具目录映射表 + `.gitignore` 三条硬规则 + 角色卡」；0.7 增脚本说明与钩子启用方式 | `AGENTS.md`（793 → 810 行，**附录 A 原文哈希仍为 `ae5e19db…53a`**） |
| 3 | 新建脚本说明文档（判据、已知指标、与 pre-commit 关系） | `scripts/governance/README.md` |
| 4 | `docs/README.md` 增「规范正文」区块与脚本说明链接；`docs/specs/README.md` 增规范正文登记表 | 两文件均为**追加**，原内容未动 |
| 5 | `docs/specs/ai-agents/` 五张角色卡已在上一轮落地，本次在规范正文与 AGENTS 0.3 中建立引用 | `docs/specs/ai-agents/` |

### 9.1 新增条款要点（本次补的"缺口"）

1. **多智能体目录映射表**：Trae/WorkBuddy/ZCode/Qoder/Codex/Claude/未来工具 → 私有目录 → 允许/禁止内容，新增工具按表对照即可，无需改规范。
2. **`.gitignore` 三条硬规则**：`docs/` 全量入库（禁止任何忽略 `docs` 的规则）；私有目录整体忽略；忽略项必须带注释说明正文所在。
3. **角色卡与复核**：R1–R5 跨工具复用，复核默认由 R5 承担，不得自审自放。
4. **规范正文与入口索引同源**：`AGENTS.md` 第 0 章为索引，`docs/specs/project-governance.md` 为正文，冲突以 `AGENTS.md` 为准。

### 9.2 二次回归

| 项 | 结果 |
| --- | --- |
| AGENTS.md 附录 A | `tail -n 712` = `ae5e19db9675ad33556faae36ea7007fa2011fefa7cdb35ee703bccec49db53a`，逐字节一致 |
| 原有文档 | 仅 `docs/README.md`、`docs/specs/README.md` 追加内容，零删除 |
| 业务代码 | `src/` 0 改动 |
| 自检 | `verify-docs.sh` 0 问题；`audit-frontend-rules.sh` 无阻断 |

