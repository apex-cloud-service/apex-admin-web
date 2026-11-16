# 治理脚本说明（apex-admin-web）

本目录脚本是「项目任务管理规范」的执行工具，**只读扫描、不改代码、默认只警告**。
规范正文见 `docs/specs/project-governance.md`。

## 1. verify-docs.sh — 文档治理自检

```bash
bash scripts/governance/verify-docs.sh            # 警告模式，永远 exit 0
bash scripts/governance/verify-docs.sh --strict   # 有问题 exit 1（可接 CI）
```

检查项：

| # | 检查 | 判据 |
| --- | --- | --- |
| 1 | 六标准目录与索引 | `docs/{tasks,specs,plans,records,reviews,notes}` 及各自 `README.md` 存在 |
| 2 | 任务大盘口径 | `docs/tasks/project-tasks.md` 含 `P0–P3`、`待规划`、`FE-` |
| 3 | 治理规范 | `AGENTS.md` 含第 0 章；`docs/README.md` 含治理索引 |
| 4 | 私有目录边界 | `.workbuddy/knowledge`、`.zcode/plans` 等不得存放 >12 行业务正文（`MIGRATED.md` 除外） |
| 5 | 文档规模快照 | 输出 `docs` 文件数与 md/svg/mmd 数量（本仓无独立图表） |
| 6 | 迁入索引可达 | `docs/reference/ai-knowledge/README.md`、`docs/archived/ai-sessions/zcode-plans/README.md` 存在 |

## 2. audit-frontend-rules.sh — 前端红线扫描

```bash
bash scripts/governance/audit-frontend-rules.sh           # 默认警告
bash scripts/governance/audit-frontend-rules.sh --strict   # 有阻断项 exit 1
```

检查项：

| # | 检查 | 说明 |
| --- | --- | --- |
| 1 | 越权 Axios 实例 | `axios.create(` 仅允许出现在 `src/utils/request.ts` |
| 2 | 会话键绕过 | 只查 `localStorage/sessionStorage.(get|set|remove)Item('access_token')`；OAuth2 协议字段名不计入 |
| 3 | `: any` 规模 | 输出命中数（技术债指标，登记 FE-005） |
| 4 | `<script setup>` 覆盖 | `src` 下 `.vue` 未使用 `script setup` 即命中（`App.vue` 豁免） |
| 5 | 死代码注释抽样 | 前 10 条，人工确认 |

已知指标（2026-11-16）：越权 Axios 0、会话键绕过 0、`: any` 51 处、全部 `.vue` 已用 `script setup`。

## 3. 与 pre-commit 的关系

`.githooks/pre-commit` 在提交涉及 `docs/`、`AGENTS.md`、`scripts/governance/`、`.githooks/` 时自动跑 `verify-docs.sh`，
另做「图表删除告警」与「>5MB 大文件提醒」。**永不阻断提交**。

```bash
git config core.hooksPath .githooks   # 每人执行一次
git config --unset core.hooksPath     # 临时关闭
```

## 4. 约定

1. 脚本不得修改仓库文件；只允许读与打印。
2. 新增检查项必须同步更新本 README 与 `docs/specs/project-governance.md` §8。
3. macOS 自带 bash 3.2：避免 `case ... ;;` 嵌在命令替换里；变量紧跟中文标点时用 `${VAR}`。
