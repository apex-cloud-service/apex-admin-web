# `dev` 分支治理一致性评审报告（前端仓）

- **评审基准**：`dev` = `d957e6f`（`master`/`test` 同点、差 0/0、工作区干净）
- **唯一正文**：跨仓完整报告见后端仓 `docs/reviews/2026-11-16-dev-branch-governance-audit.md`（含方法、判定口径、达标证据与后端偏差 D-01/D-05/D-10）。
- **本文范围**：只登记本仓（`apex-admin-web`）的判定与偏差编号，编号与唯一正文一致。

## 1. 本仓结论：有条件通过（P1 5 项 / P2 1 项）

| 维度 | 结果 | 证据 |
| --- | --- | --- |
| 分支模型 | 达标 | 本地 `dev`，三支同点，推送实测 `3afe885..d957e6f dev -> dev` |
| 六标准目录与索引 | 达标 | `docs/{tasks,specs,plans,records,reviews,notes}` 齐备，`verify-docs` 0 项 |
| 唯一正文与指针 | 达标 | 迁移留指针，`check-doc-refs` 0 项 |
| 私有目录边界 | 达标 | 8 类私有目录均已忽略；`git ls-files` 无 `.workbuddy/.trae/.zcode` |
| 忽略规则 | 达标（有重复条目） | `docs/` 未被忽略；重复见 D-06 |
| 提交纪律与钩子 | 达标 | `core.hooksPath=.githooks`，钩子只警告 |
| 记忆台账 | 达标 | `04-change-memory.md` 16 条；建立后 5/5 提交带 `memory:` |
| 编码红线 | 达标 | `audit-frontend-rules.sh` 无阻断项 |
| 许可 | 达标 | `LICENSE` MIT + `package.json` `"license": "MIT"` |
| CI | **偏差 D-02** | 无 `.github` 目录 |
| 权威文件同步 | **偏差 D-03** | `AGENTS.md` 第 0 章无台账/分支条款 |
| 任务大盘 | **偏差 D-04** | 缺 `FE-016` 起条目 |
| 分支保护 | **偏差 D-07** | 规则未生效（`master` 可直推） |

## 2. 本仓偏差与整改归属

| 编号 | 等级 | 内容 | 整改批次（见整改方案） |
| --- | --- | --- | --- |
| D-02 | P1 | 无任何 CI；治理脚本与 `npm run build` 无自动化门禁 | B3（新增 `.github/workflows/ci.yml`） |
| D-03 | P1 | `AGENTS.md` 第 0 章缺 §5.4 台账、`dev` 分支模型、MIT、预检四项 | B1（第 0 章补 0.8，附录 A 哈希不变） |
| D-04 | P1 | 任务盘缺 `FE-016`–`FE-019` | B2 |
| D-06 | P2 | `.gitignore`：`node_modules/dist/dist-ssr/dist-electron` 与 4 个私有目录各重复两处 | B5 |
| D-07 | P1 | `master`/`test` 未开保护，可强推可删除 | B6 |
| D-08 | P1 | `05-agent-tooling` 系列沿用"手工快照"口径，与 §5.4 强制登记冲突 | B1 |

## 3. 允许差异（不整改）

前端 `docs` 无九个编号目录（现为 `api/architecture/archived/features/guides/...`），运维类内容落在 `docs/guides/` 且以 `github-branch-protection.md` 指向后端唯一正文 —— 均属规范 §3.2「既有目录继续有效」。

## 4. 前端特有注意

1. **不要把 `npm run build` 直接挂成 status check**：本仓 `build` 含 `vue-tsc --noEmit`，首次接入需确认 CI 缓存；B3 方案已把它放进独立 `build` job，先跑绿再加进保护规则。
2. 保护升到「档 2（Require PR + 线性历史）」后，`dev → master` 需用 **Rebase and merge**，`master` 与 `dev` 不再同点，属预期代价。

> 完整方法、判定口径、后端偏差与复现命令：见后端 `docs/reviews/2026-11-16-dev-branch-governance-audit.md`。
