# 文档和图表查询功能说明

## 📋 功能概述

本文档描述了新增的文档管理和图表查询功能，包括前端页面实现、API 接口对接、类型定义等完整内容。

## 🎯 功能特性

### 1. 文档管理功能

#### 1.1 核心功能
- **文档列表查询**：支持分页、多维度筛选
- **文档详情查看**：完整展示文档信息
- **文档下载**：支持附件下载
- **文档 CRUD**：新增、编辑、删除文档
- **状态管理**：草稿、正常、归档三种状态

#### 1.2 筛选条件
- **关键词搜索**：标题/内容模糊搜索
- **文档类型**：合同、报告、方案、手册、其他
- **分类筛选**：技术、业务、财务、人力
- **状态筛选**：草稿、正常、归档

#### 1.3 权限控制
- `data:document:create` - 新增文档权限
- `data:document:edit` - 编辑文档权限
- `data:document:delete` - 删除文档权限

### 2. 图表管理功能

#### 2.1 核心功能
- **图表列表查询**：支持分页、多维度筛选
- **图表数据展示**：基于 ECharts 5.x 渲染
- **图表 CRUD**：新增、编辑、删除图表
- **状态管理**：草稿、正常两种状态

#### 2.2 支持的图表类型
- **折线图（line）**：趋势分析
- **柱状图（bar）**：数据对比
- **饼图（pie）**：占比展示
- **散点图（scatter）**：关系分析
- **雷达图（radar）**：多维度评估

#### 2.3 筛选条件
- **关键词搜索**：图表名称模糊搜索
- **图表类型**：折线图、柱状图、饼图、散点图、雷达图
- **分类筛选**：业务、技术、运营、财务
- **状态筛选**：草稿、正常

#### 2.4 权限控制
- `data:chart:create` - 新增图表权限
- `data:chart:edit` - 编辑图表权限
- `data:chart:delete` - 删除图表权限

## 📁 文件结构

```
src/
├── api/
│   ├── document.ts           # 文档管理 API 接口
│   └── chart.ts              # 图表管理 API 接口
├── types/
│   └── index.ts              # 类型定义（Document、Chart、ChartData、ChartSeries）
├── views/
│   └── data/
│       ├── document/
│       │   └── index.vue     # 文档查询页面
│       └── chart/
│           └── index.vue     # 图表查询页面
└── router/
    └── dynamic.ts            # 路由注册（VIEW_REGISTRY）
```

## 🔌 后端接口说明

### 文档管理接口

| 接口 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/admin-api/v1/documents` | GET | 分页查询文档列表 | - |
| `/admin-api/v1/documents/{id}` | GET | 查询文档详情 | - |
| `/admin-api/v1/documents` | POST | 创建文档 | `data:document:create` |
| `/admin-api/v1/documents/{id}` | PUT | 更新文档 | `data:document:edit` |
| `/admin-api/v1/documents/{id}` | DELETE | 删除文档 | `data:document:delete` |
| `/admin-api/v1/documents/{id}/status` | PUT | 更新文档状态 | `data:document:edit` |
| `/admin-api/v1/documents/{id}/download` | GET | 下载文档 | - |

### 图表管理接口

| 接口 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/admin-api/v1/charts` | GET | 分页查询图表列表 | - |
| `/admin-api/v1/charts/{id}` | GET | 查询图表详情 | - |
| `/admin-api/v1/charts/{id}/data` | GET | 查询图表数据 | - |
| `/admin-api/v1/charts` | POST | 创建图表 | `data:chart:create` |
| `/admin-api/v1/charts/{id}` | PUT | 更新图表 | `data:chart:edit` |
| `/admin-api/v1/charts/{id}` | DELETE | 删除图表 | `data:chart:delete` |
| `/admin-api/v1/charts/{id}/status` | PUT | 更新图表状态（⚠️ 后端契约；**前端未封装也未调用**，可用性需以后端为准） | `data:chart:edit` |

## 📊 类型定义

### Document（文档信息）

```typescript
interface Document {
  id: string
  title: string                    // 文档标题
  docType: string                  // 文档类型：contract/report/proposal/manual/other
  category?: string                // 分类：tech/business/finance/hr
  content?: string                 // 文档内容
  fileUrl?: string                 // 附件URL
  fileSize?: number                // 文件大小（字节）
  authorId?: string                // 作者ID
  authorName?: string              // 作者名称
  status: number                   // 状态：0=草稿 1=正常 2=归档
  tags?: string[]                  // 标签
  viewCount?: number               // 查看次数
  downloadCount?: number           // 下载次数
  createTime?: string              // 创建时间
  updateTime?: string              // 更新时间
}
```

### Chart（图表信息）

```typescript
interface Chart {
  id: string
  chartName: string                // 图表名称
  chartType: string                // 图表类型：line/bar/pie/scatter/radar
  category?: string                // 分类：business/tech/operation/finance
  description?: string             // 图表描述
  dataSource?: string              // 数据源地址
  config?: Record<string, unknown> // 图表配置
  status: number                   // 状态：0=草稿 1=正常
  creatorId?: string               // 创建者ID
  creatorName?: string             // 创建者名称
  viewCount?: number               // 查看次数
  createTime?: string              // 创建时间
  updateTime?: string              // 更新时间
}
```

### ChartData（图表数据）

```typescript
interface ChartData {
  chartId: string
  chartType: string                // 图表类型
  title?: string                   // 图表标题
  xAxis?: string[]                 // X轴数据
  series?: ChartSeries[]           // 数据系列
  legend?: string[]                // 图例
  tooltip?: Record<string, unknown>
  grid?: Record<string, unknown>
}

interface ChartSeries {
  name: string                     // 系列名称
  type: string                     // 系列类型
  data: (number | string | null)[] // 数据
  itemStyle?: Record<string, unknown>
  lineStyle?: Record<string, unknown>
  areaStyle?: Record<string, unknown>
}
```

## 🚀 使用方式

### 1. 路由配置

在后端菜单表（`sys_menu`）中添加以下菜单项：

```sql
-- 数据管理目录
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, icon, sort)
VALUES ('数据管理', '/data', NULL, 0, 0, 1, 1, 'document', 5);

-- 文档查询菜单
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, perms, sort)
VALUES ('文档查询', '/data/document', 'data/document/index', 1, (SELECT id FROM sys_menu WHERE path='/data'), 1, 1, 'data:document:view', 1);

-- 图表查询菜单
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, perms, sort)
VALUES ('图表查询', '/data/chart', 'data/chart/index', 1, (SELECT id FROM sys_menu WHERE path='/data'), 1, 1, 'data:chart:view', 2);
```

### 2. 权限配置

为角色分配以下权限：

**文档管理权限**：
- `data:document:view` - 查看文档
- `data:document:create` - 新增文档
- `data:document:edit` - 编辑文档
- `data:document:delete` - 删除文档

**图表管理权限**：
- `data:chart:view` - 查看图表
- `data:chart:create` - 新增图表
- `data:chart:edit` - 编辑图表
- `data:chart:delete` - 删除图表

### 3. 前端访问

启动开发服务器后，通过以下路径访问：

- 文档查询：`http://localhost:5173/data/document`
- 图表查询：`http://localhost:5173/data/chart`

## 🎨 技术实现

### 1. ECharts 图表渲染

```typescript
// 初始化 ECharts 实例
chartInstance = echarts.init(chartRef.value)

// 设置图表配置
const option: echarts.EChartsOption = {
  title: { text: chartData.title, left: 'center' },
  tooltip: { trigger: 'axis' },
  legend: { data: chartData.legend, bottom: 10 },
  xAxis: { type: 'category', data: chartData.xAxis },
  yAxis: { type: 'value' },
  series: chartData.series
}

// 渲染图表
chartInstance.setOption(option)

// 组件销毁时释放资源
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
```

### 2. 类型安全

所有接口和组件都使用了完整的 TypeScript 类型定义，确保：
- API 调用类型安全
- 组件 Props 类型检查
- 状态管理类型推导
- 表单数据类型校验

### 3. 代码注释规范

代码注释按项目克制原则处理：仅对不自明的实现逻辑、隐式接口契约和重要约束补充说明；接口路径、权限码和类型字段以实际代码与本文接口表为准。

## ✅ 验证清单

- [x] TypeScript 类型定义完整
- [x] API 接口封装完成
- [x] 文档查询页面实现
- [x] 图表查询页面实现（含 ECharts 渲染）
- [x] 路由注册（VIEW_REGISTRY）
- [x] 权限控制（v-permission）
- [x] 实现中的接口、路由、权限和文档描述已核对一致（图表 `PUT /{id}/status` 为后端契约描述，前端未封装）
- [x] 构建验证通过（`npm run build`）

## 📝 后续扩展

### 可选功能
1. **文档预览**：在线预览 PDF、Word 等文档
2. **导出功能**：导出文档列表为 Excel
3. **批量操作**：批量删除、批量修改状态
4. **图表导出**：导出图表为图片
5. **数据刷新**：实时刷新图表数据

### 性能优化
1. **虚拟滚动**：大数据量列表优化
2. **图表缓存**：缓存图表数据减少请求
3. **懒加载**：按需加载图表组件

## 🐛 常见问题

### Q1：图表不显示
**原因**：ECharts 实例未正确初始化或容器尺寸为 0
**解决**：确保容器有明确的高度，延迟初始化（使用 `setTimeout`）

### Q2：类型错误
**原因**：ECharts 的 SeriesOption 类型检查严格
**解决**：使用类型断言 `as echarts.SeriesOption[]`

### Q3：内存泄漏
**原因**：组件销毁时未释放 ECharts 实例
**解决**：在 `onBeforeUnmount` 中调用 `chartInstance.dispose()`

## 📞 联系方式

如有问题，请联系开发团队或提交 Issue。

---

**最后更新时间**：2026-09-12
**版本**：v1.0.0
