# docs/architecture（架构文档）

## 用途与边界

- 收录：前端整体架构、认证与路由、领域模型与状态机——**讲"系统怎么组织、请求怎么走"**。
- 图说：本文档内的图均为 `.mmd` 源 + 同名 `.svg` 成对资产，统一放 [`docs/diagrams/`](../diagrams/README.md)（清单见该 README）。
- 不收：具体功能使用说明 → [`docs/features/`](../features/README.md)；操作步骤 → [`docs/guides/`](../guides/README.md)。

## 索引

| 文档 | 内容 |
| --- | --- |
| [overview.md](./overview.md) | 技术栈、分层架构、请求时序、部署架构、测试与质量工具 |
| [auth-and-routing.md](./auth-and-routing.md) | 登录/令牌无感刷新/OAuth2-PKCE/动态路由（6 张流程图） |
| [domain-and-state-diagrams.md](./domain-and-state-diagrams.md) | 核心领域模型类图、工作流/租户/办公绑定状态机 |

## 维护约定

1. 新增图：先写 `docs/diagrams/<name>.mmd`，再 `mmdc` 导出同名 `.svg`，正文引用 SVG 并留「图源」链接（`check-diagram-assets.sh` 校验）。
2. 架构变更须同步 `docs/reference/ai-knowledge/` 台账。
