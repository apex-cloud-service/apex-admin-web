# 前端聚合能力评审与「事项发现聚合」实施方案

- 评审日期：2026-11-11
- 评审对象：apex-admin-web（前端仓库，当前工作区）
- 评审方式：静态代码核对（未执行真实环境联调，未审计后端隔离、鉴权与降级实现）
- 文档状态：**第 1–3 节为已完成的评审结论；第 4 节实施方案已按优化调整方案于 2026-11-11 实施**（见下文第 4 节开头链接）。AGENTS.md 已同步。

## 1. 评审结论

**需要补齐，但不重建一套「聚合平台」。**

项目已具备三层聚合（导航聚合、只读跨域概览、领域控制台），中台架构下真正的缺口是第四层——面向用户职责的**事项发现聚合**，以及把「发现 → 跳转 → 原域办理」闭环接通。跨域写编排、统一办理不应建设。

| 聚合层次 | 现状 | 判定 |
| --- | --- | --- |
| 导航聚合 | AdminLayout 统一菜单/面包屑 + 全局搜索 + 通知中心 + 站内信未读角标 | 已实现，维持 |
| 只读数据聚合 | 工作台消费 `GET /api/v2/overview`，展示文件/工作流/集成三源摘要与降级状态 | 已实现，展示质量待改进（P0） |
| 领域控制台 | 办公控制台（三平台配置/绑定/待审批）、工作流监控（统计/实例/待办页签） | 已实现，统计口径与入口待修正（P0） |
| 事项发现聚合 | 工作流待办、办公审批、系统通知、站内信、日程分散在五个页面，无统一入口 | **缺口，建议补齐（P1）** |
| 跨域业务编排 | 无 | **不应建设**：办理语义、幂等与补偿属各域职责，前端无契约依据 |

## 2. 已实现聚合与证据

### 2.1 导航聚合

- [AdminLayout.vue](../../../../src/layouts/AdminLayout.vue)：侧边栏菜单、面包屑、全局搜索、通知中心、站内信未读角标（60s 轮询 + WebSocket 推送触发刷新）。
- [GlobalSearch](../../../../src/components/GlobalSearch/index.vue)：300ms 防抖搜索，映射 user/role/menu/dept/dict/config 六类系统资源跳转。已知限制：`?id=` 深链接是否被目标页消费未验证；未知资源类型不跳转。

### 2.2 只读跨域概览

- [overview.ts](../../../../src/api/overview.ts) 调用公开聚合端点 `GET /api/v2/overview`（权限码 `system:monitor:view`；单源降级返回 `sources.{file,workflow,integration}.status=DEGRADED`；浏览器不可调用 `/internal/v1/overview`）。
- [dashboard/index.vue](../../../../src/views/dashboard/index.vue) 展示三源摘要，聚合失败静默降级、不阻塞工作台其余内容。

已确认的质量缺口（P0 候选）：

1. 直接展示后端字段名，嵌套对象转 JSON 字符串，缺少业务名称、单位与统计口径；`tenantId/generatedAt` 未展示。
2. 「接口调用趋势」图表实为累计分类柱状图（累计请求/4xx/5xx/网关请求/限流拒绝/熔断打开），标题与实现不符。
3. 整体异常被吞掉，未区分未授权、未订阅、网络失败与真实空数据。

### 2.3 领域控制台

- [办公控制台](../../../../src/views/office/console/index.vue)：三平台配置、绑定统计、待审批摘要与入口。已知缺口：
  - 绑定统计固定取 `page=1,size=100` 的数组长度当总数，不代表全量；
  - 单平台查询异常被静默忽略，初始零值可能被误读为真实零；
  - 跳转绑定审批时不传平台上下文；
  - 组织同步/消息推送/审批对接/日历会议预告卡无入口，但对应页面均已登记 [VIEW_REGISTRY](../../../../src/router/dynamic.ts)。
- [工作流监控](../../../../src/views/workflow/monitor/index.vue)：统计、实例、待办三页签聚合，待办在该页直接办理（通过/回退/转办/委派）。

## 3. 不可聚合的边界

以下边界来自现有接口契约与会话语义，方案与后续演进均不得突破：

1. **办理动作留在原域**。工作流 `completeTask` 仅携带 `comment`（通过语义）；办公审批需 `approverId` + `version` 乐观锁；站内信 `TASK` 只是消息类型，不等于真实工作流任务；消息/通知已读 ≠ 业务办结。
2. **不做跨域拼接分页**。各域分页契约不同（`page/size`、`pageNum/pageSize`、裸数组、`records/total`），前端拼接第一页不能产生可信的全局排序、分页或总数。
3. **不引入 BFF、微前端或通用聚合引擎**。现有公开概览端点 + 分域 API 已满足需要，新增中间层无契约依据。
4. **权限、租户与订阅语义照旧**。动态路由转换不消费权限参数、菜单可达性由后端菜单树决定；登录态绑定单一租户；套餐 `features` 空集合 = 未订阅。聚合入口不得自行发明权限拦截，未授权访问由后端 403 拦截（`showError` 已对「能力未开通/scope」类 403 追加能力运营页引导）。

## 4. 「事项发现聚合」实施方案（已实施）

> 本节为方案框架。含逐步执行步骤、代码设计、测试用例与验收标准的详细执行版见 [聚合能力优化调整方案（2026-11-11）](frontend-aggregation-optimization-plan-2026-11-11.md)。

### 4.1 目标与非目标

**目标**：在工作台新增「我的事项」区块，并行拉取各域第一页待办/通知摘要，分域展示、失败隔离，点击跳转原域页面办理。

**非目标**：不做跨域合并时间线；不做统一未读总数；不在面板内办理；不新增后端聚合端点或 BFF；不做自动轮询。

### 4.2 数据源契约（全部复用现有 API，零后端改动）

| 区块 | 现有函数 | 请求分页 | 响应口径与关键字段 |
| --- | --- | --- | --- |
| 工作流待办 | [getMyPendingTasks](../../../../src/api/workflow.ts) `{ pageNum, pageSize }` | pageNum/pageSize | `PageResponse`，读 `list/total` |
| 办公审批待办 | [getPendingApprovals](../../../../src/api/office-approval.ts) | pageNum/pageSize | `list/total`；字段为 `processName/currentNode/createdAt`（非 title/createTime） |
| 系统通知 | [listNotifications](../../../../src/api/notification.ts) | page/size | `PageResponse<SystemNotification>`；含 `msgType/refType/refId/readAt` |
| 站内信收件箱 | [listInboxMessages](../../../../src/api/message.ts) `(pageNum, pageSize)` | — | **裸数组**，无 total，须按「总数未知」标注 |
| 近期日程 | [getCalendarEvents](../../../../src/api/office-calendar.ts) | pageNum/pageSize | `PageResponse<CalendarEvent>`；取未来 7 天区间而非当月全量 |

实施时各 DTO 字段名以 `types/workflow.ts`、`types/index.ts` 实际定义为准，不得按 UI 文案推断。

### 4.3 统一视图模型（`types/index.ts` 追加）

```ts
export type AgendaDomain = 'workflow' | 'office-approval' | 'notification' | 'message' | 'calendar'

export interface AgendaItem {
  domain: AgendaDomain
  kind: string            // 原始类型透传（TASK / msgType / 消息类型），不归一化语义
  title: string
  subtitle?: string
  time?: string           // 后端原值，不做时区换算
  unread?: boolean
  href?: string           // 无独立页面的域（通知）为空
  hrefLabel?: string
}

export interface AgendaSection {
  domain: AgendaDomain
  label: string
  items: AgendaItem[]
  loading: boolean
  error: string | null    // 区块级错误文案，不弹全局提示
  truncated: boolean      // 「仅展示第一页 N 条」口径标注
  totalHint?: string      // 可信 total，或「总数未知（接口返回列表）」
}
```

### 4.4 分域适配器（新增 `src/composables/useAgenda.ts`）

每个适配器只做「取数 → 映射 → 截断标注」，各自 catch，互不阻塞：

```ts
async function loadWorkflowPending(): Promise<AgendaSection> {
  try {
    const page = await getMyPendingTasks({ pageNum: 1, pageSize: 5 })
    const list = page.list ?? []
    return {
      domain: 'workflow', label: '工作流待办',
      items: list.map(t => ({
        domain: 'workflow',
        kind: 'TASK',
        // 字段名以 types/workflow.ts 实际 DTO 为准，实施时校准
        title: t.instanceName ?? `任务 #${t.taskId}`,
        subtitle: t.nodeName,
        time: t.createdAt,
        href: '/workflow/monitor', hrefLabel: '去办理',
      })),
      loading: false, error: null,
      truncated: (page.total ?? 0) > list.length,
      totalHint: `共 ${page.total} 条`,
    }
  } catch {
    return { domain: 'workflow', label: '工作流待办', items: [], loading: false,
             error: '暂时无法加载', truncated: false }
  }
}
```

设计要点：

- **失败隔离**：错误落在 `section.error`，区块内显示「暂时无法加载 + 重试」，不调 `showError`——五个域并行失败时不能连弹五个错误。
- **口径诚实**：站内信是裸数组，`truncated=true` 且 `totalHint='总数未知'`，不把数组长度伪装成 total；工作流/审批/通知用真实 total 判断截断。
- **不合并排序**：各域分页契约、时间字段、已读语义不同，拼接成全局时间线会产生假排序和假总数，按域分区块展示。

### 4.5 组件与挂载（新增 `src/views/dashboard/components/AgendaPanel.vue`）

- 挂载于工作台「数据总览」区块附近，每域一个卡片（标题 + 条目列表 + 底部「去处理」链接）。
- 加载时机：`onMounted` 一次性并行 + 手动刷新按钮，不做自动轮询；后续如需实时，复用 AdminLayout 已有的站内信 WS / 通知 SSE 刷新钩子触发一次 reload，不建新通道。
- 通知区块特殊处理：[NotificationCenter](../../../../src/components/NotificationCenter/index.vue) 是顶栏弹层组件、无独立路由页，因此通知条目**只展示 + 标记已读，不提供跳转**。如需跳转须先补独立页面（后端菜单 + `VIEW_REGISTRY` 登记），属独立需求。

### 4.6 跳转闭环

| 区块 | 跳转目标 | 页面状态 |
| --- | --- | --- |
| 工作流待办 | `/workflow/monitor`（待办 Tab） | 静态入口已存在 |
| 办公审批 | `/office/approval` | 已登记 VIEW_REGISTRY |
| 站内信 | `/office/message` | 已登记 VIEW_REGISTRY |
| 日程 | `/office/calendar` | 已登记 VIEW_REGISTRY |
| 系统通知 | 不跳转 | 顶栏弹层，无独立页 |

第一阶段只做页面级跳转；带 query 的行级定位（如 `?tab=pending&taskId=x`）需目标页消费深链接，与全局搜索 `?id=` 消费验证同类，统一列为后续增强项，不混入本次。

### 4.7 文件变更清单

| 文件 | 操作 |
| --- | --- |
| `src/composables/useAgenda.ts` | 新增：5 个适配器 + `loadAll` 编排 |
| `src/views/dashboard/components/AgendaPanel.vue` | 新增：区块组件 |
| `src/types/index.ts` | 追加 `AgendaItem` / `AgendaSection` |
| `src/views/dashboard/index.vue` | 引入 AgendaPanel |
| `src/api/**`、路由、后端 | 零改动 |

### 4.8 测试与验证

- Vitest：适配器映射（含裸数组截断标注、区块级错误隔离）、`AgendaSection` 状态流转；mock 请求层。
- `npx vue-tsc --noEmit` 类型检查。
- 联调环境手动验证各域 403 / 超时 / 空列表三种降级表现。

### 4.9 实施顺序

1. **第一步（P1a）**：适配器 + AgendaPanel，先接工作流待办、办公审批、站内信、日程四个有页面的域。
2. **第二步（P1b）**：通知区块（仅展示/已读）+ 手动刷新按钮。
3. **后续增强（P2，另立项）**：行级深链接定位 + 全局搜索 `?id=` 消费验证。

另有与本文独立、但同属聚合修正范围的 P0 项（不依赖本方案）：

- 工作台聚合卡业务化（字段命名/单位/口径、区分未订阅/降级/失败、展示 `generatedAt`）；
- 「接口调用趋势」标题与图表类型对齐；
- 办公控制台统计改用 `listBindingsPage`（真实 `total` + status 过滤）、单平台失败显式标注、跳转传递平台上下文、预告卡接通已注册页面入口。

## 5. 文档同步义务

- 已于 2026-11-11 实施并同步 [AGENTS.md](../../../AGENTS.md) 的阅读导航与排障表；本文状态已更新为「已实施」。
- 实施涉及跳转目标页面（如待办 Tab 定位参数）时，同步核对 `docs/architecture/auth-and-routing.md` 相关描述。
