# reports/（测试与质量报告产出目录）

> 口径：**目录按「测试类型」分层**，文件名固定；只有"机器可读汇总件"入库，其余一律可重建、不入库。

## 目录结构

| 子目录 | 内容 | 生成命令 | 入库 |
| --- | --- | --- | --- |
| `unit/` | Vitest 单测结果：`test-results.xml`（JUnit）、`test-results.json` | `npm run test:report` | **是**（两个文件都在白名单） |
| `e2e/` | Playwright 结果：`e2e-results.xml`（JUnit）；失败截图/录像/追踪在 Playwright 的 `test-results/` 下 | `npx playwright test --reporter=list`（junit 由 `playwright.config.ts` 输出） | **是**（`e2e-results.xml`） |
| `coverage/` | Vite/Vitest 覆盖率：`coverage-summary.json`（汇总）、`index.html`、`lcov.info`、`lcov-report/` | `npm run test:report` / `npm run coverage` | 仅 `coverage-summary.json` |
| `lighthouse/` | 性能基线：`report.report.html`、`report.report.json` | `npm run test:perf` | 否（可重建） |
| `stress/` | 压测结果：`stress-results.json` | `npm run test:stress` | 否（可重建） |
| `audit/` | 依赖安全审计：`audit.html` | `npm run audit` | 否（可重建） |

扁平旧路径（`reports/test-results.xml`、`reports/test-results.json`、`reports/e2e-results.xml`、`reports/audit.html`）已于 2026-11-16 迁入上表子目录；历史文档中出现的旧路径属当时快照，不作为现状依据。

## 为什么分层

1. **可预期的落点**：CI 找单测报告就找 `reports/unit/`，找 E2E 就找 `reports/e2e/`，不用再猜"这次文件名是什么"。
2. **入库边界清晰**：`.gitignore` 只放行三个机器可读汇总件（见上表），避免 HTML/截图/录像把仓库撑大。
3. **可重建**：除白名单外所有产物都能用一条命令重跑出来，不入库不丢证据（执行记录在 `docs/records/`）。

## 校验

```bash
git check-ignore -v reports/e2e/e2e-results.xml   # 应显示「不入忽略」（白名单生效）
git check-ignore -v reports/lighthouse/report.report.html  # 应显示被 reports/* 忽略
```

## 相关文档

- 测试策略与命令全集：[`docs/reference/testing.md`](../docs/reference/testing.md)
- 目录规范：[`docs/README.md`](../docs/README.md)（🗂 目录总览）
