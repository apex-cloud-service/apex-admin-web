# docs/guides（操作指南）

## 用途与边界

- 收录：**"怎么一步步做"**——部署、前后端联调、Mock 服务、租户适配、配置维护与验证、GitHub 分支保护等。
- 不收：架构原理 → `docs/architecture/`；功能实现 → `docs/features/`。

## 索引

| 文档 | 内容 |
| --- | --- |
| [auth-tenant-adaptation.md](./auth-tenant-adaptation.md) | — |
| [config-maintenance-coverage.md](./config-maintenance-coverage.md) | — |
| [database-config-verification.md](./database-config-verification.md) | — |
| [deployment.md](./deployment.md) | — |
| [frontend-backend-integration.md](./frontend-backend-integration.md) | — |
| [github-branch-protection.md](./github-branch-protection.md) | — |
| [mock-data-service.md](./mock-data-service.md) | — |

## 维护约定

1. 每篇必须能从零复现：命令、环境变量、预期输出三样齐全。
2. 参数变更（端口/变量名/脚本路径）要同步本目录对应文档，避免"文档里的命令跑不通"。
