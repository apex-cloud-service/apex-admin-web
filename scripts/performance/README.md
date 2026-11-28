# scripts/performance（性能与压测）

## 用途

在**构建产物的 `vite preview` 服务**上跑性能与承载基线。二者共用 `preview-server.mjs` 启动/轮询/清理 preview 进程。

## 文件与入口

| 文件 | 作用 | 入口 | 产物 |
| --- | --- | --- | --- |
| `preview-server.mjs` | 共用编排：子进程启动 `vite preview` 并轮询就绪（30s 截止），调用方负责 kill | 被下面两者 import | — |
| `perf-check.mjs` | Lighthouse desktop 预设，四类得分摘要 | `npm run test:perf`（内部先 `vite build`） | `reports/lighthouse/report.html` + `report.json` |
| `stress-test.mjs` | autocannon 两档并发：首页 HTML（50 并发 × 15s）、最大 JS 产物（100 并发 × 15s） | `npm run test:stress` | `reports/stress/stress-results.json` |
| `lighthouse-test.sh` | Lighthouse 的 shell 版（可指定任意 URL） | 手动：`bash scripts/performance/lighthouse-test.sh [url]` | `reports/lighthouse/report.*` |

端口可用 `PERF_PORT` 覆盖（默认 4173，与开发 5173 隔离）。

## 口径说明（重要）

- **无后端环境**：API 请求失败会影响 TTI/SEO 等指标，结果只能作为**静态资源加载性能基线**，不能当作业务可用性结论。
- **压测范围**：只压前端静态服务（HTML + 缓存资产）。**业务接口压测属后端/网关范畴**，本仓库不提供。
- `preview-server.mjs` 的 30s 是轮询截止而非硬超时；单次 `fetch` 无超时，不保证进程树严格退出。

## 退出码

沿用被调用脚本：Lighthouse / autocannon 失败即非零；正常完成 exit 0。

## 报告入库规则

`reports/lighthouse/*`、`reports/stress/*` **不入库**（可由命令重建）。仅 `reports/README.md` 与白名单机器可读汇总件入库，见 [reports/README.md](../../reports/README.md)。

## 关联

- [docs/reference/testing.md](../../docs/reference/testing.md)
- [AGENTS.md 附录 A §9](../../AGENTS.md)（命令表；注意其历史数字以第 0.10 节勘误为准）