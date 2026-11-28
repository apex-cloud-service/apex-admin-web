# 实施与迁移计划（docs/plans）

存放可执行的拆解计划：重构步骤、分批迁移、版本迭代排期。

与 `specs/` 的分工：`specs` 回答「做不做、做成什么样」；`plans` 回答「分几步、每步怎么验、怎么回滚」。

计划模板：每步必须写「改动范围 / 验证命令 / 回滚动作」。

## 索引

| 日期 | 主题 | 状态 | 文件 |
| --- | --- | --- | --- |
| 2026-11-28 | 全仓文档/脚本/配置目录重组 + 图表全量重制 + 代码对照评审（FE-033） | 执行中（待独立 R5） | [2026-11-28-docs-reorg-and-diagram-rebuild-plan.md](./2026-11-28-docs-reorg-and-diagram-rebuild-plan.md) |
| 2026-11-23 | FE-030 前端韧性、DDD 与发布能力分波次计划 | Wave A 审计及隔离复验 R5 `APPROVE_WITH_NITS`；未实施代码 | [2026-11-23-frontend-resilience-ddd-release.md](./2026-11-23-frontend-resilience-ddd-release.md) |
| 2026-11-16 | 目录规范化（docs 总览 / 一级目录 README / reports 分层 / 结构自检） | 已执行 | [2026-11-16-directory-normalization-plan.md](./2026-11-16-directory-normalization-plan.md) |
| 2026-11-16 | `dev` 分支一致性整改（前端 B1/B2/B3/B5/B6） | **待业主确认**（未执行） | [2026-11-16-dev-alignment-remediation-plan.md](./2026-11-16-dev-alignment-remediation-plan.md) |
| 2026-11-16 | 文档治理一次性执行步骤 | 已完成（未单独拆 plan，见记录） | [records/2026-11-16-docs-governance.md](../records/2026-11-16-docs-governance.md) |

> 备注：`2026-11-23-frontend-resilience-ddd-release.md` 未实施代码；FE-029 的 `reports/**` 与租约外 `components.d.ts` 均保留，不归属 FE-030。