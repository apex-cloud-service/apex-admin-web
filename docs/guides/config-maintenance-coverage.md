# 功能配置与数据维护能力覆盖说明

> 核对日期：2026-10-30。本文依据当前前端源码、API 封装、类型定义、页面调用、路由注册和本地部署配置核对；后端实现、生产网关路由和目标环境行为需在对应工程或环境中另行确认。配套评审文档：[统一权限认证与多租户适配](auth-tenant-adaptation.md)。

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
| 代码生成器（数据源/表扫描/配置/生成/历史） | 代码生成器页 | 前端已封装并由页面调用 `/admin-api/v1/generator/*` 相关接口 |
| 文件上传/URL/删除/存在检查 | 基础与增强上传组件（演示路由 `/demo/file-upload`、`/demo/file-upload-enhanced`） | POST `/api/v1/files/generic`、GET `/api/v1/file/url`、DELETE `/api/v1/file/delete`、GET `/api/v1/file/exists`；`getFileContent` 仅构造 `/api/v1/file/content` 访问路径；无独立文件管理页，组件 remove 事件不触发后端删除 |

## 3. 当前未接入或需要外部核验的能力

以下项目是本前端当前未完整接入、未在页面提供入口，或其后端/网关行为不能仅凭本仓库确认的能力。是否存在、是否可达以及响应语义，应以对应后端工程和目标环境为准：

| 能力 | 后端端点 | 现状 |
| --- | --- | --- |
| MFA 自助管理（TOTP 绑定/验证/解绑） | 前端当前封装 `/api/mfa/*` 配置查询能力；自助操作端点需外部核验 | 当前页面未提供完整的自助绑定流程；不能仅凭本仓库判断后端路由是否可达 |
| 审计日志清理与高级查询（failed/high-risk/time-range） | 前端未封装对应专用接口 | 是否存在及网关可达性需以认证服务和目标环境契约核验 |
| 分片上传与大文件续传 | 前端当前主要使用 `/api/v1/files/generic` 上传 | 分片端点未在本前端封装；是否存在及可达性需外部核验 |
| 会话强制下线（kickout） | 页面复用 `/admin-api/v1/users/{id}/sessions/revoke` | 前端未依赖 `kickout` 端点；其后端实现状态需外部核验 |
| 租户管理与业务租户切换 | 管理页已接入 `/api/v2/platform/tenants`；业务侧未提供租户切换器 | 租户切换是否存在其他后端入口需外部核验；当前登录态按单一租户处理 |

## 4. 维护约定

1. 新增配置/维护功能前，先核对前端 API、类型、页面调用和本地代理配置，再在后端 `interfaces/router` 与目标网关确认端点可达；不要凭文档或旧代码猜测路径。
2. 接入后同步更新 [API 接口目录](../api/README.md) 对应小节与本文覆盖清单，并注明页面实际调用状态。
3. 对未在本前端封装或未在页面接入的能力，保留“未接入/待外部核验”状态，不将后端存在性、占位实现或 404 结论写成前端已证实事实。
