# 后端集成状态报告

## 📊 总览

本文档记录前端项目与后端项目的集成状态，包括已完成的后端接口实现和待对接的功能。

---

## ✅ 已完成的后端工作（30%）

### 1. 数据库设计
- ✅ MySQL 迁移脚本：`V27__create_document_and_chart_tables.sql`
- ✅ PostgreSQL 迁移脚本：`V27__create_document_and_chart_tables.sql`
- ✅ 文档表（doc_document）
- ✅ 图表表（doc_chart）

### 2. 领域模型
- ✅ DocumentEntity - 文档聚合根实体
- ✅ ChartEntity - 图表聚合根实体
- ✅ 完整的领域行为方法
- ✅ 状态枚举和类型枚举

### 3. DTO 层
- ✅ DocumentRequest - 文档创建/更新请求
- ✅ DocumentQueryRequest - 文档查询请求
- ✅ DocumentResponse - 文档响应
- ✅ ChartRequest - 图表创建/更新请求
- ✅ ChartQueryRequest - 图表查询请求
- ✅ ChartResponse - 图表响应
- ✅ ChartDataResponse - 图表数据响应

---

## ⏳ 待完成的后端工作（70%）

### 4. Repository 层（0%）
- ⏳ DocumentRepository 接口
- ⏳ ChartRepository 接口
- ⏳ DocumentRepositoryImpl 实现
- ⏳ ChartRepositoryImpl 实现

### 5. Service 层（0%）
- ⏳ DocumentService 接口
- ⏳ ChartService 接口
- ⏳ DocumentServiceImpl 实现
- ⏳ ChartServiceImpl 实现

### 6. Handler 和 Router 层（0%）
- ⏳ DocumentHandler
- ⏳ ChartHandler
- ⏳ DocumentRouter
- ⏳ ChartRouter

### 7. 测试（0%）
- ⏳ 单元测试
- ⏳ 集成测试

### 8. 文档（0%）
- ⏳ API 文档
- ⏳ 测试报告

---

## 🔌 前端对接清单

### 前端已完成（100%）

#### 1. API 接口封装
- ✅ [src/api/document.ts](../../src/api/document.ts) - 文档管理接口
- ✅ [src/api/chart.ts](../../src/api/chart.ts) - 图表管理接口

#### 2. TypeScript 类型定义
- ✅ Document、Chart、ChartData、ChartSeries
- ✅ 与后端 DTO 完全对齐

#### 3. 页面组件
- ✅ [src/views/data/document/index.vue](../../src/views/data/document/index.vue) - 文档查询页面
- ✅ [src/views/data/chart/index.vue](../../src/views/data/chart/index.vue) - 图表查询页面

#### 4. 路由注册
- ✅ VIEW_REGISTRY 中已注册 `data/document/index` 和 `data/chart/index`

#### 5. Mock 数据服务
- ✅ [src/mock/index.ts](../../src/mock/index.ts) - 完整的 Mock 数据
- ✅ 支持所有 CRUD 操作
- ✅ 支持分页和筛选
- ✅ 支持 5 种图表类型数据生成

---

## 🚀 对接步骤

### 第一阶段：后端 API 开发完成后

1. **禁用 Mock 服务**
   ```typescript
   // src/mock/index.ts
   const MOCK_ENABLED = false
   ```

2. **验证接口对接**
   - 启动后端服务（端口 8080）
   - 启动前端服务（端口 5173）
   - 测试所有 API 端点

3. **菜单配置**
   - 在后端数据库添加菜单项：
     ```sql
     INSERT INTO sys_menu (menu_name, path, component, ...)
     VALUES
       ('数据管理', '/data', null, ...),  -- 目录
       ('文档查询', '/data/document', 'data/document/index', ...),
       ('图表查询', '/data/chart', 'data/chart/index', ...);
     ```

4. **权限配置**
   - 为角色分配权限码：
     - `data:document:view`
     - `data:document:create`
     - `data:document:edit`
     - `data:document:delete`
     - `data:chart:view`
     - `data:chart:create`
     - `data:chart:edit`
     - `data:chart:delete`

### 第二阶段：集成测试

1. **功能测试**
   - 文档CRUD操作
   - 图表CRUD操作
   - 分页和筛选
   - 文件上传/下载
   - 图表数据展示

2. **权限测试**
   - 按钮权限控制
   - 接口权限校验
   - 租户隔离

3. **性能测试**
   - 大数据量查询
   - 图表渲染性能
   - 文件上传性能

---

## 📋 API 接口清单

### 文档管理接口

| 方法 | 路径 | 功能 | 前端 | 后端 |
|------|------|------|------|------|
| GET | `/admin-api/v1/documents` | 分页查询 | ✅ | ⏳ |
| GET | `/admin-api/v1/documents/{id}` | 查询详情 | ✅ | ⏳ |
| POST | `/admin-api/v1/documents` | 创建文档 | ✅ | ⏳ |
| PUT | `/admin-api/v1/documents/{id}` | 更新文档 | ✅ | ⏳ |
| DELETE | `/admin-api/v1/documents/{id}` | 删除文档 | ✅ | ⏳ |
| PUT | `/admin-api/v1/documents/{id}/status` | 更新状态 | ✅ | ⏳ |
| GET | `/admin-api/v1/documents/{id}/download` | 下载文档 | ✅ | ⏳ |

### 图表管理接口

| 方法 | 路径 | 功能 | 前端 | 后端 |
|------|------|------|------|------|
| GET | `/admin-api/v1/charts` | 分页查询 | ✅ | ⏳ |
| GET | `/admin-api/v1/charts/{id}` | 查询详情 | ✅ | ⏳ |
| GET | `/admin-api/v1/charts/{id}/data` | 查询数据 | ✅ | ⏳ |
| POST | `/admin-api/v1/charts` | 创建图表 | ✅ | ⏳ |
| PUT | `/admin-api/v1/charts/{id}` | 更新图表 | ✅ | ⏳ |
| DELETE | `/admin-api/v1/charts/{id}` | 删除图表 | ✅ | ⏳ |
| PUT | `/admin-api/v1/charts/{id}/status` | 更新状态 | ✅ | ⏳ |

---

## 🎯 注意事项

### 数据格式对齐

1. **日期时间格式**
   - 后端：`LocalDateTime` → JSON: `yyyy-MM-dd HH:mm:ss`
   - 前端：`string` 格式接收

2. **分页参数**
   - 前端使用：`{ page, size }`
   - 后端接收：`PageRequest`

3. **状态码**
   - 文档状态：0=草稿，1=正常，2=归档
   - 图表状态：0=草稿，1=正常

4. **图表类型**
   - line, bar, pie, scatter, radar
   - 前后端保持一致

### 错误处理

1. **统一响应格式**
   ```typescript
   {
     code: 0,          // 0=成功，其他=错误码
     msg: "操作成功",
     data: {},
     traceId: "xxx"
   }
   ```

2. **错误提示**
   - 使用 `ElMessage.error()` 显示错误信息
   - 显示 traceId 便于追踪

### 权限控制

1. **按钮级权限**
   ```html
   <el-button v-permission="'data:document:create'">新增</el-button>
   ```

2. **接口级权限**
   - 后端使用 `@PreAuthorize` 注解
   - 401 响应自动跳转登录页

---

## 📚 相关文档

- [文档和图表查询功能说明](./document-chart-query.md)
- [Mock 使用指南](../mock/README.md)
- [后端实施进度报告](/Users/work/apex-scaffold/docs/DOCUMENT_CHART_IMPLEMENTATION_PROGRESS.md)

---

**文档最后更新时间**：2026-09-12
**维护者**：开发团队
