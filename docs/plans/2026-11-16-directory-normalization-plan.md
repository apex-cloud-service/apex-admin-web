# 目录规范化方案（apex-admin-web，2026-11-16）

> 目标：把「智能体目录 / 文档 / 脚本 / 配置 / 测试报告」的保存位置说清并可机器校验。
> 原则：**不删内容、不搬历史正文、不破链接**；用「总览表 + 每个目录 README + 校验脚本」收敛口径。

## 1. 体检结果（改动前实测）

| 对象 | 现状 | 判定 |
| --- | --- | --- |
| `docs/` 一级目录 | 13 个 | 3 个缺 README（`architecture`、`features`、`guides`、`reference` 共 4 个） |
| `docs/README.md` 索引 | 有六标准目录表 + 新增标准目录表 | **缺一份覆盖全部 13 个目录的总览** |
| 根目录 Markdown | `AGENTS.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`MEMORY-CARD.md`、`README.md` | 全是门面文档，合规 |
| `reports/` | 扁平结构：`test-results.xml`、`test-results.json`、`e2e-results.xml` + `coverage/`、`lighthouse/`、`stress/` | 报告文件散在根层，看不出"哪份报告属于哪类测试" |
| `reports/` 入库边界 | `.gitignore` 白名单 4 条（3 个汇总件 + `coverage-summary.json`） | 机制正确，但路径与新结构未对齐 |
| `test-results/`、`logs/`、`dist/` | 未跟踪 | 已忽略，属运行产物 |
| 智能体目录 | `.workbuddy/`（agents/agents.md + memory 2 篇）、AI 会话计划缓存（当时为空，后续正文按治理规范归档） | 已被 `.gitignore` 覆盖，未跟踪；按规范不改他人私有目录 |
| `scripts/` | 8 个子目录，无根级游离脚本 | 合规 |

## 2. 目标结构

```
docs/                       # 13 个一级目录，全部有 README，全部被「🗂 目录总览」覆盖
├── architecture/  api/  features/  guides/  reference/   # 内容型目录（收新内容）
├── diagrams/                                             # 图表资产 .mmd + 同名 .svg（27 对）
├── tasks/ specs/ plans/ records/ reviews/ notes/         # 规范六目录
└── archived/                                             # 归档（只读）

reports/                    # 按测试类型分层，名称固定
├── README.md               # 目录说明（唯一入库的说明件）
├── unit/                   # test-results.xml / test-results.json      （入库）
├── e2e/                    # e2e-results.xml                          （入库）
├── coverage/               # coverage-summary.json（入库） + html/lcov（不入库）
├── lighthouse/             # 性能基线报告（不入库，可重建）
├── stress/                 # 压测结果（不入库，可重建）
└── audit/                  # 依赖审计 HTML（不入库，可重建）
```

## 3. 本轮实际改动

| # | 动作 | 文件 |
| --- | --- | --- |
| 1 | `reports/` 按测试类型分层，3 个已入库报告 `git mv` 到 `e2e/`、`unit/` | `reports/{e2e,unit}/*` |
| 2 | 同步输出路径：Playwright junit、`package.json` 的 `test:report`/`audit`、`normalize-test-report.mjs` | `playwright.config.ts`、`package.json`、`scripts/quality/normalize-test-report.mjs` |
| 3 | `.gitignore` 白名单改为新路径，并放行 `reports/README.md` | `.gitignore` |
| 4 | 新增 `reports/README.md`：子目录/生成命令/是否入库/校验命令 | `reports/README.md` |
| 5 | 补齐 4 个缺失 README（`architecture`、`features`、`guides`、`reference`），每个写「收什么/不收什么/索引/维护约定」 | `docs/*/README.md` |
| 6 | `docs/README.md` 新增「🗂 目录总览」：13 行 × 5 列 + 三条归置规则 | `docs/README.md` |
| 7 | 新增目录结构自检脚本（5 条断言）并接入 `verify-docs.sh` 第 10 项 | `scripts/governance/check-doc-layout.sh`、`verify-docs.sh`、`scripts/governance/README.md §8` |
| 8 | 活文档里的旧报告路径改新路径 | `docs/architecture/overview.md`、`docs/reference/testing.md` |

## 4. 明确「不做」的项与理由

| 未做 | 理由 |
| --- | --- |
| 把 `docs/archived/project-reports/*`（历史测试报告）迁出或改名 | 规范 §3.6：归档不改正文；这些报告里的 `reports/test-results.xml` 属当时快照，已在新 `reports/README.md` 注明"旧路径不作为现状依据" |
| 迁移 `.workbuddy/`、`.zcode/` 等智能体私有目录 | 未跟踪、已忽略；规范 §4.2 禁止跨 AI 改他人私有目录，本轮只做边界校验 |
| 把散落的 `docs/api/*.md` 拆成 per-域子目录 | 当前 40 个 api 文件已有 `docs/api/README.md` 按业务域索引，物理拆分收益低、断链风险高 |
| 删除根目录 `MEMORY-CARD.md` | 属团队约定的门面速查卡（规范 §5.4 引用），保留 |

## 5. 校验（复制即用）

```bash
cd /Users/work/apex-admin-web
bash scripts/governance/check-doc-layout.sh          # 5 条断言
bash scripts/governance/verify-docs.sh               # 10 项，0 问题
bash scripts/governance/check-doc-refs.sh            # 断链 0
bash scripts/governance/check-diagram-assets.sh      # 27/27 配对
npm run build                                        # vue-tsc + vite build
npx playwright test                                  # 12 passed（报告落到 reports/e2e/）
git check-ignore -v reports/e2e/e2e-results.xml      # 确认白名单生效
```
