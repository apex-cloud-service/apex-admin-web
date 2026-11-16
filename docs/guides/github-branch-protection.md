# GitHub 分支保护规则清单（前端仓）

> **唯一正文**：`apex-scaffold` 仓 `docs/05-operations/github-branch-protection.md`（含完整配置表、网页步骤、`gh api` 命令、开启后的 PR 流程与验收清单）。
> 本文件只记前端仓的差异化要点，避免两处维护出现口径分歧。

## 本仓要点

| 项 | 值 |
| --- | --- |
| 仓库 | `apex-cloud-service/apex-admin-web` |
| 需保护分支 | `master`（生产，远端默认）/ `test`（验收）/ `dev`（只禁强推与删除） |
| 当前保护状态 | **未开启**（`gh auth status` 未登录、匿名 API 403，需网页或 PAT） |
| 网页入口 | `https://github.com/apex-cloud-service/apex-admin-web/settings/branches` |

## 前端特有注意

1. **不要把 `npm run build` 当 status check 直接挂上**：本仓 `build` 含 `vue-tsc --noEmit`，耗时且依赖依赖安装；CI 就绪前只开人工约束。
2. 开启 `master` 保护后，原 `git merge --ff-only dev && git push` 会被拒；改走 PR：`dev → master`，用 **Rebase and merge**（保持线性历史）。
3. 分支保护变更同样要在 `docs/reference/ai-knowledge/04-change-memory.md` 登记（类型=治理）。
