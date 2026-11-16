# docs/reference（参考手册与受控知识）

## 用途与边界

- 收录：可反复查的"字典类"材料——测试命令全集、注释风格、工具包说明，以及受控的 AI 知识库。
- [`ai-knowledge/`](./ai-knowledge/README.md) 是**受控目录**：改动代码/文档须同步变更记忆台账（规范 §5.4）。
- 不收：一次性的方案/记录（去 `docs/plans/`、`docs/records/`）。

## 索引

| [comment-style.md](./comment-style.md) | — |
| [testing.md](./testing.md) | — |
| [toolkit.md](./toolkit.md) | — |
| [ai-knowledge/README.md](./ai-knowledge/README.md) | AI 知识库入口（接口契约图、变更记忆台账、领域速查） |

## 维护约定

1. `testing.md`、`toolkit.md` 随脚本/命令变更同步更新（脚本改名必须在同一提交内改完）。
2. 禁止把 `.workbuddy/`、`.zcode/` 等私有目录原文抄进本目录。
