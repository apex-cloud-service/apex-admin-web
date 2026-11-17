# 04 · 变更记忆（流水台账）

> **定位**：本仓所有「已落地改动」的事实登记处，append-only（只追加、不改写历史条目）。
> 与 `01`–`03` 的关系：`01` 现状、`02` 约定与陷阱、`03` 契约映射都是**时点快照**；本篇是**时间轴流水**——“改了哪些东西、凭什么证据”。
> **强制写入**：任何改动都必须在本篇登记一条，规则见 `docs/specs/project-governance.md` §5.4「记忆文档同步（强制）」。
> **基线**：2026-11-16 · 前端 `apex-admin-web` · 默认工作分支 `dev`

---

## 1. 写入规则

| 项 | 要求 |
| --- | --- |
| **何时写** | 任何改变仓库内容或仓库状态的动作：源码、配置、文档、脚本、许可、`.gitignore`、分支结构、远端关联。**在提交同一回合完成** |
| **写在哪** | 只追加到本篇 §3 登记表；现状类结论变化时**同时**更新 `01-current-state.md` 与本卡 `MEMORY-CARD.md` |
| **必填字段** | 日期 · 类型 · 摘要（做了什么、为什么）· 提交（短哈希）· 证据（实测命令与输出、校验脚本结果）· 影响面（是否影响页面/接口/构建） |
| **禁止** | ① 抄私有目录（`.workbuddy/`、`.zcode/`、`.trae/`、`.trae-cn/`）内容进本篇；② 只写「已完成」不写证据；③ 删除或改写历史条目（记错时追加 `更正 #n` 条目） |
| **提交带记忆** | 提交信息末行写 `memory: 04-change-memory.md#<条目编号>`；纯机械改动写 `memory: n/a（原因）` |

**类型枚举**：`代码` / `文档` / `脚本` / `图表` / `许可` / `分支` / `远端` / `治理`。

---

## 2. 当前基线条目（随改动更新，最新在前）

| 事实 | 值 | 采样日 | 证据 |
| --- | --- | --- | --- |
| 默认工作分支 | **`dev`**（本地长期停留；日常开发/文档/整改都提交在 `dev`） | 2026-11-16 | `git rev-parse --abbrev-ref HEAD` → `dev` |
| 长期分支 | `master`（生产基线）/ `dev`（默认工作）/ `test`（验收） | 2026-11-16 | `git ls-remote origin` 仅三类 heads，`main` 已删除 |
| 远端 | `origin` = `git@github.com:apex-cloud-service/apex-admin-web.git`，固定 SSH 443 | 2026-11-16 | `git config core.sshCommand`、`git ls-remote origin` |
| 许可 | **MIT**（`LICENSE`，`Copyright (c) 2026 Apex Admin Web Contributors`）+ `package.json` `"license": "MIT"` | 2026-11-16 | `head -2 LICENSE`、`python3 -c "import json;print(json.load(open('package.json'))['license'])"` |
| 图表基线 | `.mmd` **0** / `.svg` **0**（前端无图表目录） | 2026-11-16 | `find docs -name '*.mmd' \| wc -l` |
| 自检基线 | `verify-docs.sh` **0** / `check-doc-refs.sh` **0** | 2026-11-16 | 两脚本实测输出 |
| 归档方式 | `git archive` + `git bundle`（禁用 `tar .`，避免把 `node_modules`/`dist` 打进包） | 2026-11-16 | 规范 §5.3、`/Users/work/backup/` |

---

## 3. 变更登记表

### 3.1 2026-11-16

| # | 日期 | 类型 | 摘要 | 提交 | 证据 | 影响面 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-11-16 | 治理 | **§5.3 离线归档命令修正**：`tar .` → `git archive --format=tar.gz --prefix=apex-admin-web/ -o ... <branch>` + `git bundle create` + `shasum -a 256`；写明禁用 `tar .` 的理由（会把 `node_modules`/`dist` 打进包） | `73b714f` | 实测归档产物前端 tar 932K / bundle 1.5M；源文件零改动 | 仅规范正文，不改代码 |
| 2 | 2026-11-16 | 远端 | **GitHub 远端接入**：地址改 `git@github.com:apex-cloud-service/apex-admin-web.git`（原 `anqli@outlook.com:` 会被解析成主机名）；22 端口被拦 → `core.sshCommand "ssh -o Hostname=ssh.github.com -p 443"`；带口令私钥 → ssh-agent 载入后认证通过（账号 `anqli8341`） | `edc6877` | 三障碍实测；记录副本 `docs/records/2026-11-16-github-remote-onboarding.md`（唯一正文在后端仓） | 仅远端配置，不改本地代码 |
| 3 | 2026-11-16 | 治理 | 规范 §5.3 同步远端现状（origin、443、口令私钥、远端已有历史合并口径） | `edc6877` | 规范 §5.3 全文；`verify-docs.sh` 0 项 | 仅规范正文，不改代码 |
| 4 | 2026-11-16 | 远端 | 远端 `Initial commit`（`b613564`，仅 `LICENSE`+`README` 桩）与本地无共同祖先 → `git merge --allow-unrelated-histories`；`README.md` 冲突保留本地完整版（242 行） | `dce7aa0` | 合并提交；`wc -l README.md` → 242；**未使用 `push -f`** | 仅远端初始化提交（LICENSE/README），不改本地代码 |
| 5 | 2026-11-16 | 文档 | 补推送实测结果：`b613564..dce7aa0  main -> main`，并刷新记录副本 | `71295b9` | `git ls-remote origin` 与本地 HEAD 一致 | 仅文档补记 |
| 6 | 2026-11-16 | 许可 | **许可证统一为 MIT**：合并时带入的 GitHub 模板 Apache 2.0 被替换为 MIT（`Copyright (c) 2026 Apex Admin Web Contributors`），`package.json` 增 `"license": "MIT"`；选型依据（MIT vs Apache 2.0 对比表）见后端记录 §6 | `029797d` | `head -2 LICENSE` → `MIT License`；JSON 校验通过；**不改任何页面与接口** | 仅许可文件，不改代码 |
| 7 | 2026-11-16 | 分支 | `main` → `master`：`git branch -m main master` + `git push -u origin master`；远端默认分支切到 `master` 后 `git push origin --delete main` 成功 + `git fetch --prune`；规范 §5.3 与记录副本同步 `master` 口径 | `88ca2d1` | `git ls-remote origin` 现仅 `dev/master/test`；历史零改写 | 仅分支改名与远端状态，不改代码 |
| 8 | 2026-11-16 | 分支 | **新建 `dev` / `test`**（自 `master`），推送并建立跟踪，三支同点 | `c3802d7` | `git branch -vv` → 三支分别跟踪 `origin/dev`、`origin/test`、`origin/master` | 仅新建并推送分支，不改代码 |
| 9 | 2026-11-16 | 治理 | **`dev` 设为默认工作分支**：规范 §5.3 分支模型表改为 `dev` 默认、`master` 仅接受从 `dev` 合入、`test` 仅由 `dev` 合入；写明开工自检与合入命令；本地切 `dev` | `9931af3` | `git checkout dev` + `git pull --ff-only`；该规则更新本身即首个 `dev` 提交 | 仅规范正文，不改代码 |
| 11 | 2026-11-16 | 脚本 | 新增 `scripts/governance/check-memory-sync.sh`（校验暂存改动是否含台账、提交信息是否带 `memory:` 标记；默认只告警，`--strict` 才 exit 1），接入 `.githooks/pre-commit` 第 0 步与新增的 `.githooks/commit-msg`；`scripts/governance/README.md` 增 §6 说明 | 本条提交 | `bash scripts/governance/check-memory-sync.sh` 实测输出；警告模式，不影响构建与页面 | 仅新增校验脚本 |
| 10 | 2026-11-16 | 文档 | 本篇 `04-change-memory.md` 建立 + 规范 §5.4「记忆文档同步（强制）」+ `MEMORY-CARD.md`/`README.md` 索引同步 | 本条提交 | 本文件；`grep -n "5.4 记忆文档同步" docs/specs/project-governance.md` | 仅新增台账文档 |
| 12 | 2026-11-16 | 脚本 | **更正 #11**：`check-memory-sync.sh` 首版在 macOS bash 3.2 下报 `MEM_NAME: unbound variable` —— 变量紧跟中文全角括号时被并入变量名；改为 `${MEM_NAME}` 后复测通过（`OK：本次提交已登记记忆台账（04-change-memory.md）`）。**结论：脚本里变量后接非 ASCII 字符一律写 `${VAR}`** | 本条提交 | 修复后实测两条路径（未登记→告警 / 已登记→OK）均正常 | 仅脚本更正 |
| 13 | 2026-11-16 | 分支 | **`master` / `test` 快进到 `dev`**：`git checkout master && git merge --ff-only dev && git push`、`test` 同款、随后回 `dev`；三支最终同指一个提交，内容零差异 | 本条提交 | `git rev-list --count master..dev` → 0；`git rev-parse dev`/`master`/`test` 三者相同；快进推送（非强推、未 `reset --hard`） | 仅分支快进，内容零差异 |
| 14 | 2026-11-16 | 治理 | **安装 Skill 与 Agent**：用户级 Skill `apex-admin-web-frontend`、`apex-governance-ops`（`/Users/eric/DoubaoWork/skills/`，不入库）；本仓新增 `.workbuddy/agents/{frontend-expert,qa-engineer,release-guardian}.md`；新增 `05-agent-tooling.md` 登记清单；插件市场无匹配 → 用仓内脚本替代 | 本条提交 | `ls .workbuddy/agents/` 三份；`ls /Users/eric/DoubaoWork/skills/apex-admin-web-frontend/SKILL.md`；不影响构建与页面 | 仅用户级 Skill/Agent 安装（不入库），不改项目文件 |
| 15 | 2026-11-16 | 脚本 | **新增一键预检 `scripts/dev/apex-preflight.sh`**（与后端同款，自动识别前端仓）：检查分支=dev、工作区、远端对齐、附录 A 哈希、origin 与 SSH 443、记忆台账、治理脚本及自检、node 与 `build` 脚本、三支一致性 | 本条提交 | 实测 `OK=16 WARN=1 FAIL=0`；只读脚本，不改文件 | 仅新增预检脚本 |
| 16 | 2026-11-16 | 治理 | **分支保护清单** `docs/guides/github-branch-protection.md`（唯一正文在后端 `docs/05-operations/`）：`master`/`test` 禁直推/禁强推/禁删除 + 线性历史；`dev` 只禁强推与删除；本仓特有注意：**不要**把 `npm run build`（含 vue-tsc）挂成 status check；规范 §5.3 增指引 | 本条提交 | 匿名 API 403、`gh` 未登录 → 需网页或 PAT 开启 | 仅新增保护清单文档 |
| 17 | 2026-11-16 | 治理 | **`dev` 分支治理一致性评审（前端）**：本仓判定表、偏差归属 D-02/D-03/D-04/D-06/D-07/D-08、允许差异（无编号目录）、前端特有注意（不挂 `npm run build` 为 status check）；唯一正文在后端 `docs/reviews/` | 本条提交 | 实测：无 `.github`（无 CI）、`AGENTS.md` 第 0 章缺台账/分支条款、任务盘止于 FE-015、`.gitignore` 四组重复；`verify-docs`/`check-doc-refs` 均 0 项、红线无阻断 | 仅新增评审与方案文档 |
| 18 | 2026-11-16 | 治理 | **整改 B1+B2（关闭 D-03/D-08/D-04）**：`AGENTS.md` 第 0 章新增 `0.8 记忆台账、分支模型与工具链`；规范 §5.3 默认分支改为既成事实；知识库 README 增加「维护口径」（台账强制登记、其余为派生视图）；任务盘补 FE-016~FE-021 | 本条提交 | 验收：`tail -n 712 AGENTS.md \| shasum -a 256` = `ae5e19db…53a` **不变**；任务盘 6 列对齐 | 仅 AGENTS.md/规范/知识库/任务盘，不改代码 |
| 19 | 2026-11-16 | 脚本 | **整改 B5（关闭 D-06）**：`.gitignore` 合并重复项为单一「AI 私有目录」区块（9 类各 1 条带注释），移除工具链段重复目录与重复构建产物 | 本条提交 | 验收：去重检查为空；`git check-ignore docs/README.md` 无命中；`verify-docs` 0 项 | 仅 `.gitignore` 规则合并，不影响已跟踪文件 |
| 20 | 2026-11-16 | 治理 | **整改 B3（关闭 D-02）**：新增 `.github/workflows/ci.yml`（`docs-and-rules` job 跑 4 个治理脚本 + `build` job 跑 `npm ci && npm run build`），触发 `master/test/dev`、PR `master/test`、支持手动触发 | 本条提交 | 验收：`ruby -ryaml` 解析通过；本地预演 4 个治理脚本全通过；首次推送 `dev` 即验证触发 | 仅新增 CI workflow，不改业务代码 |
| 21 | 2026-11-16 | 脚本 | **B5 补正**：`.gitignore` 行尾注释不被 git 识别（`.workbuddy/  # 注释` 会被当作含 `#` 的规则，导致私有目录未被忽略、`git status` 出现 `?? .workbuddy/`），改为「注释独占一行 + 规则单列」 | 本条提交 | 验收：`git check-ignore -v .workbuddy` 命中 84 行；`git status --porcelain` 无 `?? .trae/` 等私有目录 | 仅 `.gitignore` 注释位置修正，规则语义不变 |
| 22 | 2026-11-16 | 治理 | 任务盘登记整改批次 B1/B2/B3/B5 完成与 B6 待执行（FE-021~FE-024），B6 阻塞原因写入验收列 | 本条提交 | 与代码/文档提交一一对应，状态列与实际一致 | 仅任务盘登记 |
| 23 | 2026-11-16 | 治理 | 评审报告与整改批次回填执行结果（D-02/03/04/06/08 关闭；D-07 待凭据） | 本条提交 | 与 FE-022~FE-024 一致；收尾 `FAIL=0` | 仅评审/方案回填 |
| 24 | 2026-11-16 | 治理 | **B6 落地（前端侧）**：`gh` 已登录（`anqli8341`/`repo`）后实测保护 API 六次 403（private + Free 不支持）；新增 `.githooks/pre-push` 本地守护（与后端同款），标注能力边界 | 本条提交 | 钩子 4 用例实测通过；指引副本补「平台限制说明」段落 | 仅 `.githooks`/文档/任务盘/台账，不改代码 |
| 25 | 2026-11-16 | 治理 | **B6 闭环（前端侧）**：转 public 后三支保护全部开启（禁强推+禁删除，master/test 加对话解决）；指引副本补「平台限制说明与最终结论」；`.githooks/pre-push` 保留为第二道防线 | 本条提交 | 三支 `GET /protection` 均 200 且 `force=false del=false` | 仅保护文档/任务盘/台账，不改代码 |
| 26 | 2026-11-16 | 治理 | **对齐修复**：台账补 `日期` 列（25 条回填，`摘要`/`证据` 原文未改）；任务盘 `FE-015` 错列修正（多插的「负责」列并入验收/产出）；`FE-024` 状态去加粗回归五状态字面值 | 本条提交 | 表格列一致性校验异常 0；`verify-docs.sh` 0 项；`check-doc-refs.sh` 0 项 | 仅文档，不改代码 |
| 27 | 2026-11-16 | 治理 | **更正 #26**：新增条目误把「证据」与「影响面」写在同一格（6 格），已拆为 7 格与表头一致 | 本条提交 | 校验：`04-change-memory.md` 条目列数异常 0 | 仅文档，不改代码 |
| 28 | 2026-11-16 | 类型 | **FE-005 第一批 `any` 收敛**：`src/mock/index.ts` 新增 `MockRequestOptions` 接口（url/type/body），13 处 `(options: any)` 全部替换，并补 `options.body ?? '{}'`、`url.split('/').pop() ?? ''` 空值安全；`src/utils/xss-protection.ts` 的 `sanitizeJson` 返回值与内部 `cleanValue`、`cleaned` 由 `any` 改 `unknown`/`Record<string, unknown>` | 本条提交 | `grep -rn ": any" src | wc -l` 51 → 35；`npm run build` 通过（`vue-tsc --noEmit` 0 error + vite build 39.75s） | 仅类型声明与空值兜底，运行期行为不变；业务页面零改动 |
| 29 | 2026-11-16 | 测试 | **FE-003 E2E 扩展**：新增 `e2e/workflow.spec.ts`（流程监控三 Tab + 待办 list/total 口径）、`e2e/tenant.spec.ts`（租户列表 + 查询回传）、`e2e/office-approval.spec.ts`（待办渲染 + 已办 Tab）；`e2e/helpers.ts` 增 `MENUS_FULL`/`MENUS_WITH_TENANT` 菜单夹具并让 `mockBackend` 支持自定义菜单 | 本条提交 | `npx playwright test --workers=1` → 12 passed（46.5s，4 → 7 个 spec、9 → 12 个用例）；报告 `reports/e2e-results.xml` | 仅测试代码，不触碰 `src` 业务代码 |
| 30 | 2026-11-16 | 文档 | **FE-001/002/004/006/007 收口**：新增 `docs/notes/2026-11-16-doc-dedup-audit.md`（段落级/行级 0 重复）、`-orphan-views.md`（67 页面/6 未注册：5 子组件 + 1 未接线）、`-chart-assets.md`（0 个 .mmd/.svg，27 处 Mermaid 内嵌）；`03-contract-map.md` 增 §0 关联文档、§2.1 逐文件分页口径、§5 与 docs/api 核对记录（更正办公审批为 list/total）；清除 2 个私有目录指针桩；7 张卡改「已完成」并回填产出 | 本条提交 | `docs/notes`、`docs/records`、`docs/tasks` 索引可达；`bash scripts/governance/verify-docs.sh` 通过；E2E 12 passed 与 build 结果见 `docs/records/2026-11-16-fe-tasks-batch.md` | 文档与索引；业务代码零改动 |
| 31 | 2026-11-16 | 类型 | **FE-005 第二批 `any` 收敛**：`src/utils/error-handler.ts` 的 `details`/`value` 改 `unknown`，`withErrorHandling` 由 `<T extends (...args:any[])=>Promise<any>>` 改为 `<A extends unknown[], R>` 泛型（返回 `(...args: A) => Promise<R>`）；`src/utils/mask.ts` 规则函数入参改 `string`；`src/composables/useCrud.ts` 的 `params` 改 `Record<string, unknown>` | 本条提交 | `grep -rn ": any" src | wc -l` 35 → 29；`npm run build` 通过（37.00s） | 仅类型声明；`withErrorHandling` 调用方签名不变，运行期行为不变 |
| 32 | 2026-11-16 | 清理 | **边界项处置**：①删除 0 引用的未接线页 `src/views/office/components/PlatformSelector.vue`（复核 `grep -rn` 仍 0 命中，git 历史可恢复）；②`playwright.config.ts` 增加 `expect.timeout=15s` 与 `retries: 1`，解决并行下首屏冷启动导致的偶发超时 | 本条提交 | `find src -name '*.vue'` 75 → 74；`npx playwright test` 连续两轮并行 **12 passed**（40.5s / 37.4s），串行亦 12 passed；`npm run build` 通过 | 删除文件确认无路由/模板引用，构建与 E2E 均通过 |
| 33 | 2026-11-16 | 类型 | **`any` 清零（第三批，28 → 0）**：①13 处 `catch (error: any)` → `catch (error)`（统一由 `showError(error, …)` 消费 unknown）；②`office/callback.vue` 的 `err` 归一为 `const errMsg = err instanceof Error ? err.message : String(err)`；③`FileUpload.vue`/`FileUploadEnhanced.vue` 的上传回调把 `Result{code,msg,data}` 声明成 payload 并 `as` 收窄；④`validate-rules.ts` 的校验签名改用库类型 `NonNullable<FormItemRule['validator']>`；⑤`workflow` 转办/委派载荷 `newAssigneeId`/`delegateToId` 由 `number` 改 `string`（与 `AdminUser.id` 一致，避免 Number() 丢精度），`TaskActions`/`PendingTasks` 同步 | 本条提交 | `grep -rnE ": any\b" src | wc -l` → **0**（唯一字面命中是 CSS `overflow-wrap: anywhere`）；`npm run build` 通过（40.09s） | 不改运行期行为：`catch` 仅去掉注解、上传响应仅收窄类型、用户 ID 不再做数值转换 |
| 34 | 2026-11-16 | 图表 | **图表资产落地（FE-007 由「不适用」改为「已落实」）**：27 个内嵌 Mermaid 块抽为 `docs/diagrams/*.mmd`，`mmdc 10.9.1` 导出同名 `.svg`，正文替换为 SVG 引用 + 「图源」链接；新增 `docs/diagrams/README.md`（命名规则、27 行清单、重导出命令、2 个语法坑）、`scripts/governance/check-diagram-assets.sh`（配对检查，已接入 `verify-docs.sh` 第 9 项） | 本条提交 | `find docs -name '*.mmd'`=27、`*.svg`=27、`check-diagram-assets.sh` → `mmd 总数 27 · 缺失 0`；`verify-docs.sh` 0 项；`docs/diagrams/` 740K | Mermaid 源码零删除（仅 2 处为可渲染加引号/实体转义）；文档正文其余内容未改 |
| 35 | 2026-11-16 | 规范 | 规范 §8 工具表登记 `check-diagram-assets.sh`，并补写「图表资产口径」：新增图必须同时提交 `.mmd` 与同名 `.svg`，正文引用 `.svg` 并保留「图源」链接 | 本条提交 | `bash scripts/governance/verify-docs.sh` 0 项 | 仅规范文本，无代码改动 |
| 36 | 2026-11-16 | 结构 | **目录规范化（FE-025）**：①`reports/` 按测试类型分层——`e2e-e2e-results.xml`→`reports/e2e/`、`test-results.{xml,json}`→`reports/unit/`，同步 `playwright.config.ts`/`package.json`/`normalize-test-report.mjs` 与 `.gitignore` 白名单，新增 `reports/README.md`；②`docs/README.md` 新增「🗂 目录总览」13 行 + 三条归置规则；③补齐 4 个 README（`architecture`/`features`/`guides`/`reference`）；④新增 `scripts/governance/check-doc-layout.sh`（5 条断言）接入 `verify-docs.sh` 第 10 项；⑤规范新增 §7.5 | 本条提交 | `check-doc-layout.sh` 5/5 OK、`verify-docs.sh` 10 项 0 问题、`check-doc-refs.sh` 0、`check-diagram-assets.sh` 27/27、`npm run build` 46.50s、`npx playwright test` 12 passed 且 junit 落新路径 | `src/` 零改动；历史归档报告里的旧路径按 §3.6 不改，已在 `reports/README.md` 注明 |



| 37 | 2026-11-17 | 代码 | **FE-026 真实联调契约修复**：①`office-approval.ts` 的 pending/initiated 按真实裸数组契约适配——只上送 `approverId`/`initiatorId`，平台与状态筛选后客户端真分页（total/pages/hasNext 与切片一致），缺身份直接拒绝；新增 `listMyInitiatedApprovals` 供已办区块从全量派生。②`office-calendar.ts` 改调真实 `/range`：空格转 `T`、带 `Z`/偏移时间换算浏览器本地墙钟（不再粗暴删后缀）、未选时间默认当前自然月、客户端筛选分页、平台归一为大写、状态类型对齐实体 `CONFIRMED/TENTATIVE/CANCELLED`。③用户管理页状态映射修正（1=正常、0=禁用，写操作仍提交布尔 `enabled`）。④审批页已办改为全量派生、日历页状态文案对齐 | 未提交 | `npx vue-tsc --noEmit` 退出 0；`npx vitest run` 68 文件 / **533 用例全绿**；真实浏览器回归 `/office/calendar`（真实数据 2 条渲染正确、平台「飞书」、状态「已确认」）与 `/office/approval`（`共 0 条`，无 `undefined`）；真实网关 `GET /api/office/calendar/events/range` 200 | 仅前端契约适配与页面映射；不改 request 拦截器、鉴权与租户头；后端契约未变更 |

| 38 | 2026-11-17 | 代码 | **FE-026 第二轮：日历写路径契约补齐**：①`CreateEventRequest` 补后端 `@NotBlank` 的 `eventType`/`organizerId`/`organizerName`（真实 POST 曾返回 400「事件类型不能为空, 组织者姓名不能为空, 组织者ID不能为空」），日历页新增事件类型下拉、组织者取当前登录用户；②写请求平台标识统一转小写（后端按 `<platform>CalendarClient` Bean 名查找，传 `FEISHU` 返回「不支持的办公平台: FEISHU」）；③新增 `EventType` 枚举与 `EVENT_TYPE_NAMES` | 未提交 | `npx vue-tsc --noEmit` 退出 0；`vitest` office-calendar 7 用例通过；真实 `POST /api/office/calendar/events` 的 400 原因已确认并修复前端传参 | 仅前端请求体与表单字段；未改后端。**日历写操作仍不可用**：后端无任何 `*CalendarClient` 实现，已记入记录 §7.2 另立任务 |

| 39 | 2026-11-17 | 台账 | **FE-026 收口**：环境完全重建后经网关跑 18 条真实接口 **18/18 通过**（user-info/menus/overview/calendar-range/approval-pending/initiated/kb-spaces/connectors/iot/masking/tenants/capabilities/operations/wf-instances/notifications/messages/sessions/permissions）；记录 §8 补充时区五种输入与分页边界独立校验、租户作用域复核结论及三条环境搭建注意（构建覆盖运行中 JAR、token 会话顶替、02:00 密钥轮换）；任务卡 FE-026 置「已完成」 | 未提交 | 18/18 实测；`vitest` 68 文件 533 用例全绿；`vue-tsc` 退出 0；`npm run build` 成功 | 仅记录与任务状态；日历写操作与审批发起两项外部依赖缺口已列入记录并需另立任务 |

---

## 4. 按类型检索

| 想找什么 | 看哪几行 |
| --- | --- |
| 构建/脚本改动 | #1（归档命令） |
| 远端与凭据 | #2、#4、#5、#7 |
| 许可与合规 | #6 |
| 分支策略 | #7、#8、#9 |

---

## 5. 与其它文档的分工

| 文档 | 回答什么 | 更新频率 |
| --- | --- | --- |
| 本篇 `04-change-memory.md` | 时间轴上发生了什么、证据是什么 | **每次改动** |
| `MEMORY-CARD.md` | 三分钟上手要点 + 指针 | 结构性变化时 |
| `01-current-state.md` / `02-conventions-and-pitfalls.md` / `03-contract-map.md` | 现状 / 约定与陷阱 / 接口契约快照 | 结构性变化时 |
| `docs/records/*.md` | 单个事件的完整复盘 | 事件级 |
| `docs/specs/*` | 规范原文（口径唯一权威） | 口径变化时 |

> 冲突时以源码与规范原文为准；发现本篇与源码冲突，**追加更正条目**并回写快照篇。
