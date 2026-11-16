# 前端聚合能力优化调整方案

- 编制日期：2026-11-11
- 文档状态：**已实施（2026-11-11，P0-1/P0-2/P0-3/P1-1/P1-2 全部落地并通过 `npx vue-tsc --noEmit` 与 `npx vitest run` 验证；P2-1 另立项未实施）**。实施字段按 `types/` 实际定义校准，与本方案示例的差异：`WorkflowPendingTask.subtitle` 取 `assigneeName`、`AgendaItem.id` 为 `number | string`（日程为字符串事件 ID）、审批区块需当前用户身份构造 `approverId`。
- 上游评审：[聚合评审与事项发现方案（2026-11-11）](frontend-aggregation-review-2026-11-11.md)（第 1–3 节结论与第 3 节边界约束全部适用于本方案）
- 方案口径：数据源契约已在编制时逐一核对源码；标注「实施时校准」的字段以 `types/` 实际定义为准。
- 修改约束：不动后端契约、不改路由注册表、不改请求层 `utils/request.ts`、遵守 [AGENTS.md](../../../AGENTS.md) 全部约束。

## 1. 方案总览

| 编号 | 名称 | 优先级 | 主要改动文件 | 依赖 |
| --- | --- | --- | --- | --- |
| P0-1 | 工作台跨域概览卡业务化 | P0 | `src/views/dashboard/index.vue` | 无 |
| P0-2 | 工作台图表标题与实现对齐 | P0 | `src/views/dashboard/index.vue` | 无 |
| P0-3 | 办公控制台统计与入口修正 | P0 | `src/views/office/console/index.vue`、`src/views/office/bindings/index.vue`（query 预填） | 无 |
| P1-1 | 我的事项区块（工作流/审批/站内信/日程四域） | P1 | 新增 `src/composables/useAgenda.ts`、`src/views/dashboard/components/AgendaPanel.vue`；改 `src/types/index.ts`、`src/views/dashboard/index.vue` | 无 |
| P1-2 | 通知区块（仅展示/已读）+ 手动刷新 | P1 | `useAgenda.ts`、`AgendaPanel.vue` | P1-1 |
| P2-1 | 行级深链接定位（AgendaPanel + 全局搜索） | P2（另立项） | 待定 | P1 完成 |

各项相互独立可单独执行，P0 三项与 P1 无依赖关系。

## 2. P0-1 工作台跨域概览卡业务化

### 2.1 现状与问题

[dashboard/index.vue](../../../../src/views/dashboard/index.vue) 的「数据总览（跨域只读聚合）」区块：

1. `flattenSource()` 直接把后端 `data` 的字段名作为展示 key，嵌套对象转 JSON 字符串展示；
2. 未展示响应中的 `tenantId`、`generatedAt`；
3. `loadCrossOverview()` 整体异常静默吞掉，用户无法区分「聚合服务不可用」「单源降级」「真实空数据」；
4. 数值无单位与业务名称，不可信也不可读。

### 2.2 改动步骤

1. **字段映射表**：在组件内维护 `FIELD_LABELS: Record<string, Record<string, string>>`，按 `file / workflow / integration` 三个来源维护 `字段 key → 中文名（单位）`；未登记的 key 回退显示原 key（联调时按真实响应补充映射，不在本步猜测后端字段，执行细则见 [FIELD_LABELS 联调后映射补充方案](frontend-field-labels-mapping-plan-2026-11-11.md)）。
2. **值格式化**：对象/数组类型不再 `JSON.stringify` 展示——数组显示「N 项」，对象不展示（只展示可读标量）；`null/undefined` 过滤保持现状。
3. **元信息展示**：卡片头部右侧展示 `generatedAt`（原值）与 `tenantId`（存在时）。
4. **状态分类**：来源卡片三态——`UP`（正常字段列表）、`DEGRADED`（显示后端 `error` 文案）、整体失败（区块级提示「聚合服务暂不可用」+ 重试按钮）；`loadCrossOverview` 不再静默吞异常，改为记录失败状态。

### 2.3 验收标准

- [ ] 三个来源卡片均展示中文业务名称，无裸 JSON 字符串；
- [ ] 聚合端点失败时区块显示明确失败态并可手动重试，且不影响页面其他数据；
- [ ] 单源 `DEGRADED` 时该源卡片显示后端 error 文案，其余源正常；
- [ ] `generatedAt` / `tenantId` 可见（后端返回时）。

## 3. P0-2 工作台图表标题与实现对齐

### 3.1 现状与问题

图表使用 `series.type = 'bar'`，横轴为累计请求、4xx、5xx、网关请求、限流拒绝、熔断打开六类**累计分类计数**，不是时间序列；标题「接口调用趋势」及注释与实现不符。

### 3.2 改动步骤

1. 标题改为「接口调用分类统计（累计值）」，组件内相关注释同步修正；
2. 不在本步内改接时序数据——如需真实趋势图，属图表数据源改造，另立项（后端需提供分时聚合端点，当前 `getMonitorOverview` 无此契约）。

### 3.3 验收标准

- [ ] 标题、注释与图表实际内容一致，无「趋势」误导表述。

## 4. P0-3 办公控制台统计与入口修正

### 4.1 现状与问题

[console/index.vue](../../../../src/views/office/console/index.vue) `loadData()`：

1. 用数组口径 `listBindings(platform, 1, 100)` 的数组长度当总数与待审批数，不代表全量；
2. 单平台查询异常被 `catch` 静默忽略，初始零值被误读为真实零；
3. `goToBindings(_platform)` 忽略平台参数，跳转不带上下文；
4. 组织同步/消息/审批/日历预告卡无入口（对应页面均已登记 VIEW_REGISTRY）。

### 4.2 改动步骤

1. **统计改真实分页**：每平台两个请求（共 6 个，并行执行）：
   - `listBindingsPage(platform, undefined, 1, 1)` → 读 `total` 作为绑定总数；
   - `listBindingsPage(platform, 'PENDING', 1, 1)` → 读 `total` 作为待审批数。
   函数签名见 [office-platform.ts](../../../../src/api/office-platform.ts) `listBindingsPage(platform, status, page, size)`。
2. **失败显式化**：`bindingStats` 值结构改为 `{ total: number | null; pending: number | null; error: boolean }`；单平台失败时该平台卡片显示「查询失败」占位，不再展示误导性 0；整体加载失败保留现有 `showError`。
3. **跳转传上下文**：`goToBindings(platform)` 改为 `router.push({ path: '/office/bindings', query: { platform } })`；[bindings 页](../../../../src/views/office/bindings/index.vue)初始化时读取 `route.query.platform` 预填平台筛选（实施时先核对该页现有筛选初始化逻辑，改动限于初始化读取，不改查询契约）。
4. **预告卡接通**：四张预告卡增加「进入」入口，分别跳 `/office/organization`、`/office/message`、`/office/approval`、`/office/calendar`。

### 4.3 验收标准

- [ ] 绑定总数与待审批数为后端真实 `total`，与绑定审批页数据一致；
- [ ] 单平台接口失败时该平台卡片显示失败态，其余平台正常；
- [ ] 从控制台点击某平台进入绑定审批页后，平台筛选已预填；
- [ ] 四张预告卡可跳转到对应已注册页面。

## 5. P1-1 我的事项区块（四域）

### 5.1 数据源契约（已核对）

| 区块 | 函数 | 签名与路径 | 响应 |
| --- | --- | --- | --- |
| 工作流待办 | `getMyPendingTasks` | [workflow.ts](../../../../src/api/workflow.ts) `({ pageNum, pageSize })` → `GET /api/v1/workflows/tasks/pending` | `PageResponse<WorkflowPendingTask>`，读 `list/total`；字段 `taskName/startTime` 等**实施第一步校准** |
| 办公审批待办 | `getPendingApprovals` | [office-approval.ts](../../../../src/api/office-approval.ts) | `list/total`；字段 `processName/currentNode/createdAt` |
| 站内信收件箱 | `listInboxMessages` | [message.ts](../../../../src/api/message.ts) `(pageNum, pageSize)` → `GET /api/v1/messages/inbox` | **裸数组 `InternalMessage[]`**；字段 `subject/senderName/sendTime/readStatus` |
| 近期日程 | `getCalendarEvents` | [office-calendar.ts](../../../../src/api/office-calendar.ts) | `CalendarEventsQuery` 必填 `pageNum/pageSize`，可选 `startTime/endTime/platform/status` → `PageResponse<CalendarEvent>`；字段 `title/startTime/platform` |
| （P1-2）系统通知 | `listNotifications` | [notification.ts](../../../../src/api/notification.ts) `({ page, size, unreadOnly? })` | `PageResponse<SystemNotification>`；字段 `content/msgType/readAt/createTime`；已读操作 `markNotificationRead(id)` |

### 5.2 类型定义（`src/types/index.ts` 追加）

```ts
export type AgendaDomain = 'workflow' | 'office-approval' | 'message' | 'calendar' | 'notification'

export interface AgendaItem {
  domain: AgendaDomain
  kind: string            // 原始类型透传（TASK / messageType / msgType），不归一化语义
  title: string
  subtitle?: string
  time?: string           // 后端原值，不做时区换算
  unread?: boolean
  href?: string           // 通知区块为空（无独立页面，不跳转）
  hrefLabel?: string
}

export interface AgendaSection {
  domain: AgendaDomain
  label: string
  items: AgendaItem[]
  loading: boolean
  error: string | null    // 区块级错误文案，不弹全局提示
  truncated: boolean      // 「仅展示前 N 条」口径标注
  totalHint?: string      // 可信 total，或「总数未知（接口返回列表）」
}
```

### 5.3 适配器（新增 `src/composables/useAgenda.ts`）

```ts
import { ref } from 'vue'
import type { AgendaSection } from '@/types'
import { getMyPendingTasks } from '@/api/workflow'
import { getPendingApprovals } from '@/api/office-approval'
import { listInboxMessages } from '@/api/message'
import { getCalendarEvents } from '@/api/office-calendar'

const PAGE_SIZE = 5

export function useAgenda() {
  const sections = ref<AgendaSection[]>([
    { domain: 'workflow', label: '工作流待办', items: [], loading: true, error: null, truncated: false },
    { domain: 'office-approval', label: '办公审批', items: [], loading: true, error: null, truncated: false },
    { domain: 'message', label: '站内信', items: [], loading: true, error: null, truncated: false },
    { domain: 'calendar', label: '近期日程', items: [], loading: true, error: null, truncated: false },
  ])

  const setSection = (domain: AgendaSection['domain'], patch: Partial<AgendaSection>) => {
    const s = sections.value.find((s) => s.domain === domain)
    if (s) Object.assign(s, patch)
  }

  async function loadAll(): Promise<void> {
    // 各域独立执行、独立 catch，互不阻塞；失败落在区块级 error，不调 showError
    await Promise.allSettled([
      loadWorkflow(),
      loadApprovals(),
      loadMessages(),
      loadCalendar(),
    ])
  }

  async function loadWorkflow(): Promise<void> {
    setSection('workflow', { loading: true, error: null })
    try {
      const page = await getMyPendingTasks({ pageNum: 1, pageSize: PAGE_SIZE })
      const list = page.list ?? []
      setSection('workflow', {
        loading: false,
        items: list.map((t) => ({
          domain: 'workflow', kind: 'TASK',
          // WorkflowPendingTask 字段实施第一步校准
          title: t.taskName ?? `任务 #${t.id}`,
          subtitle: t.nodeCode || t.assigneeName || undefined,
          time: t.startTime,
          href: '/workflow/monitor', hrefLabel: '去办理',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('workflow', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadApprovals(): Promise<void> {
    setSection('office-approval', { loading: true, error: null })
    try {
      const page = await getPendingApprovals({ pageNum: 1, pageSize: PAGE_SIZE } as never)
      const list = page.list ?? []
      setSection('office-approval', {
        loading: false,
        items: list.map((a) => ({
          domain: 'office-approval', kind: 'APPROVAL',
          title: a.processName,
          subtitle: a.currentNode,
          time: a.createdAt,
          href: '/office/approval', hrefLabel: '去审批',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('office-approval', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadMessages(): Promise<void> {
    setSection('message', { loading: true, error: null })
    try {
      // 裸数组：无 total，不把数组长度伪装成总数
      const list = await listInboxMessages(1, PAGE_SIZE)
      setSection('message', {
        loading: false,
        items: list.map((m) => ({
          domain: 'message', kind: m.messageType ?? 'MESSAGE',
          title: m.subject,
          subtitle: m.senderName || undefined,
          time: m.sendTime,
          unread: m.readStatus === false,
          href: '/office/message', hrefLabel: '去查看',
        })),
        truncated: list.length >= PAGE_SIZE,
        totalHint: '总数未知（接口返回列表）',
      })
    } catch {
      setSection('message', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadCalendar(): Promise<void> {
    setSection('calendar', { loading: true, error: null })
    try {
      const now = new Date()
      const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
      const page = await getCalendarEvents({
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        pageNum: 1,
        pageSize: PAGE_SIZE,
      })
      const list = page.list ?? []
      setSection('calendar', {
        loading: false,
        items: list.map((e) => ({
          domain: 'calendar', kind: 'EVENT',
          title: e.title,
          subtitle: e.platform,
          time: e.startTime,
          href: '/office/calendar', hrefLabel: '查看日程',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('calendar', { loading: false, error: '暂时无法加载' })
    }
  }

  return { sections, loadAll }
}
```

说明：

- `getPendingApprovals` 实际查询参数类型（是否含状态过滤）实施时按其签名校准，示例中以 `as never` 规避未知字段，实施后改为精确类型，**不得保留断言上线**。
- 不做跨域合并排序、不做统一未读总数（各域已读语义不同）。

### 5.4 组件（新增 `src/views/dashboard/components/AgendaPanel.vue`）

- 布局：`<script setup lang="ts">` + Element Plus；每域一个 `el-card`，卡片头为区块名 + `totalHint`，底部「去处理」链接跳 `href`。
- 条目行：未读点（`unread`）+ 标题 + 副标题 + 时间原值；点击行 = 点击链接，同一跳转。
- 状态：`loading` 用 `el-skeleton`；`error` 显示文案 + 重试按钮（重试只重载该域）；空列表用现有 `EmptyState` 组件。
- `truncated` 时显示「仅展示前 5 条，去处理页查看全部」。
- 不提供任何办理操作（通过/驳回/已读等均在原域页面完成）。

### 5.5 挂载

[dashboard/index.vue](../../../../src/views/dashboard/index.vue) 在「数据总览」区块附近插入 `<AgendaPanel />`；`onMounted` 调用 `loadAll()` 一次；不做自动轮询。

### 5.6 验收标准

- [ ] 四个区块并行加载，任一域失败只影响本区块（显示失败态 + 重试），其余正常；
- [ ] 站内信区块显示「总数未知」而非伪造 total；
- [ ] 各区块点击跳转到对应已注册页面，办理动作仅存在于原域页面；
- [ ] 聚合端点 403（能力未开通）时区块显示失败态，不弹全局错误。

## 6. P1-2 通知区块 + 手动刷新

### 6.1 改动步骤

1. `useAgenda` 增加 `notification` 适配器：`listNotifications({ page: 1, size: PAGE_SIZE })`；条目 `title` 取 `content`（超长前端截断展示），`unread = readAt === null`，`time = createTime`，**`href` 留空**。
2. 通知区块条目操作为「标记已读」：调 `markNotificationRead(id)`，成功后本地更新该条 `readAt`；失败提示保留在该条目行内，不弹全局。
3. 面板头部增加手动「刷新」按钮，触发 `loadAll()`。
4. 不新增轮询；后续如需实时，复用 AdminLayout 已有 WS/SSE 钩子触发一次 `loadAll`（不在本步实现）。

### 6.2 验收标准

- [ ] 通知条目可标记已读且状态即时更新；
- [ ] 通知区块无跳转入口（不伪造独立页面）；
- [ ] 手动刷新可重载全部区块且失败隔离行为不变。

## 7. P2-1 行级深链接定位（另立项，仅登记范围）

1. AgendaPanel 条目跳转带行级 query（如 `/office/approval?processInstanceId=x`），目标页消费 query 定位到具体记录；
2. 全局搜索 [GlobalSearch](../../../../src/components/GlobalSearch/index.vue) 现有 `?id=` 六类跳转的深链接消费验证与补齐；
3. 验收：跳转后页面定位到具体记录，不依赖用户手动查找。本项需逐页核对消费逻辑，独立立项执行。

## 8. 测试与验证计划

### 8.1 新增单测（Vitest，mock 请求层）

新增 `src/composables/__tests__/useAgenda.test.ts`，用例：

1. 各适配器成功路径：`items` 映射正确、`totalHint` 取真实 `total`；
2. 站内信裸数组：`truncated=true`（条数 ≥5）且 `totalHint='总数未知'`；
3. 任一域 reject：仅该域 `error` 置位，其余域数据正常（失败隔离）；
4. 重试：单域重载成功后 `error` 清空；
5. `truncated` 判定：`total > list.length` 才为 true；
6. 通知标记已读（P1-2）：成功后本地 `readAt` 更新，失败不影响其他条目。

### 8.2 既有验证

- `npx vue-tsc --noEmit`：类型检查通过；
- `npx vitest run`：全量测试通过（基线 27 文件 214 用例）；
- 手动验证矩阵（dev 环境，`VITE_API_PROXY_TARGET` 指向联调后端）：正常数据、单域 403、单域超时、空列表、后端整体不可达五种情形下，工作台各区块与办公控制台表现符合各节验收标准。

### 8.3 手动验证矩阵执行记录（2026-11-11）

因无联调后端，采用「Node 桩后端（`VITE_API_PROXY_TARGET` 默认指向 127.0.0.1:8080）+ 真实浏览器」方式执行，桩以 `SCENARIO` 环境变量切换场景（normal / 403 / timeout / empty / down / downov），会话通过注入 `apex.admin.token` 与 `apex.admin.refresh-token` 绕过登录（身份由桩端点提供）。结果：

| 情形 | 验证点 | 结果 |
| --- | --- | --- |
| 1 正常数据 | 工作台五域均有条目且无「暂时无法加载」；概览卡显示 `tenantId=t-demo` 与 `generatedAt`；图表标题「接口调用分类统计（累计值，进程启动以来）」 | 通过 |
| 1 正常数据（办公控制台） | 三平台绑定统计显示真实 total（飞书 5/2、钉钉 3/0、企业微信 3/0）、无「查询失败」；`/office/bindings?platform=FEISHU` 平台筛选预填且列表 5 条 | 通过 |
| 2 单域 403 | 仅办公审批区块「暂时无法加载」+ 重试，其余四域与概览卡正常，无全局弹窗 | 通过 |
| 3 单域超时 | 约 30s 后审批区块转「暂时无法加载」+ 重试，其余四域正常；网络面板显示审批请求在 30s 处 `error: timeout` | 通过（注 1） |
| 4 空列表 | 五域均空态、无错误无卡骨架；工作流「共 0 条」、站内信「总数未知」；概览卡正常 | 通过 |
| 5 后端整体不可达 | 整页刷新被守卫重定向登录（身份初始化失败，符合既有路由守卫设计）；**已加载页面**后端宕机后点「手动刷新」：五域全部「暂时无法加载」+ 重试、页面框架完整不白屏；聚合端点失败（身份端点正常）时概览卡显示「聚合服务暂不可用」+ 重试，点击重试仍稳定失败态、无崩溃 | 通过（注 2） |

注 1：dev 环境下 mockjs 全局替换 `XMLHttpRequest`，其对透传请求在 `open()` 时同步属性，而 axios 在 `open()` 之后才赋值 `request.timeout`，导致该值仅落在包装对象上、原生 XHR 超时不生效——**dev + mock 启用时会破坏全部 axios 请求的 30s 超时语义（既有问题，与本次改动无关）**。情形 3 在临时禁用 mock 动态加载后复验通过，随后已还原 `main.ts`。生产构建不加载 mock，不受影响。

注 2：概览卡初次加载成功后无刷新入口，后端宕机时保持最后一次成功数据（无自动轮询，属设计行为）；「聚合服务暂不可用」失败态在「页面加载时聚合端点失败但身份端点正常」场景下可达并已验证。真实联调时若网关行为与桩不同（如网关 502/504 状态码差异），错误提示文案可能略有差异，失败态与重试路径一致。

## 9. 实施顺序

1. **第 1 步（P0-2）**：图表标题修正——最小改动，先行验证流程；
2. **第 2 步（P0-1）**：概览卡业务化——含字段映射，需联调环境核对真实响应后补全映射表；
3. **第 3 步（P0-3）**：办公控制台修正——含 bindings 页 query 预填核对；
4. **第 4 步（P1-1）**：useAgenda + AgendaPanel 四域——第一步先校准 `WorkflowPendingTask` 与 `getPendingApprovals` 实际字段；
5. **第 5 步（P1-2）**：通知区块 + 手动刷新；
6. P2-1 另立项，不在本方案执行范围。

每步完成后独立运行 8.2 的静态验证；P0 三项与 P1 无依赖，可按需调整顺序。全程不执行 Git commit（用户明确要求时才提交）。

## 10. 风险与约束

| 风险 | 处置 |
| --- | --- |
| `WorkflowPendingTask`、`getPendingApprovals` 实际字段与本方案示例存在差异 | P1 第 4 步实施前先读 `types/workflow.ts` 与函数签名校准，不改后端契约 |
| bindings 页是否已支持 `query.platform` 预填 | P0-3 实施时核对，改动限于初始化读取 |
| 后端鉴权/租户隔离/能力门禁行为未审计 | 前端不做权限过滤，失败一律走区块级降级；403 引导复用 `showError` 既有机制 |
| 各域接口不可用导致工作台请求放大 | 每域仅 1 个请求（控制台统计为每平台 2 个小请求），无轮询，无自动重试 |
| 聚合展示与真实统计口径偏差 | 全部展示真实 `total` 或显式「总数未知」，不伪造数值 |

## 11. 文档同步义务

- 各步实施完成后，更新 [AGENTS.md](../../../AGENTS.md) 阅读导航与排障表（如「工作台」「办公控制台」「我的事项」相关条目）；
- 上游评审文档第 4 节与本方案状态同步改为「已实施（部分/全部）」；
- `docs/README.md` 导航状态说明同步更新。
