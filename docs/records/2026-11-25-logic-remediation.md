# FE-032 评审遗留逻辑修复记录

> 开始日期：2026-11-25；继续执行：2026-11-26。状态：执行中，尚未完成最终复核或真实后端联调，不宣称全部问题已经解决。

## 范围与授权

- 用户授权当前 ZCode 会话担任 FE-031 补登与 FE-032 修复的主控，并串行接管本次涉及文件与隔离联调范围。
- FE-029、FE-030 保持开放，旧任务的 reader/知识库/发布环境遗留不挪用为本次完成项。
- 基线：`dev` / `71d823040e94e987ec2df0cf39e0caea7517aa3b`，保留上一轮注释交付及用户原有文件差异。
- 不暂存、不提交、不推送、不部署、不修改真实凭据或既有业务数据库。
- 来源：[注释交接记录](./2026-11-25-comment-review-handover.md) §5，以及该记录的独立复核结论。

## 实际完成项（2026-11-26）

| 项目 | 结果 |
| --- | --- |
| 文档下载 | 改用 `request` + `responseType='blob'`；补 URL/响应类型/错误透传用例 |
| 上传顺序 | MIME → 压缩 → 按处理后大小分流 → 裁剪；分片不再绕过 MIME 与压缩 |
| 上传 Promise | XHR 在 load/error/timeout/abort 真实终结；2xx 且 code=0 才成功；裁剪 loading 覆盖上传全程；粘贴不重复上传 |
| 图片压缩 | 两维同时约束（取最小缩放比），不放大 |
| 通用脱敏 | 修 `keepEnd=0` 原文回填；负数/小数/NaN/Infinity 归一；`maskBatch` 去除 `any` |
| 空状态 | 新增 4 个场景 SVG；search/network/permission 用真实资产，default 用 el-empty 默认图 |
| 草稿 | 本地可取消定时器；清除即取消待写；非法时间戳按过期清除；卸载先取消再保存 |
| 表格配置 | 全字段结构校验；默认列快照与深拷贝；导入先写存储成功再发布内存，失败不污染 |
| 套餐能力 | 新增 `isAllFeaturesSelected` 按编码成员判断，替换数量估算 |
| 请求重试 | 识别 request.ts 与本模块两种 ApiError；默认仅网络/超时/5xx；4xx/未知错误不重试；`shouldRetry` 只能收窄 |
| 治理脚本 | 台账校验改 Python：真实追加条目、append-only、编号唯一、六字段完整、末行引用本次新增、`--worktree`/`--range` 逐提交；参数错误返回 2 |
| CI | 治理脚本 `--strict`；记忆台账按提交 SHA 范围；Node 24 满足锁定 Vitest 引擎要求 |
| 钩子 | pre-commit 覆盖删除与纯图表删除；commit-msg 改传 `--msg-file` |
| 上线探测 | 内部端点逐条探测并限定结论；413 只报链路现象并附 server 头；WS 握手携带 Origin |
| E2E | 租户字符串状态+分页参数；工作流当前 DTO+`pageNum/pageSize`；已办改 `/initiated` 终态聚合；新增并发单飞 |
| 单测补强 | 分页非首页重置、搜索结果清除、done 后停止读取、清理乱序后到、删除/重试异常保留记录、批量删除部分失败、持久化失败与结构校验、forceRefresh/pending 语义、上传编排与 XHR 终结 |

## 验证结果（2026-11-26）

| 命令 | 结果 |
| --- | --- |
| `npx vue-tsc --noEmit` | 0 error |
| `npx vitest run` | **68 文件 / 592 用例全部通过，连续 3 次稳定**（限制 `maxWorkers:4` 后无 worker 启动失败） |
| `npm run build` | 成功（多轮 23.14s–45.15s；最终版一次 9m54s 属本机负载波动，同版本此前均 < 46s，后续复跑 31.19s） |
| `PLAYWRIGHT_USE_PREVIEW=1 npx playwright test --workers=2` | **14/14 通过**（真实 Chromium，接口打桩；四轮建议处置后各复跑，均 14/14；每次均还原 `reports/`） |
| `scripts/governance/__tests__/governance-selftest.sh` | **33/33 通过**（含子检查假通过模拟） |
| `verify-docs.sh --strict` / `check-doc-refs.sh --strict` / `check-doc-layout.sh --strict` | 全部 0 项 |
| `audit-frontend-rules.sh --strict` | 无阻断项 |
| `git diff --check` | 通过 |
| `podman-verify.sh --frontend-test` | **14/14 通过**，容器/网络已清理 |
| 真实后端 `--monitor-reads` | **连续 2 次通过**：`Monitor dashboard API and rendering: passed`，五接口 HTTP 200/code=0（已修复同路由重复导航导致的超时） |
| 真实后端 `--system-reads` | 通过：认证/角色/权限/菜单 + 系统用户、部门、参数列表 |
| 真实后端 `--integration-reads` | **未通过**：`/integration/v1/connectors` HTTP 403，依赖部署方授权材料（见阻塞 §3） |

### 修复前失败证据

文档下载与 `maskGeneral` 新用例先出现 `3 failed / 27 passed`，其中含 `keepEnd=0` 回填原文的真实症状；修复后转绿。

### 顺带修复的真实缺陷

`podman-verify.sh` 原 cleanup 在 `podman-compose down` 对未启动服务报错时即判定失败，残留容器与网络。已改为按实际资源为空判定并加二次按标签清理；复跑后残留容器与网络均为 0。

## 仍未完成 / 阻塞

### 已解决（2026-11-26 第二轮）

1. **vitest worker 启动超时（已根因修复）**：本机 12 CPU 下 vitest 按 CPU 数起 forks worker，出现 `Failed to start forks worker` / `Timeout waiting for worker`，导致用例被跳过或误报失败。已在 `vitest.config.ts` 设置 `maxWorkers:4`（`pool` 本就是 vitest 5 默认 forks，故未重复声明；`minWorkers` 经核实不是 vitest 5 有效键，已删除避免误导）；改后默认命令 `npx vitest run` **连续 3 次全量 68 文件 / 592 用例通过，无 worker 错误**。此前的“分片汇总”口径不再需要。
2. **监控大盘渲染间歇超时（已根因修复）**：`browser-business-smoke.mjs` 的 `monitor-dashboard` 组在登录跳转目标已是 `/monitor/dashboard`、页面早已发出 5 个请求的情况下，又点击同名侧栏菜单；vue-router 对同路由跳转去重、不重复请求，`waitForResponse` 只能等满 32s。已改为：先确认页面已渲染，已捕获响应用缓存，缺失时点“立即刷新”触发一次真实重取。改后 `--monitor-reads` **连续 2 次 `Monitor dashboard API and rendering: passed`**（五个接口 200/code=0）。

### 仍阻塞（外部前置，不可由前端伪造）

3. **受保护接口与知识库真实联调**：`/integration/v1/connectors` 等返回 **HTTP 403（无业务 code）**。该组依赖部署方通过安全渠道提供的 `VERIFY_AUTHORIZATION_CONFIG_DIR`（`authorization.yml` + `truststore.p12`）、可信 HTTPS 授权中心 `base-url`、经确认的 `shared-user-namespace` 与按真实租户精确映射的专用 reader token。当前变量未设置；仓库文档明确规定**不能用浏览器管理员凭据代替**，也不得把 token 写入仓库/命令/日志。因此 office/workflow/file/integration 受保护链路与知识库（隔离编排未启动 KB profile）**未运行，不宣称通过**。
   - 解除条件：部署方提供只读授权材料目录（`0700`/`0600`，仅两个文件），设置 `VERIFY_AUTHORIZATION_CONFIG_DIR`，并保证 auth 与 system 使用同一租户命名空间。
   - 已验证可用的部分：`--system-reads`、`--monitor-reads` 全通过（认证、角色、权限、菜单、监控五接口、系统用户/部门/参数）。
4. **独立 R5 复核（第二轮）已完成**：第五轮 `APPROVE_WITH_NITS`（唯一发现 `minWorkers` 为无效键，已删除并清理冗余 `pool` 声明），第六轮**最终 `APPROVE`，无必修项、无建议**，绑定 HEAD `71d8230` + 指纹 `e6e7568c…`。
5. **仍有真实环境阻塞**：见上条 3。

## 边界与回滚

- 未提交、未推送、未部署；保留上一轮注释交付与用户原有差异。
- 回滚按文件撤回本任务逻辑增量；禁止 `reset --hard`。
- 本轮新增：`src/assets/empty/*.svg`、`scripts/governance/check-memory-sync.py`、`scripts/governance/__tests__/governance-selftest.sh`、`docs/specs/2026-11-26-fe032-upload-and-retry.md`、本记录。

## 已批准的执行计划（历史原文）

计划正文保留在本记录附录；工具私有目录只保留指针。下列原文代表批准时的方案，不替代上面的实际执行状态。

```text
# 修复全部未修问题 + 治理补登 + 完整验证计划

## Context

上一轮注释评审（[交接记录](/Users/work/apex-admin-web/docs/records/2026-11-25-comment-review-handover.md)）只改注释，§5 单列了 12 类未修逻辑/脚本/测试问题；R5 复核另留 2 条已采纳建议；文档治理还留有 1 条历史计划私有路径告警和 1 处 `: any` 技术债。用户现要求**修复上述所有问题**，并补做此前未运行的生产构建、E2E 与真实后端联调。

当前 `dev` 工作区有 117 个已修改文件 + 1 个未跟踪交接记录（上一轮注释交付），必须原样保留，不能回退或覆盖。用户已授权：本会话担任主控维护任务大盘/记忆台账；接管本次修复涉及文件的写入范围与隔离联调租约；FE-029/FE-030 保持开放、不挪用其未完成项。仍不提交、不推送、不部署。

## 一、治理前置（先登记，再改代码）

1. **补登 FE-031**：`【P2】注释-全仓事实评审与 JSDoc 契约补全`，状态 `已完成`（工作区交付、未提交；独立 R5 已 APPROVE）。关联交接记录与 04-change-memory 新条目。
2. **登记 FE-032**：`【P1】修复-注释评审移交的逻辑与脚本缺陷`，状态 `执行中`。写入范围：
   - `src/api/document.ts`、`src/components/FileUploadEnhanced.vue`、`src/utils/{mask,error-handler}.ts`
   - `src/components/EmptyState.vue`、`src/composables/{useFormDraft,useTableConfig}.ts`
   - `src/views/system/tenant-package/index.vue`、`src/utils/tenant-package.ts`
   - 对应 `*.spec.ts` / `*.test.ts`、`e2e/*.spec.ts`、`e2e/helpers.ts`
   - `scripts/governance/*`、`scripts/verify/post-deploy-check.sh`、`.github/workflows/ci.yml`、`.githooks/*`
   - `docs/tasks/project-tasks.md`、`docs/records/`、`docs/reviews/`、`docs/README.md` 及索引
3. **租约说明**：FE-032 单写者为本会话，独立 R5 由未参与实施的上下文承担；FE-029/FE-030 不关闭、不改其验收标准；本次不触碰 `reports/**` 共享产物（验证用临时/独立输出）。
4. 追加 **04-change-memory.md** 条目（append-only，六字段），并修复历史计划私有路径告警（按规范加「原文未入库」标注或白名单，不删历史正文）。

## 二、应用代码修复（先补失败用例，再改实现）

### Batch A：P1 真实缺陷

1. **`src/api/document.ts#downloadDocument`**
   - 改用 `request<Blob>({ method:'GET', url, responseType:'blob' })`，与 `operations.ts`/`file-share.ts` 的 Blob 下载一致。
   - 更新 `document.test.ts`：断言 `responseType='blob'` 及 URL；补非 2xx 走请求层错误的边界。
2. **`src/components/FileUploadEnhanced.vue#beforeUpload`**
   - 调整顺序：**先 MIME 校验** → 图片按 `enableCompress` 压缩 → 用处理后文件判断大小 → 超限且 `enableChunk` 时走分片 → 再按 `enableCropper` 裁剪。
   - 分片分支不再绕过 MIME；压缩/裁剪对分片文件的适用性在注释和测试中明确（分片使用处理后文件，无法处理则回退原文件并说明）。
   - 更新 `FileUploadEnhanced.spec.ts`：非法 MIME 不触发分片/上传；压缩后小于上限走普通上传；压缩后仍超限走分片；裁剪与分片互斥路径。
3. **`src/utils/mask.ts#maskGeneral`**
   - `keepStart/keepEnd` 归一为非负整数；`keepEnd<=0` 时不追加尾部原文，只输出开头+中间掩码；`keepStart+keepEnd>=length` 时仍原样返回。
   - 补 `mask.spec.ts`：`keepEnd=0`、负数、小数、超长保留值、空值。

### Batch B：P2 状态与业务逻辑

4. **`src/components/EmptyState.vue`**
   - 去掉“场景字符串当图片 URL”。为 `default/search/network/permission` 提供**仓库内真实 SVG 资产**（`src/assets/empty/*.svg`，通过 `new URL(..., import.meta.url)` 或静态 import 引用），`image` 自定义仍优先；`default` 用 el-empty 默认图。
   - 更新 `EmptyState.spec.ts`：四种 type 的图片地址可解析、custom image 优先、default 不传 image。
5. **`src/composables/useFormDraft.ts`**
   - 将 `debouncedSave` 声明提前；`clearDraft()` 调用 `debouncedSave.cancel()`，避免清除后又被待执行保存写回。
   - `loadDraft` 对非法时间戳（NaN/非正）按过期处理并清除；补 `useFormDraft.spec.ts`：保存后立即 clear 不复活、非法时间戳清除。
6. **`src/composables/useTableConfig.ts`**
   - 新增 `isTableConfig` 结构校验（columns 数组、pageSize 正整数、filters 对象）；`loadConfig` 结构非法返回 false 且不污染状态。
   - `importConfig` 先校验、深拷贝后替换，`saveConfig()` 失败则回滚内存并返回 false。
   - 初始默认列深拷贝为快照，`resetConfig` 使用快照而非外部数组引用。
   - 补 `useTableConfig.spec.ts`：结构非法、存储失败回滚、外部修改默认列不影响 reset、深拷贝隔离。
7. **`src/views/system/tenant-package/index.vue` + `src/utils/tenant-package.ts`**
   - 新增 `isAllFeaturesSelected(features, catalog)`：以能力目录实际编码集合做**成员全覆盖**判断；`featureText` 与 `allFeatures` 回填均使用该函数；空集合仍为未订阅。
   - 补 `tenant-package.spec.ts`（新建或扩展 utils 测试）：数量相等但缺编码→非全量；全编码→全量；空集合→未订阅。
8. **`src/utils/error-handler.ts#retryRequest`**
   - 识别 `request.ts` 的 `ApiError`（优先直接 import；若有循环依赖则用 `name==='ApiError'` + 数字 code 的结构判定），4xx 一律不重试；新增可选 `shouldRetry` 谓词，默认仅对网络/5xx 类错误重试；注释明确“非幂等写请求不得使用”。
   - 补 `error-handler.spec.ts`：request.ts ApiError 401/403/404 不重试、500 重试、shouldRetry 覆盖、非幂等说明不改变默认行为。
9. **`: any` 清零（FE-005 遗留）**
   - 定位当前唯一 `: any`（预计 `mask.ts` 的 `maskBatch<T extends Record<string, any>>`），改为 `Record<string, unknown>` 并显式收窄；不新增断言绕过。

## 三、脚本与 CI 修复

10. **`scripts/governance/check-memory-sync.sh`**
    - 严格参数解析：`--msg` 缺值立即 `exit 2`；支持 `--msg-file`、`--range <base>..HEAD`、`--strict`。
    - 校验提交信息**最后一个非空行**匹配 `memory:\s*(n/a|<台账>#\d+)`；`n/a` 仅允许纯机械改动（需 `--allow-na` 或提交信息理由）。
    - 有代码改动时要求台账文件出现在变更集；条目号必须真实存在于台账；不满足 strict 时 exit 1。
    - 无暂存/无 range 时明确 `skip` 退出 0，但 `--msg` 校验仍执行。
11. **`scripts/governance/verify-docs.sh`**
    - 记录每个子检查的**退出码**，非 0 或输出无法解析时计 warn/fail；`--strict` 下 exit 1，不再把提取失败当 0。
    - 保留现有告警文案边界，修正“无断链”等超范围表述。
12. **`.github/workflows/ci.yml`**
    - 文档治理、断链、红线改为 `--strict`；记忆校验改为 `--range` 模式（PR 用 `origin/${{ github.base_ref }}...HEAD`，push 用 `HEAD^..HEAD`），必要时 `fetch-depth: 0`。
    - 保留 build job；确保 CI 不会因“未暂存”静默跳过。
13. **`scripts/verify/post-deploy-check.sh`**
    - C6 探测多个内部路径（overview/notify/iot）并逐条判定；输出只声明实际探测结果。
    - C8 413 只报“链路返回 413”，不归因 Nginx；增加响应头证据；C8b 同样。
    - C11 WS 握手增加 `Origin: <BASE_URL origin>`，403 文案不再假设 allowed-origins 一定缺失。
    - 更新 `docs/guides/deployment.md` 中对检查项的描述（如涉及）。
14. **新增脚本自测** `scripts/governance/__tests__/governance-selftest.sh`：在临时 git 仓库验证 `--msg` 缺值、末行标记、条目不存在、`--range`、strict 退出码；不触碰真实仓库。

## 四、E2E 与测试断言修复

15. **E2E**
    - `e2e/tenant.spec.ts`：夹具 `status: 'ACTIVE'`，新增状态标签与 `pageNum/pageSize` 查询参数断言。
    - `e2e/office-approval.spec.ts`：删除未消费的 `/completed` 打桩；已办 Tab 用例改挂真实 `/initiated` 数组或明确仅验证 Tab；补发起人/平台筛选断言（以页面实际能力为准）。
    - `e2e/workflow.spec.ts`：夹具改为当前 `WorkflowPendingTask` 字段（id/instanceId/status/assigneeId/assigneeName），断言请求 `pageNum/pageSize` 与 `list/total`。
    - `e2e/token-refresh.spec.ts`：标题改为“401 触发一次刷新且重放成功”；新增并发双请求 401 用例验证单飞（两个 monitor 端点或同端点两次并发），断言 refresh 仅 1 次。
16. **单测断言**
    - `Pagination.spec.ts`：先切到第 2 页再改 pageSize，断言回到第 1 页。
    - `GlobalSearch.spec.ts`：先返回非空结果，再清空关键词，断言结果消失；辅助函数改名/说明不“冲刷防抖”。
    - `knowledge/chat/index.spec.ts`：断言 done 后 `reader.read` 不再被调用（或读取次数）。
    - `knowledge/document/index.spec.ts`：断言删除/重试异常后原记录仍在；新增“新页已展示后旧页响应返回不覆盖”用例。
    - `useCrud.spec.ts`：补批量删除单条失败用例，断言拒绝、已成功项不回滚、不刷新。
    - `useTableConfig.spec.ts`：补结构非法、存储失败、深拷贝、reset 快照。
    - `mask.spec.ts`/`xss-protection.spec.ts`：标题与断言口径对齐（真值顶层、六类字符）。
    - `request-cache.spec.ts`：补 forceRefresh 时 pending 复用/不清 pending 的真实行为断言，避免标题过度承诺。
17. 所有新用例先确认在修复前失败（至少 P1 三项），再修复转绿；保留现有正确用例语义。

## 五、文档与评审报告收口

18. 新增 `docs/records/2026-11-25-logic-remediation.md`：范围、逐项修复、验证、未验证边界、回滚。
19. `docs/reviews/2026-11-25-fe031-032-review.md`：独立 R5 结论（绑定最终 source diff SHA256）。
20. 扫描 `docs/reviews/` 既有评审中的开放建议：能落地的代码/文档项全部修复；外部环境依赖项（reader 授权材料、后端 JAR/镜像、真实租户凭据）列入阻塞清单，绝不伪造通过。
21. 更新 `docs/README.md`、`docs/records/README.md`、`docs/tasks/project-tasks.md`、`04-change-memory.md`；FE-031 关闭、FE-032 待复核→R5 通过后关闭。

## 六、验证（按顺序，全部留证据）

1. **修复前失败证据**：新增/修改用例先跑对应 spec，确认 P1 三项与关键 P2 用例失败。
2. `npx vue-tsc --noEmit` → 0 error。
3. `npx vitest run --reporter=dot` → 全绿（预计 >546 用例）。
4. `npm run build` → 成功（含 vue-tsc，生产构建）。
5. `PLAYWRIGHT_USE_PREVIEW=1 npm run test:e2e -- --workers=2` → 全绿（mock E2E，真实浏览器）。
6. `bash scripts/governance/__tests__/governance-selftest.sh`、`verify-docs.sh --strict`、`check-doc-refs.sh --strict`、`check-doc-layout.sh --strict`、`audit-frontend-rules.sh --strict`、`check-memory-sync.sh --strict --range HEAD^..HEAD`（临时仓库模拟）、`git diff --check` 全通过。
7. **隔离容器验证**：`bash scripts/integration/podman-verify.sh --frontend-test`（容器内单测+生产构建+mock Chromium E2E）。
8. **真实后端联调**：检查 `BACKEND_ROOT`、后端 JAR、本地镜像、`VERIFY_AUTHORIZATION_CONFIG_DIR`、Podman 可用性；条件具备则跑 `browser-auth-smoke.mjs` 基础/`--business`/`--governance-reads` 等只读链路；条件缺失则记录精确阻塞项与已完成的 mock/静态证据，不宣称真实联调通过。
9. 最终 source diff SHA256 固定，交独立 R5 只读复核；R5 无必修项后由主控关闭 FE-032。

## 红线

- 不回退/覆盖上一轮 117 个注释改动和用户原有 `MEMORY-CARD.md`、`01-current-state.md` 差异。
- 不修改认证拦截器、租户头、权限语义、后端契约，除非已有证据且先更新方案；不新增 `any`/`@ts-ignore`；不升级依赖。
- 不提交、不推送、不部署；不写真实凭据；不把 mock/静态检查冒充真实联调。
- 一次只做一类改动；代码、脚本、测试、文档分批验证，失败即停。
```
