# 图表资产体检（FE-007，2026-11-16）

> 任务卡要求：确认 `docs/architecture` 中时序图/状态机图源文件与导出件成对存在，**无孤立 `.mmd`/`.svg`**。
> 实际结论：**前端仓不存在独立 `.mmd` / `.svg` 资产**，图表以 Mermaid 代码块内嵌在 Markdown 中，因此「配对」检查不适用，也不存在孤立文件。下文给出取证与后续若改用独立源文件时的校验方法。

## 1. 取证

| 项 | 结果 | 命令 |
| --- | --- | --- |
| `docs/**` 下 `.mmd` 数量 | **0** | `find docs -name "*.mmd" \| wc -l` |
| `docs/**` 下 `.svg` 数量 | **0** | `find docs -name "*.svg" \| wc -l` |
| 含 mermaid 代码块的文档 | **8 篇** | `grep -rl '\`\`\`mermaid' docs` |
| mermaid 代码块总数 | **27 处** | `grep -rn '\`\`\`mermaid' docs \| wc -l` |
| `docs/architecture` 三篇规模 | `overview.md` 227 行、`auth-and-routing.md` 276 行、`domain-and-state-diagrams.md` 280 行 | `wc -l docs/architecture/*.md` |

## 2. 结论

1. **无孤立图表资产**：因为没有 `.mmd`/`.svg` 文件，配对检查不存在缺口；图表正文（时序图、状态机图、流程图）全部内嵌在上述 8 篇 Markdown 中，随文档入库，不依赖外部导出件。
2. **与后端仓的差异**：后端 `apex-scaffold` 使用 `.mmd` + 同名 `.svg` 成对资产（存量 30 个 `.mmd` 缺 `.svg` 由 BE-001 跟踪）；前端走内嵌 Mermaid，两仓口径不同属合理差异，不强行统一。
3. **风险提示**：内嵌 Mermaid 依赖查看端渲染（GitHub/IDE 支持），不适合印刷或离线分发；如后续需要导出件，按 §3 落地。

## 3. 若后续改为独立源文件，按此校验

```bash
cd /Users/work/apex-admin-web
# 1) 源文件缺导出件（mmd 无同名 svg）
for f in $(find docs -name "*.mmd"); do
  test -f "${f%.mmd}.svg" || echo "缺导出件: $f"
done
# 2) 导出件无源文件（svg 无同名 mmd）
for f in $(find docs -name "*.svg"); do
  test -f "${f%.svg}.mmd" || echo "孤立导出件: $f"
done
# 3) 计数基线，写入任务卡验收列
find docs -name "*.mmd" | wc -l; find docs -name "*.svg" | wc -l
```

## 4. 本轮动作

- 仅新增本文档与索引登记；**未新增/移动/删除任何图表文件**（当前也没有可动的图表文件）。
