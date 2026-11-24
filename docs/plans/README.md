# 实施与迁移计划（docs/plans）

存放可执行的拆解计划：重构步骤、分批迁移、版本迭代排期。

与 `specs/` 的分工：`specs` 回答「做不做、做成什么样」；`plans` 回答「分几步、每步怎么验、怎么回滚」。

已登记计划：

| 计划 | 状态 | 说明 |
| --- | --- | --- |
| （本次治理的执行步骤见 `docs/records/2026-11-16-docs-governance.md`） | 已完成 | 一次性治理，未单独拆 plan |
| [2026-11-23-frontend-resilience-ddd-release.md](2026-11-23-frontend-resilience-ddd-release.md) | Wave A 审计及带日志隔离复验 R5 `APPROVE_WITH_NITS` | 未实施代码；FE-029 的 `reports/**` 与租约外 `components.d.ts` 均保留，不归属 FE-030 |

计划模板：每步必须写「改动范围 / 验证命令 / 回滚动作」。
| 2026-11-16 | `dev` 分支一致性整改（前端 B1/B2/B3/B5/B6） | **待业主确认**（未执行） | [2026-11-16-dev-alignment-remediation-plan.md](./2026-11-16-dev-alignment-remediation-plan.md) |

## 2026-11-16 增补

| 日期 | 主题 | 状态 | 文件 |
| --- | --- | --- | --- |
| 2026-11-16 | 目录规范化（docs 总览 / 一级目录 README / reports 分层 / 结构自检） | 已执行 | [2026-11-16-directory-normalization-plan.md](./2026-11-16-directory-normalization-plan.md) |
