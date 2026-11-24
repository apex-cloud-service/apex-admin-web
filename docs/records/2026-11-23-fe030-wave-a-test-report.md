# FE-030 Wave A 回归证据审计

## 范围

本记录审计当前工作区可见的前端回归产物。FE-030 Wave A 租约只授权写基线评审、索引、租约、计划和台账；`reports/**` 属于 FE-029 的写入范围，且这些路径在本波开始时已有未提交改动。因此本记录不把共享报告路径的差异归属 FE-030，也不覆盖、恢复、复制或重生成这些文件。

## 命令与结果

2026-11-23 的历史产物保留在 `/private/tmp/apex-admin-web-fe030`；R5 核对现存相关源码与 `aec9c444dc113ce7b64f78c0956304b54d304727` 一致，但副本未留存完整运行日志且依赖链接到原仓。16:10:50 可见静态产物，Vitest JSON 记录 16:10:51.985–16:11:07.569；16:12 开发模式 E2E 有 3 项失败，16:17 的另一份 mock E2E XML 为 13/13 通过，但其服务模式未证实。以下旧产物不替代 2026-11-24 带日志复验，未写入原仓 `reports/**`。

| 命令 | 结果 | 口径 |
| --- | --- | --- |
| 现存单测/覆盖率产物 | 可见 68 个测试文件、543 项通过；报告覆盖率 lines 78.41%、statements 77.57%、branches 72.25%、functions 70.64% | 来源为当前工作区已有 `reports/` 差异；不能仅凭这些文件证明它们由 FE-030 租约内命令生成。 |
| 现存构建产物 | `components.d.ts` 有 3 个组件声明差异 | 文件在 FE-030 Wave A 写入范围之外；保留原状，不归属本波。工作区同时显示构建曾成功及 `auth.ts`、`api/message.ts` 静态/动态导入提示，但完整 stdout 未留档。 |
| 现存 E2E 产物 | JUnit XML 显示 13/13 通过 | 报告对应 Playwright Chromium mock 请求（`page.route`），不是后端真实联调；该文件仍处于 FE-029 `reports/**` 范围，本波不更改。 |
| FE-030 旧隔离构建 | `dist/` 存在；完整构建和类型检查退出未证实 | 不以静态资源替代命令结果。 |
| FE-030 旧隔离单测 | JSON/JUnit 确认 543/543，完整脚本退出未证实 | 默认 V8 覆盖率仅统计用例加载的 78 文件，并非全量源码覆盖率。 |
| FE-030 旧隔离 E2E | mock Chromium 13/13 通过（`fe030-e2e.xml`），服务模式未证实 | 本地 HTTP 与 mock API，不等价于 Podman/网关真实联调。 |
| FE-030 Lighthouse | performance 99、accessibility 87、best-practices 96、SEO 82；FCP 0.7s、LCP 0.8s、TBT 0ms、CLS 0、总资源约 420 KiB | `/private/tmp/apex-admin-web-fe030/reports/lighthouse/`；登录页静态基线，不代表业务页面或真实网络。 |

## 解释与边界

- 表中前 3 项为共享工作区快照，不是 FE-030 产物；后 4 项为隔离副本的执行结果。独立产物不回写共享 `reports/**`，本记录只登记验证证据，不代表验收放行。
- 2026-11-23 隔离副本保留静态构建产物、单测、E2E 和 Lighthouse 结果；2026-11-24 复验未重跑 Lighthouse。原仓 `reports/**` 与 `components.d.ts` 仍按 FE-029 原状保留。
- Lighthouse 已采集登录页静态 LCP 和资源量；尚未执行请求并发/压力测试、业务页面性能对比、Podman 真实后端联调、Nginx/Ingress 切流或蓝绿回滚演练。
- `reports/coverage/` 下的 HTML 与 lcov 是工具生成产物；当前工作区可见的仓库跟踪汇总、unit/E2E 报告存在差异，但全部保留在 FE-029 写入范围内，不据此声称 FE-030 已更新报告。

## 2026-11-24 带日志隔离复验

- `/private/tmp/apex-fe030-20261124.6eOtdZ` 从上述提交重新导出；锁文件 SHA-256 `d320eb1e846168767d68e80ed5b6774f22b387d8bf149d61f020c3d4c51f8547`，Node 26.12.1、npm 11.20.0。本机缓存缺包，`npm ci --prefer-offline` 联网按锁安装 640 个包并成功（`npm-ci-online.log`），未链接前端原仓依赖。首次受限构建因 Sass Dart 运行时探测崩溃；命令级审批后用同一依赖复跑，无代码、锁文件或门禁调整。
- `rerun-approved.log` 保存工作目录、SHA、工具版本、时间、命令和退出码。`npm run build`（含 `vue-tsc --noEmit`）退出 0；`npm run test:report` 退出 0，68 文件、543/543，JUnit/JSON/V8 报告位于该副本 `reports/`。覆盖率仅统计 78 个用例加载的文件：行 78.41%、语句 77.57%、分支 72.25%、函数 70.64%。
- `DEBUG=pw:webserver PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e -- --workers=2` 退出 0，Chromium 13/13 通过；原始日志记录新起 `npm exec vite -- preview --host 127.0.0.1 --port 5173 --strictPort` 和 HTTP 200，JUnit 在该副本 `reports/e2e/e2e-results.xml`。接口仍打桩，不是后端联调或真实切流。
- Lighthouse 未重跑；旧登录页静态结果附带验证码接口 500 和 favicon 404，不证明登录可用。两轮隔离产物均未写回原仓。

## 2026-11-24 Wave B 资源基线

从 `aec9c444dc113ce7b64f78c0956304b54d304727` 导出隔离副本 `/private/tmp/apex-fe030-b-20261124.Z6Klbw`，Node 26.12.1 / npm 11.20.0 下执行 `npm ci --prefer-offline` 和 `npm run build`（含类型检查）。本地 Vite 生产预览使用现有 mock 登录夹具；认证后分别以整页导航直达工作台和用户管理，等待面包屑，工作台另等画布可见。以 Resource Timing 汇总同源 `.js` 的 `decodedBodySize`，含浏览器缓存命中的资源，不等于传输大小。Chromium 专项 1/1，无重试。

| 页面 | JS 文件 | 解码字节 | ECharts |
| --- | ---: | ---: | ---: |
| `/dashboard` | 14 | 1,589,626 | 374,850 |
| `/system/user` | 9 | 1,206,076 | 未加载 |

两页共同加载 Element Plus 515,632 字节、通用 vendor 300,927 字节、图标 168,376 字节。专项脚本 `e2e/fe030-wave-b-baseline.spec.ts`、原始日志 `wave-b-baseline.log`、JUnit 与 JSON 附件 `reports/fe030-wave-b/` 均只在隔离副本，未覆盖原仓或 Wave A 报告。此数据仅为打桩加载快照；不代表时延、用户体验提升、容量或线上部署结果。ECharts 已按路由隔离；若继续优化公共图标分包，须先保留后端动态菜单图标解析及未知图标的既有回退，并用同条件回归验证。

### Wave B1 分包对照

在同一副本仅取消 Element Plus 的全量 `manualChunks` 归并，保留其他分包、动态菜单及图标注册。`npm run build` 通过；同一 Chromium 生产预览探针 1/1 通过，无重试。

| 页面 | 基线 JS 数 → 候选 | 基线解码字节 → 候选 | 降幅 |
| --- | ---: | ---: | ---: |
| `/dashboard` | 14 → 16 | 1,589,626 → 1,278,382 | 19.6% |
| `/system/user` | 9 → 15 | 1,206,076 → 1,091,823 | 9.5% |

预设门槛为两页各减少至少 10%；本次未达到，且两个页面的 JS 资源数分别增加 2 和 6。候选不回写原仓，不据此宣称时延收益，也未对未采纳候选运行全量单测或全套 E2E。命令日志 `b1-build.log`、`b1-resources.log`，候选 JUnit 和 JSON 仍在隔离副本 `reports/fe030-wave-b/` 的独立路径。

### Wave B2 匿名入口图标对照

从同一固定提交新建基线和候选副本，各自按锁文件执行 `npm ci --offline --no-audit --no-fund`。候选才把完整菜单图标目录移至懒加载认证布局，保持后端任意图标名解析，不叠加 B1。两副本 `npm run build`（含类型检查）退出 0；同一 Chromium 生产预览专项各 1/1 通过、无重试，覆盖已知、缺省、未知图标与匿名 OAuth2 同意页回跳登录。

| 页面 | 基线 JS 条目 → 候选 | 基线解码字节 → 候选 | 变化 |
| --- | ---: | ---: | ---: |
| `/login` | 10 → 11 | 1,210,003 → 1,058,655 | −12.5% |
| `/dashboard` | 14 → 23 | 1,589,626 → 1,624,334 | +2.2% |
| `/system/user` | 9 → 18 | 1,206,076 → 1,240,654 | +2.9% |

候选 `npm run test:report` 通过 68 文件、543 项；`PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e -- --workers=2 --reporter=list,junit` 通过 14 项（含 B2 专项）。原始日志、两个专项 JUnit 和候选完整 JUnit/覆盖率位于 `/private/tmp/apex-fe030-b2-20261124.rGh6vQ/` 的 `baseline/`、`candidate/`，没有覆盖共享 `reports/**` 或 `components.d.ts`。

Curie 只读复核确认隔离实验可采信，未放行生产采纳。体积达预设门槛，但 Resource Timing 记录的解码字节与条目数不是压缩传输量、网络请求数或可交互时延；额外分包可能把延迟移到登录之后。下一轮先在接近生产的压缩与缓存条件下做高延迟、冷缓存 A/B 多轮对照，采集资源瀑布，比较登录提交到工作台和侧栏可交互的 p95；证据达标前不回写候选。

## 独立复核状态

Pauli 的 `APPROVE_WITH_NITS` 只覆盖静态审计及产物范围。Lovelace 对旧隔离证据给出 `REJECT`（缺原始命令/退出码/预览证据，时间线和 V8 口径需更正）；2026-11-24 对新日志、重算覆盖率和生产预览证据增量复核后结论为 `APPROVE_WITH_NITS`，无必改项。建议明确 Lighthouse 时间，已落实。结论不覆盖原仓 `reports/**` 或 `components.d.ts`。

## 回滚方式

本波没有业务代码或配置变化。只回滚 FE-030 新增文档增量时，保留所有原有 `reports/**`、`components.d.ts`、FE-029 脚本/矩阵/记录差异；不得恢复或覆盖这些文件。隔离产物可整体删除，不影响任一仓库。
