# 测试指南

> 依据 [vitest.config.ts](../../vitest.config.ts)、[playwright.config.ts](../../playwright.config.ts)、[package.json](../../package.json) 与 `src/**/__tests__/`、`src/api/*.test.ts`、`e2e/` 当前实现核对（2026-11-13）。历史全量执行结果见[测试报告（2026-11-05）](../archived/project-reports/test-report-2026-11-05.md)与[测试报告（2026-11-13）](../archived/project-reports/test-report-2026-11-13.md)。

## 1. 技术选型与现状

| 项 | 现状 |
|----|------|
| 单元测试框架 | Vitest ^5.0.1 |
| DOM 测试环境 | happy-dom ^20.14.5（`environment: 'happy-dom'`，`globals: true`；`e2e/` 已排除，归 Playwright） |
| 组件测试 | @vue/test-utils ^2.5.0（已用于 `Pagination`/`FileUpload`/`EmptyState`/`FileUploadEnhanced`/`GlobalSearch`/`NotificationCenter` 与 `v-permission` 指令） |
| 全局准备 | [src/test/setup.ts](../../src/test/setup.ts)：mock `ResizeObserver` 与 `window.matchMedia`（Element Plus / ECharts 依赖） |
| E2E | Playwright ^1.63.0：`playwright.config.ts` + `e2e/`（`npm run test:e2e`）；webServer 起 Vite 开发服务，后端接口在用例内经 `page.route` 打桩，不依赖真实后端；首次运行须 `npx playwright install chromium` |
| 性能/压测 | `npm run test:perf`（Lighthouse desktop，构建产物基线口径）、`npm run test:stress`（autocannon 静态服务两档并发）；业务接口压测属后端/网关范畴 |
| 覆盖率 | v8 provider（`@vitest/coverage-v8`），报告 text/json/html/lcov（`npm run test:coverage`） |
| 报告产物 | `npm run test:report` 输出 JUnit XML + JSON + 覆盖率（text/html/lcov + `coverage-summary.json` 摘要）到 `reports/`；脚本末尾调用 `scripts/quality/normalize-test-report.mjs` 归一化路径与主机名；机器可读结果（含 `e2e-results.xml`）入库，HTML/lcov/lighthouse/stress 生成物不入库 |
| CI | 无（本地执行） |

## 2. 常用命令

```bash
npm run test            # watch 模式运行全部用例
npm run test:ui         # Vitest UI 面板
npm run test:coverage   # 覆盖率报告（v8，输出 coverage/）
npm run test:report     # 单次运行 + JUnit/JSON/HTML/lcov 报告，输出 reports/（自动归一化后仅机器可读结果入库）
npx vitest run          # CI 式单次运行（不 watch）
npx vitest run src/utils/__tests__/request.spec.ts   # 指定文件
npm run test:e2e        # Playwright E2E（6 条核心链路用例）
npm run test:perf       # Lighthouse（构建 + vite preview + 报告到 reports/lighthouse/）
npm run test:stress     # 压测（vite preview + autocannon，报告到 reports/stress/，需已构建）
```

测试文件按 Vitest 默认规则匹配 `**/*.{test,spec}.?(c|m)[jt]s?(x)`，`e2e/**` 已显式排除（归 Playwright）。覆盖率默认不设 `coverage.include`，只统计被用例加载过的模块；如需全仓库口径，追加 `--coverage.include='src/**/*.{ts,vue}'`。

## 3. 现有用例清单

共 65 个测试文件、475 个用例（2026-11-13 实测 `npx vitest run` 全绿），分布于 `src/**/__tests__/`（工具、Store、组件、指令、路由）与 `src/api/`（业务 API 契约）。下表为 2026-11-05 基线时已存在的用例；此后新增的 37 文件 / 254 用例（23 个 API 契约、7 个 utils、office Store、2 个 composables、4 个组件）与逐文件用例数见[测试报告（2026-11-13）](../archived/project-reports/test-report-2026-11-13.md) §3：

| 用例文件 | 用例数 | 覆盖内容 |
|----------|-------|---------|
| `src/utils/__tests__/request.spec.ts` | 12 | 401 刷新后单次重放；认证端点排除；非 401 状态码在重放中如实保留；并发多个 401 共享同一次刷新（refreshPromise 单飞）；会话租户记录与 `X-Tenant-Id` 头；`showError` 授权类 403 提示引导（命中/非命中关键字、非 403） |
| `src/utils/__tests__/oauth2.spec.ts` | 4 | S256 PKCE 授权 URL 生成；表单编码换取令牌与字段映射；授权上下文一次性消费（state 防重放） |
| `src/utils/__tests__/auth-config.spec.ts` | 6 | 认证配置 API 契约：权限筛选/分页参数、写接口路径、掩码密钥不回写、PKCE 不可关闭 |
| `src/utils/__tests__/auth.spec.ts` | 4 | 会话存取：token/refreshToken/identity 读写与 `clearSession` 清理 |
| `src/utils/__tests__/validate.spec.ts` | 4 | `validateEmail` / `validatePhone` 校验行为与中文错误信息 |
| `src/utils/__tests__/mask.spec.ts` | 23 | 手机/邮箱/身份证/银行卡/姓名/地址/IP/护照/车牌/通用脱敏与 `maskBatch` 的边界行为 |
| `src/utils/__tests__/xss-protection.spec.ts` | 31 | 转义/反转义、标签剥离、危险协议拦截、HTML 白名单清理、JSON 与分类输入清理、XSS 特征检测、CSP Nonce |
| `src/utils/__tests__/storage.spec.ts` | 6 | 原始/JSON 读写、缺失与损坏数据兜底、写入异常返回 false、循环引用序列化失败 |
| `src/utils/__tests__/notification-stream.spec.ts` | 9 | SSE 通知流：地址经 `apiUrl` 拼接、`Accept: text/event-stream` 头、事件解析与断线 5s→30s 退避 |
| `src/utils/__tests__/api-base.spec.ts` | 5 | `apiBaseUrl`/`apiUrl` 拼接：跨域携带 `VITE_API_BASE_URL`、同域相对路径、尾斜杠归一化 |
| `src/utils/__tests__/tenant-package.spec.ts` | 5 | 套餐载荷构造：菜单父链补全、features 空集合=未订阅语义的三开关翻译 |
| `src/api/auth.test.ts` | 6 | 登录固定 `loginType=PASSWORD`；MFA 二步路径；我的角色/权限兼容对象数组；刷新令牌参数 |
| `src/api/notification.test.ts` | 4 | 通知中心 API 契约：收件箱分页、未读数、已读/全部已读路径 |
| `src/api/office-platform.test.ts` | 4 | 办公平台基础设施 API 契约：应用更新乐观锁 version 随 body 回传；解绑 version 走 query；绑定分页 platform/status/分页参数 |
| `src/api/message.test.ts` | 7 | 站内信接口契约：收件箱/已发送返回纯数组、分页参数、标记已读路径；消息模板管理（创建/更新/删除路径） |
| `src/api/workflow.test.ts` | 1 | 工作流实例详情路由契约（`/admin-api/v1/workflows/instances/{id}`） |
| `src/api/generator.test.ts` | 5 | 生成器 API 契约：基础端点调用、同步向导模板/预检/预览、异步任务契约 |
| `src/api/platform.test.ts` | 22 | 租户套餐、能力计量、开放应用、集成中心、IoT、统一通知、在线会话、概览端点的路径与关键参数 |
| `src/stores/__tests__/user.spec.ts` | 8 | 登录/MFA 挑战分流、租户写入、身份加载降级为空数组、登出失败仍清本地 |
| `src/stores/__tests__/permission.spec.ts` | 5 | `hasPermission` 空码/空集合放行、单码与逗号多码匹配 |
| `src/stores/__tests__/app.spec.ts` | 4 | 侧边栏折叠与主题偏好持久化、根元素 `dark` class |
| `src/directives/__tests__/permission.spec.ts` | 5 | `v-permission` 放行/移除语义与逗号多码任一命中 |
| `src/composables/__tests__/useCrud.spec.ts` | 12 | 分页查询透传、增删改刷新、删除确认取消、末页回退、批量删除 |
| `src/composables/__tests__/useTableConfig.spec.ts` | 9 | 列配置/分页/筛选/排序持久化、默认列合并、导入导出与重置 |
| `src/components/__tests__/Pagination.spec.ts` | 4 | `change` 事件、每页条数重置首页、total 收缩时页码回退 |
| `src/components/__tests__/FileUpload.spec.ts` | 2 | 上传地址经 `apiUrl` 拼接契约 |
| `src/router/__tests__/dynamic.spec.ts` | 7 | 菜单树转换：按钮/空目录/未登记组件跳过、`visible=0` 隐藏、`status` 不参与过滤 |

## 4. 编写规范

### 4.1 文件与命名

- 位置：与被测代码就近；工具类集中在 `src/utils/__tests__/`，业务 API 直接与被测模块同目录（如 `src/api/office-platform.test.ts`）；
- 命名：`{被测模块}.spec.ts` 或 `{被测模块}.test.ts`（Vitest 默认同时匹配 `*.spec.*` 与 `*.test.*`）；
- 禁止依赖后端服务：网络请求一律 mock，通常 `vi.mock('@/utils/request')`。

### 4.2 示例：测试 API 层契约

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock utils/request，断言 api 层传参契约
vi.mock('@/utils/request', () => ({
  get: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  post: vi.fn().mockResolvedValue(undefined),
}))

import { listPermissions } from '@/api/auth-config'
import { get } from '@/utils/request'

describe('auth-config api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('权限列表携带分页与类型筛选', async () => {
    await listPermissions({ page: 1, size: 20, type: 1 })
    expect(get).toHaveBeenCalledWith('/admin-api/v1/auth/config/permissions',
      expect.objectContaining({ page: 1, size: 20, type: 1 }))
  })
})
```

### 4.3 优先级建议

1. **必须测**：`utils/request.ts`（解包/刷新/401）、`api/oauth2.ts`（PKCE/state）、权限指令、`composables/useCrud` 等有状态的复用逻辑——已于 2026-11-05 补齐；
2. **建议测**：表单校验规则、脱敏/XSS 工具、`validate-rules.ts`、`message-socket.ts`、`request-cache.ts`、`error-handler.ts`、`useFormDraft.ts`、`useBreakpoint.ts`、全部 API 契约与通用组件——已于 2026-11-13 补齐（39 个 API 模块全部有直接契约用例）；
3. **待补**：`src/views/**` 页面组件交互（63 个视图组件暂无用例，核心链路由 `e2e/` 打桩集成抽样覆盖）。

## 5. 覆盖率

```bash
npm run test:coverage     # 输出到 coverage/
npm run test:report      # 输出到 reports/（JUnit + JSON + HTML/lcov）
```

- Provider：v8（依赖 `@vitest/coverage-v8`，须与 `vitest` 主版本一致）；
- 报告输出 text/json/html/lcov；
- 排除：`node_modules`、`src/test`、`**/*.spec.ts`、`**/*.test.ts`、`dist`、`*.config.ts`（见 vitest.config.ts `coverage.exclude`）；
- **默认不设 `coverage.include`，只统计被用例加载过的模块**。2026-11-13 实测：默认口径行覆盖 77.35%，强制统计 `src/**` 的全量口径行覆盖 15.58%——两者差异全部来自 63 个页面组件无组件级用例（API/工具/组件层已全部有直接用例）。引用覆盖率数字时必须注明口径，不能只用默认口径宣称整体覆盖水平。
- 当前未设覆盖率门槛（thresholds），引入 CI 时建议对 `src/utils`、`src/stores`、`src/composables` 设定下限，并单独跟踪 `src/views`。

## 6. 测试环境注意事项

- `happy-dom` 对部分浏览器 API 支持有限：涉及 `ResizeObserver`、`matchMedia` 已在 [setup.ts](../../src/test/setup.ts) 全局 mock；用到其他缺失 API 时在 setup 中补充，勿散落在用例里；
- Pinia：用例中先 `createPinia()` 并 `setActivePinia()` 再使用 store；
- Element Plus 组件：单测中优先 mock 组件或直接测逻辑层，避免渲染整棵组件树拖慢用例；
- E2E 打桩口径：`e2e/` 用例 mock 的是 HTTP 接口层，不覆盖真实后端联调、OAuth 跳转与 Nginx 反代验证（后者用 `npm run verify:deploy`）；
- E2E 建议独占执行：与重负载任务并行时出现过间歇超时（见测试报告 §7）。

## 7. 关联文档

- [总体架构](../architecture/overview.md) §7 质量保障体系
- [AGENTS.md](../../AGENTS.md) 类型安全检查清单（构建前 `vue-tsc --noEmit` 是另一道强制质量门）

---

**最后更新**：2026-11-13
