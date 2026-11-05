# 测试指南

> 依据 [vitest.config.ts](../../vitest.config.ts)、[package.json](../../package.json) 与 `src/**/__tests__/`、`src/api/*.test.ts` 当前实现核对（2026-11-05）。最近一次全量执行结果见[测试报告（2026-11-05）](../archived/project-reports/test-report-2026-11-05.md)。

## 1. 技术选型与现状

| 项 | 现状 |
|----|------|
| 单元测试框架 | Vitest ^5.0.1 |
| DOM 测试环境 | happy-dom ^20.14.5（`environment: 'happy-dom'`，`globals: true`） |
| 组件测试 | @vue/test-utils ^2.5.0（已用于 `Pagination.vue`、`v-permission` 指令） |
| 全局准备 | [src/test/setup.ts](../../src/test/setup.ts)：mock `ResizeObserver` 与 `window.matchMedia`（Element Plus / ECharts 依赖） |
| E2E | @playwright/test ^1.63.0 已安装，**尚无配置文件与用例** |
| 覆盖率 | v8 provider（`@vitest/coverage-v8`），报告 text/json/html/lcov（`npm run test:coverage`） |
| 报告产物 | `npm run test:report` 输出 JUnit XML + JSON + 覆盖率到 `reports/`；脚本末尾调用 `scripts/quality/normalize-test-report.mjs` 归一化路径与主机名；机器可读结果入库，HTML/lcov 不入库 |
| CI | 无（本地执行） |

## 2. 常用命令

```bash
npm run test            # watch 模式运行全部用例
npm run test:ui         # Vitest UI 面板
npm run test:coverage   # 覆盖率报告（v8，输出 coverage/）
npm run test:report     # 单次运行 + JUnit/JSON/HTML/lcov 报告，输出 reports/（自动归一化后仅机器可读结果入库）
npx vitest run          # CI 式单次运行（不 watch）
npx vitest run src/utils/__tests__/request.spec.ts   # 指定文件
```

测试文件按 Vitest 默认规则匹配：`**/*.{test,spec}.?(c|m)[jt]s?(x)`（vitest.config.ts 未自定义 include）。覆盖率默认不设 `coverage.include`，只统计被用例加载过的模块；如需全仓库口径，追加 `--coverage.include='src/**/*.{ts,vue}'`。

## 3. 现有用例清单

共 22 个测试文件、185 个用例（2026-11-05 实测 `npx vitest run` 全绿），分布于 `src/**/__tests__/`（工具、Store、组件、路由）与 `src/api/`（业务 API 契约）：

| 用例文件 | 用例数 | 覆盖内容 |
|----------|-------|---------|
| `src/utils/__tests__/request.spec.ts` | 8 | 401 刷新后单次重放；认证端点排除；非 401 状态码在重放中如实保留；并发多个 401 共享同一次刷新（refreshPromise 单飞）；会话租户记录与 `X-Tenant-Id` 头 |
| `src/utils/__tests__/oauth2.spec.ts` | 4 | S256 PKCE 授权 URL 生成；表单编码换取令牌与字段映射；授权上下文一次性消费（state 防重放） |
| `src/utils/__tests__/auth-config.spec.ts` | 6 | 认证配置 API 契约：权限筛选/分页参数、写接口路径、掩码密钥不回写、PKCE 不可关闭 |
| `src/utils/__tests__/auth.spec.ts` | 4 | 会话存取：token/refreshToken/identity 读写与 `clearSession` 清理 |
| `src/utils/__tests__/validate.spec.ts` | 4 | `validateEmail` / `validatePhone` 校验行为与中文错误信息 |
| `src/utils/__tests__/mask.spec.ts` | 23 | 手机/邮箱/身份证/银行卡/姓名/地址/IP/护照/车牌/通用脱敏与 `maskBatch` 的边界行为 |
| `src/utils/__tests__/xss-protection.spec.ts` | 31 | 转义/反转义、标签剥离、危险协议拦截、HTML 白名单清理、JSON 与分类输入清理、XSS 特征检测、CSP Nonce |
| `src/utils/__tests__/storage.spec.ts` | 6 | 原始/JSON 读写、缺失与损坏数据兜底、写入异常返回 false、循环引用序列化失败 |
| `src/api/auth.test.ts` | 6 | 登录固定 `loginType=PASSWORD`；MFA 二步路径；我的角色/权限兼容对象数组；刷新令牌参数 |
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

1. **必须测**：`utils/request.ts`（解包/刷新/401）、`api/oauth2.ts`（PKCE/state）、权限指令、`composables/useCrud` 等有状态的复用逻辑——以上已于 2026-11-05 补齐；
2. **建议测**：表单校验规则（`validate.ts` / `validate-rules.ts`）、脱敏工具（`mask.ts`）、XSS 工具（`xss-protection.ts`）——`validate.ts` 与 `mask.ts` / `xss-protection.ts` 已有用例，`validate-rules.ts` 仍缺；
3. **待补**：`composables/useFormDraft.ts`、`useBreakpoint.ts`、`utils/message-socket.ts`、`utils/request-cache.ts`、`utils/error-handler.ts`，以及 `src/views/**` 页面组件交互（配合 @vue/test-utils + happy-dom）。

## 5. 覆盖率

```bash
npm run test:coverage     # 输出到 coverage/
npm run test:report      # 输出到 reports/（JUnit + JSON + HTML/lcov）
```

- Provider：v8（依赖 `@vitest/coverage-v8`，须与 `vitest` 主版本一致）；
- 报告输出 text/json/html/lcov；
- 排除：`node_modules`、`src/test`、`**/*.spec.ts`、`**/*.test.ts`、`dist`、`*.config.ts`（见 vitest.config.ts `coverage.exclude`）；
- **默认不设 `coverage.include`，只统计被用例加载过的模块**。2026-11-05 实测：默认口径行覆盖 73.12%（585/800），强制统计 `src/**` 的全量口径行覆盖 6.04%（585/9676）——两者差异来自 62 个页面组件与大量未测 API/工具模块。引用覆盖率数字时必须注明口径，不能只用默认口径宣称整体覆盖水平。
- 当前未设覆盖率门槛（thresholds），引入 CI 时建议对 `src/utils`、`src/stores`、`src/composables` 设定下限，并单独跟踪 `src/views`。

## 6. 测试环境注意事项

- `happy-dom` 对部分浏览器 API 支持有限：涉及 `ResizeObserver`、`matchMedia` 已在 [setup.ts](../../src/test/setup.ts) 全局 mock；用到其他缺失 API 时在 setup 中补充，勿散落在用例里；
- Pinia：用例中先 `createPinia()` 并 `setActivePinia()` 再使用 store；
- Element Plus 组件：单测中优先 mock 组件或直接测逻辑层，避免渲染整棵组件树拖慢用例。

## 7. 关联文档

- [总体架构](../architecture/overview.md) §7 质量保障体系
- [AGENTS.md](../../AGENTS.md) 类型安全检查清单（构建前 `vue-tsc --noEmit` 是另一道强制质量门）

---

**最后更新**：2026-11-05
