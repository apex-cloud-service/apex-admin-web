# 功能配置与数据维护能力覆盖说明

> 核对日期：2026-10-26。依据后端 apex-scaffold 各模块 `interfaces/router` 路由注册与网关路由（apex-gateway `application.yml`）逐项核对。配套评审文档：[统一权限认证与多租户适配](auth-tenant-adaptation.md)。

管理后台除支撑业务功能运行外，还承担必要的**功能配置**与**数据维护**职责。本文记录两类能力的当前覆盖情况，作为后续补齐的基线。

## 1. 功能配置能力（已覆盖）

| 能力 | 前端入口 | 接口来源 |
| --- | --- | --- |
| 用户/角色/菜单/部门管理 | 系统管理页 | `/admin-api/v1/users`、`staff-roles`、`menus`、`depts` |
| 字典/系统参数配置 | 系统管理页 | `/admin-api/v1/dict/*`、`configs` |
| 定时任务管理（运行/启停/日志） | 系统管理页 | `/admin-api/v1/jobs[...]` |
| JWT Token 配置与配置测试 | 认证配置 → JWT 配置 | GET/PUT `/auth/config/jwt`、POST `/auth/config/jwt/test` |
| OAuth2 客户端管理 | 认证配置 → OAuth2 | `/auth/config/oauth2/clients`、`/oauth2/clients` |
| 权限码管理与同步 | 认证配置 → 权限码 | `/auth/config/permissions[/sync]` |
| 在线会话管理与会话配置 | 认证配置 → 会话 | `/auth/config/sessions`、`session`；强退复用 `/users/{id}/sessions/revoke` |
| 安全策略（锁定/密码策略/IP 白名单/双因素开关） | 认证配置 → 安全策略 | GET/PUT `/auth/config/security` |
| 登录尝试记录 | 认证配置 → 登录日志 | GET `/auth/config/login-logs` |
| SSO 提供商配置（SAML/CAS/LDAP/OAuth2/OIDC，含测试/元数据/启停） | SSO 管理页 | `/admin-api/v1/sso/providers[...]`、`sessions`、`audit-logs`、`statistics` |
| 数据库配置与数据源管理（测试/指标/生成配置） | 数据库配置页 | `/admin-api/v1/database/*` |
| 办公平台应用配置、绑定审批、组织同步触发与历史 | 办公平台页 | `/admin-api/v1/office/*`、`org/*`、`/api/v1/office/*` |
| 数据脱敏规则 | 脱敏接口 | `/api/v1/masking/*` |
| 消息模板管理 | 站内信管理页 | `/admin-api/v1/message-templates` |

## 2. 数据维护能力（已覆盖）

| 能力 | 前端入口 | 接口来源 |
| --- | --- | --- |
| 登录日志 / 审计日志 / API 调用日志查询 | 监控与日志页 | `/admin-api/v1/login-logs`、`audit-logs`、`api-call-logs` |
| 运行日志 / 业务日志查询 | 监控与日志页 | `/admin-api/v1/logs/runtime[/count]`、`logs/business[/count]` |
| 在线用户查看与强制下线 | 监控与日志页 | `/admin-api/v1/online-users`、用户会话强退接口 |
| 监控大盘（系统/中间件/治理/业务） | 监控大盘页 | `/admin-api/v1/monitor/*` |
| 全文搜索与索引重建 | 顶栏搜索 | `/admin-api/v1/search[/rebuild]` |
| 代码生成器（数据源/表扫描/配置/生成/历史） | 代码生成器页 | `/admin-api/v1/generator/*`（已与后端对齐） |
| 文件上传/查询/删除 | 上传组件 | `/api/v1/file/*`、`/api/v1/files/*` |

## 3. 后端已定义但当前不可接入的能力（暂缓，勿自行实现）

以下端点在认证服务或系统服务中存在，但**网关未暴露对应路由**（或为占位实现），前端接入会得到 404 或假响应。待后端补齐网关路由后再评审接入：

| 能力 | 后端端点 | 现状 |
| --- | --- | --- |
| MFA 自助管理（TOTP 绑定/验证/解绑） | `/api/v1/mfa/setup|status|verify|verify-backup|disable`（仅 apex-auth-service） | 网关 `/api/v1/**` 兜底路由指向系统服务，该服务无 MFA 路由 |
| 审计日志清理与高级查询（failed/high-risk/time-range） | `/api/v1/auth/audit-logs/cleanup` 等（仅 apex-auth-service） | 同上，网关路由后 404 |
| 分片上传与大文件续传 | `/api/v1/file/chunk/*`（网关可达，apex-file-service） | 属上传功能增强，非配置/维护范畴，后续按需求评审 |
| 会话强制下线（kickout） | `/admin-api/v1/auth/config/sessions/kickout` | 后端占位实现（返回提示改用 `users/{id}/sessions/revoke`），前端已走可用链路 |
| 租户管理/租户切换 | 后端无 HTTP 入口 | 见 [auth-tenant-adaptation.md](auth-tenant-adaptation.md) §2.1 |

## 4. 维护约定

1. 新增配置/维护功能前，先在后端 `interfaces/router` 确认端点存在且网关路由可达，再接入；不要凭文档或旧代码猜测路径。
2. 接入后同步更新 [API 接口目录](../api/README.md) 对应小节与本文覆盖清单。
3. 后端占位端点（如 kickout）不得作为前端依赖，按后端提示的可用链路实现。
