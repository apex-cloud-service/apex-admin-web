# 变更与改造记录（docs/records）

每一次任务关闭、重构、缺陷修复，都要在此留痕，供后续追溯与复盘。

命名：`YYYY-MM-DD-主题.md`；必含「范围 / 改动清单 / 验证证据 / 影响面 / 回滚方式」。

已登记记录：

- [FE-032 评审遗留逻辑修复](./2026-11-25-logic-remediation.md) — 始于 2026-11-25，2026-11-26 继续核验，尚未关闭。
- [2026-11-16 文档治理与目录重构](./2026-11-16-docs-governance.md)
- [2026-11-19 前后端联调执行记录](./2026-11-19-fullstack-integration.md)
- [2026-11-23 API 契约追踪矩阵](./2026-11-23-api-contract-matrix.md)（静态生成证据）
- 本轮后续结果以追加段落写入 [2026-11-19 前后端联调执行记录](./2026-11-19-fullstack-integration.md)，保持同一任务单一记录入口。

> 规则：记录只增不改；后续修正以追加段落方式写入，不覆盖历史结论。

| 日期 | 文档 | 说明 |
| --- | --- | --- |
| 2026-11-18 | [2026-11-16-docs-governance.md](./2026-11-16-docs-governance.md) | 初始治理基线；追加多智能体协作规则 v1.2：写隔离、标准交接包、独立复核与冲突升级 |
| 2026-11-16 | [2026-11-16-directory-normalization.md](./2026-11-16-directory-normalization.md) | 目录规范化：reports 分层 + 4 个 docs README + 总览表 + check-doc-layout.sh（FE-025） |
| 2026-11-16 | [2026-11-16-fe-tasks-batch.md](./2026-11-16-fe-tasks-batch.md) | FE-001~FE-007 执行记录与测试报告（build 通过、E2E 12 passed） |
| 2026-11-17 | [2026-11-17-integration-contract-repair.md](./2026-11-17-integration-contract-repair.md) | FE-026 真实联调契约修复：审批裸数组客户端分页、日历 `/range` 本地时间、用户状态映射（前端 533 用例全绿 + 真实浏览器回归） |
| 2026-11-18 | [2026-11-18-comment-quality-audit.md](./2026-11-18-comment-quality-audit.md) | 全仓注释质量评审与 6 批整改：220 文件审计（P1×25/P2×9/P3×31），39 文件 63 处仅注释行修正（auth-config 失真头注、影子头注、features 语义等；533 用例全绿） |
| 2026-11-19 | [2026-11-19-api-route-matrix.md](./2026-11-19-api-route-matrix.md) | FE-029 API 导出函数与后端路由静态对照（335 路由匹配；动态/委派函数已人工核查） |
| 2026-11-19 | [2026-11-19-fullstack-integration.md](./2026-11-19-fullstack-integration.md) | FE-029/BE-043 Podman 联调证据，含真实网关登录修复、通知只读验证与剩余覆盖项 |
| 2026-11-23 | [2026-11-23-task-ownership-handoff.md](./2026-11-23-task-ownership-handoff.md) | FE-029 租约接管与 FE-030 独立优化任务登记 |
| 2026-11-23 | [2026-11-23-fe030-wave-a-test-report.md](./2026-11-23-fe030-wave-a-test-report.md) | FE-030 Wave A 历史产物审计、隔离复验与独立 R5 结论 |
| 2026-11-25 | [2026-11-25-comment-review-handover.md](./2026-11-25-comment-review-handover.md) | 全仓代码注释事实评审、JSDoc 补全、验证与未修逻辑交接；未提交、待主控补登 |
| 2026-11-16 | [2026-11-16-chart-assets.md](./2026-11-16-chart-assets.md) | FE-007 图表资产体检与抽取留痕（原 `docs/notes/`，2026-11-28 归位） |
| 2026-11-16 | [2026-11-16-github-remote-onboarding.md](./2026-11-16-github-remote-onboarding.md) | GitHub 远端接入（唯一正文在后端仓；本仓为副本） |
| 2026-11-16 | [2026-11-16-governance-alignment-remediation.md](./2026-11-16-governance-alignment-remediation.md) | BE-020 / FE-015 治理评审整改（唯一正文在后端仓；本仓为副本） |
| 2026-11-16 | [2026-11-16-orphan-views.md](./2026-11-16-orphan-views.md) | FE-004 孤儿页面盘点与处置（原 `docs/notes/`，2026-11-28 归位） |
| 2026-11-28 | [2026-11-28-docs-reorg-and-diagram-rebuild.md](./2026-11-28-docs-reorg-and-diagram-rebuild.md) | FE-033 文档/脚本/配置目录重组、文档对照代码评审与图表重制（执行中） |
