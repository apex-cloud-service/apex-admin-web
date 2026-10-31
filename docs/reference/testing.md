# 测试指南

> 依据 [vitest.config.ts](../../vitest.config.ts)、[package.json](../../package.json) 与 `src/utils/__tests__/`、`src/api/` 当前实现核对（2026-10-04）。

## 1. 技术选型与现状

| 项 | 现状 |
|----|------|
| 单元测试框架 | Vitest ^5.0.1 |
| DOM 测试环境 | happy-dom ^20.14.5（`environment: 'happy-dom'`，`globals: true`） |
| 组件测试 | @vue/test-utils ^2.5.0（已具备，暂无用例） |
| 全局准备 | [src/test/setup.ts](../../src/test/setup.ts)：mock `ResizeObserver` 与 `window.matchMedia`（Element Plus / ECharts 依赖） |
| E2E | @playwright/test ^1.63.0 已安装，**尚无配置文件与用例** |
| 覆盖率 | v8 provider，报告 text/json/html/lcov（`npm run test:coverage`） |
| CI | 无（本地执行） |

## 2. 常用命令

```bash
npm run test            # watch 模式运行全部用例
npm run test:ui         # Vitest UI 面板
npm run test:coverage   # 覆盖率报告（v8）
npx vitest run          # CI 式单次运行（不 watch）
npx vitest run src/utils/__tests__/request.spec.ts   # 指定文件
```

测试文件按 Vitest 默认规则匹配：`**/*.{test,spec}.?(c|m)[jt]s?(x)`（vitest.config.ts 未自定义 include）。

## 3. 现有用例清单

共 9 个测试文件、44 个用例（实测 `npx vitest run` 全绿），分布于 `src/utils/__tests__/`（工具与 API 契约）与 `src/api/`（业务 API 契约）：

| 用例文件 | 用例数 | 覆盖内容 |
|----------|-------|---------|
| `src/utils/__tests__/request.spec.ts` | 8 | 401 刷新后单次重放；认证端点排除；非 401 状态码在重放中如实保留；并发多个 401 共享同一次刷新（refreshPromise 单飞）；会话租户记录与 `X-Tenant-Id` 头 |
| `src/utils/__tests__/oauth2.spec.ts` | 4 | S256 PKCE 授权 URL 生成；表单编码换取令牌与字段映射；授权上下文一次性消费（state 防重放） |
| `src/utils/__tests__/auth-config.spec.ts` | 6 | 认证配置 API 契约：权限筛选/分页参数、写接口路径、掩码密钥不回写、PKCE 不可关闭 |
| `src/utils/__tests__/auth.spec.ts` | 4 | 会话存取：token/refreshToken/identity 读写与 `clearSession` 清理 |
| `src/utils/__tests__/validate.spec.ts` | 4 | `validateEmail` / `validatePhone` 校验行为与中文错误信息 |
| `src/api/office-new.test.ts` | 4 | 办公平台 API 契约：应用更新乐观锁 version 随 body 回传；解绑 version 走 query；绑定分页 platform/status/分页参数 |
| `src/api/message.test.ts` | 8 | 站内信接口契约：收件箱/已发送返回纯数组、分页参数、标记已读路径；消息模板管理（创建/更新/删除路径） |
| `src/api/workflow.test.ts` | 1 | 工作流实例详情路由契约（`/admin-api/v1/workflows/instances/{id}`） |
| `src/api/generator.test.ts` | 5 | 生成器 API 契约：基础端点调用、同步向导模板/预检/预览、异步任务契约 |

## 4. 编写规范

### 4.1 文件与命名

- 位置：与被测代码就近；工具类集中在 `src/utils/__tests__/`，业务 API 直接与被测模块同目录（如 `src/api/office-new.test.ts`）；
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

1. **必须测**：`utils/request.ts`（解包/刷新/401）、`api/oauth2.ts`（PKCE/state）、权限指令、`composables/useCrud` 等有状态的复用逻辑；
2. **建议测**：表单校验规则（`validate.ts` / `validate-rules.ts`）、脱敏工具（`mask.ts`）、XSS 工具（`xss-protection.ts`）；
3. **可选测**：页面组件交互（配合 @vue/test-utils + happy-dom）。

## 5. 覆盖率

```bash
npm run test:coverage
```

- Provider：v8；报告输出 text/json/html/lcov；
- 排除：`node_modules`、`src/test`、`**/*.spec.ts`、`**/*.test.ts`、`dist`、`*.config.ts`（见 vitest.config.ts `coverage.exclude`）；
- 当前未设覆盖率门槛（thresholds），引入 CI 时建议对 `src/utils`、`src/stores`、`src/composables` 设定下限。

## 6. 测试环境注意事项

- `happy-dom` 对部分浏览器 API 支持有限：涉及 `ResizeObserver`、`matchMedia` 已在 [setup.ts](../../src/test/setup.ts) 全局 mock；用到其他缺失 API 时在 setup 中补充，勿散落在用例里；
- Pinia：用例中先 `createPinia()` 并 `setActivePinia()` 再使用 store；
- Element Plus 组件：单测中优先 mock 组件或直接测逻辑层，避免渲染整棵组件树拖慢用例。

## 7. 关联文档

- [总体架构](../architecture/overview.md) §7 质量保障体系
- [AGENTS.md](../../AGENTS.md) 类型安全检查清单（构建前 `vue-tsc --noEmit` 是另一道强制质量门）

---

**最后更新**：2026-10-04
