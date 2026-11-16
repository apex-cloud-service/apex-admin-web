# apex-admin-web 知识库

> **定位**：前端仓的「事实层 + 导航层」。只写结论、现状、指针、陷阱，不复制 `AGENTS.md` 与 `docs/` 的正文。
> **权威优先级**：执行代码与类型定义 > `AGENTS.md`（核对日 2026-10-30）> `docs/` > 本库 > `MEMORY-CARD.md`
> **基线**：2026-11-16 实测 · v1.2.0 · 工作树干净 · 默认工作分支 `dev`
> **维护口径**：变更台账 `04-change-memory.md` 由规范 §5.4 **强制登记**，并由 `.githooks` 校验（`check-memory-sync.sh`）；本库其余文件（含 `MEMORY-CARD.md`）是**派生视图**，只做摘要与导航，**不作为验收依据**。

## 一、这个库解决什么问题

前端已有 `AGENTS.md`（44KB，工程全貌）和 `docs/`（架构、接口、部署），但缺少一层**能在 10 分钟内回答**的东西：

1. 这个仓现在到底有多少页面、多少 API 封装，哪些能力是真做完的？
2. 后端改了路径/字段，我需要同步哪些文件？
3. 哪些错误我已经踩过，下次怎么快速定位？
4. 哪些能力「文件存在但没接线」，不能对外宣称？

## 二、阅读路径

| 你是 | 先读 | 再读 |
| --- | --- | --- |
| 第一次接手 | [`../MEMORY-CARD.md`](../../../MEMORY-CARD.md) | [01 现状](01-current-state.md) → [02 约定与陷阱](02-conventions-and-pitfalls.md) |
| 要加/改页面 | [02 约定与陷阱](02-conventions-and-pitfalls.md) | [03 契约地图](03-contract-map.md) |
| 后端改了接口 | [03 契约地图](03-contract-map.md) | `src/api/*.ts` → 对应页面 |
| 排查线上问题 | [02 约定与陷阱](02-conventions-and-pitfalls.md) 的排障表 | `AGENTS.md` §10 |

## 三、文件索引

| 文件 | 内容 | 更新时机 |
| --- | --- | --- |
| [01-current-state.md](01-current-state.md) | 技术栈、目录与规模、构建验证命令、能力覆盖与已知缺口 | 每次功能批次后 |
| [02-conventions-and-pitfalls.md](02-conventions-and-pitfalls.md) | 硬约束、分页/权限/会话规则、高频故障排查 | 新增约束或踩坑后 |
| [03-contract-map.md](03-contract-map.md) | 前端 API 模块 ↔ 后端路径前缀 ↔ 响应/分页口径对照 | 后端契约变更时 |
| [04-change-memory.md](04-change-memory.md) | **变更流水台账**：每次改动的摘要/提交/证据/影响面（append-only） | **每次改动** |
| [05-agent-tooling.md](05-agent-tooling.md) | 本仓已装 Skill / Agent 清单与生效验证（唯一正文在后端 08 篇） | Skill/Agent 增删改时 |

## 四、维护规则

1. 状态类信息带日期（`（YYYY-MM-DD 实测）`），无日期数字视为不可信。
2. 「能力已实现」必须能指到 `src/api/*.ts` 或具体页面；只有文件、没有调用点的，写成「存在但未接线」。
3. 与后端契约相关的结论，回指 `apex-scaffold` 的具体 Router/Handler 或 `docs/03-api/API_ROUTES.md`。
4. 不复制 `AGENTS.md` 大段正文；冲突时以代码为准，并回改本库。
5. 不放任何密钥、令牌、真实环境口令。
6. **每次改动都要在 [04 变更流水台账](04-change-memory.md) 追加一条**（六字段：日期/类型/摘要/提交/证据/影响面），规则见 `docs/specs/project-governance.md` §5.4。

## 权威边界（FE-001，2026-11-16）

- 接口契约以 [`docs/api/README.md`](../../api/README.md) 为准；架构与状态机以 [`docs/architecture/overview.md`](../../architecture/overview.md) 为准。
- 本目录 `01–05` 只做**上手速查与映射**，不承载可替代上述两处的正文；发现重复时保留权威处正文、其余改为链接（复核结论见 [`docs/notes/2026-11-16-doc-dedup-audit.md`](../../notes/2026-11-16-doc-dedup-audit.md)）。
