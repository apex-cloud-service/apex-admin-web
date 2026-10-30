# AGENTS.md 补充建议

本文档列出了需要补充到 AGENTS.md 中的内容，按优先级排序。

---

## 高优先级补充内容

### 补充 1：环境变量配置章节

**建议位置**：在 §3 核心机制与约定之后新增 §3.10

```markdown
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
```

---

### 补充 2：表单校验工具章节

**建议位置**：在 §3 核心机制与约定之后新增 §3.11

```markdown
### 3.11 表单校验工具

项目在 [src/utils/validate.ts](../../../src/utils/validate.ts) 中封装了常用的表单字段校验规则，供 Element Plus 表单验证使用。

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
import { validatePhone, validateEmail, validateRequired } from '@/utils/validate'
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
```

---

### 补充 3：Token 刷新机制说明

**建议位置**：在 §6 前后端联调须知的「鉴权流程」章节中补充

```markdown
### 鉴权流程

1. 登录前：`GET /api/v1/auth/captcha` 获取验证码（captchaId + base64 image）
2. 登录：`POST /api/v1/auth/login` 返回 `accessToken` 和 `refreshToken`
3. 后续请求：自动携带 `Authorization: Bearer <accessToken>`
4. **Token 刷新**：
   - `accessToken` 过期时，前端使用 `refreshToken` 调用刷新接口
   - 刷新成功后更新 `accessToken` 和 `refreshToken`
   - 刷新失败（如 refreshToken 过期）则清理会话并跳转登录页

#### Token 存储

会话令牌通过 [src/utils/auth.ts](../../../src/utils/auth.ts) 统一管理，存储在 `localStorage`：

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
```

---

### 补充 4：settings.ts 常量补充

**建议位置**：§4.6 常量收敛与注释章节中补充完整常量列表

```markdown
### 4.6 常量收敛与注释

**所有魔法字符串/数字必须定义为常量并注释**，统一放在 [src/settings.ts](../../../src/settings.ts)：

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
```

---

## 中优先级补充内容

### 补充 5：OAuth2 授权流程说明

**建议位置**：在 §3 核心机制与约定之后新增 §3.12

```markdown
### 3.12 OAuth2 授权流程

项目支持标准的 OAuth2 授权码模式，用于第三方社交登录集成。

#### 接口层

[src/api/oauth2.ts](../../../src/api/oauth2.ts) 提供 OAuth2 相关接口：
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

[src/views/oauth2/callback.vue](../../../src/views/oauth2/callback.vue)：OAuth2 授权回调页面
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
```

---

### 补充 6：错误处理最佳实践

**建议位置**：在 §3.5 通用组件章节之后新增

```markdown
### 3.5.1 错误处理规范

#### 统一错误提示

项目通过 `ElMessage` 和 `ElNotification` 提供统一的错误提示：

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

#### 错误码处理

**后端统一响应**：
```typescript
interface Result<T> {
  code: number      // 0=成功，非0=业务错误码
  msg: string       // 错误信息
  data: T           // 业务数据
  traceId?: string  // 链路追踪 ID
}
```

**常见错误码**（见 settings.ts）：
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

#### 网络异常处理

**超时处理**：
- 请求超时：30 秒（与后端全局响应超时对齐）
- 超时后自动提示："请求超时，请检查网络连接"

**网络断开**：
- 断网时提示："网络连接失败，请检查网络设置"
- 可选：监听 `window.navigator.onLine` 事件实时提示

#### 兜底错误处理

**全局错误边界**：
```typescript
// main.ts
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info)
  ElMessage.error('程序运行异常，请刷新页面重试')
  // 可选：上报到监控平台
}
```

#### 错误排查要点

- **TraceId 联动**：前端展示的 traceId 与后端日志关联，便于快速定位问题
- **控制台日志**：开发环境下 API 错误会打印完整错误对象到控制台
- **错误信息国际化**：后端返回的 msg 需考虑前端展示，避免技术术语
```

---

### 补充 7：类型安全开发指引

**建议位置**：在 §7 变更检查清单之后新增

```markdown
### 7.1 类型安全检查清单

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
```

---

## 低优先级补充内容

### 补充 8：静态路由 vs 动态路由选择标准

**建议位置**：在 §3.2 动态路由章节之后补充

```markdown
#### 静态路由 vs 动态路由选择标准

**使用静态路由的场景**：
1. **全局入口页面**：所有用户登录后必须可访问的页面（如工作台）
2. **公开页面**：无需登录即可访问的页面（如登录页、OAuth2 回调页）
3. **通用功能页面**：不需要权限控制的页面（如个人中心、错误页面）
4. **演示/测试页面**：开发调试用页面（设置 `hidden: true` 不在侧边栏显示）

**使用动态路由的场景**：
1. **业务功能页面**：需要根据用户角色/权限动态展示的页面
2. **可配置菜单**：需要通过后台管理配置菜单结构和展示顺序
3. **多租户场景**：不同租户看到不同的菜单结构
4. **权限精细控制**：页面级别的权限控制（通过后端菜单 `perms` 字段）

**判断依据总结**：
- 问自己：这个页面是否需要「后端菜单表」控制？
  - 是 → 动态路由（需在 VIEW_REGISTRY 注册）
  - 否 → 静态路由（直接在 router/index.ts 中定义）

**实际案例**：
- 工作台（`/dashboard`）：所有用户必须可访问 → 静态路由
- 用户管理（`/system/user`）：仅管理员可访问 → 动态路由
- 工作流监控（`/workflow/monitor`）：暂未接入权限系统 → 静态路由（未来可能改为动态）
- OAuth2 回调（`/oauth2/callback`）：第三方跳转回来的页面 → 静态路由（public: true）
```

---

### 补充 9：Pinia Store 设计原则

**建议位置**：在 §3.4 状态管理章节之后补充

```markdown
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
// src/stores/example.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 示例 Store
 * 用于管理 XXX 功能的全局状态
 */
export const useExampleStore = defineStore(
  'example',  // Store ID（全局唯一）
  () => {
    // ========== 状态 ==========
    const count = ref(0)
    const name = ref('Example')

    // ========== 计算属性 ==========
    const doubleCount = computed(() => count.value * 2)

    // ========== 方法 ==========
    const increment = () => {
      count.value++
    }

    const reset = () => {
      count.value = 0
      name.value = 'Example'
    }

    // ========== 导出 ==========
    return {
      // 状态
      count,
      name,
      // 计算属性
      doubleCount,
      // 方法
      increment,
      reset
    }
  },
  {
    // 可选：持久化配置
    persist: {
      key: 'apex.admin.example',
      storage: localStorage,
      paths: ['count']  // 仅持久化部分字段
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

// ✅ 正确：使用 storeToRefs 保持响应式
const { count, doubleCount } = storeToRefs(exampleStore)
const { increment, reset } = exampleStore

// ❌ 错误：直接解构丢失响应式
const { count: badCount } = exampleStore  // badCount 不是响应式
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
// user.ts
export const useUserStore = defineStore('user', () => {
  const clearLocal = () => {
    removeToken()
    removeIdentity()
    // 登出时清理其他 Store 的状态
    const appStore = useAppStore()
    appStore.resetSettings()
  }
  return { clearLocal }
})

// app.ts
export const useAppStore = defineStore('app', () => {
  const resetSettings = () => {
    // 重置 UI 设置
  }
  return { resetSettings }
})
```

**避免 Store 滥用**：
- 不要为每个页面都创建一个 Store
- 不要把所有状态都放到 Store（优先考虑组件内状态）
- 不要在 Store 中处理业务逻辑（API 调用应在 api/ 层）
```

---

## 其他建议

### 文档维护建议

1. **版本控制**：每次大版本更新时更新文档版本号
2. **变更日志**：在文档末尾维护变更记录（可选）
3. **定期审查**：每季度检查一次文档与代码的一致性
4. **反馈渠道**：鼓励团队成员提出文档改进建议

### 实施优先级建议

**立即实施**（本次补充）：
- ✅ 环境变量配置
- ✅ 表单校验工具
- ✅ Token 刷新机制
- ✅ settings.ts 常量列表

**近期实施**（1-2周内）：
- ⚠️ OAuth2 授权流程
- ⚠️ 错误处理最佳实践
- ⚠️ 类型安全开发指引

**中期实施**（1个月内）：
- 📌 静态 vs 动态路由选择标准
- 📌 Store 设计原则

---

**文档生成时间**：2026-09-13
**检查依据**：对照实际代码文件和项目配置
**建议提交者**：AI 编码 Agent (Kiro)
