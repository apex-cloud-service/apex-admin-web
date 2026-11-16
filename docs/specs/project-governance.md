# 项目任务管理规范（apex-admin-web · 规范正文）

| 项 | 值 |
| --- | --- |
| 文档版本 | v1.1（2026-11-16 增补版） |
| 生效日期 | 2026-11-16 |
| 适用范围 | apex-admin-web 全部目录、全部参与者（人 + 任意 AI 智能体） |
| 权威关系 | 本文件与 `AGENTS.md` 第 0 章同源：`AGENTS.md` 为入口索引，本文件为可独立阅读的完整正文；技术事实以 `AGENTS.md` 附录 A 与代码为准 |
| 维护人 | 主控智能体（默认 Trae）；变更需在 `docs/records/` 留痕 |

---

## 1. 设计原则

1. **可追溯**：任何改动都能回答「哪个任务、谁批的、验收怎么过的」。
2. **不散落**：业务文档只有一个家 —— `docs/`；AI 私有目录只放工具自身的配置与缓存。
3. **不打架**：多个 AI 工具并存时，靠「目录边界 + 单一正文」避免各自一份口径。
4. **不破坏**：改造优先「新增 + 留指针」，禁止「移动 + 删原件」；功能改动与文档治理不同批提交。

---

## 2. 任务体系

### 2.1 优先级（四档，无第五档）

| 级别 | 判定标准 | 响应要求 |
| --- | --- | --- |
| **P0** | 线上白屏/登录不可用/构建失败/数据错误/安全漏洞 | 立即停止其他任务，当天修复 |
| **P1** | 阻塞他人任务、接口契约不兼容、踩编码红线 | 当期迭代内完成 |
| **P2** | 功能增强、性能优化、可维护性技术债 | 排期执行 |
| **P3** | 文档完善、可读性、工具链与体验优化 | 有空档时执行 |

> 不许出现「紧急/一般」等模糊表述，统一映射到 P0–P3。

### 2.2 五状态流转

```text
待规划 → 执行中 → 待复核 → 已完成
                    ↘ 搁置（需写明搁置原因与复活条件）
```

- 状态值只有这五个，禁止自造（如「进行中」「待办」「Done」）。
- `待复核` 必须指定复核人（人或另一 AI 角色，见 §4.4）。
- `搁置` 必须写：原因、复活条件、最迟复核日期。

### 2.3 命名与拆卡

- 任务命名：`【Px】模块-动作对象｜关联单号（可选）`，例：`【P1】router-补齐 VIEW_REGISTRY 注册`。
- **单任务单职责**：一个会话只承接一件独立交付任务；新需求新建条目，禁止在同一会话叠加。
- 拆卡规则：跨 `src/api` / `src/views` / `src/stores` / `src/router` 多个中枢目录的改动，必须按目录拆卡。
- 禁止「顺手重构」：任何非任务目标的改动，登记为独立卡。

### 2.4 任务卡必填字段

| 字段 | 要求 |
| --- | --- |
| 编号 | `FE-nnn`，不复用、不跳号占位 |
| 优先级 | P0–P3 |
| 目标 | 一句话，动词开头，≤40 字 |
| 状态 | 五状态之一 |
| 验收标准 | **可执行**（命令 + 期望结果），如 `npm run build` 0 error、页面路径可达、e2e 通过 |
| 影响面 | 文件/目录清单，标注是否触碰中枢文件（`VIEW_REGISTRY`、`utils/auth.ts`、`utils/request.ts`） |
| 执行说明 | 可选，写角色卡引用或关键约束 |

### 2.5 完成判定（DoD，缺一不可）

1. 改动完成且仅覆盖任务目标。
2. 本地验证通过：`npx vue-tsc --noEmit`；涉及逻辑改另跑 `npm run build`。
3. 不违反第 6 章红线。
4. 文档与索引同步（新增文档已登记 `docs/README.md`）。
5. 在 `docs/records/` 留一条变更记录（日期 + 任务号 + 改了什么 + 怎么验的）。

### 2.6 大盘维护权

- `docs/tasks/project-tasks.md` 只由主控智能体写入；其余智能体只读，完成后**回报**主控更新状态。
- 并行会话冲突：以「先写盘者为准」，后者必须 rebase 自身状态变更，禁止整表覆盖。

---

## 3. 文档收口

### 3.1 六个标准目录（新产出归位）

| 目录 | 用途 | 唯一入口 |
| --- | --- | --- |
| `docs/tasks/` | 任务大盘、迭代清单 | `docs/tasks/project-tasks.md` |
| `docs/specs/` | 需求规格、技术方案、契约设计、本规范正文 | `docs/specs/README.md` |
| `docs/plans/` | 实施计划、重构拆解、迁移计划 | `docs/plans/README.md` |
| `docs/records/` | 变更记录、改造留痕、缺陷复盘 | `docs/records/README.md` |
| `docs/reviews/` | 方案评审、代码评审结论 | `docs/reviews/README.md` |
| `docs/notes/` | 调研、对接备忘、风险纪要 | `docs/notes/README.md` |

### 3.2 既有目录继续有效

`docs/api`、`docs/architecture`、`docs/features`、`docs/guides`、`docs/reference`、`docs/archived` 保持原位、原名、原内容；新产出按职责归位，属于既有分类的**放回既有分类**，不强行搬迁。

### 3.3 唯一正文原则

- 同一结论只存一份正文，其余位置用链接引用（禁止复制多份）。
- 迁移文档必须：先建新版 → 校验一致（SHA-256）→ 修链接 → 删原件 → 原目录留 `MIGRATED.md` 指针。

### 3.4 命名规范

| 类型 | 命名 |
| --- | --- |
| 方案/规格 | `YYYY-MM-DD-主题.md` |
| 计划 | `YYYY-MM-DD-主题-plan.md` |
| 记录 | `YYYY-MM-DD-主题.md` |
| 评审 | `YYYY-MM-DD-主题-review.md` |
| 笔记 | `主题.md`（短名，无需日期） |

### 3.5 图表资产保护（刚性）

1. 架构图、UML、时序图、业务流程图、状态机图：**禁止删除、禁止覆盖、禁止重绘替代**。
2. **禁止为「目录整齐」批量移动**图表文件（会打断既有引用）。
3. 更新图表：新增版本文件（`_v2`）并在 `docs/records/` 写明差异与受影响引用。
4. 源文件与导出件成对（`.mmd` ↔ `.svg`）；新增图必须两者齐备。
5. 本仓现状：`docs/` 无独立 SVG/MMD，图表以内嵌 Mermaid 形式存在于 md 中；后续新增按上述执行。

### 3.6 历史归档的旧路径与断链（豁免口径）

1. 适用范围：`docs/archived/` 下的历史记录、`docs/_archive/`（如有）、`CHANGELOG.md` 历史条目。
2. 这些文档记录的是当时真实路径与当时真实断链 → **不改正文**，只做两件事：文首加「历史记录说明」（注明正文已迁入 `docs/`、未迁入部分「原文未入库」），并登记 `scripts/governance/doc-refs-allowlist.txt` 写明理由。
3. **活文档（现行规范、索引、指南、评审）不得豁免**，必须改到可达；本仓 2026-11-16 已把 `docs/archived/project-reports/` 的 3 条相对层级错误修到 0。
4. 豁免准入只有三类：历史归档 / 迁移说明与来源证明 / 评审取证。
5. 自检口径：`check-doc-refs.sh` 计数必须收敛到 0，否则视为整改未完成。

---

## 4. 多智能体协作

### 4.1 工具对应目录与允许内容

| 工具 | 私有目录 | 允许存放 | 禁止存放 |
| --- | --- | --- | --- |
| Trae | `.trae/` | 规则镜像、技能定义、缓存索引 | 方案、计划、报告、知识库正文 |
| WorkBuddy | `.workbuddy/` | memory、automations、RAG/ops 脚本与索引 | 同上 |
| ZCode | `.zcode/` | 会话计划缓存、ignore 配置 | 同上（计划正文须进 `docs/plans/` 或归档） |
| Qoder | `.qoder/` | 配置、缓存 | 同上 |
| Codex | `.codex/` | 配置、缓存 | 同上 |
| Claude | `.claude/` | 配置、agents 定义 | 同上 |
| 其他/未来 | 新增隐藏目录 | 配置、缓存、规则镜像 | 同上 |

### 4.2 隔离规则

1. 每个智能体只读写**自身**私有目录；禁止跨 AI 修改他人私有目录（含删除、重命名）。
2. `docs/` 对所有智能体**可读可写**，但写入必须遵循 §2.6 大盘维护权与 §3 归位规则。
3. 私有目录内的规则文件只能是 `AGENTS.md` / 本规范的**镜像**，冲突时以仓库内文件为准。
4. 新增 AI 工具：只新增目录 + 放置规则镜像（内容写「见 `AGENTS.md` 第 0 章与 `docs/specs/project-governance.md`」），不改本规范。

### 4.3 交接协议

一个会话结束前必须交付三样：① 已更新任务状态；② `docs/records/` 一条记录；③ 明确的「下一步建议」。缺任一项视为未交付。

### 4.4 角色卡（跨工具通用）

`docs/specs/ai-agents/` 定义五个角色的可粘贴规范，供任意工具复用：

| 角色 | 文件 | 职责 |
| --- | --- | --- |
| R1 任务规划 | `ai-agents/r1-task-planner.md` | 需求 → 任务卡 + 验收标准 |
| R2 前端实现 | `ai-agents/r2-frontend-implementer.md` | 按红线写页面/组件/API/状态 |
| R3 契约守门 | `ai-agents/r3-ui-contract-guard.md` | 审路由注册、接口契约、错误态、权限点 |
| R4 测试回归 | `ai-agents/r4-test-runner.md` | 类型检查、构建、e2e |
| R5 评审 | `ai-agents/r5-reviewer.md` | 提交前评审 + 跑治理脚本 |

> 复核人默认由 R5 承担；不得由提交者自审自放。

---

## 5. 版本控制与忽略规则

### 5.1 `.gitignore` 三条硬规则

1. **`docs/` 必须全量入库**，禁止出现任何忽略 `docs` 的规则（含通配写法）。
2. AI 私有目录**整体忽略**：`.workbuddy/`、`.trae/`、`.trae-html-share-packages/`、`.zcode/`、`.qoder/`、`.codex/`、`.claude/`、`.agents/`、`.ai/`。
3. 忽略项必须带注释说明「为什么忽略、正文在哪」，禁止裸 `*.md` 之类模糊规则。

### 5.2 提交纪律

- 一次提交只做一类改动：`docs(governance): …` / `chore(scripts): …` / `feat(...)` / `fix(...)`，禁止混提。
- 提交前钩子：`git config core.hooksPath .githooks`（每人执行一次），`.githooks/pre-commit` **只警告不阻断**。
- 禁止 `git reset --hard`、禁止 `push -f` 覆盖他人工作；回滚用 `git revert`。
- 他人未提交改动（`git status` 中非本轮产物）**不得清理、不得覆盖、不得加入本次提交**。

### 5.3 分支与远端

主线 **`master`**（2026-11-16 由 `main` 重命名）；改动走短分支后合并，禁止长期分叉。文档治理类改动可在 `master` 小步提交。远端默认分支**已**设为 `master`（2026-11-16，两仓均已切换并删除 `main`）；如需再次变更，按 GitHub Settings → General → Default branch 操作，变更后同步本条。

**分支模型（长期分支三个，2026-11-16 建立 `dev` / `test`）**：

| 分支 | 用途 | 允许直接提交 | 说明 |
| --- | --- | --- | --- |
| `dev` | **默认工作分支**，承载全部日常开发与文档治理提交 | **是（默认）** | 所有新增/修改/整改都在此提交，是唯一的日常入口 |
| `master` | 生产基线，可发布状态 | 否（仅接受从 `dev` 合入，或紧急热修） | 每条提交都应可发布；**禁止 `push -f`** |
| `test` | 测试/验收环境分支 | 否（仅由 `dev` 合入） | 供测试环境部署与联调 |
| 短分支 | 单个任务（如 `feat/FE-016`、`fix/FE-017`） | — | 自 `dev` 拉出，完成后合并回 `dev` 并删除 |

**默认工作分支为 `dev`（2026-11-16 起，两仓本地已切换）**：日常开发、技术债整改、文档治理一律在 `dev` 上进行；`master` 只做发布与合入，`test` 只做验收。开工前先确认与对齐：

```bash
cd /Users/work/apex-admin-web
git checkout dev                 # 默认工作分支（已切换，长期停留于此）
git pull --ff-only               # 开工前必须与 origin/dev 对齐
git rev-parse --abbrev-ref HEAD  # 应输出 dev
```

合入规则：`dev` 验证通过（`verify-docs.sh` / `check-doc-refs.sh` 全绿）→ `git checkout master && git merge --ff-only dev && git push` → `git checkout test && git merge --ff-only dev && git push` → 回到 `dev` 继续开发。**禁止在 `master` 上直接改代码或文档**（紧急热修除外，且须当日回合 `dev`）。

建立与推送（已执行，两仓同款）：

```bash
git branch dev  master && git push -u origin dev
git branch test master && git push -u origin test
```

首建时三支指向同一提交（前端 `88ca2d1`、后端 `ee244f89`），历史零变化。旧远端 `main` 已于远端默认分支切换为 `master` 后删除（`git push origin --delete main` + `git fetch --prune`）。

**分支保护**：`master`/`test` 应开「Require PR + 线性历史 + 禁强推 + 禁删除」，`dev` 只禁强推与删除。完整清单见 `docs/guides/github-branch-protection.md`（唯一正文在后端 `docs/05-operations/github-branch-protection.md`）。保护开启后本地 `merge --ff-only && push` 会被拒，须改走 PR + Rebase and merge。

**远端与离线归档（`origin` = `git@github.com:apex-cloud-service/apex-admin-web.git`，SSH 走 443）**：

1. 未配置远端（或推送受阻）时，全部历史只存在于本机 → **每周做一次离线归档**（用 `git archive`，避免把 `dist/`、`node_modules/` 打进包）：
   ```bash
   cd /Users/work/apex-admin-web
   ts=$(date +%Y%m%d); mkdir -p /Users/work/backup
   git archive --format=tar.gz --prefix=apex-admin-web/ -o /Users/work/backup/apex-admin-web-$ts.tar.gz master
   git bundle create /Users/work/backup/apex-admin-web-$ts.bundle master
   cd /Users/work/backup && shasum -a 256 apex-admin-web-$ts.tar.gz >> SHA256SUMS.txt
   ```
2. 归档件（tar.gz + bundle）须异地/异盘至少一份；`SHA256SUMS.txt` 用于校验完整性。
3. 推送纪律：`git push -u origin master`；**禁止 `push -f`**。本机 22 端口被网络阻断，仓库内固定走 443：
   ```bash
   git config core.sshCommand "ssh -o Hostname=ssh.github.com -p 443"
   ssh -T -p 443 git@ssh.github.com      # 期望回 Hi <账号>! You've successfully authenticated...
   ```
   私钥若带口令，先 `ssh-add --apple-use-keychain ~/.ssh/<key>`（非交互环境无法解密带口令私钥）。
4. 远端若已有另一条历史（如建仓时的 `Initial commit`）：先 `git fetch origin && git ls-tree -r --name-only origin/master` 读清内容，再 `git merge --allow-unrelated-histories origin/master`，冲突保留本地完整版；**不得 force push**。
5. 「合并到 `master`」：有远端即「提交 + push」；推送受阻时等价于「在 `master` 上提交 + 生成 bundle 归档」（见 `docs/records/2026-11-16-github-remote-onboarding.md`）。

---

### 5.4 记忆文档同步（强制）

**规则**：**任何改动都必须写入本仓的记忆文档**，与改动同一次提交完成，不允许「先提交、以后再补」。

**记忆文档清单（本仓）**

| 文件 | 角色 | 何时必须更新 |
| --- | --- | --- |
| `docs/reference/ai-knowledge/04-change-memory.md` | **变更流水台账**（append-only） | **每一次改动**都追加一条 |
| `MEMORY-CARD.md` | 一页式记忆卡（结论 + 指针） | 结构性变化（页面/路由/依赖/契约前缀/分支/许可变化） |
| `docs/reference/ai-knowledge/01`–`03` | 现状 / 约定与陷阱 / 契约映射快照 | 该篇描述的结论发生变化时 |
| `docs/records/<日期>-<主题>.md` | 事件级完整复盘 | 复杂改动（跨模块、跨仓、有踩坑或决策） |

**台账一条的必填六字段**：`日期` · `类型`（代码/文档/脚本/许可/分支/远端/治理）· `摘要`（做了什么 + 为什么）· `提交`（短哈希）· `证据`（实测命令与输出、校验脚本结果）· `影响面`（是否影响页面/接口/构建）。

**提交时的强制动作**

1. 提交信息末行写 `memory: 04-change-memory.md#<条目编号>`；无记忆更新的纯机械改动写 `memory: n/a（原因）`。
2. 提交前对照下表自检：

| 改动类型 | 除台账外还要动的记忆文档 |
| --- | --- |
| 新增/删除页面、改路由或组件结构 | `MEMORY-CARD.md` §3、`01-current-state.md` |
| 改依赖、构建命令、`vite` 配置 | `MEMORY-CARD.md` §2、`02-conventions-and-pitfalls.md` |
| 改接口路径/请求响应结构 | `03-contract-map.md` + 台账（**必须与后端契约同步核对**） |
| 改治理脚本 / 分支策略 / 许可 | 本篇（`docs/specs/project-governance.md`）+ 台账 |
| 改远端 / 分支结构 | `MEMORY-CARD.md` 基线行、台账 |

3. 周期校验（每周一次）：
   ```bash
   python3 ../../.workbuddy/ops/maintain.py status   # 若本机存在该运维脚本
   bash scripts/governance/verify-docs.sh
   bash scripts/governance/check-doc-refs.sh
   git log --oneline -10 | grep -c "memory:"
   ```

**禁止**：① 把私有目录（`.workbuddy/`、`.zcode/`、`.trae/`、`.trae-cn/`）内容抄进受控记忆文档；② 只写「已完成」不写证据；③ 删除或改写历史条目——记错时追加 `更正 #n` 条目。

## 6. 编码红线（前端）

| 编号 | 红线 | 依据 |
| --- | --- | --- |
| F1 | 只用 `<script setup lang="ts">`，禁 Options API | `AGENTS.md` 0.5.2 |
| F2 | 禁新建 Axios 实例，统一 `src/utils/request.ts` | 0.5.3 |
| F3 | 会话键只经 `src/utils/auth.ts`，禁 `localStorage` 直读直写 | 0.5.4 |
| F4 | 新页面必须注册 `VIEW_REGISTRY` | 0.5.5 |
| F5 | 禁新增 `any` 兜底；确需时注释说明原因 | 0.5.6 |
| F6 | 技术栈不得擅自升级/替换 | 0.5.1 |
| F7 | 接口调用集中在 `src/api/*.ts`，页面不直写 URL | 附录 A |
| F8 | 注释沿用 `docs/reference/comment-style.md`，禁止死代码注释 | 0.5.7 |
| F9 | 不在源码里堆长文档，说明进 `docs/` | 0.5.8 |
| F10 | 不为过检查放宽 `lint`/`tsc` 配置或加 `@ts-ignore` | 0.6.5 |

红线违规 = P1 任务，登记后当迭代修，不得「下次一起改」。

---

## 7. 变更纪律与回滚

1. 先登记任务，再动手；改造可评审、可回滚、可分批。
2. 涉及路由注册、权限码、令牌刷新、租户头、分页口径、上传链路的**功能改动**，先在 `docs/specs/` 出方案。
3. 文档治理与功能改动**禁止同批提交**。
4. 回滚三步：`git revert <sha>` → 跑 `verify-docs.sh` → 在 `docs/records/` 记录回滚原因。
5. 每次改造必须能在 `docs/records/` 找到「改了哪些文件、怎么验的、怎么回滚」。

---

## 8. 工具与脚本

| 脚本 | 作用 | 用法 |
| --- | --- | --- |
| `scripts/governance/verify-docs.sh` | 六目录/索引/任务大盘/私有目录边界/规模快照 | `bash scripts/governance/verify-docs.sh` |
| `scripts/governance/audit-frontend-rules.sh` | 越权 Axios、绕过 `auth.ts`、`: any` 规模、`script setup` 覆盖 | `bash scripts/governance/audit-frontend-rules.sh [--strict]` |
| `scripts/governance/check-doc-refs.sh` | 活文档私有路径残留 + Markdown 断链（含白名单豁免） | `bash scripts/governance/check-doc-refs.sh [--strict]` |
| `scripts/governance/check-diagram-assets.sh` | 图表资产配对：`docs/**/*.mmd` 必须有同名 `.svg` | `bash scripts/governance/check-diagram-assets.sh [--strict]` |
| `.githooks/pre-commit` | 治理范围改动时跑自检 + 图表删除告警 + 大文件提醒 | `git config core.hooksPath .githooks` |

脚本说明见 `scripts/governance/README.md`；`--strict` 才产生非零退出码，默认只警告。

图表资产口径（2026-11-16 第三批起）：每张 Mermaid 图以 `docs/diagrams/<name>.mmd` 为源、同名 `.svg` 为导出件，正文引用 `.svg` 并保留「图源」链接；新增图必须同时提交 `.mmd` 与 `.svg`。

---

## 9. 本次执行记录（2026-11-16）

### 9.1 做了什么

1. `AGENTS.md`：前置新增第 0 章，原文整体下移为附录 A（`tail -n 712` 哈希 `ae5e19db…53a` 与原文件一致）。
2. 新建六标准目录 + 各 `README.md` + 任务大盘 `docs/tasks/project-tasks.md`（FE-001~007 待规划、FE-010~013 已完成、FE-014 规范正文入仓已完成、FE-015 治理评审整改已完成）。
3. 私有目录正文迁入 `docs/`：`.workbuddy/knowledge` 4 份 → `docs/reference/ai-knowledge/`；`.zcode/plans` 6 份 → `docs/archived/ai-sessions/zcode-plans/`（逐文件 SHA-256 一致，仅修 1 处相对链接）。
4. 新建治理脚本与 pre-commit（警告模式）、`docs/specs/ai-agents/` 五张角色卡。
5. `.gitignore` 补私有目录标记块，明确「docs 全量入库」。
6. 本文档（规范正文）与 `docs/records/2026-11-16-docs-governance.md`（执行留痕）入仓。

### 9.2 回归证据

| 项 | 结果 |
| --- | --- |
| 基线 46 个 docs 文件 | 45 个逐字节一致；`docs/README.md` 纯追加（34 行新增、0 删除） |
| AGENTS.md 原文 | 712 行 / `ae5e19db9675ad33556faae36ea7007fa2011fefa7cdb35ee703bccec49db53a` 一致 |
| 业务代码 | `src/` 与构建配置 0 文件改动 |
| 治理自检 | `verify-docs.sh` 0 问题；`audit-frontend-rules.sh` 无阻断 |
| 技术债实测 | `: any` 51 处（FE-005）、越权 Axios 0、绕过 `auth.ts` 0 |

### 9.3 未完成与后续

| 项 | 状态 |
| --- | --- |
| FE-005 `: any` 清理 | 待规划，按模块分批 |
| FE-014 规范正文入仓（v1.1） | 已完成（2026-11-16） |
| FE-015 治理评审整改（死指针 1 处 / 断链 3 条 / 规范 §9 范围 / 离线归档条款） | 已完成（2026-11-16，见 `docs/records/2026-11-16-governance-alignment-remediation.md`） |
| 图表基线 | 本仓无独立 SVG/MMD；后续新增按 §3.5 执行 |
| 插件（OpenAPI/GitHub 等） | 待用户授权后安装，非治理必需 |

---

## 10. 验收清单（复制即用）

```markdown
- [ ] 任务已在大盘登记，优先级 P0–P3，验收标准可执行
- [ ] 改动只覆盖任务目标，无顺手重构
- [ ] 新文档已归位六标准目录并登记 docs/README.md
- [ ] 未删除/未覆盖任何既有文档与图表
- [ ] 私有目录未新增业务正文
- [ ] .gitignore 未出现任何忽略 docs 的规则
- [ ] bash scripts/governance/verify-docs.sh 通过
- [ ] bash scripts/governance/audit-frontend-rules.sh 无阻断
- [ ] npx vue-tsc --noEmit 通过（涉及逻辑改动再加 npm run build）
- [ ] docs/records/ 已留变更记录
- [ ] 复核人（R5）已给出 APPROVE / REQUEST_CHANGES
```

---

## 11. 附：目录样例

```text
apex-admin-web/
├── AGENTS.md                      # 入口索引：第 0 章 + 附录 A（原文）
├── docs/
│   ├── tasks/project-tasks.md     # 任务大盘（唯一写入口）
│   ├── specs/
│   │   ├── project-governance.md  # 本文件（规范正文）
│   │   └── ai-agents/             # R1–R5 角色卡
│   ├── plans/  records/  reviews/  notes/
│   ├── reference/ai-knowledge/    # 迁入的知识库 + PROVENANCE
│   └── archived/ai-sessions/zcode-plans/  # 迁入的会话计划
├── scripts/governance/            # 自检脚本 + README
└── .githooks/pre-commit           # 警告模式钩子
```
