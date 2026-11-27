# 2026-11-25 全仓代码注释评审与交接

> **待主控补登，未提交。** 用户确认全仓逐文件评审、按项目标准选择注释密度、只改不提交。本文是执行交接包，不是任务大盘登记或任务关闭结论；任务号建议 `FE-031`，以主控实际分配为准。

## 1. 范围与基线

- 执行分支：`dev`；起始及当前提交：`71d823040e94e987ec2df0cf39e0caea7517aa3b`。
- 注释规范：[comment-style.md](../reference/comment-style.md)，治理入口：[AGENTS.md](../../AGENTS.md)。本仓是 Vue/TypeScript，采用适合语言的 **JSDoc**，不机械套用 Java 专用标签；Vue 文件头用 HTML 注释，Shell/YAML/Nginx 用 `#`，Python 使用注释或文档字符串。
- 审阅 `src/` 全部 **219 个 TS/Vue 文件**（146 TS、73 Vue），其中 API 源码 40 个；Vue 页面/组件/布局专项审阅 72 个文件，另有 App.vue；同时核对根构建配置、E2E、脚本、容器入口与钩子的注释。自动注释检查覆盖 221 个文件，其范围排除 `.d.ts`，并包含根目录三个 TS 配置，不与源码审阅数字混用。
- 页面专项核对全部 **24 个使用 `v-permission` 的文件**；头注权限清单按前缀展开后与指令相符，未为凑数重写正确清单。
- 仅一个主写者修改工作区；子代理只读审计，分别负责基础层、页面及脚本/测试，另启未参与实施的独立复核上下文。
- 保留会话开始前已存在的 `MEMORY-CARD.md`、`docs/reference/ai-knowledge/01-current-state.md` 差异，未修改、暂存或回退它们。
- 不修改业务逻辑、接口签名、类型结构、路由、权限、存储键、配置有效值、测试断言或测试标题；不删除代码或历史图表，不升级依赖。

## 2. 注释处理原则

1. 先核对完整实现和必要调用点，优先纠正事实、契约与边界，不以注释数量作为质量指标。
2. API、复杂工具与组合函数在需要时补充 `@param`、`@returns`、实际的 `@throws`，说明可选性、单位、分页结构、异步完成时机及部分成功语义。
3. 页面内部函数保留简式，琐碎代码不加复述注释；已有正确头注和风格不统一重写、不回填作者日期。
4. 前端未封装不等于后端不存在；Promise 兑现不等于领域操作已完成或业务成功；前端展示/隐藏不等于后端鉴权。
5. 文本检查、接口 mock 和 DOM 模拟只能证明实际检查范围，不宣称真实后端、安全属性或发布链路已验收。

## 3. 改动清单

本次已有文件的源码改动全部为注释/文档字符串；另新增本交接记录并同步两级文档索引。

| 分类 | 代表文件 | 注释修正要点 |
| --- | --- | --- |
| 上传映射 | `src/utils/upload-sex.ts`、`upload-result.ts` | 补文件头和函数文档；调用方 0/1 与 multipart '1'/'2' 映射；fileName→objectName，其他字段与 TTL 0 保留 |
| 缓存并发 | `src/utils/request-cache.ts` | 区分缓存失效、pending 去重和取消请求；forceRefresh 仍可能复用旧 pending；prefetch 不去重；失效只阻止回填；统计序列化约束 |
| API 查询/任务 | `src/api/generator.ts`、`workflow.ts`、`operations.ts` 等 | list/total 与 records/total、裸数组无总数、Blob 解码条件、任务提交/设备命令不代表后台或设备完成 |
| 身份与写校验 | `src/api/auth-config.ts`、`system.ts`、`oauth2.ts` | 用户 ID 与单会话 ID 区分；本地 JWT/OAuth2/字典 ID 校验先抛普通 Error；公共客户端不发送 secret |
| 批量失败 | `src/api/auth-config.ts`、`sso.ts`、`src/composables/useCrud.ts` | 去重串行与不去重并发的差异；部分成功不回滚；写入成功后刷新失败不能直接重试写操作 |
| 脱敏/XSS | `src/utils/mask.ts`、`xss-protection.ts` | 短输入原值回退、顶层真值处理、不验证格式；HTML 转义不覆盖 JS/CSS/URL 上下文；白名单不是完整净化保证 |
| 状态/持久化 | `src/stores/*`、`src/composables/useFormDraft.ts`、`useTableConfig.ts` | 未接线能力、主题初始化不自动同步 DOM、持久化失败边界、浅拷贝默认列、草稿清除不取消防抖 |
| 类型字段 | `src/types/index.ts` | 区分 DTO 与前端聚合/适配模型；补耗时毫秒、容量字节、0～1 比例说明；概览使用外部端点 |
| 组件与页面 | `src/components/*`、`src/layouts/AdminLayout.vue`、`src/views/*` | 上传分片绕过 MIME/压缩/裁剪的顺序；裁剪 loading 不等待 XHR 完成；空态场景图未映射；数据失败保留旧值；单源降级无独立重试 |
| 脚本/测试 | `scripts/**`、`e2e/**`、`container/nginx.conf`、`.githooks/**` 等 | 收窄链接/红线/记忆扫描范围；Nginx 最长匹配与精确匹配；真实验证能力与断言覆盖范围分开 |

## 4. 本次验证证据

| 验证 | 结果 | 范围/限制 |
| --- | --- | --- |
| `bash scripts/dev/apex-preflight.sh --fast` | `OK=11 WARN=3 FAIL=0` | 警告为工作区已有差异，以及 fast 模式跳过远端/治理检查 |
| `node scripts/quality/check-comments.mjs` | 退出 0，221 文件通过 | 仅注释存在性；不是 JSDoc 标签或内容真实性验证 |
| `npx vue-tsc --noEmit` | 退出 0 | 没有放宽类型配置或忽略错误 |
| `npx vitest run --reporter=dot` | 退出 0，**68 文件 / 546 用例通过**，19.88 秒 | 未写入共享 reports/；不将其解释为真实后端联调或新增逻辑缺陷已被修复 |
| `git diff --check` | 退出 0 | 新增示例注释的行尾空格曾命中，已修正后复跑 |
| 去注释后的源码等价核对 | **115 个源码/脚本/配置文件，0 差异** | TS/JS 使用 TypeScript 去注释打印；Vue 比较脚本、关闭注释的模板编译结果及样式/属性；Python 去掉文档字符串后比较 AST；Shell/YAML/Nginx/ignore 比较非注释有效行 |
| 改动 Shell 的 `bash -n` | 退出 0 | 仅语法，不执行脚本副作用 |
| `audit-frontend-rules.sh --strict` | 退出 0，无阻断项 | 保留现有文本扫描范围；既有 `: any` 统计为 1，未新增 any |
| `check-doc-layout.sh --strict` | 退出 0，0 项 | audit 报告目录可选，未生成不算失败 |
| `check-memory-sync.sh` | 退出 0，**无暂存改动，跳过** | 不能据此声称本次已正式写入记忆台账；见第 6 节草案 |

单测负向场景会打印预期错误；日志中还出现一次 `Error: socket hang up` / `ECONNRESET`，Vitest 未将其计作失败且最终退出 0。本记录不将“通过”扩张为“运行日志完全无告警”。

本次**未运行**生产构建、E2E、浏览器/真实后端联调、Podman、外部安全扫描或压测：有效代码/模板/配置已核对等价，任务仅改注释，不覆盖共享报告或执行实际业务写操作。没有新增测试或改变现有断言。

源码差异指纹（不含 Markdown）：

```text
git diff -- . ':!*.md' | shasum -a 256
a9c2350ff5059da73947c6b35b43cbceea16fd3fc986e4b75cc0617a00a5e188
```

## 5. 范围外发现：未修逻辑，不应作为注释整改通过后的功能保证

以下由静态实现/断言核对得出，待主控另立任务；本次只把边界写清，没有修代码。

| 优先级建议 | 位置 | 后续核验/处理 |
| --- | --- | --- |
| P1 | `src/api/document.ts#downloadDocument` | 声明 Blob 但 GET 快捷方法未配置 responseType='blob'，需独立修下载实现并补验证 |
| P1 | `src/components/FileUploadEnhanced.vue#beforeUpload` | 超限分片先于 MIME 检查，也跳过压缩/裁剪；应独立评审上传链路后修顺序 |
| P1 | `src/utils/mask.ts#maskGeneral` | keepEnd=0 时 slice(-0) 追加完整原文；需参数边界与回归测试，不能用于保证敏感值一定隐藏 |
| P2 | `scripts/governance/check-memory-sync.sh` | --msg 缺值可能循环；扫描只查暂存文件名及子串，不验证条目、末行和 append-only |
| P2 | `scripts/governance/verify-docs.sh` | 未核对链接子检查退出码，提取失败会落到默认 0；CI 默认告警和记忆检查跳过不构成强制门禁 |
| P2 | `src/components/EmptyState.vue` | 非 default 场景字符串被作为图片 URL，未接线实际场景图片 |
| P2 | `src/composables/useFormDraft.ts`、`useTableConfig.ts` | 清除不取消待执行保存；缓存/导入只解析 JSON、不校验结构，默认列引用非快照 |
| P2 | `src/views/system/tenant-package/index.vue` | 全量展示/开关回填按数量估算，未验证编码成员；修复属于业务逻辑，另行立卡 |
| P2 | `src/utils/error-handler.ts#retryRequest` | 与 request.ts 使用不同 ApiError 构造器；不可将现有工具视为已接入的统一安全重试机制 |
| P2 | `e2e/tenant.spec.ts`、`office-approval.spec.ts`、`workflow.spec.ts` | 历史状态/DTO 与未消费 completed 打桩需独立整改；当前断言只覆盖实际展示/Tab，不证明完整契约 |
| P2 | `scripts/verify/post-deploy-check.sh` | 单路径 GET、整链路 413、无 Origin 的 curl 握手不能证明全部内部路由安全、Nginx 限制来源或浏览器白名单；输出字符串也需另项收窄 |
| P3 | 各测试标题与覆盖说明 | 少量标题声称的“单飞/状态/停止读取/保留数据”等超过实际断言；本次保持可执行测试标题不变，已补注释说明，后续应补断言或独立改标题 |

不借本任务修业务、不宣布上述问题完成，也不把未经目标后端核验的部署断言判成已证实的后端缺陷。

## 6. 主控交接草案

- **任务号 / 建议状态**：建议新卡 `FE-031`（未正式分配）；交接后由主控登记、确定状态，不由执行者写任务大盘。
- **建议任务名**：`【P2】注释-全仓事实评审与 JSDoc 契约补全`。
- **唯一主写 / 基线 / 范围**：本 ZCode 会话；`dev` / `71d8230`；只读覆盖见第 1 节，写入为本次注释 diff、本记录及 docs 两级索引，既有两处工作区差异不属本任务。
- **依赖/互斥**：不与 FE-029/FE-030 并行写同一源码；本次不变更这些任务的契约、实现或共享 reports/，正式采纳前仍需主控核对写入租约。
- **独立复核**：已提交未参与实施的上下文，只读审阅当前 source diff；结论尚待返回，不能由本记录提前宣布通过。
- **改动类型**：新增文档一份、修改注释/文档字符串与两级索引；没有删除文件或业务改动。
- **验收**：第 4 节验证及独立复核结论；治理补登、记忆正式登记与关闭由主控完成。
- **提交/推送**：没有 git add、commit、push、切分支或部署；用户要求只改不提交。

### 记忆台账条目草案（未写入正式台账）

| 编号 | 类型 | 改动 | 提交 | 要点 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 待主控分配 | 注释 | 全仓事实评审与 JSDoc 契约补全；仅注释/文档字符串和交接索引 | 未提交 | 查询分页、身份、失败/并发、上传、脱敏、安全及测试边界与实现一致；有效源码比较等价，范围外逻辑问题另立卡 | 本记录；221 注释检查、vue-tsc 0、68/546 单测、source diff SHA256；独立结论待补 |

本草案不替代 [04-change-memory.md](../reference/ai-knowledge/04-change-memory.md) 的 append-only 登记，也不授权执行者提交。主控未来若获得提交授权，应使用含 `memory:` 的提交信息并指向实际分配条目。

## 7. 影响与回滚

- 不改变接口、DTO 结构、UI 文案、路由行为、构建配置有效值或测试行为；源码注释将改变源码行号，但不是业务逻辑变化。
- 尚未提交：需要撤回时，应逐块撤销本任务注释与文档新增，保留用户原有差异；禁止 reset --hard 或整个工作区回退。
- 未来若经授权提交，按治理规范对本任务独立提交使用 git revert；不要把注释整改与范围外逻辑修复混为一类提交。

后续验证与独立复核结果应**追加**在本记录，不覆盖历史执行结论。

## 8. 独立复核与收尾增量

- 未参与实施的独立 R5 对第 4 节指纹 `a9c2350f…` 的 115 文件源码差异完成只读复核，结论 **APPROVE_WITH_NITS**，无必修项；不等同任务关闭或交接文档已经复核。
- 两项建议均已采纳：`auth-audit.ts` 将“查询响应为数组”限定为“列表查询”；`FileUploadEnhanced.vue` 明确启动阶段结束后 Promise 可兑现，不保证成功启动或上传完成。
- 采纳两项建议后的源码指纹为 `0ee9f549e59c85937e759d182a06fc01e3d04810087a9a731723b99232bb327b`；已送回独立上下文做增量复核，不沿用旧指纹冒充新版本放行。
- 两级索引及新交接记录的本地相对链接单独检查通过，包括尚未 Git 跟踪的新文件。严格链接检查与严格目录检查各退出 0、0 项。
- 文档治理首次收尾运行退出 0、警告 1 项：计划工具自动保存的本会话计划缓存正文超过私有目录阈值。下附用户已批准的计划原文保留历史记录，再将自己的缓存文件收敛为指针；未删除内容、未修改其他 AI 私有目录。

### 已批准计划原文（历史快照，不代表最新实测状态）

以下保留计划工具生成的原文；其中数量、通过预期及批次安排仅代表批准时的判断，最终证据以上文实测及后续追加为准。

```text
# 全仓注释评审与补全计划（对齐 docs/reference/comment-style.md）

## Context

您要求按项目规范评审并补全所有代码注释（详细、完整、专业、符合 Javadoc/JSDoc 规范）。调研结论：

1. **本仓已有成文规范**：`docs/reference/comment-style.md` 即本仓的「Javadoc 规范」（中文注释、`.ts` JSDoc 头注 + 66 连字符分隔线、`.vue` template 前 HTML 头注、导出符号完整式 JSDoc 用 `@param/@returns/@throws`、行内注释仅限四类场景、十类禁止坏注释）。
2. **2026-11-18 已完成一轮全仓质量审计**（任务卡 FE-027，219 文件、6 批整改、R5 复核 APPROVE，提交 `38e23fc`），当时 `check:comments` 全绿。规范 §6 明确：合规存量注释不重写、已有头注不回填 `@author/@date`。
3. **基线后出现增量缺口**：`38e23fc` 之后 3 个提交改了 23 个文件，其中新增的 `src/utils/upload-sex.ts`、`src/utils/upload-result.ts` **零注释**（当前 `check:comments` 已不通过）；`request-cache.ts` 经 Wave C 并发修复大改（+89 行）但头注仍是旧 4 行简式，未覆盖「失效屏障/版本纪元」新语义。
4. 您已确认：**全仓逐文件评审+补缺**、密度按项目规范（不超规范强凑）、**只改不提交**（代码改动 + 交接包文档留工作区，立卡/提交/R5 复核由主控接手）。

## 执行方案（只改注释行，零逻辑变更）

### 批次 1：已知缺口修复（完成后暂停等确认）
- `src/utils/upload-sex.ts`：补 JSDoc 头注 + 函数注释，重点解释 `sex 0→'1' / 1→'2'` 的后端 multipart 隐式契约（这是「代码读不出来的为什么」的典型场景，需先核对 `api/file.ts` 与两个上传组件的调用链取证）。
- `src/utils/upload-result.ts`：补 JSDoc 头注 + 函数注释（说明 FileUploadResponse→FileUploadResult 字段映射，对应后端 DTO）。
- `src/utils/request-cache.ts`：头注升级为规范三段式，补写 `versions`/`epoch`/pending 语义与「清除即失效屏障」契约（该文件基线后被修改，按规范 §6 必须同步注释一致性）；不重写已合规的存量行内注释。
- `src/api/file.ts`、`src/api/system.ts`：核对基线后变更与注释是否漂移（sex 参数口径、system.ts 新增端点）。

### 批次 2：基线后 23 个变更文件全量一致性核对
按 `git diff --name-only 38e23fc..HEAD -- src/` 清单逐文件核对注释与实现一致（含对应测试文件），重点：`components/FileUpload*.vue`、`NotificationCenter/index.vue`、`router/index.ts`、`types/index.ts`、`views/login|oauth2|system/auth|monitor/dashboard` 等。发现漂移即修正，不扩大范围。

### 批次 3~6：其余全仓文件逐文件评审（按目录分批）
约 196 个文件，分 4 批（api 其余 → utils/stores/composables/router/directives/types/mock/根目录配置 → components/layouts → views 65 个），每文件三步：
1. **头注核对**：存在性（`check-comments.mjs` 口径）+ 与代码一致性（端点清单、权限码以 `v-permission` 实际值为准、功能清单「有则必真」）。
2. **导出符号 JSDoc**：导出函数/类/接口/常量按规范完整式或简式补齐；参数顺序与签名一致、统一 `@returns`、不编造 `@throws/@example`。
3. **行内注释**：仅为复杂分支补「为什么」类注释（魔数来源、隐式契约、顺序依赖），不写复述型注释。
- views 页面内部业务函数按 §3.2 简式（一行 `/** ... */`），琐碎函数（纯转发/简单格式化）不凑数。
- 测试文件核对简化式头注（`<被测对象> 单元测试 ---- 覆盖：<场景>`）。

### 交付物（全部留在工作区，不提交）
- 代码注释改动（工作区未提交状态）。
- `docs/records/2026-11-25-comment-review-handover.md`：交接包草稿（改动清单、验证输出摘要、**任务卡 FE-031 文本草稿**、**记忆台账 #n 条目草案**），标注「待主控补登」——不修改任务大盘 `project-tasks.md`，不写 `04-change-memory.md` 正文，不 commit。

## 红线（源自 AGENTS.md 0.5/0.6 与 comment-style.md）
- 只增改注释行，零逻辑变更；不用 `// @ts-ignore`；不重排 import、不改格式。
- 已合规的存量注释不重写（规范 §6）；不回填 `@author/@date`。
- 头注不罗列新建 `.ts` 文件的端点/权限码清单（§2.5）；权限码以 `v-permission` 实际值为准。
- 不触碰任务大盘、不提交 git。

## 验证（每批结束跑 1~3，全部批次结束跑全量）
1. `node scripts/quality/check-comments.mjs` → 全绿（当前 4 处违规应清零）。
2. `npx vue-tsc --noEmit` → 0 error。
3. `npx vitest run` → 全部通过（当前基线 546 用例）。
4. `git diff` 抽查确认非注释行零变更（对照 FE-027 R5 的复核口径）。
5. `bash scripts/governance/audit-frontend-rules.sh` 无新增告警。

## 关键参考
- 规范：`docs/reference/comment-style.md`；检查器：`scripts/quality/check-comments.mjs`
- 上一轮审计记录：`docs/records/2026-11-18-comment-quality-audit.md`、复核 `docs/reviews/2026-11-18-fe026-028-review.md`
- 基线提交：`38e23fc`（FE-027）；基线后变更：`62855d2`/`52a4e5c`/`71d8230`
```

## 9. 最终验证与独立增量复核（2026-11-25）

1. 采纳两项注释建议后的完整验证链 `check-comments → vue-tsc → vitest → diff --check` 再次退出 **0**：注释检查 221 文件、类型检查通过、单测 **68 文件 / 546 用例通过**，耗时 **22.68 秒**。
2. 最终源码去注释/文档字符串后等价核对再次为 **115 文件、0 差异**，指纹保持 `0ee9f549e59c85937e759d182a06fc01e3d04810087a9a731723b99232bb327b`。
3. 自己的计划缓存正文逐字保留到本记录后，私有目录仅留指针。`verify-docs.sh --strict`、`check-doc-refs.sh --strict`、`check-doc-layout.sh --strict`、`audit-frontend-rules.sh --strict` 均退出 **0**；文档治理与链接/目录检查为 **0 项问题**。可选 audit 报告目录未生成不构成失败。
4. 独立 R5 增量结论为 **APPROVE**，无必修项，两项旧建议已解决。复核绑定上述最终 HEAD/source diff 指纹，并确认反向还原两条注释即可恢复上轮 `a9c2350f…` 指纹，没有其他源码增量。
5. R5 同时只读核对交接文件与两级索引，确认“待主控补登、未提交、未写正式台账”的边界及历史计划标注。最终单测由执行会话实跑，R5 未自行运行，不将两种证据混为一谈。
6. 当前交付为 **115 个已有源码/脚本/配置文件的注释改动 + 本交接记录和两级索引**；另有不入库的自己工具缓存指针。用户原有两份文件差异仍独立保留。
7. **没有暂存、提交、推送、部署、修改任务大盘或正式记忆台账。** 本任务的注释交付与独立复核完成，不代替主控的任务登记、记忆追加、状态更新或关闭；第 5 节逻辑问题仍未修复，需单独派单。
