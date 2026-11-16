# 05 · 智能体与工具（已安装清单）

> **采样日**：2026-11-16 · 本仓 `apex-admin-web`（前端）
> **唯一正文**：`apex-scaffold` 仓 `docs/reference/ai-knowledge/08-agent-tooling.md`（双仓工具统一登记处）；本节只记前端相关部分。
> 依规范 §5.4，安装/变更同样要登记到 `04-change-memory.md`。

## 1. 项目专属 Skill（用户级，跨会话生效）

位置：`/Users/eric/DoubaoWork/skills/`（不入版本库，换机器按本节重建）

| Skill | 与本仓的关系 |
| --- | --- |
| `apex-admin-web-frontend` | 本仓专用：真实 npm 脚本清单（含"**没有** `npm run lint`、没有独立 typecheck"）、加页面四步套路、`api-base.ts#apiUrl` / `showError` / SSE `Accept` 头等硬约束、`check:comments`、台账与分支纪律 |
| `apex-governance-ops` | 双仓通用：治理自检、台账六字段、`dev→master→test` 快进、SSH 443、`git archive` 归档、禁 `push -f`/`reset --hard` |
| `apex-scaffold-backend` | 后端仓专用（改契约时用来核对后端真实命令与红线） |

## 2. Agent 定义（`.workbuddy/agents/`，私有目录不入库）

| Agent | 职责 |
| --- | --- |
| `frontend-expert.md` | 页面/组件/API/契约/构建/依赖体积治理；命令清单与红线 |
| `qa-engineer.md` | vitest/覆盖率/E2E/性能压测；以实测为准、禁止改断言迁就实现 |
| `release-guardian.md` | 推送前四查、`--ff-only` 发布、归档、5 条硬红线 |

## 3. 插件核查

`find_plugin`（代码审查/测试/Spring Boot/Vue/质量检测）**无可用结果**，本轮不装第三方插件；对应能力用仓库内脚本：`scripts/governance/{verify-docs,check-doc-refs,audit-frontend-rules,check-memory-sync}.sh`、`scripts/verify/post-deploy-check.sh`、`npm run test:report`。


## 3.5 配套脚本与规则

| 产物 | 路径 | 用途 |
| --- | --- | --- |
| 一键预检 | `scripts/dev/apex-preflight.sh` | 分支/工作区/远端/附录A哈希/台账/治理脚本/node 与 build/分支对齐；支持 `--fast`/`--commit`/`--strict` |
| 分支保护清单 | `docs/guides/github-branch-protection.md` | 指向后端唯一正文；含前端特有注意（别把 `npm run build` 挂成 status check） |

## 4. 生效验证

```bash
ls /Users/eric/DoubaoWork/skills/apex-admin-web-frontend/SKILL.md
ls .workbuddy/agents/
python3 -c "import json;print(list(json.load(open('package.json'))['scripts'])[:6])"
bash scripts/governance/verify-docs.sh | tail -1
```

## 5. 维护

任何 Skill/Agent 增删改都要在 `04-change-memory.md` 追加一条，并同步本节；仓库脚本改名时同日更新 `SKILL.md`，否则技能会误导执行。
