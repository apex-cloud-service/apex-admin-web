# docs/features（功能实现说明）

## 用途与边界

- 收录：**单个功能"怎么实现、怎么用"**——文件上传（基础/增强/裁剪）、数据库配置、文档图表管理等。
- 不收：跨功能架构 → `docs/architecture/`；操作步骤 → `docs/guides/`；接口字段口径 → `docs/api/`。

## 索引

| 文档 | 内容 |
| --- | --- |
| [database-config.md](./database-config.md) | 数据库配置页两 Tab：配置采集（连接测试 + 生成 YAML/env/Compose）与数据源台账（CRUD + 连接池指标）；**不是**运行时库表/SQL 控制台 |
| [document-chart-management.md](./document-chart-management.md) | 文档与图表 CRUD、状态流转与数据查询；文档下载走 `{id}/download` |
| [file-upload-basic.md](./file-upload-basic.md) | 基础上传组件：Element Plus `el-upload` + multipart，10MB/MIME 前置校验，Bearer 头，独立于 Axios 拦截器 |
| [file-upload-enhanced.md](./file-upload-enhanced.md) | 增强上传组件：拖拽/粘贴/压缩/裁剪/分片续传（`enableChunk` 超限走 `/api/v1/file/chunk/**`）、进度对话框与 XHR 生命周期 |

> 上传两条传输通道（`el-upload` 与独立 XHR）及其与 Axios 拦截器的差异，见 [diagrams/upload-transport-paths.mmd](../diagrams/upload-transport-paths.mmd)。

## 维护约定

1. 新功能上线即补一篇：**功能边界 / 关键实现 / 权限与接口 / 已知限制** 四段齐全。
2. 与 `03-api` 无关的纯前端实现细节可只写在这里，不必强拆。
