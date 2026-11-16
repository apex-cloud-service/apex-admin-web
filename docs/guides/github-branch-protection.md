# GitHub 分支保护规则清单（前端仓）

> **唯一正文**：`apex-scaffold` 仓 `docs/05-operations/github-branch-protection.md`（含完整配置表、网页步骤、`gh api` 命令、开启后的 PR 流程与验收清单）。
> 本文件只记前端仓的差异化要点，避免两处维护出现口径分歧。

## 本仓要点

| 项 | 值 |
| --- | --- |
| 仓库 | `apex-cloud-service/apex-admin-web` |
| 需保护分支 | `master`（生产，远端默认）/ `test`（验收）/ `dev`（只禁强推与删除） |
| 当前保护状态 | **已开启（档 1，三支全覆盖）**：`master`/`test`/`dev` 均禁强推 + 禁删除，`master`/`test` 另加要求对话解决（2026-11-16 转 public 后写入并回读验证） |
| 网页入口 | `https://github.com/apex-cloud-service/apex-admin-web/settings/branches` |

## 前端特有注意

1. **不要把 `npm run build` 当 status check 直接挂上**：本仓 `build` 含 `vue-tsc --noEmit`，耗时且依赖依赖安装；CI 就绪前只开人工约束。
2. 开启 `master` 保护后，原 `git merge --ff-only dev && git push` 会被拒；改走 PR：`dev → master`，用 **Rebase and merge**（保持线性历史）。
3. 分支保护变更同样要在 `docs/reference/ai-knowledge/04-change-memory.md` 登记（类型=治理）。

## 平台限制说明与最终结论（2026-11-16）

服务端分支保护在「private + GitHub Free」下不可用（同一批 `PUT /protection` 六条全部 `403 Upgrade to GitHub Pro or make this repository public`），与凭据无关。两仓随后**转为 public**，同一批命令立即成功。

**本仓实测**：三支 `GET /protection` 均 200，`force=false del=false`（`master`/`test` 另 `conversation_resolution=true`）；绕本地钩子的删支/强推均被服务端拒绝（`protected branch hook declined`）。完整过程与命令见后端 `docs/05-operations/github-branch-protection.md` §0.1、§5。

`.githooks/pre-push` 作为第二道防线保留：断网或离线克隆时仍能拦住强推与删支；`git push --no-verify` 可绕过，属授权行为须留痕。
