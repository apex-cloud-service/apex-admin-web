# docs/reference（参考手册与受控知识）

## 用途与边界

- 收录：可反复查的"字典类"材料——测试命令全集、注释风格、工具包说明，以及受控的 AI 知识库。
- [`ai-knowledge/`](./ai-knowledge/README.md) 是**受控目录**：改动代码/文档须同步变更记忆台账（规范 §5.4）。
- 不收：一次性的方案/记录（去 `docs/plans/`、`docs/records/`）。

## 索引

| 文档 | 内容 |
| --- | --- |
| [testing.md](./testing.md) | 测试命令全集（Vitest/Playwright/Lighthouse/压测/覆盖率）、现有用例清单与编写规范、覆盖率双口径 |
| [toolkit.md](./toolkit.md) | `src/utils`、`src/composables`、`src/stores` 的全量导出与选型建议 |
| [comment-style.md](./comment-style.md) | 注释语言、文件头模板、JSDoc 契约与禁止的坏注释 |
| [ai-knowledge/README.md](./ai-knowledge/README.md) | AI 知识库入口（现状速查、约定与陷阱、契约映射、变更记忆台账） |

### ai-knowledge 子目录清单

| 文件 | 角色 | 何时必须更新 |
| --- | --- | --- |
| [01-current-state.md](./ai-knowledge/01-current-state.md) | 现状快照（页面/路由/依赖/命令） | 结构性变化时 |
| [02-conventions-and-pitfalls.md](./ai-knowledge/02-conventions-and-pitfalls.md) | 约定与易踩坑点 | 约定或坑点变化时 |
| [03-contract-map.md](./ai-knowledge/03-contract-map.md) | 前端 ↔ 后端契约定位表 | 接口路径或响应结构变化时（须与后端同步核对） |
| [04-change-memory.md](./ai-knowledge/04-change-memory.md) | **变更流水台账（append-only）** | **每一次改动** |
| [05-agent-tooling.md](./ai-knowledge/05-agent-tooling.md) | 智能体工具链登记 | 工具链变化时 |
| [PROVENANCE.md](./ai-knowledge/PROVENANCE.md) | 迁移来源证明（原 `.workbuddy/knowledge`） | 仅迁移类改动 |

## 维护约定

1. `testing.md`、`toolkit.md` 随脚本/命令变更同步更新（脚本改名必须在同一提交内改完）。
2. 禁止把 `.workbuddy/`、`.zcode/` 等私有目录原文抄进本目录。
3. 引用覆盖率数字必须注明口径（默认口径 vs 强制 `--coverage.include` 全量口径）。