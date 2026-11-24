# FE-029 责任与租约接管

## 范围

根据用户 2026-11-23 明确授权，由当前 Codex 会话接管 FE-029 的 R0 责任和租约记录，并独立登记 FE-030。FE-029 保持执行中，授权 reader、知识库模型、受保护链路与历史 R5 驳回项仍留在旧任务。

## 改动清单

- 更新 `docs/tasks/project-tasks.md` 的 FE-029 责任信息、接管基线和追加租约记录；新增待规划任务 FE-030。
- 新增 FE-030 规格与波次计划，并同步前端文档入口、记录索引和记忆台账。
- 接管前端 `dev` 基线 `aec9c444dc113ce7b64f78c0956304b54d304727`；工作区已有未提交的 API 审计、契约矩阵、联调记录和索引改动，全部保留。

## 验证证据

- 用户明确授权接管 BE-043、BE-049、FE-029 的责任/租约，并要求旧任务未完成项保留、优化任务分开管理。
- `git status --short --branch` 显示前端 `dev...origin/dev`，已有用户改动；未运行构建/测试、未生成报告、未提交或推送。
- `bash scripts/governance/verify-docs.sh --strict` 通过（0 项）；`bash scripts/governance/check-doc-refs.sh --strict` 通过（0 断链/私有路径）；`bash scripts/governance/audit-frontend-rules.sh --strict` 无阻断项，保留 1 处已登记 FE-005 `: any` 技术债；`git diff --check` 通过。

## 影响面

只新增治理文档与新规格/计划，不改源码、API、配置或数据。FE-029 维持执行中，FE-030 维持待规划。

## 回滚方式

本次未提交；如需撤销，仅移除本记录新增的任务行/租约附记、索引行和新文档，保留任务接管前已存在的工作区变更。集成后按独立提交执行 `git revert`。
