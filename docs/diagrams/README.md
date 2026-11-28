# 图表资产（Mermaid 源 + SVG 导出）

> 口径：`docs/` 下的每一张 Mermaid 图都以 `.mmd` 源文件 + 同名 `.svg` 成对存在；配对检查见 `scripts/governance/check-diagram-assets.sh`。

## 命名规则

- `<文档相对路径以 - 连接>-<两位序号>.mmd`，例如 `docs/architecture/auth-and-routing.md` 的第 3 张图为 `architecture-auth-and-routing-03.mmd`。
- 跨文档复用的专题图不绑定单一文档，使用语义命名（如 `chunk-upload-flow.mmd`、`request-authz-layers.mmd`）。
- 序号按图在文档中出现的顺序（`01` 起）。

## 重新导出

```bash
# 单张
npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i docs/diagrams/xxx.mmd -o docs/diagrams/xxx.svg -b white

# 全量（根下 36 张）
for f in docs/diagrams/*.mmd; do npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i "$f" -o "${f%.mmd}.svg" -b white; done
```

> **本机实操**：若 `mmdc` 报 `Could not find chrome-headless-shell`，用已装的 Chrome for Testing 指定可执行文件即可：
> ```bash
> printf '{"executablePath": "%s", "args": ["--no-sandbox"]}\n' \
>   "$(ls -d ~/.cache/puppeteer/chrome/*/*/Google\ Chrome\ for\ Testing.app/Contents/MacOS/* | head -1)" > /tmp/pptr.json
> mmdc -p /tmp/pptr.json -q -i docs/diagrams/xxx.mmd -o docs/diagrams/xxx.svg -b white
> ```

## 已知导出注意点

1. 边标签内的 `|` 必须写成 `&#124;` 并给标签加引号（`-->|"…"|`），否则 Mermaid 词法冲突。
2. 节点标签含 `${VAR}`、以 `/` 开头、含括号、含 `?` `=` `:` 时，必须整体加引号（`X["…"]`）。
3. **flowchart 不支持 `Note`**：需改用普通节点并虚线连接（`X -.-> NOTE["说明"]`）。`Note` 仅 `sequenceDiagram` / `stateDiagram-v2` 支持。
4. `sequenceDiagram` 的消息文本中避免 HTML 实体（`&lt;` / `&gt;` 等会触发解析错误）；直接写文字。
5. 背景固定 `-b white`，保证浅色与深色主题下都可读。

## 历史归档件（`_legacy/`）

2026-11-28（FE-033）全量重制时，27 对既有图的原件整体迁入 `docs/diagrams/_legacy/`：

| 项 | 现行图 | `_legacy/` 历史件 |
| --- | --- | --- |
| 数量 | 36 对 | 22 对（另 5 对为 `archived-*` 归档评审图，迁回根目录未重制） |
| 是否被正文引用 | 是 | **否，勿引用** |
| 用途 | 与当前代码一致 | 保留 2026-11-28 之前的原始画法与措辞，供追溯 |

> `docs/archived/project-reports/` 的 5 张 `archived-*` 图**刻意未重制**：它们记录的是当时后端网关的真实缺陷状态（如「SSE 有通道无发布者」「消息模板 /{id} 落入 system 兜底 404」），本仓库代码无法重新推导该状态，重绘等于伪造评审证据。按治理规范 §3.6 历史归档豁免处理。

## 清单（`docs/diagrams/` 根下 36 对 = 31 张现行图 + 5 张历史证据图）

### 架构（16）

| 文档 | 图文件名 | 图名 |
| --- | --- | --- |
| [architecture/overview.md](../architecture/overview.md) | `architecture-overview-01` | 系统与部署边界（含四条传输通道） |
| [architecture/overview.md](../architecture/overview.md) | `architecture-overview-02` | 前端分层与状态依赖 |
| [architecture/overview.md](../architecture/overview.md) | `architecture-overview-03` | 请求处理时序（含 401 单飞刷新） |
| [architecture/overview.md](../architecture/overview.md) | `architecture-overview-04` | 构建与部署产物链路 |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-01` | 账号密码登录（含 MFA 二步） |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-02` | 路由守卫（含失败回滚与重解析） |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-03` | 并发 401 单飞刷新 |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-04` | OAuth2 授权码 + PKCE |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-05` | 标准 OAuth2 与办公平台回调两条链路 |
| [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) | `architecture-auth-and-routing-06` | 菜单驱动动态路由 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-01` | 核心领域模型类图 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-02` | 工作流实例状态 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-03` | 租户生命周期 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-04` | 办公平台账号绑定 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-05` | 我的事项：五域并行聚合 |
| [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) | `architecture-domain-and-state-diagrams-06` | 数据总览：D5 跨域聚合 |

### 专题（新增 9 张，跨文档引用）

| 图文件名 | 主题 | 主要引用位置 |
| --- | --- | --- |
| `chunk-upload-flow` | 分片上传全链路（init → status → upload → merge） | [features/file-upload-enhanced.md](../features/file-upload-enhanced.md) |
| `knowledge-sse-chat` | 知识库 SSE 问答（citations → delta → done） | [api/README.md](../api/README.md) §2.30 |
| `message-websocket` | 站内信 WebSocket（ticket / ping-pong / 指数退避） | [architecture/overview.md](../architecture/overview.md) |
| `notification-sse-stream` | 通知中心 SSE（fetch 流式 / 5s→30s 退避） | [api/README.md](../api/README.md) §2.20 |
| `workflow-start-and-task` | 工作流发起与待办办理（complete/rollback/transfer/delegate） | [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) |
| `tenant-package-capability` | 租户套餐与能力运营（三类集合字段语义） | [api/README.md](../api/README.md) §2.23/§2.24 |
| `request-authz-layers` | 权限三层：菜单可见 / 按钮权限 / 后端鉴权 | [architecture/auth-and-routing.md](../architecture/auth-and-routing.md) §9 |
| `upload-transport-paths` | 上传两条传输通道与 Axios 拦截器差异 | [features/README.md](../features/README.md) |
| `state-machine-overview` | 三套状态机总览（工作流/租户/绑定） | [architecture/domain-and-state-diagrams.md](../architecture/domain-and-state-diagrams.md) |

### 接口与指南（6）

| 文档 | 图文件名 | 图名 |
| --- | --- | --- |
| [api/README.md](../api/README.md) | `api-README-01` | 知识库文档删除与清理状态流转 |
| [guides/deployment.md](../guides/deployment.md) | `guides-deployment-01` | 部署架构与请求路径（location 优先级） |
| [guides/deployment.md](../guides/deployment.md) | `guides-deployment-02` | 镜像设计与运行期注入 |
| [guides/database-config-integration.md](../guides/database-config-integration.md) | `guides-database-config-integration-01` | 配置采集流程 |
| [guides/database-config-integration.md](../guides/database-config-integration.md) | `guides-database-config-integration-02` | 数据源管理流程 |
| [guides/database-config-integration.md](../guides/database-config-integration.md) | `guides-database-config-integration-03` | 页面与接口时序 |

### 归档评审（5，历史证据，不重制）

| 文档 | 图文件名 | 图名 |
| --- | --- | --- |
| [archived/project-reports/frontend-backend-review-2026-11-06.md](../archived/project-reports/frontend-backend-review-2026-11-06.md) | `archived-project-reports-frontend-backend-review-2026-11-06-01` | 路由组映射总览 |
| [archived/project-reports/frontend-backend-review-2026-11-06.md](../archived/project-reports/frontend-backend-review-2026-11-06.md) | `archived-project-reports-frontend-backend-review-2026-11-06-02` | 通知中心 SSE「有通道、无发布者」 |
| [archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-01` | 评审方法与范围 |
| [archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-02` | 站内信模板编辑/删除 404 |
| [archived/project-reports/frontend-backend-review-2026-11-08.md](../archived/project-reports/frontend-backend-review-2026-11-08.md) | `archived-project-reports-frontend-backend-review-2026-11-08-03` | 通知中心前端实现 |

> 上述 5 张在 `docs/diagrams/` 根下（正文引用路径不变），内容保持 2026-11 历史口径，**不得**作为现状依据。

---

**最后更新**：2026-11-28（FE-033：27 对既有图全量重制并按代码补强；新增 9 张专题图；旧件 22 对归档至 `_legacy/`）