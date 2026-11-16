# 来源说明（PROVENANCE）

本目录内容迁自 AI 工具私有目录 `.workbuddy/knowledge/`（该目录被 `.gitignore` 忽略，长期未纳入版本库，存在丢失风险）。

| 项 | 值 |
| --- | --- |
| 迁移日期 | 2026-11-16 |
| 迁移执行 | 项目治理改造（任务 FE-012） |
| 迁移方式 | 逐文件 `cp` + SHA-256 逐一比对，全部一致后移除原件，原目录保留 `MIGRATED.md` 指针 |
| 内容改动 | **仅修正 1 处相对链接**：`README.md` 中 `../MEMORY-CARD.md` → `../../../MEMORY-CARD.md`（因目录层级由 `.workbuddy/knowledge` 变为 `docs/reference/ai-knowledge`）。正文其余内容零删改 |
| 校验命令 | `bash scripts/governance/verify-docs.sh` |

## 文件清单（迁移前后一致）

| 文件 | 原路径 | 说明 |
| --- | --- | --- |
| `README.md` | `.workbuddy/knowledge/README.md` | 知识库定位、阅读路径、索引 |
| `01-current-state.md` | `.workbuddy/knowledge/01-current-state.md` | 前端现状（2026-11-14 基线） |
| `02-conventions-and-pitfalls.md` | 同名 | 约定与踩坑排障表 |
| `03-contract-map.md` | 同名 | 前端 ↔ 后端契约地图 |

## 后续约定

1. 本目录是**唯一副本**，`.workbuddy/knowledge/` 不再存放正文。
2. 更新内容直接修改本目录文件，并同步 `docs/records/` 留痕。
3. 涉及架构结论的变更，应升级为 `docs/specs/` 方案或 `docs/reference/` 正式参考文档。
