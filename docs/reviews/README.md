# 评审记录（docs/reviews）

存放方案评审、代码评审、上线检查的结论与检查清单结果。

建议格式：
1. 评审对象与版本（commit / 分支）
2. 检查清单（勾选项 + 不通过原因）
3. 结论（通过 / 有条件通过 / 驳回）与责任人
4. 后续动作及对应任务 ID

历史评审材料仍保留在 `docs/archived/project-reports/`，不搬迁。

## 跨仓评审（正文在 apex-scaffold）

两仓共用的治理评审只有一份正文，避免双份口径：

| 日期 | 对象 | 结论 | 正文位置 |
| --- | --- | --- | --- |
| 2026-11-16 | 前后端两仓治理规范对齐（前端 `1455fbc` / 后端 `14f6bc2a`） | 有条件通过 | `apex-scaffold/docs/reviews/2026-11-16-governance-alignment-review.md` |

配套整改方案：`apex-scaffold/docs/plans/2026-11-16-governance-alignment-plan.md`（待业主确认）。
本仓相关整改项：`database-config.md:153` 死指针、`docs/archived/project-reports/` 3 条断链、规范 §9 任务范围。
| 2026-11-16 | 两仓 `dev` 分支治理一致性（前端基线 `d957e6f`） | 有条件通过（P1 5 / P2 1） | [2026-11-16-dev-branch-governance-audit.md](./2026-11-16-dev-branch-governance-audit.md) |
| 2026-11-17 | [2026-11-17-integration-review-checklist.md](./2026-11-17-integration-review-checklist.md) | FE-026 联调修复复核要点（正文在 apex-scaffold `docs/reviews/`，跨仓链接） |
