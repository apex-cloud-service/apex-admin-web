# 更新日志（Changelog）

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循语义化版本（SemVer）。

## [Unreleased]

### Added
- 监控大盘增强：新增链路追踪查询页（`/monitor/trace` 静态路由，`TraceQuery.vue`）与 `monitor/trace/{traceId}` 接口封装（`src/api/monitor.ts`）
- 认证配置管理模块（`src/api/auth-config.ts`、`views/system/auth`）：JWT/OAuth2 客户端/权限码/会话/安全策略/登录尝试管理
- SSO 单点登录模块（`src/api/sso.ts`、`views/system/sso`）：SAML/CAS/LDAP/OAuth2/OIDC 提供商、会话、审计
- 代码生成器模块（`src/api/generator.ts`、`views/system/generator`）
- 办公平台集成（飞书/钉钉/企微）：消息/审批/日历/文档/配置/绑定/控制台/组织同步页面与 `office.ts`、`office-new.ts` 双 API 层
- 令牌无感刷新（`src/utils/request.ts`）：401 单次重放、并发共享刷新、`x-new-access-token` 头支持
- 请求层契约单测（`src/utils/__tests__/`：request/oauth2/auth-config/validate）
- 工程化脚本：性能审计（`scripts/performance/`）、依赖安全扫描（`scripts/security-scan.sh`）、OpenAPI 生成（`npm run generate:api`）
- 文档体系补齐：架构文档（`docs/architecture/`）、API 接口目录（`docs/api/`）、测试指南与工具库参考（`docs/reference/`）

### Fixed
- 文件上传组件与登录页面的类型问题（aa375a3）
- 办公平台授权回调页 `/office/callback` 此前未注册路由导致不可达，已补注册为静态路由（public），与 `office/callback.vue` 头注释及 AGENTS.md 静态路由清单对齐

## [1.2.0] — 2026-09

> 对应提交 c119674（项目结构重组 + 办公平台功能）前后的功能集合。

### Added
- OAuth2 第三方登录（PKCE S256 + 一次性 state）（0b8b95a）
- Mock 数据服务，支持前端独立开发（1e589e9）
- 文档管理与图表管理功能模块（8b5d75b）
- 数据库配置采集页（连接测试/部署配置生成）

### Changed
- 项目结构重组，文档目录归档整理（c119674、4597c87、d9420ac）
- TypeScript 类型系统完善（f3056de）

## [1.1.0]

### Added
- 文件上传组件：`FileUpload`（基础）与 `FileUploadEnhanced`（拖拽/粘贴/裁剪/压缩/进度）（4d7641c、78409a5、6944cde）
- 上传演示页面与静态路由（7c4fc70）

## [1.0.0]

### Added
- 管理后台基座：Vue 3 + Vite 6 + TypeScript + Pinia + Element Plus
- 账号密码登录（图形验证码）、菜单驱动动态路由（VIEW_REGISTRY）、按钮权限指令
- 系统管理（用户/角色/菜单/部门/字典/参数/定时任务）、监控（日志/在线用户/大盘）
- 工作流监控、全局搜索（Meilisearch）、AdminLayout 布局

---

**维护约定**：每次发版前由开发者补充本文件；`Unreleased` 段落随手记录，避免发版时回忆。
