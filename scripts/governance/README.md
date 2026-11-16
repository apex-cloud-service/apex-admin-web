# 治理脚本说明（apex-admin-web）

本目录脚本是「项目任务管理规范」的执行工具，**只读扫描、不改代码、默认只警告**。
规范正文见 `docs/specs/project-governance.md`。

## 1. verify-docs.sh — 文档治理自检

```bash
bash scripts/governance/verify-docs.sh            # 警告模式，永远 exit 0
bash scripts/governance/verify-docs.sh --strict   # 有问题 exit 1（可接 CI）
```

检查项：

| # | 检查 | 判据 |
| --- | --- | --- |
| 1 | 六标准目录与索引 | `docs/{tasks,specs,plans,records,reviews,notes}` 及各自 `README.md` 存在 |
| 2 | 任务大盘口径 | `docs/tasks/project-tasks.md` 含 `P0–P3`、`待规划`、`FE-` |
| 3 | 治理规范 | `AGENTS.md` 含第 0 章；`docs/README.md` 含治理索引 |
| 4 | 私有目录边界 | `.workbuddy/knowledge`、`.zcode/plans` 等不得存放 >12 行业务正文（`MIGRATED.md` 除外） |
| 5 | 文档规模快照 | 输出 `docs` 文件数与 md/svg/mmd 数量（图表为 `.mmd` + 同名 `.svg`，见 `docs/diagrams/`） |
| 6 | 迁入索引可达 | `docs/reference/ai-knowledge/README.md`、`docs/archived/ai-sessions/zcode-plans/README.md` 存在 |
| 9 | 图表资产配对 | 调 `check-diagram-assets.sh`；`.mmd` 必须有同名 `.svg`（27/27） |

## 2. audit-frontend-rules.sh — 前端红线扫描

```bash
bash scripts/governance/audit-frontend-rules.sh           # 默认警告
bash scripts/governance/audit-frontend-rules.sh --strict   # 有阻断项 exit 1
```

检查项：

| # | 检查 | 说明 |
| --- | --- | --- |
| 1 | 越权 Axios 实例 | `axios.create(` 仅允许出现在 `src/utils/request.ts` |
| 2 | 会话键绕过 | 只查 `localStorage/sessionStorage.(get|set|remove)Item('access_token')`；OAuth2 协议字段名不计入 |
| 3 | `: any` 规模 | 输出命中数（技术债指标，登记 FE-005） |
| 4 | `<script setup>` 覆盖 | `src` 下 `.vue` 未使用 `script setup` 即命中（`App.vue` 豁免） |
| 5 | 死代码注释抽样 | 前 10 条，人工确认 |

已知指标（2026-11-16 第三批）：越权 Axios 0、会话键绕过 0、**`: any` 0 处（仅 CSS `overflow-wrap: anywhere` 会被字面匹配，用 `grep -rnE ": any\b"` 可排除）**、全部 `.vue` 已用 `script setup`。

## 3. 与 pre-commit 的关系

`.githooks/pre-commit` 在提交涉及 `docs/`、`AGENTS.md`、`scripts/governance/`、`.githooks/` 时自动跑 `verify-docs.sh`，
另做「图表删除告警」与「>5MB 大文件提醒」。**永不阻断提交**。

```bash
git config core.hooksPath .githooks   # 每人执行一次
git config --unset core.hooksPath     # 临时关闭
```

## 4. 约定

1. 脚本不得修改仓库文件；只允许读与打印。
2. 新增检查项必须同步更新本 README 与 `docs/specs/project-governance.md` §8。
3. macOS 自带 bash 3.2：避免 `case ... ;;` 嵌在命令替换里；变量紧跟中文标点时用 `${VAR}`。
## 5. `check-doc-refs.sh`（活文档指针自检，2026-11-16 新增）

| 项 | 说明 |
| --- | --- |
| 检查 1 | 受控 Markdown 中是否仍指向 AI 私有目录（`.workbuddy/knowledge|reports/`、`.zcode/plans/`、`.trae/documents/`） |
| 检查 2 | Markdown 相对链接是否可达（目标是 `.md` 文件的相对链接） |
| 豁免 | ① `docs/_archive/` 前缀整体豁免 ② `doc-refs-allowlist.txt` 列出的文件 ③ 行内含「原文未入库」 |
| 接入 | `verify-docs.sh` 第 8 项 |
| 严格模式 | `bash scripts/governance/check-doc-refs.sh --strict` |

**为什么新增**：跨仓指针（`apex-scaffold/.trae/documents/...`）失效、`docs/archived/` 相对层级写错，旧自检都发现不了。


## 6. `check-memory-sync.sh`（记忆台账同步校验，2026-11-16 新增）

| 项 | 说明 |
| --- | --- |
| 目的 | 强制「任何改动都写入记忆台账」，落实规范 §5.4 |
| 查什么 | ① 本次暂存改动里是否包含记忆台账 `docs/reference/ai-knowledge/04-change-memory.md`（后端仓为 `07-change-memory.md`，脚本自动探测）② 提交信息是否带 `memory:` 标记 |
| 阻断 | 默认**只告警**（exit 0），`--strict` 才 exit 1 |
| 接入点 | `.githooks/pre-commit` 第 0 步（所有提交都跑）+ `.githooks/commit-msg`（校验提交信息） |
| 例外 | 纯机械改动（格式化、改错字）在提交信息写 `memory: n/a（原因）` |

```bash
bash scripts/governance/check-memory-sync.sh
bash scripts/governance/check-memory-sync.sh --msg "$(cat .git/COMMIT_EDITMSG)"
bash scripts/governance/check-memory-sync.sh --strict            # CI 用，缺登记即失败
```

## 7. `check-diagram-assets.sh`（图表资产配对，2026-11-16 第三批新增）

| 项 | 说明 |
| --- | --- |
| 目的 | 落实 FE-007：`docs/` 下每张 Mermaid 图都必须「`.mmd` 源 + 同名 `.svg` 导出件」成对存在 |
| 查什么 | 遍历 `docs/**/*.mmd`，`${f%.mmd}.svg` 不存在即记为缺口 |
| 输出 | `mmd 总数 N · 缺失 M`；缺失逐条打印 `[MISS]` |
| 阻断 | 默认警告（exit 0），`--strict` 有缺口 exit 1 |
| 接入 | `verify-docs.sh` 第 9 项；`.githooks/pre-commit` 间接覆盖 |

```bash
bash scripts/governance/check-diagram-assets.sh            # 警告
bash scripts/governance/check-diagram-assets.sh --strict   # CI
```

重新导出（`mmdc` 10.9.1）：

```bash
for f in docs/diagrams/*.mmd; do
  npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i "$f" -o "${f%.mmd}.svg" -b white
done
```

> 命名规则、27 张清单与两个已踩过的语法坑（边标签 `|`、节点标签 `${}`/`/` 开头）见 `docs/diagrams/README.md`。

## 8. `check-doc-layout.sh`（目录结构规范化自检，2026-11-16 新增）

| 断言 | 内容 |
| --- | --- |
| 1 | `docs/` 下 13 个一级目录**都有 `README.md`** |
| 2 | 一级目录在脚本 `EXPECTED` 白名单内（新增目录要同步脚本） |
| 3 | `docs/README.md` 的「🗂 目录总览」覆盖全部一级目录 |
| 4 | 仓库根目录无散落业务 Markdown（白名单：门面 + 许可） |
| 5 | `reports/` 已按测试类型分层（`e2e`/`unit`/`coverage`/`lighthouse`/`stress`）+ `reports/README.md` 存在（`audit` 可选） |
| 阻断 | 默认警告（exit 0），`--strict` 有问题 exit 1 |
| 接入 | `verify-docs.sh` 第 10 项 |

```bash
bash scripts/governance/check-doc-layout.sh            # 明细
bash scripts/governance/check-doc-layout.sh --strict   # CI
```
