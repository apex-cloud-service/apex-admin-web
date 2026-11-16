# 需求与技术方案（docs/specs）

存放需要评审后再实施的设计类文档：接口契约设计、路由与权限方案、跨模块改造方案、第三方对接方案。

命名：`YYYY-MM-DD-主题.md`；必须包含「背景 / 目标 / 影响面 / 兼容性 / 回滚方案 / 验收标准」六节。

已登记方案：

| 方案 | 状态 | 说明 |
| --- | --- | --- |
| （暂无新增，历史评审材料见 `docs/archived/project-reports/`） | — | 历史报告保持原位，不搬迁 |

> 规则：涉及路由注册、权限码、令牌刷新、租户头、分页口径、上传链路的改动，必须先在此出方案。

## AI 智能体角色规范（跨工具通用）

`docs/specs/ai-agents/` 存放角色卡正文，可直接粘贴给 Trae / WorkBuddy / Qoder / Codex / ZCode 等工具：

| 角色 | 文件 |
| --- | --- |
| 需求拆解与任务卡 | `ai-agents/r1-task-planner.md` |
| 前端实现（Vue3+TS） | `ai-agents/r2-frontend-implementer.md` |
| 交互与契约守门 | `ai-agents/r3-ui-contract-guard.md` |
| 测试与回归 | `ai-agents/r4-test-runner.md` |
| 评审与红线扫描 | `ai-agents/r5-reviewer.md` |

## 规范正文登记

| 文档 | 内容 | 状态 |
| --- | --- | --- |
| [project-governance.md](project-governance.md) | 项目任务管理规范完整正文（任务体系、文档收口、多智能体目录映射、`.gitignore` 规则、前端红线、执行记录、验收清单） | v1.1 · 2026-11-16 生效 |
