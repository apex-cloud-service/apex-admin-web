# Apex Admin Web 文档中心

本目录包含 apex-admin-web 前端项目的所有文档。

## 📁 文档结构

```
docs/
├── README.md                           # 本文档
├── guides/                             # 指南文档
│   ├── deployment.md                   # 部署指南
│   ├── frontend-backend-integration.md # 前后端集成指南
│   └── database-config-verification.md # 数据库配置验证
├── features/                           # 功能文档
│   ├── file-upload-basic.md           # 基础文件上传功能
│   ├── file-upload-enhanced.md        # 增强文件上传功能
│   └── database-config.md             # 数据库配置功能
├── analysis/                           # 分析文档
│   ├── auth-integration.md            # 认证授权集成分析
│   └── file-upload-analysis.md        # 文件上传功能分析
└── implementation/                     # 实施文档
    ├── file-upload-implementation.md  # 基础文件上传实施总结
    ├── file-upload-enhanced-implementation.md # 增强文件上传实施总结
    ├── documentation-reorganization.md # 文档整合报告
    └── agents-md-rewrite-plan.md      # AGENTS.md 重写计划
```

## 📖 文档分类说明

### 核心文档（项目根目录）

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目概述、快速开始、目录结构 |
| [AGENTS.md](../AGENTS.md) | **AI Agents 工作规范**（最重要） |

### 指南文档 (docs/guides/)

**部署与运维相关的操作指南**

| 文档 | 说明 |
|------|------|
| [deployment.md](guides/deployment.md) | 构建、部署、Docker 容器化完整指南 |
| [frontend-backend-integration.md](guides/frontend-backend-integration.md) | 前后端接口对接说明 |
| [database-config-verification.md](guides/database-config-verification.md) | 数据库配置功能前端验证 |

### 功能文档 (docs/features/)

**具体功能模块的使用文档**

| 文档 | 说明 |
|------|------|
| [file-upload-basic.md](features/file-upload-basic.md) | 基础文件上传功能使用指南 |
| [file-upload-enhanced.md](features/file-upload-enhanced.md) | 增强文件上传功能（裁剪、压缩、粘贴）|
| [database-config.md](features/database-config.md) | 数据库配置采集功能实施文档 |

### 分析文档 (docs/analysis/)

**技术分析与设计决策记录**

| 文档 | 说明 |
|------|------|
| [auth-integration.md](analysis/auth-integration.md) | 后端认证授权功能对应前端页面分析 |
| [file-upload-analysis.md](analysis/file-upload-analysis.md) | 文件上传功能实现分析 |

### 实施文档 (docs/implementation/)

**功能实施总结和项目记录**

| 文档 | 说明 |
|------|------|
| [file-upload-implementation.md](implementation/file-upload-implementation.md) | 基础文件上传功能实施总结 |
| [file-upload-enhanced-implementation.md](implementation/file-upload-enhanced-implementation.md) | 增强文件上传功能实施总结 |
| [documentation-reorganization.md](implementation/documentation-reorganization.md) | 文档整合重组报告（第一版） |
| [documentation-reorganization-final.md](implementation/documentation-reorganization-final.md) | 文档整合重组报告（最终版） |
| [agents-md-rewrite-plan.md](implementation/agents-md-rewrite-plan.md) | AGENTS.md 重写计划 |
| [link-validation-report.md](implementation/link-validation-report.md) | 文档链接验证报告 |
| [image-validation-report.md](implementation/image-validation-report.md) | 文档图片引用验证报告 |

## 🔍 快速导航

### 我想...

- **部署项目** → [deployment.md](guides/deployment.md)
- **了解前后端对接** → [frontend-backend-integration.md](guides/frontend-backend-integration.md)
- **使用文件上传** → [file-upload-basic.md](features/file-upload-basic.md) 或 [file-upload-enhanced.md](features/file-upload-enhanced.md)
- **配置数据库** → [database-config.md](features/database-config.md)
- **查看 AI 工作规范** → [../AGENTS.md](../AGENTS.md)

## 📝 文档维护规范

### 文档分类原则

1. **guides/** - 操作性强的指南文档
   - 部署、配置、集成等操作流程
   - 面向开发者和运维人员
   - 需要长期维护

2. **features/** - 功能使用文档
   - 具体功能模块的使用说明
   - 面向开发者使用组件
   - 随功能更新而更新

3. **analysis/** - 技术分析文档
   - 设计决策、技术选型、架构分析
   - 面向架构师和技术决策者
   - 相对稳定，记录历史决策

4. **implementation/** - 实施文档
   - 功能实施总结和项目记录
   - AI 工作记录和实施报告
   - 记录实施过程和决策

### 新增文档时

1. 确定文档类型（指南/功能/分析）
2. 放入对应目录
3. 更新本 README 的索引
4. 如果是核心功能，在 AGENTS.md 中添加引用

### 文档命名规范

- 使用小写字母和连字符
- 英文命名，简洁明了
- 示例：`file-upload-basic.md`、`deployment.md`

## 📚 相关资源

- [前端规范 AGENTS.md](../AGENTS.md) - **必读**
- [项目 README](../README.md) - 项目概述
- [后端文档](https://github.com/your-org/apex-scaffold/tree/main/docs) - 后端仓库文档

---

**文档版本：** v1.0  
**最后更新：** 2026-09-09  
**维护人员：** 开发团队