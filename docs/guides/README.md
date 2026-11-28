# docs/guides（操作指南）

## 用途与边界

- 收录：**"怎么一步步做"**——部署、前后端联调、Mock 服务、租户适配、配置维护与验证、GitHub 分支保护等。
- 不收：架构原理 → `docs/architecture/`；功能实现 → `docs/features/`。

## 索引

| 文档 | 内容 |
| --- | --- |
| [auth-tenant-adaptation.md](./auth-tenant-adaptation.md) | 后端统一权限认证/多租户评审结论与前端适配说明（租户声明、`X-Tenant-Id` 与单租户登录态边界） |
| [config-maintenance-coverage.md](./config-maintenance-coverage.md) | 配置/维护能力清单、前端接入状态与需外部核验项 |
| [database-config-verification.md](./database-config-verification.md) | 数据库配置页（`/system/database`）验证清单：前置条件、8 个接口、逐项验证步骤 |
| [database-config-integration.md](./database-config-integration.md) | 数据库配置采集与数据源管理的前后端接口联调（原文件名 `frontend-backend-integration.md`） |
| [deployment.md](./deployment.md) | 构建、三种部署形态、代理矩阵（SSE/WS location）、镜像设计、上线验证 |
| [github-branch-protection.md](./github-branch-protection.md) | `master`/`test`/`dev` 分支保护规则与开启步骤（唯一正文在后端仓） |
| [mock-data-service.md](./mock-data-service.md) | Mock.js 服务用法与开关（仅 DEV 动态加载） |

## 维护约定

1. 每篇必须能从零复现：命令、环境变量、预期输出三样齐全。
2. 参数变更（端口/变量名/脚本路径）要同步本目录对应文档，避免"文档里的命令跑不通"。
