# 需求与技术方案（docs/specs）

存放需要评审后再实施的设计类文档：接口契约设计、路由与权限方案、跨模块改造方案、第三方对接方案。

命名：`YYYY-MM-DD-主题.md`；必须包含「背景 / 目标 / 影响面 / 兼容性 / 回滚方案 / 验收标准」六节。

已登记方案：

| 方案 | 状态 | 说明 |
| --- | --- | --- |
| [2026-11-17-integration-contract-repair.md](2026-11-17-integration-contract-repair.md) | 已实施（FE-026） | 真实联调既有改动补记及后续日期/分页修复边界；非事前审批 |
| [2026-11-18-fullstack-integration.md](2026-11-18-fullstack-integration.md) | 执行中（FE-029 / BE-043） | 全量 API 对照、Podman Compose 真实联调及前后端缺陷闭环 |
| [2026-11-23-frontend-resilience-ddd-release.md](2026-11-23-frontend-resilience-ddd-release.md) | Wave A 已复验，后续波次待规划（FE-030） | 前端领域边界、性能韧性与静态资源发布能力分波次评审 |
| [2026-11-26-fe032-upload-and-retry.md](2026-11-26-fe032-upload-and-retry.md) | 已实施（FE-032） | 上传链路（MIME/压缩/分片/裁剪顺序与 XHR 终结）与请求重试收窄契约 |
| （历史评审材料见 `docs/archived/project-reports/`） | — | 历史报告保持原位，不搬迁 |

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
| [project-governance.md](project-governance.md) | 项目任务管理规范完整正文（任务体系、文档受控归位、多智能体编排/写隔离/交接/复核、`.gitignore` 规则、前端红线、执行记录、验收清单） | **v1.3 · 2026-11-28 生效**（§3.2 受控归位、§3.5 图表重制与 `_legacy/` 归档、§9.4 现状口径） |
