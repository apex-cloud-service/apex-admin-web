# scripts/（脚本总索引）

> 本目录存放构建、治理、测试、联调、验证类脚本。**业务文档不放这里**（按治理规范第 0.2 节一律进 `docs/`）。
> 脚本改动（改名/移动/改参数）必须同步：本表 + 引用方（`package.json`、`.github/workflows/ci.yml`、`.githooks/*`、其他脚本内部互引）+ `docs/reference/testing.md` 或 `docs/guides/deployment.md`。

## 目录一览

| 目录 | 职责 | 入口/如何被调用 | 详见 |
| --- | --- | --- | --- |
| `build/` | 前端镜像构建（Podman + `Containerfile`） | 手动执行 | [build/README.md](./build/README.md) |
| `database/` | 菜单 SQL 手动补充（**非后端 Flyway 正式种子**） | 手动执行 | [database/README.md](./database/README.md) |
| `dev/` | 开工/提交前一键预检 | 手动执行 | [dev/README.md](./dev/README.md) |
| `governance/` | 文档治理与前端红线静态自检 + 自测 | CI（`--strict`）、`.githooks/*`、手动 | [governance/README.md](./governance/README.md) |
| `integration/` | API 路由静态审计 + Podman Compose 联调冒烟 | 手动执行 | [integration/README.md](./integration/README.md) |
| `performance/` | Lighthouse / 压测 / 预览服务 | `npm run test:perf`、`npm run test:stress` | [performance/README.md](./performance/README.md) |
| `quality/` | 注释规范检查、测试报告归一化 | `npm run check:comments`、`npm run test:report` | [quality/README.md](./quality/README.md) |
| `security/` | 依赖安全扫描 | 手动执行 | [security/README.md](./security/README.md) |
| `verify/` | 上线后端到端验证 | `npm run verify:deploy` | [verify/README.md](./verify/README.md) |

## 快速索引：按场景找脚本

| 我要…… | 用这个 | 命令 |
| --- | --- | --- |
| 开工前确认分支/工作区/台账正常 | `dev/apex-preflight.sh` | `bash scripts/dev/apex-preflight.sh` |
| 提交前检查文档治理 | `governance/verify-docs.sh` | `bash scripts/governance/verify-docs.sh` |
| 检查文档断链 | `governance/check-doc-refs.sh` | `bash scripts/governance/check-doc-refs.sh` |
| 检查图表 `.mmd`↔`.svg` 配对 | `governance/check-diagram-assets.sh` | `bash scripts/governance/check-diagram-assets.sh` |
| 检查 docs 目录结构（README/总览/根目录/reports 分层） | `governance/check-doc-layout.sh` | `bash scripts/governance/check-doc-layout.sh` |
| 检查变更台账是否同步 | `governance/check-memory-sync.sh` | `bash scripts/governance/check-memory-sync.sh` |
| 扫描前端红线（越权 Axios / 绕过 auth.ts / `: any` / script setup） | `governance/audit-frontend-rules.sh` | `bash scripts/governance/audit-frontend-rules.sh` |
| 检查注释规范 | `quality/check-comments.mjs` | `npm run check:comments` |
| 构建前端镜像 | `build/build-image.sh` | `bash scripts/build/build-image.sh --tag v1.2.0` |
| 静态审计前端 API 与后端路由 | `integration/api-route-audit.mjs` | `node scripts/integration/api-route-audit.mjs` |
| 起 Podman Compose 联调冒烟 | `integration/podman-verify.sh` | `bash scripts/integration/podman-verify.sh` |
| Lighthouse 性能基线 | `performance/perf-check.mjs` | `npm run test:perf` |
| 静态服务压测 | `performance/stress-test.mjs` | `npm run test:stress` |
| 依赖安全审计 | `security/security-scan.sh` 或 `npm run audit` | 见脚本说明 |
| 上线后端到端验证 | `verify/post-deploy-check.sh` | `BASE_URL=... npm run verify:deploy` |

## 通用约定

1. **退出码**：治理类脚本默认「只警告」（exit 0），加 `--strict` 才在有问题时 exit 1；CI 全部用 `--strict`。
2. **工作目录**：脚本自行 `cd` 到仓库根，可从任意目录调用。
3. **路径引用**：脚本内部引用其他脚本一律用相对仓库根的路径（`scripts/<dir>/<file>`），移动文件必须同步全部引用。
4. **不入库产物**：脚本产出的报告写 `reports/`（仅有白名单机器可读件入库，见 `reports/README.md`）。
5. **不写入业务正文**：任何脚本都不得把说明写进 `docs/` 之外的受控文档目录。

---

**最后更新**：2026-11-28（FE-033：补总索引与 7 个子目录 README）