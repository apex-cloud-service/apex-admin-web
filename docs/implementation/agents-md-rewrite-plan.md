# 重写 AGENT.md 实现计划

## Repository Research

通过逐文件核对，当前 `AGENT.md` 与项目实际状态存在以下主要出入：

### 1. api/ 目录不完整
- AGENT.md 仅列 `auth.ts / user.ts / system.ts / monitor.ts`
- 实际还有 `search.ts`（全文搜索，Meilisearch）和 `workflow.ts`（工作流：定义/实例/统计/任务/回退转办委派挂起恢复）

### 2. types/ 目录不完整
- AGENT.md 仅列 `index.ts`
- 实际还有 `types/workflow.ts`（工作流领域类型：WorkflowNode/Edge/Definition/Instance/Task/Statistics/Trend 及各 Payload）

### 3. views/ 目录缺少工作流模块
- AGENT.md 列 `login / dashboard / system/* / monitor/* / profile / error`
- 实际还有 `workflow/`：
  - `monitor/index.vue`（统计看板 + 流程实例列表两个 Tab）
  - `monitor/Statistics.vue`、`monitor/InstanceList.vue`、`monitor/InstanceDetail.vue`
  - `components/TaskActions.vue`

### 4. components/ 缺少 GlobalSearch
- AGENT.md 仅列 `Pagination.vue`
- 实际还有 `GlobalSearch/index.vue`（顶栏全局搜索，对接 `/admin-api/v1/search`，结果按 resourceType 跳转对应管理页）

### 5. 工作流模块完全未被 AGENT.md 描述
- API 层、类型层、视图层均缺失
- 路由特殊处理：`router/index.ts` 中工作流监控页与流程详情页是**静态路由**（`hidden: true`，不依赖后端菜单），与其他页面的菜单驱动动态路由机制不同
- `dynamic.ts` 的 `VIEW_REGISTRY` 含 `'workflow/monitor/index'`

### 6. 工作流分页口径与其它模块不一致（需在文档中标注为已知差异）
- 统一模块：`PageQuery{page,size}` + `PageResponse{list,total,pageNum,pageSize,pages,hasNext}`
- 工作流模块：`{pageNum,pageSize}` + `{records,total}`
- 新增代码时应优先遵循统一口径；工作流模块的差异属历史遗留，修改时保持模块内一致即可

### 7. 动态路由 status/visible 语义需补充
- `dynamic.ts` 注释明确：**不按 `status` 过滤**（历史种子数据 status 取值与枚举不一致，过滤会导致全量菜单丢失 404）
- `visible: 0` 仅隐藏侧边栏展示，**路由仍注册可直接访问**
- 当前 AGENT.md §3.2 未提及，易误导

### 8. dynamic.ts.bak 备份文件
- 仓库中存在 `src/router/dynamic.ts.bak`（内容与 dynamic.ts 相同），属残留备份
- AGENT.md 应提示 Agent 忽略 `.bak` 文件，不将其作为有效源码

### 9. 全局搜索入口未提及
- `AdminLayout.vue` 顶栏集成 `GlobalSearch`，对接 Meilisearch 全文搜索，AGENT.md 未描述

## Files and Modules

- `AGENT.md`（根目录）：整体重写，使其与上述实际项目状态一致

## Implementation Steps

1. 重写 §1 项目概览：保持技术栈与版本准确，补充功能模块清单（含工作流、全文搜索）
2. 重写 §2 目录结构：补全 `api/`（+search.ts、+workflow.ts）、`types/`（+workflow.ts）、`components/`（+GlobalSearch）、`views/`（+workflow/*）
3. 完善 §3 核心机制：
   - §3.2 动态路由：补充 status 不过滤、visible 仅影响侧边栏的语义；补充工作流页面走静态路由的特例
   - §3.5 通用组件：补充 GlobalSearch 的用途与跳转逻辑
4. 新增 §3.6 工作流模块专节：说明 API 分层、类型定义、静态路由注册方式、分页口径差异
5. 新增 §3.7 全文搜索：说明 GlobalSearch 组件、`/admin-api/v1/search` 接口、资源类型跳转映射
6. 完善 §6 前后端联调：工作流菜单/路由接入的特殊说明（静态路由无需后端菜单）
7. 更新 §7 变更检查清单：新增「忽略 .bak 文件」「工作流新页面走静态路由或 VIEW_REGISTRY 二选一」检查项
8. 通读校对：确保所有路径、接口前缀、字段名与源码一致；移除或弱化无法在本仓库验证的代码生成器段落（apex-generator 为后端工具，保留但标注「后端提供」）

## Dependencies and Considerations

- AGENT.md 是 Agent 行为准则文档，所有断言必须可在源码中验证，不引入仓库外未核实的信息
- 不修改任何 `.ts/.vue` 源码，仅重写 `AGENT.md`
- `dynamic.ts.bak` 不纳入文档的有效源码描述（仅提示忽略）
- 工作流分页口径差异以「已知差异」方式记录，不在本次范围内修改源码统一

## Validation

- 文档中每个文件路径均通过本计划阶段的 `Read` 验证存在
- 接口前缀（`/api/v1`、`/admin-api/v1`、工作流部分高级操作用 `/api/workflow`）与 `src/api/*.ts` 核对一致
- VIEW_REGISTRY 条目与 `src/router/dynamic.ts` 核对一致
- 静态路由条目与 `src/router/index.ts` 核对一致

## Risks

- **过度文档化**：AGENT.md 应聚焦工程约定与易错点，避免复制 README 的使用说明 → 控制篇幅，与 README 去重
- **信息过时**：后续新增模块时 AGENT.md 需同步 → 在文档末尾加「维护说明」提醒
- **工作流口径差异处理不当**：若在文档中表述为「必须统一」会误导 → 明确标注为历史遗留差异，新代码仍遵循统一口径
