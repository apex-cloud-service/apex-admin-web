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
| 真实后端 `--integration-reads` | 见下文「授权链路三层根因（2026-11-27 全部定位并修复）」：浏览器冒烟单测 `Connector list: passed`（HTTP 200 / code=0）；完整脚本回归见台账 #142 |

### 修复前失败证据

文档下载与 `maskGeneral` 新用例先出现 `3 failed / 27 passed`，其中含 `keepEnd=0` 回填原文的真实症状；修复后转绿。

### 顺带修复的真实缺陷

`podman-verify.sh` 原 cleanup 在 `podman-compose down` 对未启动服务报错时即判定失败，残留容器与网络。已改为按实际资源为空判定并加二次按标签清理；复跑后残留容器与网络均为 0。

## 仍未完成 / 阻塞

### 已解决（2026-11-26 第二轮）

1. **vitest worker 启动超时**：`vitest.config.ts` 设 `maxWorkers:4`（`pool:forks` 为默认不重复声明，`minWorkers` 非有效键已删）。默认命令 `npx vitest run` 连续多次 **68 文件 / 592 用例通过**。
2. **监控大盘渲染间歇超时**：`browser-business-smoke.mjs` 删除“同路由二次点击”（vue-router 去重导致 waitForResponse 等满 32s），改为断言已渲染 + 缓存响应 + 缺失时点“立即刷新”重取。`--monitor-reads` 连续 2 次 passed。

### 授权材料问题（2026-11-27 已解决）

原判断“需部署方提供”不完整：经核对后端源码，三项前置**均可在隔离栈内真实生成**，无需伪造：

| 材料 | 实际来源 |
| --- | --- |
| reader 账号 | 栈内 `apex_auth.auth_user` 的 admin(1001)，同租户启用 |
| reader token | 由**栈内 auth-service 真实登录签发**，且必须在栈内迁移完成后签发并就地写入配置（auth-service 走 Redis 密钥轮换，预签 token 在栈重建后失效） |
| HTTPS base-url | 新增仅隔离验证用 nginx TLS 终结（自签 CA，栈内 `:8443`，只允许 GET） |
| truststore.p12 | 同一 CA 由 **keytool 导入**（口令 changeit）。初版用 openssl `pkcs12 -export -nokeys` 导出，OpenSSL 3.x 下产物为 0 条目空 keystore，Java 报 `trustAnchors parameter must be non-empty`，是 403 的第一层根因；已修复并加「必须恰好 1 条 trustedCertEntry」自检 |
| shared-user-namespace | 隔离栈共用 default 租户，事实成立 |

新增 `prepare-authorization.sh` 生成上述材料；过程中修复 5 个真实缺陷（compose 变量未 export、未建库致迁移失败、OAuth2 公钥缺 PKCS#8 DER、`$VAR（` 在 `set -u` 下被当作变量名、TLS 代理早于上游 DNS 启动）。链路已验证：TLS 代理成功转发，auth 返回 401（非 403），证明请求确实到达认证中心。

### 更正：前判「后端租户上下文未装配」为误判（2026-11-27）

日志中 10 条 `IllegalStateException: 租户上下文未装配` 逐条溯源，触发方全部是 `DeviceCommandTimeoutScanner`（每 30s 一次的后台定时扫描），**没有任何一条来自 HTTP 请求路径**——把它当成 connectors 403 根因是误判。该后台任务缺陷仍然真实存在，移交后端（见下文交接清单第 3 项），但与本次 403 无关。

connectors 403 的真实根因有三层，全部已定位并处置：

### 授权链路三层根因（2026-11-27 全部定位并修复）

| # | 根因 | 证据 | 处置 |
| --- | --- | --- | --- |
| 1 | truststore.p12 为空 keystore：`openssl pkcs12 -export -nokeys`（OpenSSL 3.6）不写入任何证书 | 容器内 `keytool -list` 显示 `contains 0 entries`；集成服务日志 `trustAnchors parameter must be non-empty`；TLS 握手失败 → `IntegrationPermissionClient.onErrorMap → AccessDeniedException` | `prepare-authorization.sh` 改用 `keytool -importcert` 导入 CA，并新增「恰好 1 条 trustedCertEntry」自检 |
| 2 | apex_auth 库缺 `integration:*`/`iot:*` 权限码：V83/V85 只写 `apex_system.sys_permission`，而 `IntegrationPermissionClient` 查询认证中心 `apex_auth.auth_permission`（该库 V47 仅 20 条基础权限 + MFA 段），快照不含 `integration:connector:read` → 判定失败恒 403 | `apex_auth.auth_permission WHERE code LIKE 'integration:%'` 为空；快照 JSON 权限列表无 integration 项；在 apex_auth 补插 12 码并授予 ADMIN 后（37→49 条）接口立即 200 | 属**后端迁移缺口**（apex-scaffold 仓库）。本仓库不改后端代码，仅在隔离验证栈内按后端同一份权限码补种并留痕（`podman-verify.sh` fixture，带注释说明），见台账 #142 |
| 3 | 会话数上限：重复验证累积 5 条 ACTIVE 会话达 `maxSessions` 上限，脚本内的浏览器登录在**登录阶段**被拒（HTTP 403、`code none`），冒烟误报为 connectors 403 | `auth_session WHERE user_id=1001 AND status='ACTIVE'` 计数 5；登录接口日志 `登录失败: error=BusinessException`（同 traceId 前文为 SessionMapper 查询）；清空会话后浏览器冒烟立即 `Connector list: passed` | `podman-verify.sh` 在授权流程开始前将本栈 `default` 租户的 ACTIVE 会话置 EXPIRED，消除重跑残留 |

另修复两处脚本时序缺陷（均由实测暴露）：

- 受保护服务重启后端口先监听、Spring 后完成绑定，立即请求会撞上网关连接失败计数（503/code=3007）。已在重启后依次等待各服务**自身端口**（8084/8093/8085/8094；曾误写 8080 导致每个服务白等 360s）、用配置内 reader token 经 TLS 代理探授权快照 `"code":0`、再经网关探无鉴权路由 `/api/v1/auth/captcha`（不可探 `/api/v2/overview`——无令牌必然 401，条件永不成立）。
- MySQL 就绪探活超时分支原本静默退出，现输出容器状态与末 30 行日志，便于区分初始化慢与真实故障。

**验证（2026-11-27）**：

- 存活栈内重放浏览器冒烟：`Connector list: passed`、`GET /integration/v1/connectors (code 0): HTTP 200`，login/identity/roles/permissions/menus 全部 200。
- **完整脚本回归（空栈起跑）**：迁移 22+91 全成功 → 权限补种 fixture confirmed → reader token 栈内签发 → 受保护服务重启 → 授权快照可达 → 网关恢复 → 浏览器登录与菜单渲染通过 → `GET /integration/v1/connectors (code 0): HTTP 200`、`Connector list: passed` → 容器/网络清理干净。

### 后端交接清单（apex-scaffold 仓库，本仓库不改后端代码）

1. **权限迁移缺口（P1）**：开启 `auth-center-permission` 后，`integration:*`/`iot:*` 权限码（V83/V85 仅登记在 `apex_system.sys_permission`）在 `apex_auth.auth_permission` 不存在，集成与 IoT 接口恒 403。需补一份 auth 侧迁移（参照 V48/V50 的 `INSERT IGNORE INTO auth_permission` + 授权 ADMIN 角色模式）。
2. **`ConnectorConfigRepositoryImpl` 租户上下文覆盖不全（P1）**：7 个方法仅 `page()` 包裹 `TenantContext.callWithTenant(...)`，`findActive/findById/insert/update/delete` 直接在 `BlockingIoSchedulers.jdbc()` 上执行租户 SQL，一旦认证成功进入写路径将复现 `租户上下文未装配`。建议统一在各仓储方法内包裹。
3. **`DeviceCommandTimeoutScanner` 每 30s 报错（P2）**：后台定时任务无线程级租户上下文，每次执行 `DeviceCommandRepositoryImpl.findDueTimeout` 均抛 `IllegalStateException`（隔离栈日志 10+ 条）。需为扫描任务按租户遍历或临时关闭租户过滤（后端自行评估）。

### 当前可用结论

| 项目 | 结果 |
| --- | --- |
| `--system-reads` | 通过 |
| `--monitor-reads` | 连续 2 次通过 |
| 授权材料本地生成 | 已打通并可复用 |
| `--integration-reads` | 浏览器冒烟已通过（`Connector list: passed`，HTTP 200/code=0）；脚本侧三层根因已修复，完整回归见台账 #142 |
| office / workflow / file 受保护链路 | 授权材料与链路已打通（同一套 reader token/TLS/权限码），尚未逐域跑冒烟，留待后续任务 |
| 知识库 | 隔离编排未启动 KB profile，未运行 |

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
