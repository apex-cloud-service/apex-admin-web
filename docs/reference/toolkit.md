# 工具库与组合式函数参考

> 依据 [src/utils/](../../src/utils/) 与 [src/composables/](../../src/composables/) 当前实现核对（2026-10-31 复核）。核心工具（request/auth/validate）在 [AGENTS.md](../../AGENTS.md) 已有专章，本文覆盖其余模块。

## 1. utils 总览

| 文件 | 职责 | 核心导出 |
|------|------|---------|
| [request.ts](../../src/utils/request.ts) | Axios 封装：Token 注入、Result 解包、401 无感刷新、ApiError | `request` `get` `post` `put` `del` `showError` `ApiError` |
| [auth.ts](../../src/utils/auth.ts) | 会话存取（localStorage） | `getToken/setToken/removeToken`、`getRefreshToken/setRefreshToken/removeRefreshToken`、`getIdentity/setIdentity/removeIdentity`、`clearSession` |
| [validate.ts](../../src/utils/validate.ts) | Element Plus 校验器风格规则（validator 回调式） | `validatePhone` `validateEmail` `validateUsername` `validateChineseName` `validateIDCard` `validatePassword` `validateURL` `validateIP` `validatePort` `validateInteger` `validatePositiveInteger` `validateRequired` `validateLength` `validateRange` |
| [validate-rules.ts](../../src/utils/validate-rules.ts) | 校验规则**工厂**（函数返回 FormItemRule，可组合） | `required` `email` `phone` `username` `password` `strongPassword` `url` `number` `integer` `positiveInteger` `length` `minLength` `maxLength` `range` `idCard` `ip` `port` `pattern` `validator` `confirmation` `combine`、聚合对象 `rules` |
| [storage.ts](../../src/utils/storage.ts) | localStorage 安全读写（JSON 序列化、异常吞掉返回 null/false） | `readRaw` `writeRaw` `readJSON` `writeJSON` `removeItem` `hasItem` |
| [error-handler.ts](../../src/utils/error-handler.ts) | 分类错误体系与统一处理（当前仓库无页面调用点） | `ErrorType` 枚举、`ApiError` `NetworkError` `TimeoutError` `ValidationError` `AuthorizationError`、`handleError`、`withErrorHandling`（装饰异步函数）、`createErrorBoundary` |
| [mask.ts](../../src/utils/mask.ts) | 敏感信息脱敏（当前仓库无页面调用点） | `maskPhone` `maskEmail` `maskIdCard` `maskBankCard` `maskName` `maskAddress` `maskIp` `maskPassport` `maskPlateNumber` `maskGeneral` `maskBatch`（按字段批量脱敏）、`maskRules` |
| [xss-protection.ts](../../src/utils/xss-protection.ts) | XSS 防护与输入净化（当前仓库无页面调用点） | `escapeHtml` `unescapeHtml` `stripHtmlTags` `sanitizeUrl` `sanitizeHtml` `sanitizeJson` `sanitizeInput` `generateCSPNonce` `detectXSS` |
| [request-cache.ts](../../src/utils/request-cache.ts) | 请求结果缓存（TTL/去重）；当前仓库无调用点 | `cachedRequest` `prefetchRequest` `clearCache(key)` `clearAllCache()` `getCacheStats()`、`CACHE_KEYS` 常量 |
| [echarts-theme.ts](../../src/utils/echarts-theme.ts) | ECharts 明暗主题（当前仓库无页面调用点） | `lightTheme` `darkTheme` `setTheme` `getTheme` `getBaseChartOption` `mergeChartOption`、`presetCharts` 预设 |
| [message-socket.ts](../../src/utils/message-socket.ts) | 站内信 WebSocket 管理器：票据握手、20s ping/pong、1h 寿命、断线重连（5s→30s 退避）；已接入 AdminLayout 与站内信页 | `subscribeMessagePush` `subscribeMessageSocketState`、类型 `MessageSocketState` |

## 2. 两套校验工具如何选

| 场景 | 用法 |
|------|------|
| 简单表单，规则一次性写死 | 用 `validate.ts` 的 validator 函数（AGENTS.md §3.11 风格） |
| 规则需带参数/复用组合 | 用 `validate-rules.ts` 工厂：`rules.combine(rules.required(), rules.length(2, 20))` |

两者不互斥，同一表单不要混用两种风格。

## 3. composables

| 文件 | 签名 | 职责 |
|------|------|------|
| [useCrud.ts](../../src/composables/useCrud.ts) | `useCrud<T>(api: CrudApi<T>, options?: UseCrudOptions)` | 列表页通用 CRUD 状态机：分页数据、loading、查询参数、增删改后的列表刷新。`CrudApi<T>` 约定 `list/get/create/update/remove` 五个 API 函数形状 |
| [useTableConfig.ts](../../src/composables/useTableConfig.ts) | `useTableConfig(tableKey, columns, options?)` | 表格列配置持久化（localStorage 键前缀 `table_config_`，见 settings.ts `TABLE_CONFIG_KEY_PREFIX`），支持列显示/排序记忆 |
| [useFormDraft.ts](../../src/composables/useFormDraft.ts) | `useFormDraft<T>(draftKey, options?)` | 表单草稿自动暂存与恢复（键前缀 `draft_`，时间戳后缀 `_timestamp` 用于 TTL 过期清理） |
| [useBreakpoint.ts](../../src/composables/useBreakpoint.ts) | `useBreakpoint(customBreakpoints?)` | 响应式断点侦测（返回当前断点与各区间布尔值），用于布局自适应 |

统一从 [src/composables/index.ts](../../src/composables/index.ts) 桶导出。当前四个 composable 均未发现页面调用点，属已实现未接入能力。

> 选型参考（AGENTS.md §3.4）：单页内状态用 ref/reactive；跨页复用的列表 CRUD 行为优先用 `useCrud`；只有跨页面共享且需持久化/全局通知的状态才进 Pinia store。

## 4. stores（含未在早期文档记载的 office store）

| Store | id | 职责 | 持久化 |
|-------|----|------|--------|
| [user.ts](../../src/stores/user.ts) | `user` | token/identity/permissions、`login()`、`loadIdentity()`（三接口并行，roles/permissions 失败降级空数组）、`logout()`、`clearLocal()` | 经 `utils/auth.ts` 写 localStorage |
| [permission.ts](../../src/stores/permission.ts) | `permission` | 派生权限计算，`hasPermission(code)` | 无 |
| [app.ts](../../src/stores/app.ts) | `app` | 侧边栏折叠、明暗主题（`documentElement.classList.toggle('dark')`） | 经 `utils/storage.ts`（SIDEBAR_KEY/THEME_KEY） |
| [office.ts](../../src/stores/office.ts) | `office` | 办公平台当前选中平台（`currentPlatform`）与绑定状态（`bindingStatus`） | 无 |

> 注意：项目**未安装** pinia 持久化插件，持久化均为手动实现（storage.ts / auth.ts）。AGENTS.md 中带 `persist` 配置的示例是"若引入插件时"的参考写法，当前代码不生效。

## 5. Mock 数据服务

- 位置：[src/mock/index.ts](../../src/mock/index.ts)；
- 加载：[main.ts](../../src/main.ts) 仅在 `import.meta.env.DEV` 时动态 `import('./mock')`，生产构建不打包；
- 内容：Mock.js 模拟文档/图表管理接口（50 条文档、30 条图表），详见 [Mock 数据服务指南](../guides/mock-data-service.md)。

## 6. 演进约定

新增工具/composable 时：

1. 文件职责和用法应在代码结构或文档中清晰可见；仅在逻辑不自明或存在重要约束时补充必要注释（遵循 AGENTS.md 的克制原则）；
2. 纯函数优先、可单测；涉及 localStorage 的键名收敛到 `settings.ts`；
3. 同步更新本文表格；
4. 复杂或易错逻辑配套 `*.spec.ts` 用例（见 [测试指南](testing.md)）。

---

**最后更新**：2026-10-31
