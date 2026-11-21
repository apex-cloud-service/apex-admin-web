# Apex Admin Web 文档中心

欢迎来到 Apex Scaffold 管理后台前端项目的文档中心。本文档提供完整的开发指南、功能说明和参考资料。

## 📚 文档导航

### 快速开始

- [项目主文档](../README.md) - 项目介绍、安装和快速开始
- [开发规范](../AGENTS.md) - AI Agent 开发规范与工程约束
- [贡献指南](../CONTRIBUTING.md) - 分支/提交/质量门/文档同步义务
- [更新日志](../CHANGELOG.md) - 版本变更记录

### 本次联调

- [2026-11-17 联调契约修复方案](specs/2026-11-17-integration-contract-repair.md) — FE-026，日期/数组分页/状态契约及验证边界。
- [2026-11-18 前后端全量联调方案](specs/2026-11-18-fullstack-integration.md) — FE-029 / BE-043，Podman Compose 联调环境、全量 API 对照和缺陷闭环。
- [2026-11-19 API 路由静态对照报告](records/2026-11-19-api-route-matrix.md) — API 导出函数与后端源码路由的静态映射；不代表真实 HTTP 联调通过。
- [2026-11-19 前后端联调执行记录](records/2026-11-19-fullstack-integration.md) — FE-029 / BE-043 的 Podman Compose 验证证据、未完成项与部署方授权前置条件。

### 架构文档

- [总体架构](architecture/overview.md) - 技术栈、分层架构、请求时序、部署架构、质量保障
- [认证与路由架构](architecture/auth-and-routing.md) - 登录、令牌无感刷新、OAuth2/PKCE、动态路由全流程图
- [领域模型与状态机图](architecture/domain-and-state-diagrams.md) - 核心领域模型类图、工作流实例/租户生命周期/办公绑定状态机、我的事项与数据总览聚合时序图
- [图表资产（Mermaid 源 + SVG）](diagrams/README.md) - 27 张图的 `.mmd` 源与同名 `.svg` 导出件、重导出命令与语法注意点

### API 文档

- [API 接口目录](api/README.md) - 按业务域整理的前端 API 封装、已确认页面接入、分页口径和错误处理约定

### 开发指南

- [部署指南](guides/deployment.md) - 生产环境部署配置与上线验证
- [数据库配置接口联调](guides/frontend-backend-integration.md) - 数据库配置采集与数据源管理的前后端接口对接（历史文件名，内容为数据库专用联调指南）
- [统一权限认证与多租户适配](guides/auth-tenant-adaptation.md) - 后端统一权限认证/多租户评审结论与前端适配说明
- [功能配置与数据维护覆盖](guides/config-maintenance-coverage.md) - 配置/维护能力清单、前端接入状态与外部核验项
- [数据库配置验证](guides/database-config-verification.md) - 数据库配置功能说明
- [Mock 数据服务](guides/mock-data-service.md) - 前端开发 Mock 数据使用指南

### 功能文档

- [数据库配置](features/database-config.md) - 数据库配置管理功能
- [文档图表管理](features/document-chart-management.md) - 文档和图表管理功能
- [基础文件上传](features/file-upload-basic.md) - 基础文件上传组件
- [增强文件上传](features/file-upload-enhanced.md) - 增强版文件上传组件

### 参考文档

- [测试指南](reference/testing.md) - Vitest 配置、现有用例、编写规范与覆盖率
- [工具库与组合式函数参考](reference/toolkit.md) - utils/composables/stores 全量导出与选型建议
- [注释规范](reference/comment-style.md) - 注释语言、文件头模板与禁止的坏注释

### 归档文档

- [项目报告](archived/project-reports/) - 历史项目报告和更新记录
  - [AGENTS 更新总结](archived/project-reports/agents-update-summary-2026-09-13.md)
  - [AGENTS 更新清单](archived/project-reports/agents-updates-2026-09-13.md)
  - [AGENTS 检查报告](archived/project-reports/agents-check-report-2026-09-13.md)
  - [AGENTS 补充建议](archived/project-reports/agents-supplements-2026-09-13.md)
  - [办公平台前端交付](archived/project-reports/office-frontend-delivery-2026-09-14.md)
  - [前端测试报告（2026-11-05）](archived/project-reports/test-report-2026-11-05.md)
  - [前后端对照评审（2026-11-06）](archived/project-reports/frontend-backend-review-2026-11-06.md)
  - [前后端对照评审（2026-11-08）](archived/project-reports/frontend-backend-review-2026-11-08.md)
  - [前端中台评审（2026-11-10）](archived/project-reports/frontend-middle-platform-review-2026-11-10.md)
  - [中台整改方案（2026-11-10）](archived/project-reports/frontend-middle-platform-adjustment-plan-2026-11-10.md)
  - [上线检查清单（2026-11-10）](archived/project-reports/frontend-middle-platform-go-live-checklist-2026-11-10.md)
  - [聚合评审与事项发现方案（2026-11-11）](archived/project-reports/frontend-aggregation-review-2026-11-11.md) - 聚合能力分层评审结论与「我的事项」工作台区块实施方案（已实施）
  - [聚合能力优化调整方案（2026-11-11）](archived/project-reports/frontend-aggregation-optimization-plan-2026-11-11.md) - P0/P1/P2 各项的详细执行步骤、代码设计、测试与验收标准（P0/P1 已实施，P2-1 另立项）
  - [前端测试报告（2026-11-13）](archived/project-reports/test-report-2026-11-13.md) - 单元/组件 65 文件 475 用例全绿 + E2E/Lighthouse/压测首建基线
- [前后端优化实施方案](archived/frontend-backend-optimization-plan-2026-10-01.md) - 前后端功能匹配评审与分级优化方案
- [后端待实现功能清单](archived/backend-pending-features-2026-10-01.md) - 后端待实现功能清单与接口契约
- [后端代码生成器实现](archived/backend-code-generator-implementation-2026-10-01.md) - 代码生成器模块后端完整实现代码
- [认证集成分析](archived/auth-integration-2026-09-08.md) - 认证与权限集成历史分析（2026-09-08 快照）
- [文件上传分析](archived/file-upload-analysis-2026-09-08.md) - 文件上传功能历史分析（2026-09-08 快照）
- [文件上传实现](archived/file-upload-implementation-2026-09-08.md) - 基础文件上传 MVP 实施记录（2026-09-08 快照）
- [增强文件上传实现](archived/file-upload-enhanced-implementation-2026-09-08.md) - 增强文件上传实施记录（2026-09-08 快照）
- [文档图表后端状态](archived/document-chart-backend-status-2026-09-12.md) - 文档图表后端集成状态快照（2026-09-12）
- [文档图表后端实施总结](archived/document-chart-backend-summary-2026-09-12.md) - 文档图表后端实施总结（2026-09-12）
- [文档图表功能总结](archived/document-chart-feature-summary-2026-09-12.md) - 文档和图表功能总结（2026-09-12）
- [监控大盘增强](archived/monitor-dashboard-enhancement-2026-10-25.md) - 监控大盘历史增强方案（TraceQuery 已于 2026-10-25 移除，正文保留当时口径）
- [历史文档](archived/) - 已归档的历史文档

## 📁 项目结构

```
apex-admin-web/
├── README.md                    # 项目主文档
├── AGENTS.md                    # 开发规范
├── docs/                        # 文档中心
│   ├── README.md               # 本文档
│   ├── guides/                 # 开发指南
│   ├── features/               # 功能文档
│   ├── archived/               # 归档文档
│   │   ├── project-reports/    # 项目报告
│   │   └── *.md                # 历史预归档文档（含日期后缀）
│   ├── architecture/           # 架构文档（总体架构、认证与路由）
│   ├── api/                    # API 接口目录（与 src/api/ 对齐）
│   └── reference/              # 参考文档（测试指南、工具库参考、注释规范）
├── scripts/                     # 脚本目录
│   ├── build/                  # 构建脚本
│   ├── database/               # 数据库脚本（archive/ 存历史增量菜单 SQL）
│   ├── performance/            # 性能测试脚本
│   ├── quality/                # 质量检查脚本（注释规范检查、测试报告归一化）
│   ├── security/               # 安全扫描脚本
│   ├── integration/            # API 路由静态审计与 Podman Compose 联调冒烟
│   └── verify/                 # 上线后验证脚本（post-deploy-check.sh，npm run verify:deploy）
└── src/                        # 源代码
```

## 🔍 按场景查找文档

### 新人入门
1. 阅读[项目主文档](../README.md)了解项目概况
2. 阅读[开发规范](../AGENTS.md)了解编码约定
3. 参考[部署指南](guides/deployment.md)搭建开发环境
4. 查接口对接与联调约定 → [API 接口目录](api/README.md)与[数据库配置接口联调](guides/frontend-backend-integration.md)

### 功能开发
- 需要文件上传功能 → [基础文件上传](features/file-upload-basic.md) 或 [增强文件上传](features/file-upload-enhanced.md)
- 需要数据库配置 → [数据库配置](features/database-config.md)
- 需要文档管理 → [文档图表管理](features/document-chart-management.md)
- 查接口定义 → [API 接口目录](api/README.md)
- 理解登录/路由机制 → [认证与路由架构](architecture/auth-and-routing.md)
- 写测试 → [测试指南](reference/testing.md)

### 问题排查
- 认证问题 → [认证与路由架构](architecture/auth-and-routing.md)
- 部署问题 → [部署指南](guides/deployment.md)
- 数据库配置联调 → [数据库配置接口联调](guides/frontend-backend-integration.md)

## 📝 文档规范

### 文档分类说明

- **guides/** - 面向开发者的操作指南,包含部署、集成、配置等实践指导
- **features/** - 功能特性说明,从用户角度描述功能和使用方法
- **architecture/** - 系统架构设计文档（含 Mermaid 架构图/流程图/时序图）
- **api/** - API 接口目录（按前端 API 封装、类型、页面调用和代理配置核对）
- **reference/** - 参考文档（测试指南、工具库与组合式函数参考）
- **archived/** - 已完成或过时的历史文档归档
  - **project-reports/** - 项目报告、更新记录等临时性文档

### 文档命名规范

- 使用小写字母和连字符: `file-upload-basic.md`
- 见名知意: 文件名应清晰表达文档内容
- 归档文档添加日期: `agents-update-summary-2026-09-13.md`

## 🚀 贡献指南

### 添加新文档
1. 根据文档类型选择合适的目录
2. 遵循文档命名规范
3. 在本 README 中更新相应的导航链接
4. 确保文档包含清晰的标题和目录结构

### 更新现有文档
1. 保持文档与代码同步
2. 重大更新时更新文档修订日期
3. 过时文档移动到 archived/ 目录

### 归档文档
- 项目完成的临时报告移至 `archived/project-reports/`
- 已过时的功能文档移至 `archived/`
- 归档时添加日期后缀便于追溯

## 📮 反馈与支持

如发现文档问题或有改进建议,请:
1. 提交 Issue 说明问题
2. 或直接提交 Pull Request 修复

---

**最后更新**: 2026-11-13  
**维护者**: Apex Admin Web Team

---

## 🏛 项目治理与任务管理（2026-11-16 增补）

本区块为治理规范新增的入口索引，原有文档分类（架构 / API / 指南 / 功能 / 参考 / 归档）**保持不变**。

### 规范与规则

- [项目治理规范（AGENTS.md 第 0 章）](../AGENTS.md) - 文档收口、任务体系、多智能体隔离、编码红线
- [任务大盘](tasks/project-tasks.md) - 全量任务、优先级、状态与验收标准（唯一可信源）

### 新增标准目录

| 目录 | 用途 | 入口 |
| --- | --- | --- |
| `docs/tasks/` | 任务大盘与迭代任务 | [tasks/README](tasks/README.md) |
| `docs/specs/` | 需求与技术方案（评审后实施） | [specs/README](specs/README.md) |
| `docs/plans/` | 实施与迁移计划 | [plans/README](plans/README.md) |
| `docs/records/` | 变更、改造、缺陷留痕 | [records/README](records/README.md) |
| `docs/reviews/` | 方案评审、代码评审记录 | [reviews/README](reviews/README.md) |
| `docs/notes/` | 调研、对接备忘、风险纪要 | [notes/README](notes/README.md) |
| `docs/diagrams/` | 图表资产（`.mmd` 源 + 同名 `.svg`） | [diagrams/README](diagrams/README.md) |

### 🗂 目录总览（全部一级目录，2026-11-16 增补）

本表是 `docs/` 的**唯一目录索引**：新增文档先查此表定去向；新增目录必须同步登记本表与 `scripts/governance/check-doc-layout.sh`。

| 目录 | 内容 | 性质 | 收新内容 | 入口 |
| --- | --- | --- | --- | --- |
| `docs/architecture/` | 总体架构、认证与路由、领域/状态机（图已资产化） | 架构 | 是 | [README](architecture/README.md) |
| `docs/api/` | 按业务域整理的接口文档（与 `src/api/*.ts` 对齐） | 接口 | 是 | [README](api/README.md) |
| `docs/features/` | 单功能实现说明（上传、数据库配置、图表管理等） | 功能 | 是 | [README](features/README.md) |
| `docs/guides/` | 操作指南（部署、联调、Mock、分支保护等） | 指南 | 是 | [README](guides/README.md) |
| `docs/reference/` | 参考手册（测试命令、注释风格、工具包）+ `ai-knowledge/` | 参考（受控） | 是（`ai-knowledge/` 强制台账） | [README](reference/README.md) |
| `docs/diagrams/` | 图表资产：`.mmd` 源 + 同名 `.svg`（27 对） | 资产 | 是（必须成对） | [README](diagrams/README.md) |
| `docs/tasks/` | 任务大盘（唯一任务登记处） | 规范六目录 | 是（强制） | [README](tasks/README.md) |
| `docs/specs/` | 规范正文与角色卡 | 规范六目录 | 是 | [README](specs/README.md) |
| `docs/plans/` | 方案/计划 | 规范六目录 | 是 | [README](plans/README.md) |
| `docs/records/` | 执行记录与验收证据 | 规范六目录 | 是 | [README](records/README.md) |
| `docs/reviews/` | 评审记录 | 规范六目录 | 是 | [README](reviews/README.md) |
| `docs/notes/` | 调研备忘（可升格为正式文档） | 规范六目录 | 是 | [README](notes/README.md) |
| `docs/archived/` | 历史归档（`project-reports/`、`ai-sessions/`） | 归档（只读） | 否 | [README](archived/README.md) |

**三条归置规则**

1. 新产出只进「收新内容 = 是」的目录；归档区只读、不追加。
2. 同一主题只一个权威落点：架构 → `architecture/`；接口 → `api/`；功能 → `features/`；操作 → `guides/`；测试命令 → `reference/testing.md`；图表源 → `diagrams/`。
3. 图表必须 `.mmd` + 同名 `.svg` 成对提交（`check-diagram-assets.sh` 校验），正文引用 `.svg` 并保留「图源」链接。

### 规范正文（完整、可独立阅读）

- [项目任务管理规范](specs/project-governance.md) — 优先级与五状态、文档收口、多智能体目录映射、`.gitignore` 规则、前端红线 F1–F10、执行记录、验收清单
- [AI 角色卡 R1–R5](specs/ai-agents/README.md) — 需求拆解 / 前端实现 / 契约守门 / 测试回归 / 评审

### 迁入的历史资料（自 AI 私有目录迁出，内容零删改）

- [AI 协作知识库](reference/ai-knowledge/README.md) - 原 `.workbuddy/knowledge`：当前状态、约定与坑、契约映射
- [ZCode 会话计划归档](archived/ai-sessions/zcode-plans/README.md) - 原 `.zcode/plans`：六份会话计划原始文本

### 治理自检

```bash
bash scripts/governance/verify-docs.sh        # 目录、索引、任务大盘、私有目录边界
bash scripts/governance/audit-frontend-rules.sh   # 前端红线扫描（默认警告模式）
```

脚本用法与判据见 [scripts/governance/README.md](../scripts/governance/README.md)；配合 `.githooks/pre-commit`（`git config core.hooksPath .githooks`）在提交前自动提示。
