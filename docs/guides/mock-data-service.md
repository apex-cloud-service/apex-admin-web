# Mock 数据服务使用指南

## 📋 概述

本项目集成了 Mock.js 数据服务，用于前端独立开发和测试。Mock 服务会自动拦截 API 请求并返回模拟数据，无需依赖后端环境。

## 🎯 功能特性

### 1. 自动启用
- **开发环境**：自动启用 Mock 服务
- **生产环境**：自动禁用，不影响生产构建

### 2. 完整的 CRUD 操作
- **文档管理**：增删改查、状态更新、下载
- **图表管理**：增删改查、状态更新、数据查询

### 3. 真实的业务场景
- 分页查询
- 多维度筛选
- 随机数据生成
- 延迟模拟（200-600ms）

## 📁 文件结构

```
src/
├── mock/
│   └── index.ts              # Mock 数据服务（文档和图表）
└── main.ts                   # 引入 Mock 服务
```

## 🚀 使用方式

### 1. 启用 Mock 服务

Mock 服务已在 `main.ts` 中自动引入，开发环境下会自动生效：

```typescript
// Mock 数据服务（仅开发环境生效）
if (import.meta.env.DEV) {
  import('./mock')
}
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，控制台会显示：
```
📦 Mock 数据服务已启用
```

### 3. 访问页面测试

- 文档查询：`http://localhost:5173/data/document`
- 图表查询：`http://localhost:5173/data/chart`

所有 API 请求会被 Mock 服务拦截，返回模拟数据。

## 📊 Mock 数据说明

### 文档 Mock 数据

#### 数据量
- 初始生成 **50 条**文档数据
- 支持动态新增、编辑、删除

#### 字段说明
```typescript
{
  id: string                    // UUID
  title: string                 // 随机中文标题（10-30字）
  docType: string               // contract/report/proposal/manual/other
  category: string              // tech/business/finance/hr
  content: string               // 随机中文段落（5-10句）
  fileUrl?: string              // 50%概率生成文件URL
  fileSize: number              // 1KB - 10MB
  authorName: string            // 张三/李四/王五/赵六/钱七
  status: number                // 0=草稿 1=正常 2=归档
  tags: string[]                // 1-3个标签
  viewCount: number             // 0-1000
  downloadCount: number         // 0-500
  createTime: string            // yyyy-MM-dd HH:mm:ss
  updateTime: string            // yyyy-MM-dd HH:mm:ss
}
```

#### 支持的操作
- ✅ 分页查询（支持 keyword/docType/category/status 筛选）
- ✅ 查询详情
- ✅ 创建文档
- ✅ 更新文档
- ✅ 删除文档
- ✅ 更新状态
- ✅ 下载文档

### 图表 Mock 数据

#### 数据量
- 初始生成 **30 条**图表数据
- 支持动态新增、编辑、删除

#### 字段说明
```typescript
{
  id: string                    // UUID
  chartName: string             // 随机中文标题 + "图表"
  chartType: string             // line/bar/pie/scatter/radar
  category: string              // business/tech/operation/finance
  description: string           // 随机中文句子（10-30字）
  dataSource: string            // API 地址
  creatorName: string           // 张三/李四/王五/赵六/钱七
  status: number                // 0=草稿 1=正常
  viewCount: number             // 0-1000
  createTime: string            // yyyy-MM-dd HH:mm:ss
  updateTime: string            // yyyy-MM-dd HH:mm:ss
}
```

#### 图表数据类型

**折线图（line）**
```javascript
{
  xAxis: ['1月', '2月', ..., '12月'],
  series: [
    { name: '系列1', type: 'line', data: [随机数据] },
    { name: '系列2', type: 'line', data: [随机数据] }
  ]
}
```

**柱状图（bar）**
```javascript
{
  xAxis: ['1月', '2月', ..., '6月'],
  series: [
    { name: '产品A', type: 'bar', data: [随机数据] },
    { name: '产品B', type: 'bar', data: [随机数据] },
    { name: '产品C', type: 'bar', data: [随机数据] }
  ]
}
```

**饼图（pie）**
```javascript
{
  series: [
    {
      name: '数据分布',
      type: 'pie',
      data: [
        { name: '类别A', value: 随机数 },
        { name: '类别B', value: 随机数 },
        ...
      ]
    }
  ]
}
```

#### 支持的操作
- ✅ 分页查询（支持 keyword/chartType/category/status 筛选）
- ✅ 查询详情
- ✅ 查询图表数据（根据 chartType 返回不同结构）
- ✅ 创建图表
- ✅ 更新图表
- ✅ 删除图表
- ✅ 更新状态

## 🔧 自定义配置

### 1. 调整数据量

编辑 `src/mock/index.ts`：

```typescript
// 文档数据量（默认50条）
const documentDatabase: Document[] = Array.from({ length: 100 }, () => generateDocument())

// 图表数据量（默认30条）
const chartDatabase: Chart[] = Array.from({ length: 50 }, () => generateChart())
```

### 2. 调整响应延迟

```typescript
Mock.setup({
  timeout: '200-600'  // 修改为需要的延迟范围（毫秒）
})
```

### 3. 禁用 Mock 服务

如果需要测试真实后端接口，在 `main.ts` 中注释掉 Mock 引入：

```typescript
// Mock 数据服务（仅开发环境生效）
// if (import.meta.env.DEV) {
//   import('./mock')
// }
```

或直接修改 `src/mock/index.ts`：

```typescript
const MOCK_ENABLED = false  // 改为 false
```

## 🐛 常见问题

### Q1: Mock 服务未生效
**检查清单**：
1. 确认是开发环境（`npm run dev`）
2. 查看控制台是否有 "📦 Mock 数据服务已启用"
3. 检查浏览器控制台 Network 标签，请求是否被拦截

### Q2: 数据不持久化
**原因**：Mock 数据存储在内存中，刷新页面后重置
**解决**：这是正常行为，如需持久化可使用 localStorage 或真实后端

### Q3: 图表数据格式错误
**原因**：不同图表类型需要不同的数据结构
**解决**：Mock 服务已根据 `chartType` 自动返回正确格式

### Q4: 筛选不生效
**检查**：
1. 确认参数名称正确（keyword/docType/category/status）
2. 查看浏览器控制台 Network 标签，检查请求参数
3. Mock 服务会记录匹配的正则表达式

## 📈 测试场景

### 场景1：分页查询
```typescript
// 自动测试
1. 访问文档/图表列表页
2. 修改每页条数
3. 切换页码
4. 观察数据变化
```

### 场景2：筛选功能
```typescript
// 自动测试
1. 输入关键词搜索
2. 选择类型筛选
3. 选择分类筛选
4. 选择状态筛选
5. 点击查询按钮
6. 观察筛选结果
```

### 场景3：CRUD 操作
```typescript
// 自动测试
1. 新增：填写表单 → 提交 → 列表刷新
2. 编辑：点击编辑 → 修改数据 → 提交 → 列表更新
3. 删除：点击删除 → 确认 → 列表刷新
4. 状态：修改状态 → 列表更新
```

### 场景4：图表渲染
```typescript
// 自动测试
1. 访问图表列表页
2. 点击"查看图表"
3. 观察 ECharts 渲染
4. 切换不同类型的图表
5. 检查数据是否正确显示
```

## 🎨 数据示例

### 文档示例
```json
{
  "id": "8f8d7e6c-5b4a-3c2d-1e0f-9a8b7c6d5e4f",
  "title": "2024年度财务预算报告",
  "docType": "report",
  "category": "finance",
  "content": "本报告详细阐述了2024年度的财务预算情况...",
  "fileUrl": "https://example.com/files/budget-2024.pdf",
  "fileSize": 2048576,
  "authorName": "张三",
  "status": 1,
  "tags": ["重要", "财务", "年度"],
  "viewCount": 156,
  "downloadCount": 42,
  "createTime": "2024-01-15 10:30:00",
  "updateTime": "2024-01-20 14:25:00"
}
```

### 图表示例
```json
{
  "id": "7a6b5c4d-3e2f-1a0b-9c8d-7e6f5a4b3c2d",
  "chartName": "月度销售趋势图表",
  "chartType": "line",
  "category": "business",
  "description": "展示2024年各月销售数据变化趋势",
  "dataSource": "https://api.example.com/data/sales",
  "status": 1,
  "creatorName": "李四",
  "viewCount": 89,
  "createTime": "2024-02-10 09:15:00",
  "updateTime": "2024-02-15 16:40:00"
}
```

## 🔗 相关文档

- [Mock.js 官方文档](http://mockjs.com/)
- [ECharts 官方文档](https://echarts.apache.org/zh/index.html)
- [文档和图表管理功能说明](../features/document-chart-management.md)

## 📝 更新日志

### v1.0.0 (2026-09-12)
- ✅ 初始版本
- ✅ 支持文档管理 Mock 数据
- ✅ 支持图表管理 Mock 数据
- ✅ 支持完整的 CRUD 操作
- ✅ 支持分页和筛选
- ✅ 支持 5 种图表类型数据生成

---

**最后更新时间**：2026-09-12  
**维护者**：开发团队
