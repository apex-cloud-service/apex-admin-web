# GitHub 分支保护规则清单（前端仓）

> **唯一正文**：`apex-scaffold` 仓 `docs/05-operations/github-branch-protection.md`（含完整配置表、网页步骤、`gh api` 命令、开启后的 PR 流程与验收清单）。
> 本文件只记前端仓的差异化要点，避免两处维护出现口径分歧。

## 本仓要点

| 项 | 值 |
| --- | --- |
| 仓库 | `apex-cloud-service/apex-admin-web` |
| 需保护分支 | `master`（生产，远端默认）/ `test`（验收）/ `dev`（只禁强推与删除） |
| 当前保护状态 | **不可开启（平台限制）**：本仓 private + 账户 Free，`PUT /branches/*/protection` 返回 `403 Upgrade to GitHub Pro or make this repository public`；已加 `.githooks/pre-push` 本地守护（拒绝强推/删除 dev·master·test） |
| 网页入口 | `https://github.com/apex-cloud-service/apex-admin-web/settings/branches` |

## 前端特有注意

1. **不要把 `npm run build` 当 status check 直接挂上**：本仓 `build` 含 `vue-tsc --noEmit`，耗时且依赖依赖安装；CI 就绪前只开人工约束。
2. 开启 `master` 保护后，原 `git merge --ff-only dev && git push` 会被拒；改走 PR：`dev → master`，用 **Rebase and merge**（保持线性历史）。
3. 分支保护变更同样要在 `docs/reference/ai-knowledge/04-change-memory.md` 登记（类型=治理）。

## 平台限制说明（2026-11-16 实测）

服务端分支保护在「private + GitHub Free」下不可用，与凭据无关（已用 `gh`（`anqli8341`/`repo`）实测六次全部 403）。解锁方式二选一：**转公开** 或 **升级 Pro/Team**；升级后按后端 `docs/05-operations/github-branch-protection.md` §3 命令一次性配置。

当前补偿是本地 `.githooks/pre-push`：拒绝强推与删除三支，快进推送与普通分支放行；`git push --no-verify` 可绕过，须业主授权并留痕。**钩子只约束本机，无法阻止他人从其他克隆强推。**
