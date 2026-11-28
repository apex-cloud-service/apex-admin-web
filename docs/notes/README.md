# 调研与临时结论（docs/notes）

存放调研记录、第三方对接备忘、风险纪要、待验证结论。**写完即登记索引**，避免成为"只建不读"的角落。

命名：`YYYY-MM-DD-主题.md`。

约定：
1. 结论必须可验证（给出命令、日志片段或接口返回）。
2. 已验证的结论若影响架构或契约，应升级为 `docs/specs/` 方案或 `docs/reference/` 参考文档。
3. **本目录不收执行记录与评审结论**：执行留痕 → `docs/records/`；评审/审计结论 → `docs/reviews/`。

## 索引

| 日期 | 文件 | 说明 |
| --- | --- | --- |
| — | （暂无） | 2026-11-28 归位：原 3 篇分别迁入 `docs/records/`（2 篇执行记录）与 `docs/reviews/`（1 篇审计结论） |

### 已迁出（2026-11-28，FE-033 受控归位）

| 原文件 | 现位置 | 理由 |
| --- | --- | --- |
| `2026-11-16-orphan-views.md` | [records/2026-11-16-orphan-views.md](../records/2026-11-16-orphan-views.md) | 内容为 FE-004 执行留痕（含处置动作与取证数据），属记录而非调研 |
| `2026-11-16-chart-assets.md` | [records/2026-11-16-chart-assets.md](../records/2026-11-16-chart-assets.md) | 内容为 FE-007 执行留痕（抽取规则、导出命令、踩坑），属记录 |
| `2026-11-16-doc-dedup-audit.md` | [reviews/2026-11-16-doc-dedup-audit.md](../reviews/2026-11-16-doc-dedup-audit.md) | 内容为去重复核的**审计结论**，属评审 |