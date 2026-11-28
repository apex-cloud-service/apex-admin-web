# 图表资产规范化（FE-007，2026-11-16；2026-11-16 第三批落地独立资产）

> 任务卡要求：确认 `docs/architecture` 中时序图/状态机图源文件与导出件成对存在，**无孤立 `.mmd`/`.svg`**。
> 演进：第一批体检时前端仓**没有**独立图表资产（图表全部内嵌 Mermaid 代码块，配对检查不适用）；第三批已把 27 张图统一抽成 `docs/diagrams/*.mmd` + 同名 `.svg`，**配对检查现已生效并通过（27/27，缺失 0）**。

## 1. 最终口径

| 项 | 第一批（体检） | 第三批（落地后） |
| --- | --- | --- |
| `docs/**` 下 `.mmd` | 0 | **27** |
| `docs/**` 下 `.svg`（图表导出件） | 0 | **27** |
| 配对缺口 | 不适用 | **0**（`bash scripts/governance/check-diagram-assets.sh`） |
| Mermaid 源码位置 | 内嵌在 8 篇 Markdown | `docs/diagrams/*.mmd`（正文改为引用同名 `.svg`，并保留 `图源` 链接） |
| 索引 | 无 | `docs/diagrams/README.md`（27 行清单：文档 / 图文件名 / 图名） |

## 2. 抽取与替换规则

1. 文件名 = `<文档相对路径以 - 连接>-<两位序号>.mmd`，序号按图在文档中出现顺序；例：`docs/architecture/auth-and-routing.md` 第 3 张 → `architecture-auth-and-routing-03.mmd`。
2. 文档中每个 ` ```mermaid ` 块替换为：
   - 一行图片引用 `![<所在章节标题>](<相对路径>/diagrams/<name>.svg)`
   - 一行来源 `> 图源：[<name>.mmd](…/diagrams/<name>.mmd)（Mermaid 源码；导出件同名 .svg，由 mmdc 生成）`
3. **Mermaid 源码一字未改**地落到 `.mmd`（仅下述 2 处为可渲染而做的语法修正），文档正文其余部分未动。
4. 导出命令（全量 27 张，`mmdc` 10.9.1）：
   ```bash
   for f in docs/diagrams/*.mmd; do
     npx -y @mermaid-js/mermaid-cli@10.9.1 -q -i "$f" -o "${f%.mmd}.svg" -b white
   done
   ```

## 3. 导出中真实踩到的 2 个语法坑（已修，写进 README 供后人避免）

| 文件 | 原写法 | 报错 | 修正 |
| --- | --- | --- | --- |
| `architecture-overview-04.mmd` | 边标签 `-->|…\|v2 …|` 含裸 `\|` 与括号 | `Parse error … got 'NODE_STRING'` | `\|` → `&#124;`，并给边标签加引号 `-->|"…"|` |
| `guides-deployment-02.mmd` | 节点 `TPL[docker/nginx.conf 模板<br/>含 ${API_PROXY_PASS}]`；节点 `CONF[/etc/nginx/conf.d/default.conf]` | `got 'DIAMOND_START'` / `Unrecognized text` | 节点标签整体加引号：`TPL["…"]`、`CONF["…"]` |

## 4. 取证命令

```bash
cd /Users/work/apex-admin-web
find docs -name "*.mmd" | wc -l      # 27
find docs -name "*.svg" | wc -l      # 27
bash scripts/governance/check-diagram-assets.sh   # mmd 总数 27 · 缺失 0 · [OK] 全部配对
```

## 5. 风险与边界

- 内嵌块被替换为 SVG 引用后，**纯文本阅读端**（不支持渲染 SVG 的终端）看不到图形，但 `图源` 链接始终指向 `.mmd` 原文，信息未丢失。
- SVG 由 `mmdc` 生成、体积远小于位图；`docs/diagrams/` 下 `.svg` 合计约 27 个文件，未触发仓内 >5MB 大文件告警。
- 后端仓口径（`.mmd` + 同名 `.svg`）与前端仓现已一致，两仓 `check-diagram-assets` 逻辑同构。
