# 项目任务管理规范（apex-admin-web · 规范正文）

| 项 | 值 |
| --- | --- |
| 文档版本 | v1.3（2026-11-28 受控归位与图表重制版） |
| 生效日期 | 2026-11-28 |
| 适用范围 | apex-admin-web 全部目录、全部参与者（人 + 任意 AI 智能体） |
| 权威关系 | 本文件与 `AGENTS.md` 第 0 章同源：`AGENTS.md` 为入口索引，本文件为可独立阅读的完整正文；技术事实以 `AGENTS.md` 附录 A 与代码为准 |
| 维护人 | 主控智能体（默认 Trae）；变更需在 `docs/records/` 留痕 |

**v1.3 相对 v1.2 的修订点**（2026-11-28，FE-033）：

1. §3.2 由「既有目录不搬迁」改为「受控归位」：允许**逐文件**把错分类文档迁到职责目录，条件是同批更新全部引用、断链归零、并在 `docs/records/` 留迁移清单。
2. §3.5 由「禁止覆盖重绘」改为「允许重制 + 原文件归档」：旧图整体移入 `docs/diagrams/_legacy/` 并成对保留，新版同名重生成。
3. §3.5 与 §9.5 修正「本仓无独立 SVG/MMD」的过期陈述（实际根下 36 对 + `_legacy/` 22 对）。
4. §8 补 `scripts/` 各子目录 README 要求与 `scripts/README.md` 总索引。

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
| 主责/主写 | 同一时段仅 1 名智能体或人；并行任务不得共享主写 |
| 复核 | 默认 R5；必须未参与执行，禁止自审自放 |
| 执行基线 | 分支/worktree + 起始提交；并行任务必填 |
| 写入范围 | 允许修改的目录/文件；范围外改动不得进入本轮 diff |
| 依赖/互斥 | blocked-by、重叠任务与串行要求；无则写「无」 |
| 验收标准 | **可执行**（命令 + 期望结果），如 `npm run build` 0 error、页面路径可达、e2e 通过 |
| 影响面/交接证据 | 中枢文件标记、改动清单、命令结果、提交/diff、风险与回滚 |
| 执行说明 | 可选，写角色卡引用或关键约束 |

> 大盘主表可以折叠展示上述信息，但活跃任务必须能通过任务描述或交接包完整回答上述字段；缺少主写、写入范围或复核人时不得进入「执行中」。

### 2.5 完成判定（DoD，缺一不可）

1. 改动完成且仅覆盖任务目标。
2. 本地验证通过：`npx vue-tsc --noEmit`；涉及逻辑改另跑 `npm run build`。
3. 不违反第 6 章红线。
4. 文档与索引同步（新增文档已登记 `docs/README.md`）。
5. 在 `docs/records/` 留一条变更记录（日期 + 任务号 + 改了什么 + 怎么验的）。
6. R5 已对绑定版本的 diff 给出 `APPROVE` 或 `APPROVE_WITH_NITS` 且 nits 已处置；不得以执行者自检代替独立复核。
7. 主控智能体已将任务状态置为「已完成」；执行智能体不得自行完成状态翻转。

### 2.6 大盘维护权与任务占用

- `docs/tasks/project-tasks.md` 只由主控智能体写入；其余智能体只读，完成后**回报**主控更新状态，不得自行把卡片改为「待复核/已完成」。
- 任务进入「执行中」前，主控必须登记唯一主写、复核人、执行基线与写入范围；同一文件在同一时段只允许一个主写。
- 需要并行时，优先拆分写入范围；无法拆分则串行。禁止两个智能体在同一工作区同时修改同一文件后再合并。
- 并行会话冲突：以「先写盘者为准」，后者必须 rebase 自身状态变更，禁止整表覆盖；发现任务卡或基线已过期时先停止写入并回报主控。
- 业主可直派治理/文档修订；非主控执行体须在交接包标注「待主控补登」，不得自行写任务大盘或顺带修改业务代码。业务逻辑、中枢文件或契约改动必须先完成任务登记与方案评审。

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

### 3.2 既有目录与受控归位

`docs/api`、`docs/architecture`、`docs/features`、`docs/guides`、`docs/reference`、`docs/archived` **目录名与位置保持不变**（目录名被治理脚本与 CI 硬编码，重命名收益为零且断链风险最高）。新产出按职责归位，属于既有分类的**放回既有分类**。

**受控归位（v1.3 新增）**：允许把**单个**错分类文档从其所在目录迁到职责目录，前提是同时满足以下五项：

1. 迁移理由可一句话说清（「文件职责 ≠ 所在目录职责」），并写进 `docs/records/` 的迁移清单（原路径 → 新路径 → 理由）。
2. 同一批次内完成**全部**引用更新（正文链接、`docs/README.md` 索引、`docs/diagrams/README.md` 清单、治理脚本白名单）。
3. `bash scripts/governance/check-doc-refs.sh --strict` 在批次结束时归 0。
4. 涉及改名时，旧名不得复用；确需保留可发现性时，在原目录留 `MIGRATED.md` 指针。
5. 禁止「为整齐而批量移动整个目录」——只做逐文件归位，且每次归位都要能单独 `git revert`。

> 判定口径：目录级重组按本节五项执行；文件级归位不得以「目录整齐」为唯一理由，必须能指出该文件被放错了哪个目录职责。

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

### 3.5 图表资产：成对、可重制、旧件归档（v1.3 修订）

1. 架构图、UML、时序图、业务流程图、状态机图**一律成对**：`.mmd` 源 + 同名 `.svg` 导出件，两者缺一视为未完成。
2. **正常维护**：修正图内容时**新增版本文件**（`_v2`）并在 `docs/records/` 写明差异与受影响引用；`_v1` 保留。
3. **全量重制（v1.3 新增）**：允许对全部图表做同名重制，条件是：
   - 旧件**整体迁入** `docs/diagrams/_legacy/`，`.mmd` 与 `.svg` 成对保留，**不得删除**；
   - 新版沿用原文件名重写，正文引用路径不变（从而零断链）；
   - `_legacy/` 在 `docs/diagrams/README.md` 登记来源、迁移日期与「历史件，勿引用」标注；
   - 重制后在 `docs/records/` 列出「图名 / 变更要点 / 依据的源码位置」。
4. **禁止**：只为目录整齐而移动图表文件（会打断既有引用）；禁止删除任何历史图。
5. **本仓现状**：`docs/diagrams/` 根下现共 **36 对** = 22 对重制 + 9 对本次新增（分片上传/知识库 SSE/站内信 WS/工作流发起待办/租户套餐能力/通知 SSE/权限三层/上传通道/状态机总览）+ 5 对 `archived-*` 历史证据图（刻意不重制）；被重制的 22 对旧版存于 `docs/diagrams/_legacy/`；`AGENTS.md` §3–§7 与 `README.md` 的「架构概览」仍保留内嵌 Mermaid 编码块，其抽取件与正文引用同步维护。
6. 新增图必须同时提交 `.mmd` 与 `.svg`；`scripts/governance/check-diagram-assets.sh` 校验配对（`_legacy/` 同样要求成对，但单独统计）。

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

执行智能体结束前向主控提交**标准交接包**，不直接修改任务大盘状态。交接包至少包含：

1. 任务号与建议状态（只建议，不翻状态）。
2. 执行基线：分支/worktree、起始提交、最终提交或工作区 diff。
3. 改动清单：逐文件列出新增/修改/删除，并标注是否严格落在写入范围内。
4. 验证证据：命令、退出码/摘要、不可复跑项及其三处交叉证据（记录 / 台账 / 评审）。
5. 风险与回滚：未验证边界、兼容性风险、回滚提交或文件。
6. 下一步建议：待办、阻塞项、范围外发现（只登记建议，不顺带修复）。

主控据此更新任务状态；`docs/records/` 由执行智能体追加事实记录，最终关闭仍由主控完成。缺任一必填项视为未交付。

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

### 4.5 并行编排与写隔离

1. **派单前置**：主控必须先完成任务卡，写明唯一主写、写入范围、执行基线、复核人、依赖/互斥项。缺项时只能规划，不能并行开工。
2. **工作区隔离**：并行任务各自使用独立 worktree，或使用包含任务 ID 的短分支并在独立检出中工作；禁止多个智能体共用同一工作区同时写文件。
3. **文件所有权**：同一时段同一文件只有一个主写。不同任务需要改同一文件时，先拆出接口/契约或串行执行，禁止用「后提交覆盖」解决冲突。
4. **范围守卫**：开工前确认卡片状态、当前分支、基线和干净工作区；结束前用 `git status --short` 和 `git diff --stat` 对照写入范围，范围外改动不得混入。
5. **治理文件加锁**：`AGENTS.md`、本规范、`docs/tasks/project-tasks.md`、角色卡与治理脚本属于高冲突文件；并行任务只读引用，修订必须单独立卡并串行。

### 4.6 独立复核与关闭

1. **复核准入**：全部目标改动完成、本地验证通过、交接包完整、diff 固定在某一提交或工作区快照后，才可进入「待复核」。
2. **独立性**：复核人不得参与该任务的实现或需求拆解；默认由全新上下文的 R5 承担。R3 可先做契约专项复核，再由 R5 做最终放行。
3. **证据绑定**：复核结论必须写清基线、待复核提交/diff、重跑命令和结果；仅写「检查通过」不放行。
4. **结论闭环**：`REQUEST_CHANGES` 由原主写修订并重新提交复核；不得把未处置 nits 标记为完成。只有 R5 `APPROVE`/`APPROVE_WITH_NITS` 且 nits 有处置记录后，主控才能置「已完成」。
5. **不可复跑项**：真实网关、第三方环境等不可复跑证据，至少同时引用变更记录、记忆台账和评审清单；未覆盖边界必须保留在交接包中，不得表述为已验证。

### 4.7 冲突与升级

| 场景 | 动作 |
| --- | --- |
| 任务卡缺失、状态不符或基线过期 | 停止写入，回报主控补卡/重派 |
| 写入范围重叠 | 串行，或拆成接口先行 + 实现后行；不得并行覆盖 |
| 发现范围外问题 | 写入交接包「范围外发现」，由主控另立卡，不顺带修复 |
| 验证失败或环境不可用 | 记录命令、退出码与最小复现；不得以口头判断替代证据 |
| 规则与执行代码冲突 | 技术事实以附录 A/执行代码为准；同时向主控提交规则修订建议 |

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

日常改动统一落在 **`dev`**；`master` 为生产基线，`test` 为验收基线，禁止长期分叉。单智能体任务可在 `dev` 小步提交；多智能体并行任务按 §4.5 使用独立 worktree/短分支，最终合并回 `dev`。远端默认分支仍为 `master`（2026-11-16 已将默认分支从 `main` 切换为 `master` 并删除 `main`）；如需变更默认分支，按 GitHub Settings → General → Default branch 操作并同步本条。

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

### 7.5 目录总览与「一个主题一个家」（2026-11-16 增补）

| 规则 | 内容 |
| --- | --- |
| 唯一索引 | `docs/README.md` 的「🗂 目录总览」是全部一级目录的唯一索引；新增目录必须先登记该表 |
| 必带 README | `docs/` 下每个一级目录必须有 `README.md`（用途 / 收什么 / 不收什么·新去向 / 索引）；`scripts/` 下每个子目录同样必须有 `README.md`，并在 `scripts/README.md` 总索引登记 |
| 同层文档必登记 | 目录内每个 `.md` 必须在**同目录 `README.md`** 出现其文件名（防「只建文件不登记」），由 `check-doc-layout.sh` 第 7 项机器校验 |
| 一个主题一个家 | 架构 → `docs/architecture/`；接口 → `docs/api/`；功能 → `docs/features/`；操作 → `docs/guides/`；测试命令 → `docs/reference/testing.md`；图表源 → `docs/diagrams/` |
| 测试报告分层 | `reports/{e2e,unit,coverage,lighthouse,stress,audit}/`，文件名固定；只有机器可读汇总件入库（见 `reports/README.md`） |
| 根目录洁净 | 根目录只放门面/许可文档；业务 Markdown 一律进 `docs/` |
| 机器校验 | `scripts/governance/check-doc-layout.sh`（`verify-docs.sh` 第 10 项）：一级目录 README、总览覆盖、根目录散落、reports 分层、**scripts 子目录 README、同层文档登记覆盖** |


---

## 8. 工具与脚本

| 脚本 | 作用 | 用法 |
| --- | --- | --- |
| `scripts/governance/verify-docs.sh` | 六目录/索引/任务大盘/私有目录边界/规模快照 | `bash scripts/governance/verify-docs.sh` |
| `scripts/governance/audit-frontend-rules.sh` | 越权 Axios、绕过 `auth.ts`、`: any` 规模、`script setup` 覆盖 | `bash scripts/governance/audit-frontend-rules.sh [--strict]` |
| `scripts/governance/check-doc-refs.sh` | 活文档私有路径残留 + Markdown 断链（含白名单豁免） | `bash scripts/governance/check-doc-refs.sh [--strict]` |
| `scripts/governance/check-diagram-assets.sh` | 图表资产配对：`docs/**/*.mmd` 必须有同名 `.svg` | `bash scripts/governance/check-diagram-assets.sh [--strict]` |
| `scripts/governance/check-doc-layout.sh` | 目录结构：docs 一级目录 README、总览覆盖、根目录散落、reports 分层 | `bash scripts/governance/check-doc-layout.sh [--strict]` |
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

### 9.2 回归证据（2026-11-16 时点快照）

> 本节数值为 v1.0 落地当时的实测值，**不代表现状**。现状口径见 §9.4。

| 项 | 结果（2026-11-16） |
| --- | --- |
| 基线 46 个 docs 文件 | 45 个逐字节一致；`docs/README.md` 纯追加（34 行新增、0 删除） |
| AGENTS.md 原文 | 712 行 / `ae5e19db9675ad33556faae36ea7007fa2011fefa7cdb35ee703bccec49db53a` 一致 |
| 业务代码 | `src/` 与构建配置 0 文件改动 |
| 治理自检 | `verify-docs.sh` 0 问题；`audit-frontend-rules.sh` 无阻断 |
| 技术债实测 | `: any` 51 处（FE-005 三批已收敛至 0）、越权 Axios 0、绕过 `auth.ts` 0 |

### 9.3 未完成与后续

| 项 | 状态 |
| --- | --- |
| FE-005 `: any` 清理 | 待规划，按模块分批 |
| FE-014 规范正文入仓（v1.1） | 已完成（2026-11-16） |
| FE-015 治理评审整改（死指针 1 处 / 断链 3 条 / 规范 §9 范围 / 离线归档条款） | 已完成（2026-11-16，见 `docs/records/2026-11-16-governance-alignment-remediation.md`） |
| 图表基线 | 根下 36 对 `.mmd`+`.svg`（31 现行 + 5 历史证据），`_legacy/` 另存 22 对旧版；「本仓无独立 SVG/MMD」为 2026-11-16 时点陈述，已失效 |
| 插件（OpenAPI/GitHub 等） | 待用户授权后安装，非治理必需 |

### 9.4 现状口径（2026-11-28 实测，FE-033）

| 项 | 结果 | 命令 |
| --- | --- | --- |
| `docs/` 文件总数 | 226（md 110 / svg 58 / mmd 58） | `find docs -type f \| wc -l` |
| 图表资产 | 根下 36 对（31 现行 + 5 历史证据）+ `_legacy/` 22 对旧版 | `bash scripts/governance/check-diagram-assets.sh` |
| 断链 / 私有路径残留 | 0 | `bash scripts/governance/check-doc-refs.sh` |
| 目录结构 | 13 个一级目录 README 齐全且被总览覆盖 | `bash scripts/governance/check-doc-layout.sh` |
| 前端红线 | 无阻断；TS `: any` **0** 处 | `bash scripts/governance/audit-frontend-rules.sh` |
| 单元/组件测试 | 68 文件 / 592 用例全绿 | `npx vitest run` |
| E2E | 6 spec 全绿（接口层打桩） | `npx playwright test` |

---

## 10. 验收清单（复制即用）

```markdown
- [ ] 任务已在大盘登记，优先级 P0–P3，验收标准可执行
- [ ] 活跃卡已写明唯一主写、复核人、执行基线、写入范围、依赖/互斥
- [ ] 改动只覆盖任务目标，无顺手重构
- [ ] 并发任务使用独立 worktree/短分支，文件级写入范围无重叠
- [ ] 新文档已归位六标准目录并登记 docs/README.md
- [ ] 未删除/未覆盖任何既有文档与图表
- [ ] 私有目录未新增业务正文
- [ ] .gitignore 未出现任何忽略 docs 的规则
- [ ] bash scripts/governance/verify-docs.sh 通过
- [ ] bash scripts/governance/audit-frontend-rules.sh 无阻断
- [ ] npx vue-tsc --noEmit 通过（涉及逻辑改动再加 npm run build）
- [ ] docs/records/ 已留变更记录
- [ ] 交接包包含改动清单、命令证据、风险与回滚
- [ ] 独立 R5 已对绑定版本的 diff 给出 APPROVE / APPROVE_WITH_NITS
- [ ] 主控已更新任务状态；执行智能体未自行置「已完成」
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
