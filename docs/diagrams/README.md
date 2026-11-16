# 图表资产（Mermaid 源 + SVG 导出）

> 口径：`docs/` 下的每一张 Mermaid 图都以 `.mmd` 源文件 + 同名 `.svg` 成对存在；配对检查见 `scripts/governance/check-diagram-assets.sh`。

## 命名规则

- `<文档相对路径以 - 连接>-<两位序号>.mmd`，例如 `docs/architecture/auth-and-routing.md` 的第 3 张图为 `architecture-auth-and-routing-03.mmd`。
- 序号按图在文档中出现的顺序（`01` 起）。

## 重新导出

```bash
# 单张
npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i docs/diagrams/xxx.mmd -o docs/diagrams/xxx.svg -b white

# 全量（27 张）
for f in docs/diagrams/*.mmd; do npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i "$f" -o "${f%.mmd}.svg" -b white; done
```

## 已知导出注意点

1. 边标签内的 `|` 必须写成 `&#124;` 并给标签加引号（`-->|"…"|`），否则 Mermaid 词法冲突。
2. 节点标签含 `${VAR}`、以 `/` 开头或含括号时，必须整体加引号（`X["…"]`）。
3. 背景固定 `-b white`，保证浅色与深色主题下都可读。

## 清单（27 张）

| 文档 | 图文件名 | 图名（取自所在章节标题） |
| --- | --- | --- |
| [docs/api/README.md](../api/README.md) | `api-README-01.mmd` / `api-README-01.svg` | 2.30 知识库 [src/api/knowledge.ts](../../src/api/knowledge.ts) |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-01.mmd` / `architecture-auth-and-routing-01.svg` | 2. 账号密码登录流程 |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-02.mmd` / `architecture-auth-and-routing-02.svg` | 3. 路由守卫流程 |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-03.mmd` / `architecture-auth-and-routing-03.svg` | 4. 令牌无感刷新（已实现） |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-04.mmd` / `architecture-auth-and-routing-04.svg` | 5. OAuth2 授权码登录 |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-05.mmd` / `architecture-auth-and-routing-05.svg` | 6. 办公平台接口与独立授权回调（飞书/钉钉/企微） |
| [docs/architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-06.mmd` / `architecture-auth-and-routing-06.svg` | 7. 菜单驱动动态路由 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-01.mmd` / `architecture-domain-and-state-diagrams-01.svg` | 1. 核心领域模型 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-02.mmd` / `architecture-domain-and-state-diagrams-02.svg` | 2.1 工作流实例状态 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-03.mmd` / `architecture-domain-and-state-diagrams-03.svg` | 2.2 租户生命周期 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-04.mmd` / `architecture-domain-and-state-diagrams-04.svg` | 2.3 办公平台账号绑定 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-05.mmd` / `architecture-domain-and-state-diagrams-05.svg` | 3.1 我的事项：五域并行聚合 |
| [docs/architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-06.mmd` / `architecture-domain-and-state-diagrams-06.svg` | 3.2 数据总览：D5 跨域聚合 |
| [docs/architecture/overview.md](../architecture/overview.md) | `architecture-overview-01.mmd` / `architecture-overview-01.svg` | 2. 系统总体架构 |
| [docs/architecture/overview.md](../architecture/overview.md) | `architecture-overview-02.mmd` / `architecture-overview-02.svg` | 3. 前端分层架构 |
| [docs/architecture/overview.md](../architecture/overview.md) | `architecture-overview-03.mmd` / `architecture-overview-03.svg` | 4. 请求处理时序 |
| [docs/architecture/overview.md](../architecture/overview.md) | `architecture-overview-04.mmd` / `architecture-overview-04.svg` | 6. 部署架构 |
| [docs/archived/project-reports/frontend-backend-review-2026-11-06.md](../archived/project-reports/frontend-backend-review-2026-11-06.md) | `archived-project-reports-frontend-backend-review-2026-11-06-01.mmd` / `archived-project-reports-frontend-backend-review-2026-11-06-01.svg` | 4.1 路由组映射总览 |
| [docs/archived/project-reports/frontend-backend-review-2026-11-06.md](../archived/project-reports/frontend-backend-review-2026-11-06.md) | `archived-project-reports-frontend-backend-review-2026-11-06-02.mmd` / `archived-project-reports-frontend-backend-review-2026-11-06-02.svg` | 7.1 通知中心：SSE 通道「有通道、无发布者」，system 消息读面被网关截胡 |
| [docs/archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-01.mmd` / `archived-project-reports-frontend-backend-review-2026-11-08-01.svg` | 2. 评审方法与范围 |
| [docs/archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-02.mmd` / `archived-project-reports-frontend-backend-review-2026-11-08-02.svg` | 5.1 站内信模板编辑/删除 404（后端网关死角） |
| [docs/archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-03.mmd` / `archived-project-reports-frontend-backend-review-2026-11-08-03.svg` | 9.1 前端实现 |
| [docs/guides/deployment.md](../guides/deployment.md) | `guides-deployment-01.mmd` / `guides-deployment-01.svg` | 2. 架构与请求路径 |
| [docs/guides/deployment.md](../guides/deployment.md) | `guides-deployment-02.mmd` / `guides-deployment-02.svg` | 7.2 镜像设计 |
| [docs/guides/frontend-backend-integration.md](../guides/frontend-backend-integration.md) | `guides-frontend-backend-integration-01.mmd` / `guides-frontend-backend-integration-01.svg` | 7.1 配置采集流程 |
| [docs/guides/frontend-backend-integration.md](../guides/frontend-backend-integration.md) | `guides-frontend-backend-integration-02.mmd` / `guides-frontend-backend-integration-02.svg` | 7.2 数据源管理流程 |
| [docs/guides/frontend-backend-integration.md](../guides/frontend-backend-integration.md) | `guides-frontend-backend-integration-03.mmd` / `guides-frontend-backend-integration-03.svg` | 7.3 页面与接口时序 |
