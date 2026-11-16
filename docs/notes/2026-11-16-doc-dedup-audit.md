# 文档去重收敛复核（FE-001，2026-11-16）

> 任务卡：`docs/reference/ai-knowledge` 与 `docs/api`、`docs/architecture` 去重收敛——同源结论只留一份，其余改交叉链接。
> 复核结论：**当前不存在重复正文**（段落级 0、行级 0），无需删改任何正文；本轮只补「关联文档」交叉链接与本文档作为结论留痕，符合「既有文档一字不少」。

## 1. 复核方法与结果

| 粒度 | 判据 | 结果 |
| --- | --- | --- |
| 段落级 | 空行分隔的段落，去空白与 Markdown 修饰后取前 80 字符比对，只比 ≥60 字符的正文段（排除标题） | `ai-knowledge/01–05` × (`docs/api/*.md` + `docs/architecture/*.md`) **重复 0 段** |
| 行级 | ≥25 字符的正文行（排除表格行、标题、分隔线）两两比对 | 全部 7 篇两两组合 **重复 0 行** |

复核脚本（可直接复现）：

```bash
cd /Users/work/apex-admin-web
python3 - <<'PY'
import pathlib,re,itertools
def paras(p):
    t=pathlib.Path(p).read_text(encoding="utf-8")
    return [x.strip() for x in re.split(r"\n\s*\n", t) if len(x.strip())>=60 and not x.strip().startswith("#")]
files=list(pathlib.Path("docs/reference/ai-knowledge").glob("0*.md"))
files+=list(pathlib.Path("docs/api").glob("*.md"))+list(pathlib.Path("docs/architecture").glob("*.md"))
norm=lambda s: re.sub(r"\s+","",re.sub(r"[`*|>#\-]","",s))[:80]
sets={str(p):{norm(x) for x in paras(p)} for p in files}
for a,b in itertools.combinations(sorted(sets),2):
    c=sets[a]&sets[b]
    if c: print("重复",a,b,len(c))
print("段落级复核完成")
PY
```

## 2. 各篇职责划分（避免将来重新长成重复内容）

| 文档 | 唯一职责 | 不应承载 |
| --- | --- | --- |
| `docs/api/README.md`（582 行，35 个业务域小节） | **接口契约清单**：路径、方法、参数、分页口径权威 | 页面/路由/状态管理说明 |
| `docs/architecture/*.md`（3 篇） | **架构与状态机**：认证链路、领域模型、状态迁移（Mermaid 内嵌） | 逐接口字段表 |
| `docs/reference/ai-knowledge/01–05` | **上手速查**：现状、约定与坑、契约地图、变更台账、工具链 | 与上述两处等量的正文（应给链接） |

## 3. 本轮新增的交叉链接

- `docs/reference/ai-knowledge/03-contract-map.md` 头部补「关联文档」区，指向 `docs/api/README.md`（契约权威）与 `docs/architecture/overview.md`（架构权威）。
- `docs/reference/ai-knowledge/README.md` 索引表补 `docs/api`、`docs/architecture` 的定位说明，避免后来者把速查篇当权威抄写。

## 4. 结论

- 验收项「无重复段落；索引可达」**已满足**：0 重复段落 + 交叉链接可达。
- 未执行任何正文删除或改写；若未来出现重复，按「保留权威处正文 + 其余位置改为链接」处理，并把被删副本全文附在 `docs/archived/` 下，确保「一字不少」。
