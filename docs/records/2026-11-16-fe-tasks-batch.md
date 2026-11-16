# 前端 7 张待规划卡执行记录与测试报告（FE-001~FE-007）

> 日期：2026-11-16 · 分支：`dev` · 基线：`5b3a9d1`（三支同点）
> 主题：把任务盘 7 张「待规划」卡按「先取证、再落产物」逐张闭环，**不改业务逻辑、不动既有文档正文**。

## 1. 逐卡结果

| 卡 | 结论 | 产物 | 验收证据 |
| --- | --- | --- | --- |
| FE-001 | 复核为**无重复正文**，只补交叉链接 | `docs/notes/2026-11-16-doc-dedup-audit.md`；`03-contract-map.md` §0；`ai-knowledge/README.md` 权威边界 | 段落级 0、行级 0 重复（脚本可复现） |
| FE-002 | 端点与分页口径逐条核对，**发现并更正 1 处文档错误** | `03-contract-map.md` §2.1（逐文件口径表）、§5（核对记录） | 40 个 `src/api/*.ts` 全部有归属小节；12 条高频端点 12/12 一致；办公审批 `records`→`list/total` 按源码更正 |
| FE-003 | 新增 3 个主链路 spec，全量 E2E 转绿 | `e2e/workflow.spec.ts`、`e2e/tenant.spec.ts`、`e2e/office-approval.spec.ts`、`e2e/helpers.ts`（`MENUS_FULL`/`MENUS_WITH_TENANT`） | `npx playwright test --workers=1` → **12 passed（46.5s）**；`reports/e2e-results.xml` |
| FE-004 | 6 个未注册页面中 5 个是子组件，1 个未接线（已删除） | `docs/notes/2026-11-16-orphan-views.md` | 删除后 66 页面 / 60 可路由；`PlatformSelector.vue` 全仓 0 引用，删除后 build 与 E2E 通过 |
| FE-005 | `any` 两批收敛 | `src/mock/index.ts`（新增 `MockRequestOptions`）、`src/utils/xss-protection.ts`（`unknown`） | `: any` 51 → **29**（第一批 51→35，第二批 35→29）；`npm run build` 通过（37.00s） |
| FE-006 | 私有目录指针桩已清 | 删除 WorkBuddy 知识目录与 ZCode 计划目录下的 2 个 `MIGRATED.md` 指针桩 | 两私有目录已空；全仓无指向私有目录的链接（历史正文提及按 §3.6 豁免） |
| FE-007 | 无独立图表资产，无孤立文件 | `docs/notes/2026-11-16-chart-assets.md` | `docs` 内 `.mmd` 0、`.svg` 0；Mermaid 内嵌 27 处 / 8 篇 |

## 2. 测试报告

### 2.1 类型与构建

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 + 构建 | `npm run build` | ✅ 通过（`vue-tsc --noEmit` 0 error；vite build 39.75s） |
| `any` 收敛 | `grep -rn ": any" --include=*.ts --include=*.vue src \| wc -l` | 51 → **35**（mock 13 处 + xss 3 处清零） |

### 2.2 E2E（真实浏览器 + 接口打桩，不依赖后端）

| spec | 用例数 | 结果 |
| --- | --- | --- |
| `auth.spec.ts` | 3 | ✅ |
| `dynamic-menu.spec.ts` | 2 | ✅ |
| `token-refresh.spec.ts` | 1 | ✅ |
| `workflow.spec.ts`（新增） | 2 | ✅ |
| `tenant.spec.ts`（新增） | 2 | ✅ |
| `office-approval.spec.ts`（新增） | 2 | ✅ |
| **合计** | **12** | **12 passed（46.5s）** |

- 报告文件：`reports/e2e-results.xml`（junit，配置见 `playwright.config.ts`）。
- 运行口径：默认并行（`fullyParallel`）已稳定——`playwright.config.ts` 把 `expect.timeout` 放宽到 15s 并开启 `retries: 1`，连续两轮并行均 **12 passed**（40.5s / 37.4s）；串行 `--workers=1` 亦 12 passed，作为排障基线保留。

## 3. 未做与不做（如实记录）

| 项 | 状态 | 原因 |
| --- | --- | --- |
| `PlatformSelector.vue` 处置 | **已删除**（第二批） | 0 引用；git 历史可恢复（`git checkout 21b999b -- <path>`），删除后 build/E2E 均通过 |
| `any` 剩余 29 处 | 未清零 | 集中在 `views/**` 模板与组件 props（`office/document`、`office/calendar`、`office/bindings`、`workflow/TaskActions`、`validate-rules.ts` 等），改动面涉及表单绑定；按批推进，每批跑 `npm run build` |
| 图表 `.mmd`/`.svg` 导出 | 不适用 | 前端仓无该资产形态（内嵌 Mermaid） |
| 业务代码改动 | **零** | 本轮仅类型声明、测试与文档；`src` 下业务页面未改一行 |

## 4. 复核命令（可直接复制）

```bash
cd /Users/work/apex-admin-web
git log --oneline -3
grep -rn ": any" --include=*.ts --include=*.vue src | wc -l
npm run build
npx playwright test --workers=1 --reporter=list
ls .workbuddy/knowledge .zcode/plans 2>/dev/null
```
