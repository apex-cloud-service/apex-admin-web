# 数据库配置采集页实施文档

## 概述

已完成数据库配置采集页的前端实现，该页面定位为**部署配置采集与导出工具**，而非运行时数据库管理控制台。

## 实施内容

### 1. 类型定义 (`src/types/index.ts`)

新增以下 TypeScript 类型：

- `DatabaseConfig`: 数据库配置（dbType, host, port, database, username, connectionParams, environment）
- `DatabaseTestResult`: 连接测试结果（success, message, version）
- `DeploymentConfigResult`: 部署配置生成结果（yaml, env, dockerCompose）
- `CurrentDatabaseInfo`: 当前数据库信息（type, version, driverVersion）

### 2. API 接口 (`src/api/database.ts`)

实现三个核心接口：

- `testDatabaseConnection()`: 测试数据库连接
- `generateDeploymentConfig()`: 生成部署配置（YAML/env/docker-compose）
- `getCurrentDatabaseInfo()`: 获取当前数据库信息

**安全边界**：密码参数仅用于一次性测试和配置生成，不会被前端保存。

> 2026-10-31 补充：`src/api/database.ts` 现已扩展数据源台账管理能力——`listDataSources`（分页，url/username 已脱敏）、`createDataSource`、`updateDataSource`、`deleteDataSource`、`getDataSourceMetrics`（连接池指标）。上文「三个核心接口」为早期实现描述，仍准确但已不完整。

### 3. 页面组件 (`src/views/system/database/index.vue`)

**核心功能**：

- 数据库类型选择：MySQL / PostgreSQL
- 连接参数表单：主机、端口、数据库名、用户名、密码、连接参数
- 部署环境选择：dev / test / prod
- 连接测试：验证配置有效性
- 配置导出：生成 YAML、环境变量、Docker Compose 配置
- 当前数据库信息展示：显示运行中的数据库类型和版本

**用户体验**：

- 切换数据库类型自动设置默认端口（MySQL: 3306, PostgreSQL: 5432）
- 表单验证确保必填字段完整
- 配置导出弹窗支持多格式查看和一键复制
- 安全提示明确告知密码不保存

### 4. 路由注册 (`src/router/dynamic.ts`)

已在 `VIEW_REGISTRY` 中注册：

```typescript
'system/database/index': () => import('@/views/system/database/index.vue')
```

### 5. 菜单注册（SQL 脚本）

菜单 SQL 脚本位于 `scripts/database/menu-init.sql`（菜单初始化脚本），包括：

- 数据库配置菜单项（在系统管理下）
- 三个按钮权限：测试连接、生成配置、查询数据库信息

**重要**：需要根据实际系统管理目录的 `parent_id` 调整 SQL 中的值。

## 验证结果

✅ **TypeScript 类型检查**：`vue-tsc --noEmit` 通过  
✅ **生产构建**：成功构建到 `/tmp/apex-admin-web-dist`  
✅ **模块数量**：2321 个模块正常转换  

## 后续工作

### 前端部分（已完成）

- [x] TypeScript 类型定义
- [x] API 接口封装
- [x] 页面组件实现
- [x] 路由注册
- [x] 菜单 SQL 脚本
- [x] 类型检查和构建验证

### 后端部分（待实现）

需要在 `apex-scaffold` 后端项目中实现以下接口：

1. **POST** `/admin-api/v1/database/test`
   - 请求体：`DatabaseConfig & { password: string }`
   - 响应：`DatabaseTestResult`
   - 功能：验证数据库连接参数

2. **POST** `/admin-api/v1/database/generate-config`
   - 请求体：`DatabaseConfig & { password: string }`
   - 响应：`DeploymentConfigResult`
   - 功能：生成 YAML/env/docker-compose 配置

3. **GET** `/admin-api/v1/database/current`
   - 响应：`CurrentDatabaseInfo`
   - 功能：返回当前运行数据库的类型和版本

### 数据库部分（待执行）

执行 `scripts/database/menu-init.sql` 脚本，将数据库配置菜单添加到 `sys_menu` 表。

## 使用流程

1. 管理员登录系统
2. 进入"系统管理" → "数据库配置"
3. 选择数据库类型（MySQL / PostgreSQL）
4. 填写连接参数（主机、端口、数据库名、用户名、密码）
5. 点击"测试连接"验证配置
6. 点击"生成配置"导出部署配置文件
7. 复制生成的 YAML/env/docker-compose 配置用于部署

## 安全设计

- ✅ 密码仅用于一次性操作，不保存到前端状态或存储
- ✅ 页面顶部明确显示安全提示
- ✅ API 请求通过 HTTPS 传输（生产环境）
- ✅ 后端需验证用户权限（`system:database:*`）
- ✅ 生成的配置建议通过环境变量或密钥系统注入密码，而非硬编码

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Element Plus
- Vite
- Vue Router

## 文件清单

```
apex-admin-web/
├── src/
│   ├── types/index.ts                    # 新增类型定义
│   ├── api/database.ts                   # 新增 API 接口
│   ├── views/system/database/index.vue   # 新增页面组件
│   └── router/dynamic.ts                 # 修改（添加路由注册）
├── scripts/database/menu-init.sql        # 菜单注册 SQL
└── docs/features/database-config.md      # 本文档
```

## 注意事项

1. **路由生效**：菜单 SQL 执行后需重新登录或刷新菜单缓存
2. **权限控制**：确保目标用户角色拥有 `system:database:view` 权限
3. **后端实现**：前端页面依赖后端三个接口的实现
4. **环境差异**：开发环境可能需要配置 CORS 或代理

## 参考文档

- 功能验证清单：`docs/guides/database-config-verification.md`
- 后端方案文档：`apex-scaffold` 仓库 `docs/07-commercial/`（原 `.trae/documents/` 方案未入库，如需原文请联系后端维护人）
- 前端规范：`AGENTS.md`
