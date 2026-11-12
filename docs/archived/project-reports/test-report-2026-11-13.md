# 前端测试报告（2026-11-13）

> 执行环境：macOS 24.6.0（x64），Node v26.12.1，npm 11.20.0，仓库 `apex-admin-web` v1.2.0。
> 依据 `vitest.config.ts`、`playwright.config.ts`、`package.json` 与实际执行结果整理；所有数字来自本次真实运行，未做估算。
> 本次在 2026-11-05 [基线](test-report-2026-11-05.md)之上补齐单元测试缺口，并首次建立 E2E、性能与压力测试设施。

## 1. 结论摘要

| 项 | 结果 |
| --- | --- |
| 单元/组件测试文件 | 65 个，全部通过（基线 28 个） |
| 单元/组件测试用例 | 475 个，通过 475，失败 0，跳过 0（基线 221 个） |
| 通过率 | 100% |
| E2E（Playwright，chromium） | 3 个用例文件 / 6 条用例，全部通过 |
| 类型检查 `npx vue-tsc --noEmit` | 通过（0 error） |
| 生产构建 `npm run build` | 通过（vue-tsc + vite build，约 22s） |
| 注释规范 `npm run check:comments` | 通过（213 个文件头与导出符号注释齐全） |
| 覆盖率（默认统计口径） | 语句 77.22%（1668/2160）、分支 71.45%、函数 72.09%、行 77.35%（1551/2005） |
| 覆盖率（`src` 全量口径） | 行 15.58%（1551/9952）——页面层（63 个视图组件）仍无组件级用例 |
| 性能测试（Lighthouse desktop，`vite preview` 静态基线口径） | performance 95 · best-practices 96 · accessibility 87 · seo 82 |
| 压力测试（autocannon，`vite preview` 静态服务） | 首页 50 并发：12,269 req/s、p99 6ms、错误 0；最大 JS 产物（504KB）100 并发：1,113 req/s、p99 174ms、错误 0 |

## 2. 执行项与产物

| 命令 | 用途 | 结果 |
| --- | --- | --- |
| `npx vitest run` | 单元/组件测试全量运行 | 65 文件 / 475 用例通过 |
| `npm run test:report` | JUnit XML + JSON + 覆盖率（归一化后入库） | 通过 |
| `npx vitest run --coverage --coverage.include='src/**/*.{ts,vue}'` | 全量口径覆盖率 | 行 15.58% |
| `npx playwright test` | 浏览器端集成测试 | 6 条用例通过 |
| `npm run test:perf` | Lighthouse（构建产物） | `reports/lighthouse/report.report.{html,json}` |
| `npm run test:stress` | 静态服务压测（autocannon） | `reports/stress/stress-results.json` |
| `npm run build` | 类型检查 + 生产构建 | 通过 |
| `npm run check:comments` | 注释规范检查 | 通过 |

产物入库边界（`.gitignore` 白名单机制）：`reports/test-results.xml`、`reports/test-results.json`、`reports/coverage/coverage-summary.json`、`reports/e2e-results.xml`（本次新增）入库；`reports/coverage/` 其余、`reports/lighthouse/`、`reports/stress/`、`test-results/`（Playwright 产物）均不入库、可重建。

## 3. 本次补充的测试

自 2026-11-05 基线（28 文件 / 221 用例）以来新增 **37 个测试文件、254 个用例**：

**API 契约测试 ×23（128 用例，全部 mock `@/utils/request`，断言方法/路径/参数透传）：**

| 模块 | 用例数 | 点名的易错契约 |
| --- | --- | --- |
| `api/system.test.ts` | 11 | 菜单/部门/字典/参数/定时任务全端点；任务分页走 `/jobs/page` 且 pageNum/pageSize |
| `api/operations.test.ts` | 9 | 快照分页是 **page/size**（非 pageNum/pageSize）；导出任务 query 串；CSV 流 responseType=blob |
| `api/user.test.ts` | 8 | 用户 ID 为字符串路径参数；导出走通用 `request` 且 `responseType:'blob'` |
| `api/auth-audit.test.ts` | 7 | tenantId 必填；裸数组端点；IP 路径参数 CIDR `%2F` 编码 |
| `api/file.test.ts` | 7 | 分片四件套契约：upload 原始字节流 + query 定位参数 + octet-stream 头；status 为 `/file/chunk/status/{fileId}` |
| `api/sso.test.ts` | 7 | 会话撤销按数字主键 `POST /sessions/{id}/revoke`；批量终止为前端循环单条 |
| `api/mfa.test.ts` | 6 | `?code=` encodeURIComponent（`+`→`%2B`）；配置列表裸数组 |
| `api/ip-access-control.test.ts` | 6 | 写操作参数走 query string 而非 body；裸数组列表 |
| `api/file-share.test.ts` | 6 | 创建一次性 token；按 fileId 仅所有者列表；匿名 exchange/download |
| `api/office-document.test.ts` | 6 | 创建必须携带 ownerId/ownerName 且 platform 小写；复制 targetFolderId 走 query |
| `api/tenant.test.ts` | 6 | 分页必须 pageNum/pageSize；生命周期小写六枚举逐一断言；配额 null=不限；乐观锁透传 |
| `api/operations` 之外的其余模块 | 45 | database 5 / meeting-room 5 / monitor 5 / office-approval 5 / document 4 / office-calendar 4 / office-sync-wizard 4 / password-recovery 4 / search 4 / chart 3 / log 3 / masking 3 |

**utils / stores / composables ×10（84 用例）：**

| 文件 | 用例数 | 覆盖内容 |
| --- | --- | --- |
| `utils/__tests__/error-handler.spec.ts` | 15 | 错误→提示映射（401/403/404/5xx/网络/超时/验证/授权）、traceId 追加、自定义处理器短路、重试指数退避与 401/403/404 不重试 |
| `utils/__tests__/validate-rules.spec.ts` | 13 | 手机号/用户名/密码/强密码/身份证/IP 正则语义、端口与二次确认回调规则 |
| `utils/__tests__/request-cache.spec.ts` | 12 | 缓存命中/TTL 过期/并发去重/强制刷新/失败不缓存/预加载/统计 |
| `utils/__tests__/message-socket.spec.ts` | 9 | 票据握手 URL、ping→pong、message 帧分发与 messageId 字符串化、5s 起步退避重连、票据失败重试、最后退订清理 |
| `utils/__tests__/performance.spec.ts` | 8 | SSR 跳过、观察者注册、FCP/LCP/FID 计算、load 上报（该工具当前未接线，纯逻辑验证） |
| `composables/__tests__/useFormDraft.spec.ts` | 10 | 草稿写入/加载/TTL 过期清理/恢复确认/放弃清理/卸载保存/beforeunload 挂卸 |
| `composables/__tests__/useBreakpoint.spec.ts` | 6 | 断点判定联动、设备类型布尔、自定义断点、区间工具方法 |
| `utils/__tests__/echarts-theme.spec.ts` | 5 | 主题切换联动、配置合并语义、四类预设图 |
| `stores/__tests__/office.spec.ts` | 4 | 平台设置/绑定状态/登出清理 |
| `utils/__tests__/echarts.spec.ts` | 2 | 按需注册入口冒烟 |

**通用组件 ×4（42 用例）：**

| 文件 | 用例数 | 覆盖内容 |
| --- | --- | --- |
| `components/__tests__/GlobalSearch.spec.ts` | 14 | 防抖搜索、结果渲染与跳转、索引重建、分页翻页 |
| `components/__tests__/FileUploadEnhanced.spec.ts` | 12 | 上传地址同源拼接、props 缺省、超限/类型校验、分片编排（mock API）、paste 监听挂卸 |
| `components/__tests__/NotificationCenter.spec.ts` | 11 | 未读角标、SSE 订阅/退订与推送刷新、标记已读、60s 轮询 |
| `components/__tests__/EmptyState.spec.ts` | 5 | props 默认值、内置图映射、插槽 |

**E2E / 性能 / 压力（首次建立）：**

- `playwright.config.ts` + `e2e/`（3 文件 6 用例）：未登录跳转（含 `redirect` 回跳参数）、表单登录成功进工作台并落会话、退出登录清理会话、动态菜单树渲染与点击直达、动态路由 URL 直达（冷启动重新注册）、401 单飞刷新且原请求重放成功（断言刷新恰一次、令牌已替换）。后端接口全部在用例内经 `page.route` 打桩，不依赖真实后端；webServer 自动起 Vite 开发服务。
- `npm run test:perf`（新增）：构建产物上运行 Lighthouse desktop 预设。**口径：无后端环境下 API 请求失败，结果为静态资源加载性能基线**，不代表业务可用性。
- `npm run test:stress`（新增，引入 devDependency `autocannon`）：对 `vite preview` 两档并发压测。**口径：衡量前端静态服务承载能力，业务接口压测属后端/网关范畴**。结果：首页（50 并发×15s）12,269 req/s / p99 6ms / 错误 0；最大 JS 产物 element-plus 块 504KB（100 并发×15s）1,113 req/s / p99 174ms / 错误 0 / 吞吐 547.5 MB/s。

## 4. 覆盖率（双口径，引用须注明）

| 口径 | 行 | 语句 | 分支 | 函数 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 默认（仅统计被用例加载的模块） | **77.35%**（1551/2005） | 77.22% | 71.45% | 72.09% | 较 11-05 基线 73.12% 提升，主要来自 API/工具/组件新用例 |
| 全量（`--coverage.include='src/**/*.{ts,vue}'`） | **15.58%**（1551/9952） | — | — | — | 较基线 6.04% 提升；主因 23 个 API 模块与工具层补测；63 个视图组件仍零用例 |

两个口径差异全部来自「文件是否被用例加载」，不得以默认口径宣称整体覆盖水平。

## 5. 未覆盖范围与风险

| 范围 | 状态 | 风险 |
| --- | --- | --- |
| 63 个页面组件（`src/views/**`） | 无组件级用例 | 表单校验、loading、错误提示、分页适配等页面级行为依赖人工回归与 E2E 抽样 |
| `views/dashboard` 等核心页的 E2E 仅覆盖骨架链路 | 打桩集成 | 真实后端联调语义（数据形状、权限过滤）未覆盖 |
| OAuth 跳转、剪贴板、Canvas 压缩/裁剪、真实分片传输、Nginx 反代 | DOM 模拟与 route 打桩均无法覆盖 | 需真实浏览器环境或 `verify:deploy` 上线后验证 |
| 业务接口压力/性能 | 未覆盖 | 属后端/网关范畴，需在目标环境执行 |
| Lighthouse accessibility 87 / seo 82 | 有改进空间 | 登录页 meta 描述、对比度等明细见 `reports/lighthouse/report.report.html` |

## 6. 复现方式

```bash
npm install
npx playwright install chromium   # E2E 首次运行前安装浏览器
npx vitest run                    # 单元/组件测试（65 文件 475 用例）
npm run test:report               # 报告口径：JUnit + JSON + 覆盖率到 reports/
npx playwright test               # E2E（6 条用例）
npm run test:perf                 # Lighthouse（构建 + preview + 报告）
npm run test:stress               # 压测（preview + autocannon，需已构建）
npx vue-tsc --noEmit              # 类型检查
npm run build                     # 生产构建
npm run check:comments            # 注释规范
```

## 7. 观察到的实现问题（非本次修改范围）

1. `src/utils/request-cache.ts` 的 `setPendingRequest` 对共享 pending promise 附加 `.finally()`，其派生 promise 在请求失败时无人观察，会触发 `unhandledRejection`（去重开启 + 请求失败时必然发生）。本次测试以 `dedupe:false` 口径验证失败不缓存语义，实现侧建议改为 `.finally()` 挂在 `Promise.resolve().then(() => promise)` 或吞掉派生 promise 的 rejection。
2. `src/utils/monitoring/performance.ts`（PerformanceMonitor）与 `src/composables/useCrud.ts`、`useFormDraft.ts`、`useBreakpoint.ts` 仍为已实现未接线代码（仓库内无业务调用点），本次已为其建立纯逻辑回归用例。
3. `api/office-approval.ts` 的 `getMyInitiatedApprovals` 声明参数类型为 `ApprovalListQuery`（不含 `initiatorId`），与其导出的 `MyInitiatedApprovalsQuery` 接口不一致；调用方实际按 `ApprovalListQuery` 传参，属类型冗余而非缺陷。
4. E2E 全量运行在与其余重负载任务并行时出现过 2 条间歇超时（独占运行复测稳定通过），建议 CI 中为 E2E 分配独立执行环境。

---

**报告生成时间**：2026-11-13
