# 前端测试报告（2026-11-05）

> 执行环境：macOS 24.6.0（x64），Node v26.12.1，npm 11.20.0，仓库 `apex-admin-web` v1.2.0。
> 依据 `vitest.config.ts`、`package.json` 与实际执行结果整理；所有数字来自本次真实运行，未做估算。

## 1. 结论摘要

| 项 | 结果 |
| --- | --- |
| 单元测试文件 | 22 个，全部通过 |
| 单元测试用例 | 185 个，通过 185，失败 0，跳过 0 |
| 通过率 | 100% |
| 类型检查 `npx vue-tsc --noEmit` | 通过（0 error） |
| 生产构建 `npm run build` | 通过（vue-tsc + vite build，约 57s） |
| 覆盖率（默认统计口径） | 语句 73.09%（625/855）、分支 70.4%（264/375）、函数 54.8%（194/354）、行 73.12%（585/800） |
| 覆盖率（`src` 全量口径） | 行 6.04%（585/9676）——主因是 62 个页面组件无组件级用例 |
| E2E | 未执行：仓库安装了 `@playwright/test`，但没有配置文件与用例 |

## 2. 执行项与产物

| 命令 | 用途 | 结果 |
| --- | --- | --- |
| `npx vitest run` | 单次全量运行 | 22 文件 / 185 用例通过 |
| `npm run test:coverage` | 覆盖率（v8） | 通过 |
| `npm run test:report` | 本次新增：一次性产出 JUnit XML + JSON + HTML/lcov 覆盖率 | 通过 |
| `npx vue-tsc --noEmit` | 类型检查 | 通过 |
| `npm run build` | 生产构建 | 通过 |

产物（`reports/` 已在 `.gitignore`/`CONTRIBUTING.md` 中约定不入库）：

| 文件 | 说明 |
| --- | --- |
| `reports/test-results.xml` | JUnit 格式，供 CI/测试平台消费 |
| `reports/test-results.json` | Vitest JSON 格式，含每个用例耗时与状态 |
| `reports/coverage/index.html` | HTML 覆盖率报告（可逐文件钻取） |
| `reports/coverage/lcov.info`、`lcov-report/` | lcov 报告，供覆盖率平台消费 |
| `reports/coverage/coverage-summary.json` | 机器可读覆盖率汇总 |

## 3. 用例分布

| 测试文件 | 用例数 | 覆盖内容 |
| --- | --- | --- |
| `src/utils/__tests__/xss-protection.spec.ts` | 31 | HTML 转义/反转义、标签剥离、危险协议拦截、白名单清理、JSON/输入清理、XSS 特征检测、Nonce 格式 |
| `src/utils/__tests__/mask.spec.ts` | 23 | 手机/邮箱/身份证/银行卡/姓名/地址/IP/护照/车牌/通用脱敏与批量脱敏边界 |
| `src/api/platform.test.ts` | 22 | 租户套餐、能力计量、开放应用、集成中心、IoT、统一通知、在线会话、概览的路径与参数契约 |
| `src/composables/__tests__/useCrud.spec.ts` | 12 | 分页查询、增删改、删除确认取消、末页回退、批量删除 |
| `src/composables/__tests__/useTableConfig.spec.ts` | 9 | 列配置/分页/筛选/排序持久化、默认列合并、导入导出与重置 |
| `src/utils/__tests__/request.spec.ts` | 8 | 401 单飞刷新、单次重放、认证端点排除、重放错误保留、`X-Tenant-Id` |
| `src/stores/__tests__/user.spec.ts` | 8 | 登录/MFA 分流、租户记录、身份加载降级、登出本地清理 |
| `src/api/message.test.ts` | 7 | 站内信收发、已读、ws-ticket、投递记录、消息模板 CRUD |
| `src/router/__tests__/dynamic.spec.ts` | 7 | 菜单树转换：按钮/空目录/未登记组件跳过、visible 隐藏、status 不过滤 |
| `src/api/auth.test.ts` | 6 | 登录固定 PASSWORD、MFA 二步路径、角色/权限对象数组兼容、刷新令牌参数 |
| `src/utils/__tests__/auth-config.spec.ts` | 6 | 认证配置写接口契约、掩码密钥不回写、PKCE 不可关闭 |
| `src/utils/__tests__/storage.spec.ts` | 6 | 原始/JSON 读写、损坏数据兜底、写入异常、循环引用 |
| `src/directives/__tests__/permission.spec.ts` | 5 | 空码/空集合放行、命中保留、未命中移除、逗号多码任一 |
| `src/stores/__tests__/permission.spec.ts` | 5 | `hasPermission` 判定口径与 Store 派生 |
| `src/api/generator.test.ts` | 5 | 生成器基础端点、向导预检/预览、异步任务、产物下载 |
| `src/components/__tests__/Pagination.spec.ts` | 4 | `change` 事件契约、每页条数重置首页、总数收缩回退 |
| `src/stores/__tests__/app.spec.ts` | 4 | 侧边栏折叠、主题持久化与根元素 class |
| `src/utils/__tests__/auth.spec.ts` | 4 | 会话存取与 `clearSession` 连带清理 |
| `src/utils/__tests__/oauth2.spec.ts` | 4 | S256 PKCE、表单换 Token、state 一次性消费 |
| `src/utils/__tests__/validate.spec.ts` | 4 | 邮箱/手机号校验与错误文案 |
| `src/api/office-platform.test.ts` | 4 | 应用更新乐观锁、解绑 version query、绑定分页筛选 |
| `src/api/workflow.test.ts` | 1 | 工作流实例详情路由契约 |
| **合计** | **185** | |

## 4. 覆盖率明细（默认口径：仅统计被用例加载过的文件）

默认 `vitest.config.ts` 未设置 `coverage.include`，因此只统计被测试触达的模块。下表为本次结果：

| 文件 | 行 % | 语句 % | 分支 % | 函数 % | 未覆盖行 |
| --- | --- | --- | --- | --- | --- |
| `src/utils/mask.ts` | 100 | 95.29 | 91.52 | 100 | 部分防御分支 |
| `src/utils/xss-protection.ts` | 98.59 | 98.76 | 95.83 | 93.75 | 147 |
| `src/composables/useTableConfig.ts` | 98.27 | 98.36 | 70.83 | 100 | 95 |
| `src/stores/user.ts` | 100 | 97.43 | 80 | 90 | 98-99 |
| `src/stores/app.ts` | 100 | 100 | 100 | 100 | — |
| `src/stores/permission.ts` | 100 | 100 | 100 | 100 | — |
| `src/directives/permission.ts` | 100 | 100 | 83.33 | 100 | 20 |
| `src/components/Pagination.vue` | 100 | 100 | 100 | 100 | — |
| `src/composables/useCrud.ts` | 82.53 | 82.81 | 82.35 | 88.88 | 失败分支与批量删除异常 |
| `src/utils/storage.ts` | 86.95 | 87.5 | 100 | 100 | 27-28、97 |
| `src/utils/auth.ts` | 80 | 80.95 | 62.5 | 92.3 | 47、74-77 |
| `src/utils/request.ts` | 79.03 | 75.38 | 65.95 | 57.14 | 刷新失败与非 401 分支 |
| `src/utils/validate.ts` | 33.89 | 32.78 | 13.79 | 11.76 | 后半段校验器 |
| `src/api/message.ts` | 100 | 100 | 100 | 100 | — |
| `src/api/capability.ts` | 100 | 100 | 100 | 100 | — |
| `src/api/tenant-package.ts` | 100 | 100 | 100 | 100 | — |
| `src/api/overview.ts` | 100 | 100 | 100 | 100 | — |
| `src/api/oauth2.ts` | 83.87 | 75 | 70 | 85.71 | 95、137、170-175 |
| `src/api/notify.ts` | 85.71 | 85.71 | 100 | 80 | 96 |
| `src/api/session.ts` | 80 | 80 | 50 | 80 | 49 |
| `src/api/integration.ts` | 77.77 | 77.77 | 50 | 75 | 66、110 |
| `src/api/iot.ts` | 71.42 | 71.42 | 100 | 66.66 | 82、98、128-136 |
| `src/api/open-app.ts` | 71.42 | 71.42 | 100 | 71.42 | 73-81 |
| `src/api/auth-config.ts` | 57.57 | 57.14 | 81.81 | 47.82 | 多个未调用管理接口 |
| `src/api/generator.ts` | 57.14 | 57.14 | 100 | 57.14 | 122-143、157-185 |
| `src/api/auth.ts` | 52.38 | 52.38 | 100 | 47.36 | 38、67、174-229（系统角色/权限 CRUD） |
| `src/api/office-platform.ts` | 19.04 | 19.04 | 100 | 15 | 大部分未测端点 |
| `src/api/workflow.ts` | 5 | 5 | 0 | 5 | 仅测实例详情一个端点 |
| `src/api/user.ts` | 0 | 0 | 0 | 0 | 43-124（仅被 Store 测试 mock，未直接断言） |
| `src/settings.ts` | 100 | 100 | 100 | 100 | — |
| `src/router/dynamic.ts` | 21.66 | 26.56 | 81.25 | 7.84 | 22-68（VIEW_REGISTRY 懒加载函数未执行） |
| **合计** | **73.12** | **73.09** | **70.4** | **54.8** | |

### 4.1 全量口径（含未触达模块）

以 `--coverage.include='src/**/*.{ts,vue}'` 强制统计全仓库源码时，整体行覆盖率为 **6.04%**（585/9676）。分目录：

| 目录 | 行 % | 说明 |
| --- | --- | --- |
| `src/stores` | 82.5 | 三个核心 Store 已覆盖 |
| `src/directives` | 100 | 唯一指令全覆盖 |
| `src/composables` | 51.2 | `useCrud`/`useTableConfig` 已测；`useFormDraft`/`useBreakpoint` 未测 |
| `src/utils` | 40.3 | 脱敏/XSS/存储已测；`validate-rules`、`error-handler`、`request-cache`、`message-socket` 等未测 |
| `src/api` | 31.7 | 15 个 API 模块有契约测试，其余 28 个模块（system/user/tenant/sso/mfa 等）未测 |
| `src/router` | 12.5 | 仅 `dynamic.ts` 的部分逻辑 |
| `src/components` | 4.0 | 仅 `Pagination.vue` |
| `src/views` | 0.0 | 62 个页面组件无组件级用例 |
| `src/layouts`、`src/mock` | 0.0 | 未覆盖 |

两个口径差异全部来自「文件是否被用例加载」，不代表默认口径存在虚高：默认口径的 73% 是已纳入测试范围模块的真实覆盖，全量口径的 6% 反映的是页面层完全空白。

## 5. 本次补充的测试

审计前仓库有 10 个测试文件、65 个用例，且 `npm run test:coverage` 因缺少 `@vitest/coverage-v8` 直接报错退出。本次：

1. 补装 `@vitest/coverage-v8@5.0.1`（与 `vitest@5.0.1` 对齐），覆盖率命令恢复可用。
2. 按 `docs/reference/testing.md` §4.3「必须测」清单补齐缺口：
   - `directives/permission.ts`（此前 0 覆盖，且 `testing.md` 明确列为必须测）
   - `composables/useCrud.ts`（同上，此前无任何用例）
   - `utils/mask.ts`、`utils/xss-protection.ts`、`utils/storage.ts`（建议测项）
   - `stores/user.ts`、`stores/app.ts`、`stores/permission.ts`
   - `router/dynamic.ts` 的菜单转换规则
   - `api/auth.ts` 的登录/MFA/角色权限兼容契约
   - `components/Pagination.vue` 的事件契约
3. 新增 `npm run test:report` 脚本，把 JUnit/JSON/HTML/lcov 产物固定输出到 `reports/`。

## 6. 未覆盖范围与风险

| 范围 | 状态 | 风险 |
| --- | --- | --- |
| 62 个页面组件（`src/views/**`） | 无用例 | 表单校验、loading、错误提示、分页适配等页面级行为依赖人工回归 |
| `api/system.ts`、`api/tenant.ts`、`api/sso.ts`、`api/mfa.ts` 等 28 个 API 模块 | 无契约测试 | 路径/参数写错只能在联调或运行期暴露 |
| `utils/validate-rules.ts`、`utils/error-handler.ts`、`utils/request-cache.ts`、`utils/message-socket.ts` | 无用例 | 表单规则与错误兜底行为无自动保障；WS 重连逻辑未验证 |
| `composables/useFormDraft.ts`、`useBreakpoint.ts` | 无用例 | 草稿 TTL、断点计算无回归保护 |
| OAuth 跳转、剪贴板、Canvas 裁剪、文件上传、Nginx 反代 | DOM 模拟无法覆盖 | 需要真实浏览器或 E2E 验证 |
| Playwright E2E | 已安装依赖，无配置与用例 | 关键登录/CRUD 链路无端到端保障 |

`AGENTS.md` §9 已说明 DOM 模拟不能替代真实浏览器的 OAuth 跳转、剪贴板、Canvas、上传与 Nginx 反代验证，本报告的通过结论同样不覆盖这些场景。

## 7. 复现方式

```bash
npm install
npx vitest run            # 全量单次运行
npm run test:coverage     # 覆盖率（输出至 coverage/）
npm run test:report       # 本次报告口径：JUnit + JSON + HTML/lcov 到 reports/
npx vue-tsc --noEmit      # 类型检查
npm run build             # 生产构建
```

## 8. 观察到的实现问题（非本次修改范围）

执行过程中发现一处与 `AGENTS.md` 描述不完全一致、但**未改动**的实现细节，供后续评估：

- `src/directives/permission.ts` 的 `checkPermission` 只有在 `el.dataset.permChecked` 未设置时才移除节点，但注释写的是「记录父节点与注释锚点以便恢复」，代码中并没有恢复逻辑（也没有 `restore` 相关实现）。当前行为等价于「首次判定无权限即永久移除」。`AGENTS.md` §4.5 已正确描述为「没有恢复锚点」，因此**文档无误、代码注释有误导**，属于注释规范问题而非功能缺陷。

---

**报告生成时间**：2026-11-05
