# `dev` 分支一致性整改方案（前端仓·待确认）

> **唯一正文**：后端仓 `docs/plans/2026-11-16-dev-alignment-remediation-plan.md`（含完整步骤、命令、YAML 片段、验收与回滚）。
> 本文只列本仓需执行的批次与文件，编号、决策点与唯一正文一致。**已执行（2026-11-16）**：B1/B2/B3/B5 完成并合并至 `master`/`test`；B6 待网页或 PAT。

## 本仓批次

| 批次 | 关闭 | 改动文件 | 验收 |
| --- | --- | --- | --- |
| B1 | D-03 D-08 | `AGENTS.md`（第 0 章补 `0.8`，附录 A 不动）、`docs/specs/project-governance.md`（§5.3 默认分支口径）、`docs/reference/ai-knowledge/{README.md,MEMORY-CARD.md}` | `tail -n 712 AGENTS.md \| shasum -a 256` = `ae5e19db…53a` |
| B2 | D-04 | `docs/tasks/project-tasks.md` 新增 `FE-016`–`FE-019` | `grep -c "^\| FE-01"` ≥ 4 |
| B5 | D-06 | `.gitignore` 合并重复项 | `awk` 重复检查为空；`verify-docs` 仍 0 项 |
| B3 | D-02 | 新增 `.github/workflows/ci.yml`（docs+rules job、build job） | 本地预演四个治理脚本全通过；YAML 可解析 |
| B6 | D-07 | GitHub 分支保护（网页或 PAT），先「禁强推+禁删除」 | 强推/删除被拒；清单 8 条打勾 |

## 与其他仓的依赖

- B3 的 workflow 与本仓 `scripts/governance/*` 路径一一对应，脚本已存在，无需新增；
- B6 的保护强度需与后端同步（同一决策点 2），避免两仓口径不一致。

## 回滚

每批一次提交，`git revert <sha>` 即可；`.gitignore` 与文档改动不影响构建与运行。
