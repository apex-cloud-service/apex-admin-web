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

| # | 类型 | 摘要 | 提交 | 证据 / 影响面 |
| --- | --- | --- | --- | --- |
| 1 | 治理 | **§5.3 离线归档命令修正**：`tar .` → `git archive --format=tar.gz --prefix=apex-admin-web/ -o ... <branch>` + `git bundle create` + `shasum -a 256`；写明禁用 `tar .` 的理由（会把 `node_modules`/`dist` 打进包） | `73b714f` | 实测归档产物前端 tar 932K / bundle 1.5M；源文件零改动 |
| 2 | 远端 | **GitHub 远端接入**：地址改 `git@github.com:apex-cloud-service/apex-admin-web.git`（原 `anqli@outlook.com:` 会被解析成主机名）；22 端口被拦 → `core.sshCommand "ssh -o Hostname=ssh.github.com -p 443"`；带口令私钥 → ssh-agent 载入后认证通过（账号 `anqli8341`） | `edc6877` | 三障碍实测；记录副本 `docs/records/2026-11-16-github-remote-onboarding.md`（唯一正文在后端仓） |
| 3 | 治理 | 规范 §5.3 同步远端现状（origin、443、口令私钥、远端已有历史合并口径） | `edc6877` | 规范 §5.3 全文；`verify-docs.sh` 0 项 |
| 4 | 远端 | 远端 `Initial commit`（`b613564`，仅 `LICENSE`+`README` 桩）与本地无共同祖先 → `git merge --allow-unrelated-histories`；`README.md` 冲突保留本地完整版（242 行） | `dce7aa0` | 合并提交；`wc -l README.md` → 242；**未使用 `push -f`** |
| 5 | 文档 | 补推送实测结果：`b613564..dce7aa0  main -> main`，并刷新记录副本 | `71295b9` | `git ls-remote origin` 与本地 HEAD 一致 |
| 6 | 许可 | **许可证统一为 MIT**：合并时带入的 GitHub 模板 Apache 2.0 被替换为 MIT（`Copyright (c) 2026 Apex Admin Web Contributors`），`package.json` 增 `"license": "MIT"`；选型依据（MIT vs Apache 2.0 对比表）见后端记录 §6 | `029797d` | `head -2 LICENSE` → `MIT License`；JSON 校验通过；**不改任何页面与接口** |
| 7 | 分支 | `main` → `master`：`git branch -m main master` + `git push -u origin master`；远端默认分支切到 `master` 后 `git push origin --delete main` 成功 + `git fetch --prune`；规范 §5.3 与记录副本同步 `master` 口径 | `88ca2d1` | `git ls-remote origin` 现仅 `dev/master/test`；历史零改写 |
| 8 | 分支 | **新建 `dev` / `test`**（自 `master`），推送并建立跟踪，三支同点 | `c3802d7` | `git branch -vv` → 三支分别跟踪 `origin/dev`、`origin/test`、`origin/master` |
| 9 | 治理 | **`dev` 设为默认工作分支**：规范 §5.3 分支模型表改为 `dev` 默认、`master` 仅接受从 `dev` 合入、`test` 仅由 `dev` 合入；写明开工自检与合入命令；本地切 `dev` | `9931af3` | `git checkout dev` + `git pull --ff-only`；该规则更新本身即首个 `dev` 提交 |
| 11 | 脚本 | 新增 `scripts/governance/check-memory-sync.sh`（校验暂存改动是否含台账、提交信息是否带 `memory:` 标记；默认只告警，`--strict` 才 exit 1），接入 `.githooks/pre-commit` 第 0 步与新增的 `.githooks/commit-msg`；`scripts/governance/README.md` 增 §6 说明 | 本条提交 | `bash scripts/governance/check-memory-sync.sh` 实测输出；警告模式，不影响构建与页面 |
| 10 | 文档 | 本篇 `04-change-memory.md` 建立 + 规范 §5.4「记忆文档同步（强制）」+ `MEMORY-CARD.md`/`README.md` 索引同步 | 本条提交 | 本文件；`grep -n "5.4 记忆文档同步" docs/specs/project-governance.md` |
| 12 | 脚本 | **更正 #11**：`check-memory-sync.sh` 首版在 macOS bash 3.2 下报 `MEM_NAME: unbound variable` —— 变量紧跟中文全角括号时被并入变量名；改为 `${MEM_NAME}` 后复测通过（`OK：本次提交已登记记忆台账（04-change-memory.md）`）。**结论：脚本里变量后接非 ASCII 字符一律写 `${VAR}`** | 本条提交 | 修复后实测两条路径（未登记→告警 / 已登记→OK）均正常 |
| 13 | 分支 | **`master` / `test` 快进到 `dev`**：`git checkout master && git merge --ff-only dev && git push`、`test` 同款、随后回 `dev`；三支最终同指一个提交，内容零差异 | 本条提交 | `git rev-list --count master..dev` → 0；`git rev-parse dev`/`master`/`test` 三者相同；快进推送（非强推、未 `reset --hard`） |
| 14 | 治理 | **安装 Skill 与 Agent**：用户级 Skill `apex-admin-web-frontend`、`apex-governance-ops`（`/Users/eric/DoubaoWork/skills/`，不入库）；本仓新增 `.workbuddy/agents/{frontend-expert,qa-engineer,release-guardian}.md`；新增 `05-agent-tooling.md` 登记清单；插件市场无匹配 → 用仓内脚本替代 | 本条提交 | `ls .workbuddy/agents/` 三份；`ls /Users/eric/DoubaoWork/skills/apex-admin-web-frontend/SKILL.md`；不影响构建与页面 |
| 15 | 脚本 | **新增一键预检 `scripts/dev/apex-preflight.sh`**（与后端同款，自动识别前端仓）：检查分支=dev、工作区、远端对齐、附录 A 哈希、origin 与 SSH 443、记忆台账、治理脚本及自检、node 与 `build` 脚本、三支一致性 | 本条提交 | 实测 `OK=16 WARN=1 FAIL=0`；只读脚本，不改文件 |
| 16 | 治理 | **分支保护清单** `docs/guides/github-branch-protection.md`（唯一正文在后端 `docs/05-operations/`）：`master`/`test` 禁直推/禁强推/禁删除 + 线性历史；`dev` 只禁强推与删除；本仓特有注意：**不要**把 `npm run build`（含 vue-tsc）挂成 status check；规范 §5.3 增指引 | 本条提交 | 匿名 API 403、`gh` 未登录 → 需网页或 PAT 开启 |
| 17 | 治理 | **`dev` 分支治理一致性评审（前端）**：本仓判定表、偏差归属 D-02/D-03/D-04/D-06/D-07/D-08、允许差异（无编号目录）、前端特有注意（不挂 `npm run build` 为 status check）；唯一正文在后端 `docs/reviews/` | 本条提交 | 实测：无 `.github`（无 CI）、`AGENTS.md` 第 0 章缺台账/分支条款、任务盘止于 FE-015、`.gitignore` 四组重复；`verify-docs`/`check-doc-refs` 均 0 项、红线无阻断 |
| 18 | 治理 | **整改 B1+B2（关闭 D-03/D-08/D-04）**：`AGENTS.md` 第 0 章新增 `0.8 记忆台账、分支模型与工具链`；规范 §5.3 默认分支改为既成事实；知识库 README 增加「维护口径」（台账强制登记、其余为派生视图）；任务盘补 FE-016~FE-021 | 本条提交 | 验收：`tail -n 712 AGENTS.md \| shasum -a 256` = `ae5e19db…53a` **不变**；任务盘 6 列对齐 |
| 19 | 脚本 | **整改 B5（关闭 D-06）**：`.gitignore` 合并重复项为单一「AI 私有目录」区块（9 类各 1 条带注释），移除工具链段重复目录与重复构建产物 | 本条提交 | 验收：去重检查为空；`git check-ignore docs/README.md` 无命中；`verify-docs` 0 项 |
| 20 | 治理 | **整改 B3（关闭 D-02）**：新增 `.github/workflows/ci.yml`（`docs-and-rules` job 跑 4 个治理脚本 + `build` job 跑 `npm ci && npm run build`），触发 `master/test/dev`、PR `master/test`、支持手动触发 | 本条提交 | 验收：`ruby -ryaml` 解析通过；本地预演 4 个治理脚本全通过；首次推送 `dev` 即验证触发 |

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
