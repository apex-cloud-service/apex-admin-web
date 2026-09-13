# AGENTS.md — apex-admin-web（前端）

本文件为 AI 编码 Agents 在本仓库工作时需遵守的**工程约定与行为准则**。改动前请先通读；违反将导致类型检查失败、动态路由解析不到页面或与既有代码风格不一致。

> **维护说明**：本文件是 Agents 的行为约束，新增/重构模块后必须同步更新（目录结构、VIEW_REGISTRY、接口口径等）。凡是文档中无法在源码中验证的断言，一律不写入。

## 1. 项目概览

**Apex Scaffold 管理后台前端**，前后端分离的独立工程，对接后端 Apex Scaffold（Spring Boot 3 WebFlux）。

- **版本**：`1.1.4`（见 [package.json](package.json)）
- **运行环境**：Node >= 18
- **技术栈**：**Vue 3.5 + Vite 6 + TypeScript ~5.7 + Pinia + Element Plus + ECharts + Axios + vue-router 4 + cropperjs**
- **开发模式**：`<script setup lang="ts">` 单文件组件（SFC）
- **后端接口前缀**：
  - `/api/v1/**` — 业务接口（认证、当前用户、文件上传等）
  - `/admin-api/v1/**` — 管理后台接口（系统管理、监控、数据库配置、日志查询等）
  - `/api/workflow/**` — 工作流高级操作（回退/转办/委派/挂起/恢复，见 §3.6）
- **部署文档**：[README.md](README.md) 与 [`docs/guides/deployment.md`](docs/guides/deployment.md)（已前后端分离，后端不再托管静态前端）

### 功能模块

| 模块 | 页面路径 | 说明 |
|------|---------|------|
| 认证 | `/login` | 账号密码 + 图形验证码 |
| 工作台 | `/dashboard` | 指标卡片 + 趋势图（静态路由） |
| 系统管理 | `/system/*` | 用户/角色/菜单(树)/部门(树)/字典/参数/数据库配置/定时任务（动态路由） |
| 监控 | `/monitor/*` | 登录日志/审计日志/API调用日志/在线用户/监控大盘/运行日志/业务日志（动态路由） |
| 数据管理 | `/data/*` | 文档管理/图表管理（动态路由，见 §3.9） |
| 工作流 | `/workflow/monitor` | 统计看板 + 流程实例列表 + 详情（静态路由，见 §3.6） |
| 个人中心 | `/profile` | 当前用户信息（动态路由） |
| 全局搜索 | 顶栏组件 | Meilisearch 全文搜索（见 §3.7） |
| 文件管理 | 组件级 | FileUpload / FileUploadEnhanced 组件（见 §3.8） |
| 演示页面 | `/demo/*` | 文件上传组件演示（静态路由，hidden: true） |

## 2. 目录结构与职责

```
src/
├── api/                    # 接口层，按业务域拆分
│   ├── auth.ts                 # 认证（验证码/登录/登出/角色/权限）
│   ├── user.ts                 # 当前用户 + 后台用户管理
│   ├── system.ts               # 菜单/部门/字典/参数/定时任务
│   ├── database.ts             # 数据库配置（连接测试/部署配置生成/当前信息）
│   ├── file.ts                 # 文件管理（上传/删除/URL获取/存在性检查）
│   ├── monitor.ts              # 登录日志/审计/在线用户/监控大盘/API调用日志
│   ├── log.ts                  # 日志查询（运行时日志/业务日志统一查询）
│   ├── workflow.ts             # 工作流（定义/实例/统计/任务/高级操作）
│   ├── document.ts             # 文档管理（文档CRUD/状态管理/下载）
│   ├── chart.ts                # 图表管理（图表CRUD/数据查询/状态管理）
│   ├── search.ts               # 全文搜索（Meilisearch）
│   └── oauth2.ts               # OAuth2 认证（标准授权码流程/第三方社交登录）
├── types/                  # 与后端 DTO 对齐的 TS 类型
│   ├── index.ts                # 统一响应/分页 + 系统/监控/文件/数据库/文档/图表领域类型
│   └── workflow.ts             # 工作流领域类型（定义/实例/任务/统计）
├── utils/                  # 工具函数
│   ├── request.ts              # Axios 封装（统一解包/错误处理/Token注入）
│   ├── auth.ts                 # Token 会话存取
│   └── validate.ts             # 表单校验规则
├── stores/                 # Pinia 状态管理
│   ├── user.ts                 # 用户会话（登录态/身份信息/权限码）
│   ├── permission.ts           # 按钮权限派生（hasPermission）
│   └── app.ts                  # UI 状态（侧边栏折叠/明暗主题）
├── router/                 # 路由配置
│   ├── index.ts                # 静态路由 + 全局守卫
│   └── dynamic.ts              # 菜单驱动动态路由 + VIEW_REGISTRY
├── directives/             # 自定义指令
│   └── permission.ts           # v-permission 按钮权限指令
├── layouts/                # 布局组件
│   └── AdminLayout.vue         # 管理后台主布局（侧边栏/顶栏/面包屑/全局搜索/主题切换）
├── components/             # 通用组件
│   ├── Pagination.vue          # 分页组件
│   ├── GlobalSearch/           # 全局搜索组件
│   │   └── index.vue
│   ├── FileUpload.vue          # 基础文件上传组件
│   ├── FileUploadEnhanced.vue  # 增强版文件上传（拖拽+粘贴+裁剪+压缩）
│   └── EmptyState.vue          # 空状态展示
├── views/                  # 页面视图
│   ├── login/                  # 登录页
│   │   └── index.vue
│   ├── oauth2/                 # OAuth2 授权
│   │   └── callback.vue        # OAuth2 授权回调页面
│   ├── dashboard/              # 工作台
│   │   └── index.vue
│   ├── profile/                # 个人中心
│   │   └── index.vue
│   ├── error/                  # 错误页面
│   │   └── NotFound.vue
│   ├── demo/                   # 演示页面（静态路由，hidden）
│   │   ├── FileUploadDemo.vue
│   │   └── FileUploadEnhancedDemo.vue
│   ├── system/                 # 系统管理（动态路由）
│   │   ├── user/index.vue
│   │   ├── role/index.vue
│   │   ├── menu/index.vue
│   │   ├── dept/index.vue
│   │   ├── dict/index.vue
│   │   ├── config/index.vue
│   │   ├── database/index.vue
│   │   ├── job/index.vue       # 定时任务管理主页
│   │   └── job/query.vue       # 定时任务分页查询页面
│   ├── monitor/                # 监控（动态路由）
│   │   ├── loginlog/index.vue
│   │   ├── audit/index.vue
│   │   ├── api-call-log/index.vue
│   │   ├── online/index.vue
│   │   ├── dashboard/index.vue
│   │   ├── runtime-log/index.vue
│   │   └── business-log/index.vue
│   ├── data/                   # 数据管理（动态路由）
│   │   ├── document/index.vue  # 文档管理页面
│   │   └── chart/index.vue     # 图表管理页面
│   └── workflow/               # 工作流（静态路由）
│       ├── monitor/
│       │   ├── index.vue           # 工作流监控主页
│       │   ├── Statistics.vue      # 统计看板
│       │   ├── InstanceList.vue    # 流程实例列表
│       │   └── InstanceDetail.vue  # 流程实例详情
│       └── components/
│           └── TaskActions.vue     # 任务操作按钮
├── settings.ts             # 应用级常量（Token key/分页/错误码/标题/上传大小）
├── App.vue                 # 根组件
├── main.ts                 # 入口文件
└── env.d.ts                # 环境变量类型声明
```

> **注意事项**：
> - 忽略 `src/router/dynamic.ts.bak`（残留备份文件，非有效源码，不要修改或引用）

## 3. 核心机制与约定

### 3.1 请求封装（必须复用，禁止裸写 axios）

统一走 [src/utils/request.ts](src/utils/request.ts) 暴露的 `request` / `get` / `post` / `put` / `del`：

- **自动注入 Token**：`Authorization: Bearer <token>`
- **统一解包**：后端 `Result{code,msg,data,traceId}`，**`code === 0` 才返回 `data`**，否则 `throw ApiError`（携带 code + traceId）
- **401 自动处理**：清理会话并跳转登录页（保留 redirect 回跳地址）
- **超时设置**：30s（与后端全局响应超时对齐）

> **重要**：新增接口时，在本工具函数上再包一层类型化函数并写 JSDoc，**不要**在页面里直接调用 `axios`。

**示例**（见 [src/api/system.ts](src/api/system.ts)）：
```typescript
/**
 * 获取菜单树
 * @returns 菜单树列表
 */
export function listMenuTree(): Promise<MenuNode[]> {
  return get<MenuNode[]>('/admin-api/v1/menus')
}
```

### 3.2 动态路由（菜单驱动）

- **数据源**：后端菜单树 `/admin-api/v1/menus` → [src/router/dynamic.ts](src/router/dynamic.ts) 的 `buildDynamicRoutes()`
- **菜单类型**（`menuType`）：
  - `0` = 目录（分组，不对应页面）
  - `1` = 菜单（对应具体页面，挂到 AdminLayout）
  - `2` = 按钮（不生成路由，仅用于权限控制）
- **组件解析**：依赖 **`VIEW_REGISTRY` 注册表**（`component` 字段 → `import()`）
- **新增页面必须**：在 `VIEW_REGISTRY` 中登记组件 loader，否则该菜单点进去 404

**VIEW_REGISTRY 示例**：
```typescript
const VIEW_REGISTRY: Record<string, () => Promise<unknown>> = {
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue'),
  // ...
}
```

**`status` 与 `visible` 语义**（重要，易踩坑）：
- **`status`（停用/正常）在前端路由层完全被忽略**
  - 历史种子数据的 `status` 取值与后端枚举不一致
  - 前端路由生成不读取该字段，避免因过滤导致全量菜单丢失、页面 404
  - 目录/菜单只要组件可解析即注册路由
- **`visible: 0`（隐藏）仅通过 `meta.hidden` 控制侧边栏展示**
  - 路由仍注册、可直接访问
  - `visible: 1`（显示）才出现在侧边栏
- **总结**：`status` 不影响路由也不影响侧边栏；`visible` 仅影响侧边栏，不影响路由可达性

**静态路由特例**：
- 工作台（`/dashboard`）
- 工作流监控页（`/workflow/monitor`）与流程详情页（`/workflow/instances/:id`）
- OAuth2 授权回调页（`/oauth2/callback`）
- 演示页面（`/demo/*`）

以上页面在 [src/router/index.ts](src/router/index.ts) 中作为**静态路由**注册（`meta.hidden: true`），**不依赖后端菜单**，也**不需要**在 `VIEW_REGISTRY` 登记。

**路由守卫**（[router/index.ts](src/router/index.ts)）：
1. 未登录 → 跳转登录页（携带 redirect）
2. 已登录但身份未加载 → 拉取身份并生成动态路由
3. 动态路由生成失败 → 静默降级为静态路由（登录页仍可用）

### 3.3 按钮权限指令

**使用方式**：
```html
<el-button v-permission="'system:user:create'">新增</el-button>
```

- **实现**：[src/directives/permission.ts](src/directives/permission.ts)
- **机制**：基于用户权限码集合控制元素显隐（无权限时从 DOM 移除）
- **多权限**：支持逗号分隔多码（满足其一即可）
- **未配置权限**：空权限集合视为未配置（放行）
- **注意**：新增可操作按钮前确认权限码已由后端下发

### 3.4 状态管理（Pinia）

**三大 Store**：

1. **`stores/user.ts`**：用户会话
   - 登录态、身份信息、权限码
   - `loadIdentity()`：并行拉取三个接口
     - `/api/v1/user/info` — 用户信息
     - `/api/v1/auth/roles/my` — 角色列表
     - `/api/v1/auth/permissions/my` — 权限码列表

2. **`stores/permission.ts`**：按钮权限
   - 派生 `permissions` 计算属性
   - `hasPermission(code)` 方法（供 v-permission 指令与页面调用）

3. **`stores/app.ts`**：UI 状态
   - 侧边栏折叠状态
   - 明暗主题切换（`document.documentElement.classList.toggle('dark')`）
   - 均持久化到 localStorage

**最佳实践**：复杂跨组件状态优先进 store，避免 prop 钻取与事件总线。

#### Store 设计原则与最佳实践

**何时创建新的 Store**：
1. **跨多个页面共享**的状态（单页面内用 ref/reactive 即可）
2. **需要持久化**到 localStorage 的状态
3. **复杂业务逻辑**需要封装和复用的场景
4. **全局事件**需要响应式通知的场景（如 WebSocket 消息）

**何时不需要 Store**：
1. 仅在单个组件内使用的状态（用 ref/reactive）
2. 父子组件间传递的数据（用 props/emit）
3. 临时中间状态（如表单草稿、过渡动画状态）

**Store 命名与职责**：
- **user.ts**：用户会话、身份信息、权限（登录/登出/身份加载）
- **permission.ts**：派生权限相关计算属性和方法（供指令和组件使用）
- **app.ts**：UI 状态（侧边栏折叠、主题切换、语言设置）

**新增 Store 的规范**：
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExampleStore = defineStore(
  'example',
  () => {
    const count = ref(0)
    const name = ref('Example')

    const doubleCount = computed(() => count.value * 2)

    const increment = () => {
      count.value++
    }

    const reset = () => {
      count.value = 0
      name.value = 'Example'
    }

    return {
      count,
      name,
      doubleCount,
      increment,
      reset
    }
  },
  {
    persist: {
      key: 'apex.admin.example',
      storage: localStorage,
      paths: ['count']
    }
  }
)
```

**Store 使用规范**：
```vue
<script setup lang="ts">
import { useExampleStore } from '@/stores/example'
import { storeToRefs } from 'pinia'

const exampleStore = useExampleStore()

const { count, doubleCount } = storeToRefs(exampleStore)
const { increment, reset } = exampleStore
</script>

<template>
  <div>Count: {{ count }}</div>
  <div>Double: {{ doubleCount }}</div>
  <button @click="increment">+1</button>
  <button @click="reset">Reset</button>
</template>
```

**跨 Store 通信**：
```typescript
export const useUserStore = defineStore('user', () => {
  const clearLocal = () => {
    removeToken()
    removeIdentity()
    const appStore = useAppStore()
    appStore.resetSettings()
  }
  return { clearLocal }
})

export const useAppStore = defineStore('app', () => {
  const resetSettings = () => {
  }
  return { resetSettings }
})
```

**避免 Store 滥用**：
- 不要为每个页面都创建一个 Store
- 不要把所有状态都放到 Store（优先考虑组件内状态）
- 不要在 Store 中处理业务逻辑（API 调用应在 api/ 层）

### 3.5 通用组件

**核心组件**：

1. **`components/Pagination.vue`**：分页统一组件
   - Props：`:total`（总条数）
   - Events：`@change(page, size)`
   - **要求**：列表页一律复用，勿自写分页

2. **`components/GlobalSearch/index.vue`**：全局搜索
   - 集成在 `AdminLayout` 顶栏
   - 详见 §3.7

3. **`components/FileUpload.vue`**：基础文件上传
   - 支持图片上传（jpg/png/gif/webp）
   - 文件大小校验（默认 10MB）
   - 自动携带认证 Token
   - 详见 §3.8

4. **`components/FileUploadEnhanced.vue`**：增强版文件上传
   - 支持拖拽上传
   - 支持粘贴上传（Ctrl+V）
   - 支持图片裁剪（cropperjs）
   - 支持图片压缩
   - 上传进度展示
   - 详见 §3.8

5. **`components/EmptyState.vue`**：空状态展示

**表格页统一形态**：
```
查询区（el-form inline）
    ↓
el-table（v-loading、border、stripe）
    ↓
Pagination 组件
    ↓
新增/编辑 el-dialog
```

**UI 交互约定**：
- 使用 Element Plus 组件（`el-*`）
- `ElMessage` 提示
- `showError` 统一错误提示（展示 traceId，支持自定义默认提示信息）

#### 错误处理规范

**统一错误提示**：

项目通过 `ElMessage` 和 `ElNotification` 提供统一的错误提示。

**API 错误处理**（已在 request.ts 中统一处理）：
```typescript
import { ElMessage } from 'element-plus'
import { ApiError } from '@/utils/request'

// API 调用时自动捕获错误
try {
  const result = await someApiCall()
  // 处理成功结果
} catch (error) {
  if (error instanceof ApiError) {
    // 业务错误（code !== 0）
    ElMessage.error({
      message: error.message,
      // 可展示 traceId 便于排查
      description: error.traceId ? `TraceId: ${error.traceId}` : undefined
    })
  } else {
    // 网络错误或其他异常
    ElMessage.error('操作失败，请稍后重试')
  }
}
```

**表单提交错误处理**：
```typescript
const handleSubmit = async () => {
  try {
    // 先校验表单
    await formRef.value?.validate()
    // 调用 API
    await createUser(form)
    ElMessage.success('创建成功')
    // 关闭对话框、刷新列表等后续操作
  } catch (error) {
    // 表单校验失败会自动提示，API 错误已统一处理
    // 这里仅需处理特殊逻辑（如关闭 loading 状态）
    loading.value = false
  }
}
```

**错误码处理**：

后端统一响应：
```typescript
interface Result<T> {
  code: number      // 0=成功，非0=业务错误码
  msg: string       // 错误信息
  data: T           // 业务数据
  traceId?: string  // 链路追踪 ID
}
```

常见错误码（见 settings.ts）：
- `0`：成功
- `401`：未认证（自动跳转登录页）
- `403`：无权限
- `404`：资源不存在
- `500`：服务器内部错误

**自定义错误码处理**：
```typescript
import { CODE_UNAUTHORIZED } from '@/settings'

try {
  const result = await apiCall()
} catch (error) {
  if (error instanceof ApiError) {
    if (error.code === CODE_UNAUTHORIZED) {
      // 401 会被 request.ts 自动处理，这里一般不需要
    } else if (error.code === 40001) {
      // 自定义业务错误码处理
      ElMessage.warning('用户名已存在')
    } else {
      // 通用错误提示
      ElMessage.error(error.message)
    }
  }
}
```

**网络异常处理**：
- 请求超时：30 秒（与后端全局响应超时对齐）
- 超时后自动提示："请求超时，请检查网络连接"
- 断网时提示："网络连接失败，请检查网络设置"

**错误排查要点**：
- **TraceId 联动**：前端展示的 traceId 与后端日志关联，便于快速定位问题
- **控制台日志**：开发环境下 API 错误会打印完整错误对象到控制台
- **错误信息国际化**：后端返回的 msg 需考虑前端展示，避免技术术语

### 3.6 工作流模块（特例）

工作流是本仓库中**唯一走静态路由 + 自有分页口径**的模块，新增/修改时注意与其它模块的差异。

**接口层** [src/api/workflow.ts](src/api/workflow.ts)：
- **流程定义**：`/admin-api/v1/workflows/definitions`（CRUD + 列表）
- **流程实例**：`/admin-api/v1/workflows/instances`（列表 + 详情）
- **统计**：`/admin-api/v1/workflows/statistics`、`/statistics/trend`
- **待办任务**：`/admin-api/v1/workflows/tasks/my`、`/tasks/approve`、`/tasks/reject`
- **高级操作**（注意前缀是 `/api/workflow`，不是 `/admin-api/v1`）：
  - 回退：`/api/workflow/tasks/{id}/rollback`
  - 转办：`/api/workflow/tasks/{id}/transfer`
  - 委派：`/api/workflow/tasks/{id}/delegate`
  - 挂起：`/api/workflow/instances/{id}/suspend`
  - 恢复：`/api/workflow/instances/{id}/resume`

**类型层** [src/types/workflow.ts](src/types/workflow.ts)：
- `WorkflowNode` / `WorkflowEdge` / `WorkflowDefinition` / `WorkflowInstance` / `WorkflowInstanceDetail` / `WorkflowTask` / `WorkflowStatistics` / `WorkflowTrend`
- 各 Payload：`CompleteTaskPayload`、`RollbackTaskPayload`、`TransferTaskPayload`、`DelegateTaskPayload`、`SuspendInstancePayload`、`ResumeInstancePayload`

**视图层** [src/views/workflow/](src/views/workflow/)：
- `monitor/index.vue`：Tab 切换「统计看板」(`Statistics.vue`) 与「流程实例」(`InstanceList.vue`)
- `monitor/InstanceDetail.vue`：流程详情（含任务操作）
- `components/TaskActions.vue`：审批/回退/转办/委派/挂起/恢复操作按钮

**路由**：
- `workflow/monitor` 与 `workflow/instances/:id` 为**静态路由**（`hidden: true`，`meta.activeMenu` 指向 `/workflow/monitor`）
- **不需要**在 `VIEW_REGISTRY` 登记，也**不需要**后端菜单

**分页口径差异**（历史遗留）：
- **工作流模块**：使用 `{pageNum, pageSize}` + 响应 `{records, total}`
- **其它模块**：统一使用 `PageQuery{page, size}` + `PageResponse{list, total, pageNum, pageSize, pages, hasNext}`
- **要求**：新增非工作流代码**必须**遵循统一口径；修改工作流代码时保持模块内一致，不在本次范围内强行统一

### 3.7 全文搜索

**组件**：[src/components/GlobalSearch/index.vue](src/components/GlobalSearch/index.vue)
- 集成在 `AdminLayout` 顶栏
- 快捷键：支持快捷键唤起

**接口**：[src/api/search.ts](src/api/search.ts)
- `GET /admin-api/v1/search`（keyword + types + page + size）
- `POST /admin-api/v1/search/rebuild`（重建索引）

**后端**：Meilisearch 全文搜索引擎

**跳转映射**：搜索结果按 `resourceType` 跳转到对应管理页并带 `?id=`：
- `user` → `/system/user`
- `role` → `/system/role`
- `menu` → `/system/menu`
- `dept` → `/system/dept`
- `dict` → `/system/dict`
- `config` → `/system/config`

**扩展要求**：新增可搜索资源类型时，需同时：
1. 更新后端索引配置
2. 更新 `GlobalSearch` 的 `routes` 映射
3. 更新 `getTypeName` 方法（类型显示名称）
4. 更新 `getTagType` 方法（标签颜色）

### 3.8 文件管理

文件管理功能以**组件**形式提供（非独立页面模块），通过 API 接口与后端对接。

**接口层** [src/api/file.ts](src/api/file.ts)：
- **上传**：`POST /api/v1/files/generic`（FormData，含 file + sex 参数）
- **获取URL**：`GET /api/v1/files/url`（bucketName + fileName）
- **删除**：`DELETE /api/v1/files`（bucketName + fileName）
- **检查存在**：`GET /api/v1/files/exists`（bucketName + fileName）
- **获取内容**：`GET /api/v1/files/content?fileName=`（返回预签名URL）

**类型层** [src/types/index.ts](src/types/index.ts)：
```typescript
export interface FileUploadResult {
  bucketName: string      // 存储桶名称
  objectName: string      // 对象存储路径（含性别目录，如 AF/uuid.jpg）
  url: string             // 文件访问URL
  contentType: string     // MIME类型
  size: number            // 文件大小（字节）
}
```

**组件层**：

1. **`components/FileUpload.vue`**：基础文件上传组件
   - 封装 Element Plus `el-upload`
   - 支持图片格式（jpg/png/gif/webp）
   - 文件大小校验（默认 10MB，可配置）
   - 自动携带认证 Token
   - **Props**：
     - `sex`（0=男/AM，1=女/AF，必填）
     - `limit`（最大上传数量）
     - `accept`（文件类型）
     - `maxSize`（最大文件大小，MB）
     - `listType`（'text' | 'picture' | 'picture-card'）
     - `disabled`（是否禁用）
     - `tip`（提示文本）
   - **Events**：
     - `success(result: FileUploadResult)`
     - `error(error)`
     - `remove(file)`

2. **`components/FileUploadEnhanced.vue`**：增强版文件上传组件
   - 继承基础组件所有功能
   - **额外支持**：
     - **拖拽上传**（`:drag="true"`）
     - **粘贴上传**（Ctrl+V，`:enable-paste="true"`）
     - **图片裁剪**（`:enable-cropper="true"`，基于 cropperjs）
     - **图片压缩**（`:enable-compress="true"`，可配置质量和尺寸）
     - **上传进度展示**
   - **适用场景**：图片批量上传、富文本编辑器、图片管理等

**演示页面**（静态路由，`hidden: true`）：
- [src/views/demo/FileUploadDemo.vue](src/views/demo/FileUploadDemo.vue)：基础组件演示
- [src/views/demo/FileUploadEnhancedDemo.vue](src/views/demo/FileUploadEnhancedDemo.vue)：增强版组件演示
- 访问路径：`/demo/file-upload`、`/demo/file-upload-enhanced`

**使用建议**：
- **单文件/表单上传场景**：使用 `FileUpload`
- **批量上传/拖拽上传场景**：使用 `FileUploadEnhanced`
- **自定义上传逻辑**：参考 [src/api/file.ts](src/api/file.ts) 的接口封装
- **业务页面集成**：直接引用组件，无需自写上传逻辑

**重要提醒**：
- `FileUploadResult` 的字段名是 `objectName`（不是 `fileName`）
- 删除文件需传 `bucketName` + `objectName` 两个参数
- 所有文件操作接口前缀是 `/api/v1/files`（不是 `/admin-api/v1`）

### 3.9 数据管理模块

数据管理模块提供文档和图表的统一管理功能，采用动态路由方式集成。

#### 文档管理功能

**接口层** [src/api/document.ts](src/api/document.ts)：
- **分页查询**：`GET /admin-api/v1/documents`（支持关键词、类型、分类、状态筛选）
- **查询详情**：`GET /admin-api/v1/documents/{id}`
- **创建文档**：`POST /admin-api/v1/documents`
- **更新文档**：`PUT /admin-api/v1/documents/{id}`
- **删除文档**：`DELETE /admin-api/v1/documents/{id}`
- **更新状态**：`PUT /admin-api/v1/documents/{id}/status`
- **下载文档**：`GET /admin-api/v1/documents/{id}/download`

**视图层** [src/views/data/document/index.vue](src/views/data/document/index.vue)：
- 文档列表展示（支持分页）
- 多维度筛选（关键词、文档类型、分类、状态）
- 文档CRUD操作
- 文件下载功能

**类型定义**：
```typescript
interface Document {
  id: string
  title: string                    // 文档标题
  docType: string                  // 文档类型：contract/report/proposal/manual/other
  category?: string                // 分类：tech/business/finance/hr
  content?: string                 // 文档内容
  fileUrl?: string                 // 附件URL
  fileSize?: number                // 文件大小（字节）
  status: number                   // 状态：0=草稿 1=正常 2=归档
  tags?: string[]                  // 标签
  createTime?: string              // 创建时间
  updateTime?: string              // 更新时间
}
```

**权限控制**：
- `data:document:create` - 创建文档
- `data:document:edit` - 编辑文档
- `data:document:delete` - 删除文档

#### 图表管理功能

**接口层** [src/api/chart.ts](src/api/chart.ts)：
- **分页查询**：`GET /admin-api/v1/charts`（支持关键词、类型、分类、状态筛选）
- **查询详情**：`GET /admin-api/v1/charts/{id}`
- **查询数据**：`GET /admin-api/v1/charts/{id}/data`
- **创建图表**：`POST /admin-api/v1/charts`
- **更新图表**：`PUT /admin-api/v1/charts/{id}`
- **删除图表**：`DELETE /admin-api/v1/charts/{id}`
- **更新状态**：`PUT /admin-api/v1/charts/{id}/status`

**视图层** [src/views/data/chart/index.vue](src/views/data/chart/index.vue)：
- 图表列表展示（支持分页）
- 多维度筛选（关键词、图表类型、分类、状态）
- 图表CRUD操作
- ECharts 图表渲染展示

**类型定义**：
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
  createTime?: string              // 创建时间
  updateTime?: string              // 更新时间
}

interface ChartData {
  chartId: string
  chartType: string                // 图表类型
  title?: string                   // 图表标题
  xAxis?: string[]                 // X轴数据
  series?: ChartSeries[]           // 数据系列
  legend?: string[]                // 图例
}
```

**支持的图表类型**：
- `line` - 折线图（趋势分析）
- `bar` - 柱状图（数据对比）
- `pie` - 饼图（占比展示）
- `scatter` - 散点图（关系分析）
- `radar` - 雷达图（多维度评估）

**权限控制**：
- `data:chart:create` - 创建图表
- `data:chart:edit` - 编辑图表
- `data:chart:delete` - 删除图表

#### 路由配置

数据管理模块使用动态路由，需在后端菜单表中配置：

```sql
-- 数据管理目录
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, icon, sort)
VALUES ('数据管理', '/data', NULL, 0, 0, 1, 1, 'document', 5);

-- 文档管理菜单
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, perms, sort)
VALUES ('文档管理', '/data/document', 'data/document/index', 1, (SELECT id FROM sys_menu WHERE path='/data'), 1, 1, 'data:document:view', 1);

-- 图表管理菜单
INSERT INTO sys_menu (menu_name, path, component, menu_type, parent_id, visible, status, perms, sort)
VALUES ('图表管理', '/data/chart', 'data/chart/index', 1, (SELECT id FROM sys_menu WHERE path='/data'), 1, 1, 'data:chart:view', 2);
```

**VIEW_REGISTRY 注册**：
```typescript
const VIEW_REGISTRY: Record<string, () => Promise<unknown>> = {
  'data/document/index': () => import('@/views/data/document/index.vue'),
  'data/chart/index': () => import('@/views/data/chart/index.vue'),
  // ...
}
```

#### 技术要点

1. **ECharts 集成**：图表管理页面使用 ECharts 5.x 进行图表渲染
2. **统一分页口径**：遵循 `PageQuery{page, size}` + `PageResponse` 标准
3. **类型安全**：所有接口和组件使用完整的 TypeScript 类型定义
4. **资源释放**：组件销毁时调用 `chartInstance.dispose()` 释放 ECharts 实例

**详细文档**：
- 功能说明：[docs/features/document-chart-management.md](docs/features/document-chart-management.md)
- 后端集成状态：[docs/implementation/document-chart-backend-status.md](docs/implementation/document-chart-backend-status.md)

### 3.10 环境变量配置

项目使用 Vite 环境变量管理开发/生产环境配置，通过 `.env.*` 文件区分。

#### 环境文件

**`.env.development`**（开发环境）：
```bash
# 后端服务地址（Vite 开发代理目标）
VITE_API_PROXY_TARGET=http://127.0.0.1:8080

# OAuth2 客户端配置
VITE_OAUTH2_CLIENT_ID=apex-admin-web-dev
```

**`.env.production`**（生产环境）：
```bash
# 生产部署时后端网关地址（同域部署可留空，直接走相对路径）
VITE_API_BASE_URL=

# OAuth2 客户端配置
VITE_OAUTH2_CLIENT_ID=apex-admin-web-prod
```

#### Vite 配置要点

**`vite.config.ts`** 关键配置：

1. **路径别名**：`@` 映射到 `src/`
   ```typescript
   alias: {
     '@': fileURLToPath(new URL('./src', import.meta.url))
   }
   ```

2. **开发服务器**：端口 5173，监听 `0.0.0.0`
   ```typescript
   server: {
     host: '0.0.0.0',
     port: 5173
   }
   ```

3. **开发代理**（前后端分离）：
   ```typescript
   proxy: {
     '/api': {
       target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
       changeOrigin: true
     },
     '/admin-api': {
       target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
       changeOrigin: true
     }
   }
   ```

4. **构建配置**：
   - 输出目录：`dist/`
   - 兼容目标：`es2018`
   - Chunk 大小警告阈值：1500 KB

#### 使用规范

- **禁止在代码中硬编码**后端地址，统一通过环境变量配置
- **开发环境**：修改 `.env.development` 的 `VITE_API_PROXY_TARGET` 指向后端服务
- **生产环境**：
  - 同域部署（推荐）：`VITE_API_BASE_URL` 留空，前端使用相对路径
  - 跨域部署：`VITE_API_BASE_URL` 填写后端完整网关地址（需后端配置 CORS）
- **OAuth2 客户端 ID**：开发/生产环境需使用不同的 Client ID，与后端注册的客户端信息一致

### 3.11 表单校验工具

项目在 [src/utils/validate.ts](src/utils/validate.ts) 中封装了常用的表单字段校验规则，供 Element Plus 表单验证使用。

#### 内置校验规则

**基础信息校验**：
- `validatePhone`：手机号格式（11 位，1 开头）
- `validateEmail`：邮箱格式
- `validateUsername`：用户名格式（4-16 位字母、数字、下划线）
- `validateChineseName`：中文姓名（2-4 个汉字）
- `validateIDCard`：身份证号（18 位）

**密码与安全**：
- `validatePassword`：密码强度（至少 8 位，含大小写字母和数字）

**网络与系统**：
- `validateURL`：URL 格式（http:// 或 https://）
- `validateIP`：IP 地址格式（含 0-255 范围校验）
- `validatePort`：端口号范围（1-65535）

**数值校验**：
- `validateInteger`：整数
- `validatePositiveInteger`：正整数

**通用校验工厂**：
- `validateRequired(message)`：非空校验（自定义提示信息）
- `validateLength(min, max)`：长度范围校验
- `validateRange(min, max)`：数值范围校验

#### 使用示例

```vue
<script setup lang="ts">
import { validatePhone, validateEmail, validateUsername, validateRequired, validateLength, validateRange } from '@/utils/validate'
import type { FormRules } from 'element-plus'

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { validator: validateUsername, trigger: 'blur' }
  ],
  phone: [
    { validator: validatePhone, trigger: 'blur' }
  ],
  email: [
    { validator: validateEmail, trigger: 'blur' }
  ],
  nickname: [
    { validator: validateRequired('请输入昵称'), trigger: 'blur' },
    { validator: validateLength(2, 20), trigger: 'blur' }
  ],
  age: [
    { validator: validateRange(0, 150), trigger: 'blur' }
  ]
}
</script>

<template>
  <el-form :model="form" :rules="formRules">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" />
    </el-form-item>
  </el-form>
</template>
```

#### 扩展规则

新增自定义校验规则时，遵循以下规范：

1. **函数签名**：`(rule: FormItemRule, value: unknown, callback: ValidateCallback) => void`
2. **错误处理**：通过 `callback(new Error('错误信息'))` 返回错误
3. **成功处理**：通过 `callback()` 表示校验通过
4. **导出约定**：使用 `export const validateXxx` 命名
5. **注释说明**：添加单行注释说明校验规则用途

**示例**：
```typescript
// 工号校验（8位纯数字）
export const validateEmployeeNo = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^\d{8}$/.test(value)) {
    callback(new Error('工号为8位数字'))
  } else {
    callback()
  }
}
```

### 3.12 OAuth2 授权流程

项目支持标准的 OAuth2 授权码模式，用于第三方社交登录集成。

#### 接口层

[src/api/oauth2.ts](src/api/oauth2.ts) 提供 OAuth2 相关接口：
- **授权 URL 构建**：`GET /api/v1/oauth2/authorize/url`（获取第三方授权页面地址）
- **授权回调处理**：`POST /api/v1/oauth2/callback`（用授权码换取访问令牌）

#### 授权流程

```
用户点击第三方登录按钮
    ↓
调用 getAuthorizeUrl() 获取授权 URL
    ↓
跳转到第三方授权页面（用户同意授权）
    ↓
第三方回调到 /oauth2/callback?code=xxx&state=xxx
    ↓
callback.vue 提取 code 和 state
    ↓
调用 handleOAuth2Callback() 换取 Token
    ↓
保存 Token 并跳转到回调前页面或工作台
```

#### 视图层

[src/views/oauth2/callback.vue](src/views/oauth2/callback.vue)：OAuth2 授权回调页面
- 路由：`/oauth2/callback`（静态路由，public: true）
- 功能：接收授权码、调用后端换取 Token、保存会话并跳转

#### 配置要求

1. **环境变量**：
   - 开发环境：`.env.development` 的 `VITE_OAUTH2_CLIENT_ID`
   - 生产环境：`.env.production` 的 `VITE_OAUTH2_CLIENT_ID`

2. **后端配置**：
   - 在 OAuth2 服务商注册应用，获取 Client ID 和 Client Secret
   - 配置回调地址：`{前端域名}/oauth2/callback`
   - 后端需实现授权码换取 Token 的逻辑

3. **前端集成**：
   - 在登录页添加第三方登录按钮
   - 点击按钮时调用 `getAuthorizeUrl()` 并跳转
   - 无需修改 callback.vue（通用处理逻辑）

#### 安全要点

- **state 参数校验**：防止 CSRF 攻击，前后端必须校验 state 一致性
- **授权码一次性**：授权码（code）只能使用一次，后端需校验
- **Token 安全存储**：获取 Token 后立即存入 localStorage，不暴露在 URL 中

## 4. 注释与代码风格规范（强制）

本项目遵循严格的注释规范，确保代码可读性与可维护性。所有新增/修改代码必须遵循以下规范。

### 4.1 文件头注释（必须）

**每个 `.ts` / `.vue` 文件顶部必须包含文件头注释**，说明文件职责与关联接口。

#### TypeScript 文件（`.ts`）

使用 `/**` 块注释，格式如下：

```typescript
/**
 * 文件功能简述
 * ------------------------------------------------------------------
 * 详细说明：
 *   - 功能点1
 *   - 功能点2
 * 
 * 后端接口（可选）：
 *   - POST /api/v1/xxx - 接口说明
 *   - GET /api/v1/xxx - 接口说明
 */
```

**实际示例**（[src/api/file.ts](src/api/file.ts)）：
```typescript
/**
 * 文件管理 API
 * ------------------------------------------------------------------
 * 文件上传、删除、URL获取等接口封装
 * 
 * 后端接口：
 * - POST /api/v1/files/generic - 通用文件上传（推荐）
 * - GET /api/v1/files/url - 获取文件访问URL
 * - DELETE /api/v1/files - 删除文件
 * - GET /api/v1/files/exists - 检查文件是否存在
 * - GET /api/v1/files/content - 读取文件内容
 */
```

**实际示例**（[src/utils/request.ts](src/utils/request.ts)）：
```typescript
/**
 * Axios 请求封装
 * ------------------------------------------------------------------
 * 统一处理：
 *   1. 请求拦截：注入 Bearer Token
 *   2. 响应拦截：解包 Result{code,msg,data,traceId}
 *   3. 401 处理：清除会话并跳转登录页（保留回跳地址）
 *   4. 业务错误：code !== 0 时抛出带 traceId 的错误信息
 *   5. 请求超时：默认 30s（与后端全局响应超时对齐）
 */
```

#### Vue 组件文件（`.vue`）

使用 HTML 注释 `<!-- -->` 开头：

```html
<!--
  组件功能简述
  ------------------------------------------------------------------
  详细说明：功能点描述
  
  Props（可选）：
    - propName: 说明
  
  Emits（可选）：
    - eventName: 说明
-->
<template>
  <!-- 组件模板 -->
</template>

<script setup lang="ts">
/**
 * 组件脚本说明
 * - 核心逻辑说明
 */
</script>
```

**实际示例**（[src/components/Pagination.vue](src/components/Pagination.vue)）：
```html
<!--
  通用分页组件
  ------------------------------------------------------------------
  基于 el-pagination 封装，内置分页参数与变更回调，
  供各列表页面统一复用（当前页/每页条数/总数）。
-->
```

### 4.2 JSDoc 函数注释（必须）

**所有导出函数、方法必须包含 JSDoc 注释**，说明用途、参数与返回值。

#### 基础格式

```typescript
/**
 * 函数功能简述
 * 
 * @param paramName 参数说明
 * @returns 返回值说明
 */
```

#### 完整示例（含 @example）

当函数使用较复杂时，建议添加 `@example` 示例代码：

```typescript
/**
 * 上传文件（通用接口）
 * 
 * @param file 文件对象
 * @param sex 性别路由参数（0=男/AM，1=女/AF）
 * @returns 上传结果，包含存储路径和访问URL
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const result = await uploadFile(file, 0)
 * console.log('访问URL：', result.url)
 * ```
 */
export function uploadFile(file: File, sex: 0 | 1): Promise<FileUploadResult> {
  // ...
}
```

#### 简洁示例

简单函数可省略详细说明：

```typescript
/**
 * 获取菜单树
 * @returns 菜单树列表
 */
export function listMenuTree(): Promise<MenuNode[]> {
  return get<MenuNode[]>('/admin-api/v1/menus')
}
```

#### 多参数示例

```typescript
/**
 * 判断当前用户是否拥有指定权限码。
 * @param code 权限码（如 system:user:create）；支持逗号分隔多码（满足其一即可）
 * @returns true=拥有权限
 */
function hasPermission(code: string): boolean {
  // ...
}
```

### 4.3 类型与接口注释

**所有导出的 `interface` / `type` 必须有注释**，关键字段需单独注释：

```typescript
/** 登录请求体 */
export interface LoginPayload {
  /** 登录类型：PASSWORD=账号密码（管理后台固定使用） */
  loginType?: string
  /** 登录账号（sys_user.username） */
  username?: string
  /** 登录密码（BCrypt 哈希比对） */
  password?: string
  /** 图形验证码 ID（登录前先调用 getCaptcha） */
  captchaId?: string
  /** 图形验证码内容 */
  captchaCode?: string
}
```

**Class 注释示例**：

```typescript
/** 业务异常：携带后端错误码与链路追踪 ID */
export class ApiError extends Error {
  code: number
  traceId?: string

  constructor(message: string, code: number, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
  }
}
```

### 4.4 区块注释

使用注释划分代码功能区块，提高可读性：

#### TypeScript 文件

```typescript
/** ========== 请求拦截 ========== */
service.interceptors.request.use(
  (config) => {
    // ...
  }
)

/** ========== 响应拦截 ========== */
service.interceptors.response.use(
  (response) => {
    // ...
  }
)

/** ========== 工具函数 ========== */
function handleUnauthorized(): void {
  // ...
}
```

#### Vue 组件

```html
<template>
  <!-- ========== 查询区 ========== -->
  <el-form inline>
    <!-- ... -->
  </el-form>

  <!-- ========== 列表区 ========== -->
  <el-table>
    <!-- ... -->
  </el-table>

  <!-- ========== 分页区 ========== -->
  <Pagination @change="handlePageChange" />

  <!-- ========== 新增/编辑对话框 ========== -->
  <el-dialog>
    <!-- ... -->
  </el-dialog>
</template>
```

### 4.5 行内注释

复杂逻辑需要行内注释说明：

```typescript
// 会话失效：清除本地会话并跳转登录页
function handleUnauthorized(): void {
  clearSession()
  const current = window.location.pathname + window.location.search
  // 避免重复跳转登录页
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(current)}`
  }
}
```

**注意**：
- 简单逻辑不需要行内注释（代码自解释）
- 复杂算法、边界处理、临时方案必须注释
- 注释说明"为什么"，而不是"做什么"

### 4.6 常量收敛与注释

**所有魔法字符串/数字必须定义为常量并注释**，统一放在 [src/settings.ts](src/settings.ts)：

```typescript
/** ========== 会话管理 ========== */

/** 会话 Token 的 localStorage 键 */
export const TOKEN_KEY = 'apex.admin.token'

/** 刷新令牌的 localStorage 键 */
export const REFRESH_TOKEN_KEY = 'apex.admin.refresh-token'

/** 用户身份信息的 localStorage 键 */
export const IDENTITY_KEY = 'apex.admin.identity'

/** ========== 分页配置 ========== */

/** 分页默认每页条数 */
export const DEFAULT_PAGE_SIZE = 20

/** 分页每页条数选项 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/** ========== 响应码 ========== */

/** 业务成功码 */
export const RESULT_SUCCESS = 0

/** HTTP 401 未授权 */
export const CODE_UNAUTHORIZED = 401

/** ========== 应用配置 ========== */

/** 系统管理标题（布局顶栏/页签展示） */
export const APP_TITLE = 'Apex Scaffold 管理后台'

/** 上传文件大小上限（字节，10MB） */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
```

**扩展规范**：
- 新增常量前先检查是否已有类似常量
- 按功能分组，使用 `/** ========== 分组名 ========== */` 注释分隔
- 每个常量必须有单行注释说明用途
- 常量值可读性优先（如 `10 * 1024 * 1024` 比 `10485760` 更清晰）

### 4.7 命名约定

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| **类型定义** | PascalCase | `interface UserInfo`、`type LoginResult` |
| **组件文件** | PascalCase | `FileUpload.vue`、`Pagination.vue` |
| **目录名** | kebab-case | `api-call-log`、`runtime-log` |
| **函数/变量** | camelCase | `getUserInfo`、`hasPermission` |
| **常量** | SCREAMING_SNAKE_CASE | `TOKEN_KEY`、`DEFAULT_PAGE_SIZE` |
| **私有变量** | 前缀 `_` | `_internalCache` |

**特殊约定**：
- 新增视图目录命名需对齐后端菜单的 `component` 字段
- API 函数命名遵循 RESTful 风格：`get/list/create/update/delete` + 实体名

### 4.8 注释反模式（禁止）

❌ **无意义注释**：
```typescript
// 获取用户
function getUser() { }  // 代码本身已经说明
```

❌ **过时注释**：
```typescript
// 使用 MD5 加密密码（实际已改为 BCrypt）
function hashPassword() { }
```

❌ **注释掉的代码**：
```typescript
// function oldImplementation() {
//   // 旧实现...
// }
```

✅ **应该**：删除无用代码，使用 Git 管理历史版本

❌ **TODO 注释堆积**：
```typescript
// TODO: 优化性能
// TODO: 添加错误处理
// TODO: 重构这段代码
```

✅ **应该**：TODO 必须包含负责人和期限，或创建 Issue 跟踪

### 4.9 检查清单

新增/修改代码前，确保满足以下要求：

- [ ] 文件头注释完整（说明职责与关联接口）
- [ ] 所有导出函数有 JSDoc（含 `@param` 和 `@returns`）
- [ ] 复杂函数包含 `@example` 示例代码
- [ ] 所有导出类型/接口有注释
- [ ] 关键字段有单独注释说明
- [ ] 使用区块注释划分功能模块
- [ ] 复杂逻辑有行内注释说明
- [ ] 魔法字符串/数字已收敛到 `settings.ts`
- [ ] 命名符合约定（camelCase/PascalCase/kebab-case）
- [ ] 无注释掉的代码、无意义注释、无过时注释

## 5. 构建与质量检查

### 开发命令

```bash
# 安装依赖（Node >= 18）
npm install

# 启动开发服务器（默认 http://localhost:5173）
# 代理 /api、/admin-api → 后端 8080
npm run dev

# 类型检查 + 生产构建（输出 dist/）
npm run build

# 预览构建产物
npm run preview
```

### 质量要求

- **`npm run build` 必须通过**（含 `vue-tsc --noEmit` 严格类型检查）
- 新增/修改代码务必运行构建命令验证
- 开发代理目标：`.env.development` 的 `VITE_API_PROXY_TARGET`
- 生产网关地址：`.env.production` 的 `VITE_API_BASE_URL`（同域部署留空）

### 运行环境

- 触发页面前需后端 `apex-scaffold` 已启动（接口模块 8080）
- 后端未启动时，所有接口调用将失败

## 6. 前后端联调须知

### 接口契约

1. **字段命名**：camelCase，与后端 DTO 对齐
2. **统一响应**：`Result{code,msg,data,traceId}` 结构勿破坏
3. **分页口径**：
   - **统一口径**（推荐）：`PageQuery{page, size}` + `PageResponse{list, total, pageNum, pageSize, pages, hasNext}`
   - **工作流口径**（历史遗留）：`{pageNum, pageSize}` + `{records, total}`

### 鉴权流程

1. 登录前：`GET /api/v1/auth/captcha` 获取验证码（captchaId + base64 image）
2. 登录：`POST /api/v1/auth/login` 返回 `accessToken` 和 `refreshToken`
3. 后续请求：自动携带 `Authorization: Bearer <accessToken>`
4. **Token 刷新**：
   - `accessToken` 过期时，前端使用 `refreshToken` 调用刷新接口
   - 刷新成功后更新 `accessToken` 和 `refreshToken`
   - 刷新失败（如 refreshToken 过期）则清理会话并跳转登录页

#### Token 存储

会话令牌通过 [src/utils/auth.ts](src/utils/auth.ts) 统一管理，存储在 `localStorage`：

- **访问令牌**：`apex.admin.token`（有效期较短，如 2 小时）
- **刷新令牌**：`apex.admin.refresh-token`（有效期较长，如 7 天）
- **用户身份**：`apex.admin.identity`（缓存用户信息和权限）

**工具函数**：
```typescript
// Token 管理
getToken(): string
setToken(token: string): void
removeToken(): void

// RefreshToken 管理
getRefreshToken(): string
setRefreshToken(token: string): void
removeRefreshToken(): void

// 身份信息管理
getIdentity(): UserIdentity | null
setIdentity(identity: UserIdentity): void
removeIdentity(): void

// 统一清理会话
clearSession(): void
```

**使用规范**：
- 登录成功后必须同时保存 `accessToken` 和 `refreshToken`
- 登出或会话失效时必须调用 `clearSession()` 清理全部会话信息
- 不要在业务代码中直接操作 localStorage，统一通过 `auth.ts` 工具函数

### 错误排查

- 接口失败提示带 `traceId`
- 与后端日志（TraceId 贯穿）联动定位
- 401 自动清理会话并跳转登录页

### 新增菜单全流程（菜单驱动页面）

**四步走，缺一不可**：

1. **后端**：Flyway 迁移脚本入 `sys_menu` 表（设置 `component` 字段）
2. **前端**：新建视图文件 `views/{module}/{page}/index.vue`
3. **注册**：在 [src/router/dynamic.ts](src/router/dynamic.ts) 的 `VIEW_REGISTRY` 登记同名 loader
4. **权限**：后端 Handler 标注权限码 → 前端用 `v-permission` 控制按钮
5. **联调**：验证侧边栏出现、路由可达、CRUD 正常

**示例**：
```typescript
// 1. 后端 Flyway 种子数据
INSERT INTO sys_menu (menu_name, path, component, ...) 
VALUES ('API调用日志', '/monitor/api-call-log', 'monitor/api-call-log/index', ...);

// 2. 前端创建视图
// src/views/monitor/api-call-log/index.vue

// 3. 在 VIEW_REGISTRY 注册
'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue')
```

### 全局入口页面（静态路由）

**特殊情况**：工作台、工作流监控、演示页面

- 走 [src/router/index.ts](src/router/index.ts) 静态路由
- **不需要**后端菜单
- **不需要**在 `VIEW_REGISTRY` 登记
- 需设 `meta.hidden: true` 避免出现在侧边栏（或显式控制）

### 代码生成器

- 后端 `apex-generator` 的 `-f` 参数可自动产出 `api/{module}/{entity}.ts` 与 `views/.../form.vue`
- 产物需人工接入 `VIEW_REGISTRY` 与权限码
- 该工具由后端仓库提供，本前端仓库不内置

### 文件上传集成

- 业务页面需文件上传功能时，直接引用 `FileUpload` 或 `FileUploadEnhanced` 组件
- 无需重复实现上传逻辑
- 后端需提供与 [src/api/file.ts](src/api/file.ts) 对齐的接口（`/api/v1/files/**`）

### 数据库配置

- `system/database` 页面用于**部署配置采集与导出**（连接测试、生成配置）
- **不是**运行时数据库管理控制台
- 密码不通过前端保存，仅用于一次性生成配置

### 日志查询

- **运行时日志**（`monitor/runtime-log`）：
  - 查询后端运行时日志（Logback 日志文件）
  - 无分页，返回 `RuntimeLog[]`
- **业务日志**（`monitor/business-log`）：
  - 查询业务操作日志（登录/操作/API）
  - 有分页，返回 `PageResponse<BusinessLog>`
- 接口统一通过 [src/api/log.ts](src/api/log.ts) 调用 `/admin-api/v1/logs/**`

## 7. 变更检查清单（提交前必查）

- [ ] **构建通过**：`npm run build`（含 `vue-tsc --noEmit`）通过
- [ ] **注释完整**：所有新增代码带文件头注释 + JSDoc，风格与既有文件一致
- [ ] **请求规范**：复用 `utils/request.ts` 的 `get/post/put/del`，未裸写 axios
- [ ] **路由注册**：新增菜单页面已在 `dynamic.ts` 的 `VIEW_REGISTRY` 登记（全局入口页面除外，走静态路由）
- [ ] **分页统一**：新增非工作流代码分页遵循统一口径（`PageQuery{page,size}` + `PageResponse`）
- [ ] **常量收敛**：魔法字符串收敛到 `settings.ts`
- [ ] **组件复用**：分页复用 `Pagination` 组件
- [ ] **接口对齐**：与后端字段/权限码/菜单 `component` 对齐
- [ ] **文件清理**：未修改或引用 `*.bak` 备份文件
- [ ] **依赖安装**：新增依赖已运行 `npm install` 并提交 `package.json` + `package-lock.json`

### 类型安全检查清单

TypeScript 严格类型检查是本项目的质量红线，所有代码必须通过 `vue-tsc --noEmit` 验证。

#### 类型定义规范

**接口定义**：
```typescript
// ✅ 正确：完整类型定义 + 注释
/** 用户信息 */
export interface UserInfo {
  /** 用户 ID */
  id: string
  /** 登录账号 */
  username: string
  /** 用户昵称 */
  nickname?: string  // 可选字段使用 ?
  /** 性别：0=男 1=女 */
  sex: 0 | 1        // 使用联合类型限制取值范围
  /** 角色列表 */
  roles: string[]   // 数组类型明确元素类型
}

// ❌ 错误：使用 any 类型
export interface BadUserInfo {
  id: any           // 禁止使用 any
  data: object      // 禁止使用空 object
  extra: unknown    // unknown 需后续类型守卫
}
```

**API 响应类型**：
```typescript
// ✅ 正确：泛型约束返回类型
export function getUser(id: string): Promise<UserInfo> {
  return get<UserInfo>(`/admin-api/v1/users/${id}`)
}

// ❌ 错误：返回 Promise<any>
export function getBadUser(id: string): Promise<any> {
  return get(`/admin-api/v1/users/${id}`)
}
```

**组件 Props 类型**：
```vue
<script setup lang="ts">
// ✅ 正确：使用 TypeScript 类型定义
interface Props {
  /** 用户 ID */
  userId: string
  /** 是否显示（可选） */
  visible?: boolean
  /** 回调函数 */
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// ❌ 错误：使用运行时 props 定义（无类型检查）
const props = defineProps({
  userId: String,
  visible: Boolean
})
</script>
```

#### 类型断言规范

**避免滥用类型断言**：
```typescript
// ✅ 正确：使用类型守卫
function isUserInfo(data: unknown): data is UserInfo {
  return typeof data === 'object' && data !== null && 'id' in data
}

const data: unknown = await apiCall()
if (isUserInfo(data)) {
  console.log(data.id)  // 类型安全
}

// ❌ 错误：强制类型断言（跳过类型检查）
const data = await apiCall() as UserInfo  // 危险！运行时可能不是 UserInfo
console.log(data.id)
```

**合理使用 `as const`**：
```typescript
// ✅ 正确：字面量类型推断
const menuType = {
  DIRECTORY: 0,
  MENU: 1,
  BUTTON: 2
} as const

type MenuType = typeof menuType[keyof typeof menuType]  // 0 | 1 | 2

// ❌ 错误：丢失字面量类型
const badMenuType = {
  DIRECTORY: 0,  // 类型推断为 number，而不是 0
  MENU: 1,
  BUTTON: 2
}
```

#### 常见类型陷阱

**1. 可选链与空值检查**：
```typescript
// ✅ 正确：使用可选链 + 空值合并
const nickname = user?.profile?.nickname ?? '未设置'

// ❌ 错误：多层嵌套访问（可能抛出异常）
const nickname = user.profile.nickname || '未设置'
```

**2. 数组类型守卫**：
```typescript
// ✅ 正确：过滤 null/undefined
const validUsers: UserInfo[] = users.filter((u): u is UserInfo => u !== null)

// ❌ 错误：filter 后类型仍包含 null
const badUsers: UserInfo[] = users.filter(u => u !== null)  // 类型错误
```

**3. 枚举 vs 联合类型**：
```typescript
// ✅ 推荐：使用联合类型（更灵活，与后端对齐）
type Status = 0 | 1 | 2
const status: Status = 1

// ⚠️ 备选：使用枚举（需与后端协商数值对应关系）
enum Status {
  DRAFT = 0,
  NORMAL = 1,
  ARCHIVED = 2
}
```

#### 类型检查命令

```bash
# 仅类型检查（不生成产物）
npm run build  # 包含 vue-tsc --noEmit

# 如需单独检查类型
npx vue-tsc --noEmit
```

**CI/CD 要求**：
- 提交前必须运行 `npm run build` 确保类型检查通过
- Git pre-commit hook 可配置自动类型检查（可选）

## 8. 常见问题与陷阱

### 问题 1：菜单配置了但页面 404

**原因**：未在 `VIEW_REGISTRY` 注册组件 loader

**解决**：
```typescript
// src/router/dynamic.ts
const VIEW_REGISTRY: Record<string, () => Promise<unknown>> = {
  // 添加这一行
  'your/component/path': () => import('@/views/your/component/path.vue'),
}
```

### 问题 2：按钮权限不生效

**原因**：权限码未由后端下发或书写错误

**排查**：
1. 检查后端 Handler 是否标注了权限码注解
2. 在浏览器控制台查看 `usePermissionStore().permissions` 是否包含该权限码
3. 检查 `v-permission` 指令中的权限码字符串是否与后端一致

### 问题 3：文件上传报错 "fileName is not defined"

**原因**：`FileUploadResult` 字段名是 `objectName` 不是 `fileName`

**解决**：
```typescript
// ❌ 错误
ElMessage.success(`上传成功：${result.fileName}`)

// ✅ 正确
ElMessage.success(`上传成功：${result.objectName}`)
```

### 问题 4：动态路由生成失败

**原因**：
- 后端菜单接口返回数据格式不正确
- `component` 字段在 `VIEW_REGISTRY` 中找不到对应的 loader

**排查**：
1. 浏览器控制台查看错误信息
2. 检查 `/admin-api/v1/menus` 接口返回数据
3. 对比 `component` 字段与 `VIEW_REGISTRY` 中的键名

### 问题 5：工作流分页不显示

**原因**：工作流模块使用不同的分页口径

**解决**：工作流模块使用 `{pageNum, pageSize}` + `{records, total}`，不要用统一的 `PageQuery` / `PageResponse`

### 问题 6：cropperjs 模块找不到

**原因**：依赖未安装

**解决**：
```bash
npm install cropperjs
```

## 9. 附录：完整 VIEW_REGISTRY

当前项目中所有已注册的菜单页面组件（基于 [src/router/dynamic.ts](src/router/dynamic.ts)）：

```typescript
const VIEW_REGISTRY: Record<string, () => Promise<unknown>> = {
  // 系统管理
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'system/role/index': () => import('@/views/system/role/index.vue'),
  'system/menu/index': () => import('@/views/system/menu/index.vue'),
  'system/dept/index': () => import('@/views/system/dept/index.vue'),
  'system/dict/index': () => import('@/views/system/dict/index.vue'),
  'system/config/index': () => import('@/views/system/config/index.vue'),
  'system/database/index': () => import('@/views/system/database/index.vue'),
  'system/job/index': () => import('@/views/system/job/index.vue'),
  'system/job/query': () => import('@/views/system/job/query.vue'),
  
  // 监控
  'monitor/loginlog/index': () => import('@/views/monitor/loginlog/index.vue'),
  'monitor/audit/index': () => import('@/views/monitor/audit/index.vue'),
  'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue'),
  'monitor/online/index': () => import('@/views/monitor/online/index.vue'),
  'monitor/dashboard/index': () => import('@/views/monitor/dashboard/index.vue'),
  'monitor/runtime-log/index': () => import('@/views/monitor/runtime-log/index.vue'),
  'monitor/business-log/index': () => import('@/views/monitor/business-log/index.vue'),
  
  // 数据管理
  'data/document/index': () => import('@/views/data/document/index.vue'),
  'data/chart/index': () => import('@/views/data/chart/index.vue'),
  
  // 其他
  'profile/index': () => import('@/views/profile/index.vue'),
  'dashboard/index': () => import('@/views/dashboard/index.vue'),
  'workflow/monitor/index': () => import('@/views/workflow/monitor/index.vue'),
}
```

**注意**：
- 以上列表必须与实际文件系统中的视图文件一一对应
- 新增页面时必须同步更新此注册表
- 静态路由页面（工作台、工作流监控、OAuth2 回调、演示页面）不在此注册表中

---

**文档维护**：本文件随项目演进持续更新。如发现文档与代码不符，请优先以代码为准，并及时更新本文件。

**最后更新**：2026-09-13（完整补充：环境变量配置、表单校验工具、Token 刷新机制、OAuth2 授权流程、错误处理规范、Store 设计原则、类型安全检查清单）
