# docs/features（功能实现说明）

## 用途与边界

- 收录：**单个功能"怎么实现、怎么用"**——文件上传（基础/增强/裁剪）、数据库配置、文档图表管理等。
- 不收：跨功能架构 → `docs/architecture/`；操作步骤 → `docs/guides/`；接口字段口径 → `docs/api/`。

## 索引

| 文档 | 内容 |
| --- | --- |
| [database-config.md](./database-config.md) | — |
| [document-chart-management.md](./document-chart-management.md) | — |
| [file-upload-basic.md](./file-upload-basic.md) | — |
| [file-upload-enhanced.md](./file-upload-enhanced.md) | — |

## 维护约定

1. 新功能上线即补一篇：**功能边界 / 关键实现 / 权限与接口 / 已知限制** 四段齐全。
2. 与 `03-api` 无关的纯前端实现细节可只写在这里，不必强拆。
