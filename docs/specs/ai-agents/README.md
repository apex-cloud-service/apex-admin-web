# 项目级 AI 智能体角色定义（apex-admin-web 前端）

跨工具通用的角色卡：可直接粘贴给 Trae / WorkBuddy / Qoder / Codex / ZCode / Claude 等工具作为系统提示，也可被各工具的规则文件引用。

角色卡描述**职责**，不授予额外写权限。任务大盘始终由主控智能体单写；执行角色只提交交接包，R3/R5 只审不改，最终状态由主控翻转。

| 位置 | 用途 | 入库 |
| --- | --- | --- |
| `docs/specs/ai-agents/`（本目录） | 角色规范**正文**，唯一权威副本 | ✅ |
| `.trae/` `.workbuddy/` `.zcode/` `.qoder/` `.codex/` | 工具缓存/索引/规则副本 | ❌ |

## 角色清单

| 角色 | 文件 | 场景 |
| --- | --- | --- |
| R1 需求拆解与任务卡 | `r1-task-planner.md` | 需求 → FE 任务卡 + 验收标准 |
| R2 前端实现（Vue3+TS） | `r2-frontend-implementer.md` | 按红线写页面/组件/API/状态 |
| R3 交互与契约守门 | `r3-ui-contract-guard.md` | 审路由注册、接口契约、错误态、权限点 |
| R4 测试与回归 | `r4-test-runner.md` | 类型检查、构建、e2e |
| R5 评审与红线扫描 | `r5-reviewer.md` | 提交前评审、跑治理脚本 |

## 通用铁律

1. 改代码前先读 `AGENTS.md` 第 0 章 + 目标文件全文。
2. 一卡一目标，跨模块拆卡。
3. 不动既有文档与图表；迁移先建新版留指针。
4. 提交前跑 `bash scripts/governance/verify-docs.sh` 与 `bash scripts/governance/audit-frontend-rules.sh`。
5. 拒绝顺手重构，登记独立任务卡。

## 编排顺序

`R1 产出任务卡 → 主控派单并锁定主写/写入范围 → R2 实现 → R3 契约定门 → R4 回归 → R5 独立复核 → 主控关闭`

- 并行任务必须各自使用独立 worktree/含任务 ID 的短分支。
- 同一文件同一时段只允许一个主写；冲突时串行，不发散式重写。
- 执行结束回传标准交接包；R5 必须使用未参与执行的全新上下文。
