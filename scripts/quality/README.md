# scripts/quality（质量检查与报告归一化）

## 文件与入口

| 文件 | 作用 | 入口 | 退出码 |
| --- | --- | --- | --- |
| `check-comments.mjs` | 注释规范检查（只读）：`.ts` 首个非空行 / `.vue` 顶部 HTML 注释或 `script` 首行注释是否有；正则命中的导出声明前是否有注释 | `npm run check:comments` | 0 通过 / 1 有违规 |
| `normalize-test-report.mjs` | 测试报告归一化：把绝对路径改相对、JUnit `hostname` 统一 `localhost`、覆盖率摘要键去机器路径 | 由 `npm run test:report` 末尾调用 | 0 |

## check-comments 的能力边界（务必知悉）

- **只检查注释是否存在**，不解析标签、参数或内容真实性。
- 通过 ≠ 注释与实现一致；注释与代码是否同步需人工评审（历史做法见 `docs/records/2026-11-18-comment-quality-audit.md`）。
- `.vue` 接受顶部 HTML 注释**或** `script` 首行注释，不要求完整 JSDoc。

## normalize-test-report 的处理范围

| 处理 | 说明 |
| --- | --- |
| 绝对路径 → 相对路径 | 仅处理**当前仓库根**前缀，其他机器/仓库外路径不动 |
| JUnit `hostname` | 统一替换为 `localhost`（避免泄露主机名并消除跨机 diff） |
| 覆盖率摘要键 | 绝对路径键改相对路径键 |
| 时间戳 | **保留**（记录本次执行时刻） |

## 为什么需要归一化

Vitest 的 JUnit/JSON 与 v8 覆盖率摘要默认写入绝对路径、主机名与随机时间段。直接提交会泄露本机目录结构，并在不同机器执行时产生无意义 diff。归一化后机器可读汇总件才适合入库（白名单见 `reports/README.md`）。

## 关联

- [docs/reference/comment-style.md](../../docs/reference/comment-style.md)
- [reports/README.md](../../reports/README.md)
- [AGENTS.md 附录 A §9](../../AGENTS.md)（命令表）