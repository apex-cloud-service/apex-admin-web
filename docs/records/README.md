# 变更与改造记录（docs/records）

每一次任务关闭、重构、缺陷修复，都要在此留痕，供后续追溯与复盘。

命名：`YYYY-MM-DD-主题.md`；必含「范围 / 改动清单 / 验证证据 / 影响面 / 回滚方式」。

已登记记录：

- [2026-11-16 文档治理与目录重构](./2026-11-16-docs-governance.md)

> 规则：记录只增不改；后续修正以追加段落方式写入，不覆盖历史结论。

| 日期 | 文档 | 说明 |
| --- | --- | --- |
| 2026-11-18 | [2026-11-16-docs-governance.md](./2026-11-16-docs-governance.md) | 初始治理基线；追加多智能体协作规则 v1.2：写隔离、标准交接包、独立复核与冲突升级 |
| 2026-11-16 | [2026-11-16-directory-normalization.md](./2026-11-16-directory-normalization.md) | 目录规范化：reports 分层 + 4 个 docs README + 总览表 + check-doc-layout.sh（FE-025） |
| 2026-11-16 | [2026-11-16-fe-tasks-batch.md](./2026-11-16-fe-tasks-batch.md) | FE-001~FE-007 执行记录与测试报告（build 通过、E2E 12 passed） |
| 2026-11-17 | [2026-11-17-integration-contract-repair.md](./2026-11-17-integration-contract-repair.md) | FE-026 真实联调契约修复：审批裸数组客户端分页、日历 `/range` 本地时间、用户状态映射（前端 533 用例全绿 + 真实浏览器回归） |
| 2026-11-18 | [2026-11-18-comment-quality-audit.md](./2026-11-18-comment-quality-audit.md) | 全仓注释质量评审与 6 批整改：220 文件审计（P1×25/P2×9/P3×31），39 文件 63 处仅注释行修正（auth-config 失真头注、影子头注、features 语义等；533 用例全绿） |
