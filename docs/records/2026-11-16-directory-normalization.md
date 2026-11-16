# 执行记录：目录规范化（apex-admin-web，2026-11-16）

> 任务卡 FE-025 · 分支 `dev` · 方案 [`docs/plans/2026-11-16-directory-normalization-plan.md`](../plans/2026-11-16-directory-normalization-plan.md)
> 结论：**测试报告按类型分层落地 + 文档目录入口补齐 + 结构可机器校验**；不搬历史正文、不删内容。

## 1. 改动清单

| # | 文件 | 动作 |
| --- | --- | --- |
| 1 | `reports/e2e/e2e-results.xml` | 由 `reports/e2e-results.xml` `git mv` 迁入 |
| 2 | `reports/unit/test-results.xml`、`reports/unit/test-results.json` | 由 `reports/` 根层 `git mv` 迁入 |
| 3 | `reports/README.md` | 新建：6 个子目录 × 生成命令 × 是否入库 + 校验命令 |
| 4 | `playwright.config.ts` | junit 输出改 `reports/e2e/e2e-results.xml` |
| 5 | `package.json` | `test:report` 的 junit/json 改 `reports/unit/`；`audit` 改 `reports/audit/audit.html` |
| 6 | `scripts/quality/normalize-test-report.mjs` | 归一化目标路径改 `reports/unit/` |
| 7 | `.gitignore` | 白名单改新路径，并放行 `reports/README.md` |
| 8 | `docs/{architecture,features,guides,reference}/README.md` | 新建（收什么/不收什么/索引/维护约定） |
| 9 | `docs/README.md` | 新增「🗂 目录总览」13 行 + 三条归置规则 |
| 10 | `scripts/governance/check-doc-layout.sh` | 新建：5 条断言（docs README / 白名单 / 总览覆盖 / 根目录洁净 / reports 分层） |
| 11 | `scripts/governance/verify-docs.sh`、`README.md §8` | 接入第 10 项 + 说明 |
| 12 | `docs/architecture/overview.md`、`docs/reference/testing.md` | 旧报告路径改新路径（活文档） |
| 13 | `docs/plans/README.md` | 登记本方案 |

## 2. 验收证据

```bash
bash scripts/governance/check-doc-layout.sh     # 5 项全 OK（13 个 docs 目录 README 齐全、总览覆盖、reports 分层）
bash scripts/governance/verify-docs.sh          # 10 项 0 问题
bash scripts/governance/check-doc-refs.sh       # 断链 0
bash scripts/governance/check-diagram-assets.sh # 27/27 配对
npm run build                                   # vue-tsc --noEmit && vite build 通过（46.50s）
npx playwright test                             # 12 passed；junit 落到 reports/e2e/e2e-results.xml
```

## 3. 入库边界（改后）

| 文件 | 入库 | 理由 |
| --- | --- | --- |
| `reports/e2e/e2e-results.xml` | 是 | E2E 汇总，CI/趋势对比用 |
| `reports/unit/test-results.xml`、`.json` | 是 | 单测汇总，机器可读 |
| `reports/coverage/coverage-summary.json` | 是 | 覆盖率汇总 |
| `reports/README.md` | 是 | 目录说明（白名单显式放行） |
| 其余（html/lcov/截图/录像/压测原始） | 否 | 可重建，避免仓库膨胀 |

## 4. 未做与原因

| 未做 | 原因 |
| --- | --- |
| 改归档报告里的旧路径 | `docs/archived/` 是历史快照，规范 §3.6 不改正文；新 `reports/README.md` 已注明旧路径不作现状依据 |
| 迁移 `.workbuddy/`、`.zcode/` | 未跟踪、已忽略；规范 §4.2 禁止跨 AI 改他人私有目录 |
| 拆分 `docs/api/*.md` 为子目录 | 已有按业务域的 `docs/api/README.md` 索引，物理拆分收益低、断链风险高 |

## 5. 影响面

- 业务代码：**零改动**（只改测试报告输出路径与测试配置，`src/` 未动）。
- 自动化：E2E/单测命令不变；产物路径变更已同步 README、`testing.md`、`overview.md`。
