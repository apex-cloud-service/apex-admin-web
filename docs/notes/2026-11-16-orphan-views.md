# 孤儿页面盘点（FE-004，2026-11-16）

> 口径：**文件存在 ≠ 路由可用**。一个 `.vue` 只有在「被 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 导入」或「被 `src/router/index.ts` 静态路由导入」时，才算用户可达页面；其余要么是被父组件引用的**子组件**，要么是**未接线遗留页**。
> 结论：**未接线遗留页 1 个**（`src/views/office/components/PlatformSelector.vue`），其余 5 个未注册项均为子组件。本文只盘点，不删除、不改路由。

## 1. 盘点数据

| 项 | 数量 | 取证 |
| --- | --- | --- |
| `src/**/*.vue` 总数 | 75 | `find src -name "*.vue" \| wc -l` |
| 其中 `src/views/` 下 | 67 | 同上，排除 `App.vue`/`components`/`layouts` |
| `VIEW_REGISTRY` 条目 | 51 | 正则抽取 `'<key>': () => import('@/views/<file>.vue')` |
| 静态路由导入页面 | 12 | `src/router/index.ts` 中 `@/views/**` |
| 动态 + 静态并集 | 61 | 51 ∪ 12 |
| **未被任何路由导入** | **6** | 见 §2 |

> 说明：早期任务卡写作「75 个 `.vue` 中未注册」，是因为把 8 个非页面 `.vue`（`App.vue`、`components/*`、`layouts/*`）一并计入。按「页面」口径，分母是 67。

## 2. 未注册明细与分类

| 文件 | 分类 | 判定依据 | 处置建议 |
| --- | --- | --- | --- |
| `views/dashboard/components/AgendaPanel.vue` | 子组件 | 被 `views/dashboard/index.vue` 引用，属仪表盘内部面板 | 保持现状（不注册路由） |
| `views/workflow/monitor/InstanceList.vue` | 子组件 | 被 `views/workflow/monitor/index.vue` 引用（实例 Tab） | 同上 |
| `views/workflow/monitor/PendingTasks.vue` | 子组件 | 被 `views/workflow/monitor/index.vue` 引用（待办 Tab） | 同上 |
| `views/workflow/monitor/Statistics.vue` | 子组件 | 被 `views/workflow/monitor/index.vue` 引用（统计 Tab） | 同上 |
| `views/workflow/components/TaskActions.vue` | 子组件 | 被工作流页面以 `<TaskActions>` 形式使用（模板引用，非 `import` 字符串） | 同上 |
| `views/office/components/PlatformSelector.vue` | **未接线遗留页** | 全仓 `grep -rn "PlatformSelector" src` **0 命中**：既无路由导入，也无模板引用 | 建议在单独任务卡中评估删除或接入；**本轮不动**（避免影响功能与不可逆删除） |

## 3. 复核命令（可直接复制）

```bash
cd /Users/work/apex-admin-web
find src -name "*.vue" | wc -l
python3 - <<'PY'
import re,pathlib
def imports(f):
    return set(re.findall(r"@/views/([^'\"]+?\.vue)", pathlib.Path(f).read_text(encoding="utf-8")))
dyn, static = imports("src/router/dynamic.ts"), imports("src/router/index.ts")
views={str(p.relative_to("src/views")) for p in pathlib.Path("src/views").rglob("*.vue")}
print("未注册:", sorted(v for v in views if v not in dyn|static))
PY
grep -rn "PlatformSelector" src || echo "0 命中"
```

## 4. 结论

1. 可路由页面 61 / 67，覆盖 `system`、`monitor`、`workflow`、`office`、`data`、`knowledge`、`integration`、`iot` 全部业务域。
2. 未注册 6 项中 5 项为有意设计的子组件（父页面内 Tab/面板），不属缺陷。
3. 唯一可疑遗留项 `office/components/PlatformSelector.vue` 已登记在此，**不在本轮清理**；是否删除需产品确认「办公平台接入是否需要独立选择器页面」。
