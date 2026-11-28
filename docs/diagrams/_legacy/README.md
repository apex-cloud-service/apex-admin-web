# `_legacy/` 历史图表归档（勿引用）

> **状态：只读历史件。任何正文都不得引用本目录的 `.svg`。**
> 现行图请用上级目录 `docs/diagrams/*.svg`（36 对）。

## 为什么存在

2026-11-28（FE-033）对图表做**全量重制**时，为满足治理规范 §3.5「不得删除任何历史图」，把既有图中**被重制的 22 对原件迁入本目录**，再以同名重写新版。（另 5 对 `archived-*` 历史证据图刻意不重制，留在 `docs/diagrams/` 根目录。）

上级目录的文件名与引用路径完全不变，因此正文零断链；本目录仅作追溯与对照。

## 内容清单（22 对）

| 分组 | 数量 | 说明 |
| --- | --- | --- |
| 架构类 | 16 对 | `architecture-overview-01..04`、`architecture-auth-and-routing-01..06`、`architecture-domain-and-state-diagrams-01..06` |
| 接口类 | 1 对 | `api-README-01` |
| 指南类 | 5 对 | `guides-deployment-01..02`、`guides-database-config-integration-01..03` |

> 迁移前共 27 对；另 5 对为 `archived-project-reports-*`（历史评审证据图），**刻意未重制**，已迁回上级目录保持正文引用可达 —— 它们记录 2026-11 后端网关的真实缺陷状态，本仓库代码无法重新推导，重绘等于伪造评审证据。详见 [`../README.md`](../README.md)「历史归档件」小节。

## 与现行版的差异要点

重制按当时源码校正了以下实质问题（完整清单见 `docs/records/2026-11-28-docs-reorg-and-diagram-rebuild.md` §批次 4）：

| 图 | 旧版问题 |
| --- | --- |
| `architecture-auth-and-routing-02` | 写「注册失败→降级静态路由」，实际代码是**逆序回滚已 addRoute 的路由** + `console.warn`，且可重试 |
| `guides-deployment-02` | `node:18-alpine`→22、`npm install`→`npm ci`、`docker/nginx.conf`→`container/nginx.conf`、`docker-entrypoint.sh`→`container/container-entrypoint.sh` |
| `architecture-auth-and-routing-01` | 缺 `mfaRequired=true` 二步验证分支 |
| `architecture-domain-and-state-diagrams-02` | 含虚构的 `DRAFT` 子状态 |

## 使用约定

1. **禁止**在任何 `.md` 正文中引用 `_legacy/*.svg`（`check-doc-refs.sh` 与评审共同把关）。
2. **禁止**修改本目录文件（历史证据不可改写）。
3. 如需对比新旧画法，仅在本目录内直接打开文件查看，不复制进正文。
4. `check-diagram-assets.sh` 对本目录同样要求 `.mmd` ↔ `.svg` 成对（防止归档时丢半边）。

---

**迁移日期**：2026-11-28　**来源**：`docs/diagrams/`（重制前版本）　**任务**：FE-033