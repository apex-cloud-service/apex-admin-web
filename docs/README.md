# Apex Admin Web 文档中心

欢迎来到 Apex Scaffold 管理后台前端项目的文档中心。本文档提供完整的开发指南、功能说明和参考资料。

## 📚 文档导航

### 快速开始

- [项目主文档](../README.md) - 项目介绍、安装和快速开始
- [开发规范](../AGENTS.md) - AI Agent 开发规范与工程约束
- [贡献指南](../CONTRIBUTING.md) - 分支/提交/质量门/文档同步义务
- [更新日志](../CHANGELOG.md) - 版本变更记录

### 架构文档

- [总体架构](architecture/overview.md) - 技术栈、分层架构、请求时序、部署架构、质量保障
- [认证与路由架构](architecture/auth-and-routing.md) - 登录、令牌无感刷新、OAuth2/PKCE、动态路由全流程图

### API 文档

- [API 接口目录](api/README.md) - 按业务域整理的前端 API 封装、已确认页面接入、分页口径和错误处理约定

### 开发指南

- [部署指南](guides/deployment.md) - 生产环境部署配置
- [前后端集成](guides/frontend-backend-integration.md) - 前后端联调和接口对接
- [统一权限认证与多租户适配](guides/auth-tenant-adaptation.md) - 后端统一权限认证/多租户评审结论与前端适配说明
- [功能配置与数据维护覆盖](guides/config-maintenance-coverage.md) - 配置/维护能力清单、前端接入状态与外部核验项
- [数据库配置验证](guides/database-config-verification.md) - 数据库配置功能说明
- [Mock 数据服务](guides/mock-data-service.md) - 前端开发 Mock 数据使用指南

### 功能文档

- [数据库配置](features/database-config.md) - 数据库配置管理功能
- [文档图表管理](features/document-chart-management.md) - 文档和图表管理功能
- [基础文件上传](features/file-upload-basic.md) - 基础文件上传组件
- [增强文件上传](features/file-upload-enhanced.md) - 增强版文件上传组件

### 实现文档

- [文档图表后端状态](implementation/document-chart-backend-status.md) - 文档图表功能后端集成状态
- [文件上传实现](implementation/file-upload-implementation.md) - 基础文件上传实现细节
- [增强文件上传实现](implementation/file-upload-enhanced-implementation.md) - 增强版文件上传实现细节
- [监控大盘增强](implementation/monitor-dashboard-enhancement.md) - 监控大盘前端优化完整实现方案

### 参考文档

- [测试指南](reference/testing.md) - Vitest 配置、现有用例、编写规范与覆盖率
- [工具库与组合式函数参考](reference/toolkit.md) - utils/composables/stores 全量导出与选型建议

### 分析文档

- [认证集成分析](analysis/auth-integration.md) - 用户认证和权限集成分析
- [文件上传分析](analysis/file-upload-analysis.md) - 文件上传功能分析

### 归档文档

- [项目报告](archived/project-reports/) - 历史项目报告和更新记录
  - [AGENTS 更新总结](archived/project-reports/agents-update-summary-2026-09-13.md)
  - [AGENTS 更新清单](archived/project-reports/agents-updates-2026-09-13.md)
  - [AGENTS 检查报告](archived/project-reports/agents-check-report-2026-09-13.md)
  - [AGENTS 补充建议](archived/project-reports/agents-supplements-2026-09-13.md)
  - [办公平台前端交付](archived/project-reports/office-frontend-delivery-2026-09-14.md)
- [前后端优化实施方案](archived/frontend-backend-optimization-plan-2026-10-01.md) - 前后端功能匹配评审与分级优化方案
- [后端待实现功能清单](archived/backend-pending-features-2026-10-01.md) - 后端待实现功能清单与接口契约
- [后端代码生成器实现](archived/backend-code-generator-implementation-2026-10-01.md) - 代码生成器模块后端完整实现代码
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
│   ├── implementation/         # 实现文档
│   ├── analysis/               # 分析文档
│   ├── archived/               # 归档文档
│   │   ├── project-reports/    # 项目报告
│   │   └── *.md                # 历史预归档文档（含日期后缀）
│   ├── architecture/           # 架构文档（总体架构、认证与路由）
│   ├── api/                    # API 接口目录（与 src/api/ 对齐）
│   └── reference/              # 参考文档（测试指南、工具库参考）
├── scripts/                     # 脚本目录
│   ├── build/                  # 构建脚本
│   ├── database/               # 数据库脚本
│   ├── performance/            # 性能测试脚本
│   └── security-scan.sh        # 安全扫描脚本
└── src/                        # 源代码
```

## 🔍 按场景查找文档

### 新人入门
1. 阅读[项目主文档](../README.md)了解项目概况
2. 阅读[开发规范](../AGENTS.md)了解编码约定
3. 参考[部署指南](guides/deployment.md)搭建开发环境
4. 查看[前后端集成](guides/frontend-backend-integration.md)了解联调流程

### 功能开发
- 需要文件上传功能 → [基础文件上传](features/file-upload-basic.md) 或 [增强文件上传](features/file-upload-enhanced.md)
- 需要数据库配置 → [数据库配置](features/database-config.md)
- 需要文档管理 → [文档图表管理](features/document-chart-management.md)
- 查接口定义 → [API 接口目录](api/README.md)
- 理解登录/路由机制 → [认证与路由架构](architecture/auth-and-routing.md)
- 写测试 → [测试指南](reference/testing.md)

### 问题排查
- 认证问题 → [认证集成分析](analysis/auth-integration.md)
- 部署问题 → [部署指南](guides/deployment.md)
- 后端联调 → [前后端集成](guides/frontend-backend-integration.md)

## 📝 文档规范

### 文档分类说明

- **guides/** - 面向开发者的操作指南,包含部署、集成、配置等实践指导
- **features/** - 功能特性说明,从用户角度描述功能和使用方法
- **implementation/** - 技术实现细节,面向开发者的代码实现说明
- **analysis/** - 技术分析文档,包含架构分析、技术选型等
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

**最后更新**: 2026-10-30  
**维护者**: Apex Admin Web Team
