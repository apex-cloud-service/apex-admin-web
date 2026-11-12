# 领域模型与状态机图

> 本文补齐 classDiagram（类图）、stateDiagram（状态机）与两份聚合时序图，全部依据 `src/types/`、`src/api/`、`src/composables/` 当前实现绘制；发现偏差以代码为准并回改本文。字段为选摘（非全量复制），完整定义以 [src/types/index.ts](../../src/types/index.ts)、[src/types/workflow.ts](../../src/types/workflow.ts) 为准。既有 flowchart/时序图集中在 [AGENTS.md](../../AGENTS.md) 与 [总体架构](overview.md)、[认证与路由](auth-and-routing.md)。

## 1. 核心领域模型

覆盖统一响应契约、RBAC（用户/角色/菜单/部门）、租户域（租户/套餐/能力）、工作流域与办公平台绑定五个截面：

```mermaid
classDiagram
    class Result~T~ {
        +number code
        +string msg
        +T data
        +string traceId
    }
    class PageResponse~T~ {
        +T[] list
        +number total
        +number pageNum
        +number pageSize
        +number pages
        +boolean hasNext
    }

    class AdminUser {
        +string id
        +string nickname
        +string avatarUrl
        +string phone
        +number status
        +AdminRole[] roles
    }
    class AdminRole {
        +string id
        +string name
        +string code
    }
    class MenuNode {
        +number id
        +number parentId
        +string menuName
        +number menuType
        +string path
        +string component
        +string perms
        +number visible
        +number status
        +MenuNode[] children
    }
    class DeptNode {
        +number id
        +number parentId
        +string name
        +number orderNum
        +string leader
        +number status
        +DeptNode[] children
    }

    class TenantInfo {
        +number id
        +string tenantCode
        +string tenantName
        +string packageCode
        +string expireTime
        +string status
        +number maxUsers
        +number maxStorageMb
        +number version
    }
    class TenantPackage {
        +number id
        +string packageCode
        +string packageName
        +number[] menuIds
        +string[] permissionCodes
        +string[] features
        +number status
        +number version
    }
    class CapabilityInfo {
        +string code
        +string name
        +string center
        +string component
        +string[] openScopes
    }

    class WorkflowInstance {
        +number id
        +number definitionId
        +string processCode
        +string title
        +string status
        +number initiatorId
        +string businessKey
        +string currentNodeId
        +boolean suspended
    }
    class WorkflowTask {
        +number id
        +number instanceId
        +string taskName
        +string status
        +number assigneeId
        +string assigneeName
    }
    class OfficeBindingResponse {
        +number id
        +number userId
        +string platform
        +string externalUserId
        +string status
        +number version
    }

    AdminUser "1" o-- "0..*" AdminRole : roles
    MenuNode "1" --> "0..*" MenuNode : children
    DeptNode "1" --> "0..*" DeptNode : children
    TenantInfo ..> TenantPackage : packageCode 引用套餐
    TenantPackage ..> CapabilityInfo : features 订阅（空集合=未订阅）
    WorkflowInstance "1" *-- "0..*" WorkflowTask : tasks（实例详情聚合）
```

要点：

- `Result`/`PageResponse` 是统一包装契约；**部分端点返回裸数组**（如 MFA 配置、IP 规则、站内信收件箱、SSO 会话等，见 [API 目录](../api/README.md) 各表 ⚠️ 标注），调用方不得假设都有 `Result` 包装。
- `MenuNode.menuType`：0=目录、1=菜单、2=按钮，仅 0/1 参与动态路由转换；`visible=0` 仅隐藏侧边栏，路由仍可访问。
- `TenantPackage` 的集合字段语义不一致：`menuIds`/`permissionCodes` 空集合=全量放行，`features` 空集合=未订阅。
- `OfficeBindingResponse.userId` 关联系统用户，`platform` 为 `FEISHU/DINGTALK/WECOM`；审批与解绑均携带 `version` 乐观锁。

## 2. 状态机

### 2.1 工作流实例状态

状态枚举见 [src/types/workflow.ts:103](../../src/types/workflow.ts)；前端仅封装发起（固定 `RUNNING`）、挂起与恢复三个实例级动作，其余迁移由后端引擎驱动：

```mermaid
stateDiagram-v2
    [*] --> RUNNING : startWorkflowInstance（businessKey 必填，固定 RUNNING）

    RUNNING --> SUSPENDED : suspend（原因必填）
    SUSPENDED --> RUNNING : resume（原因必填）

    RUNNING --> APPROVED : 后端引擎驱动
    RUNNING --> REJECTED : 后端引擎驱动
    RUNNING --> CANCELLED : 后端引擎驱动
    RUNNING --> TERMINATED : 后端引擎驱动

    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
    TERMINATED --> [*]
```

- 枚举中的 `DRAFT` 为后端契约保留值；前端发起的实例固定为 `RUNNING`，页面不产生 `DRAFT`。
- 任务级操作（`/api/workflow/**`）：回退（rollback）、转办（transfer）、委派（delegate）；任务办理仅 complete+comment（固定为通过语义）。任务状态枚举为 `PENDING/APPROVED/REJECTED/ROLLED_BACK/DELEGATED/CANCELLED`。

### 2.2 租户生命周期

状态枚举见 [src/api/tenant.ts](../../src/api/tenant.ts) `TENANT_STATUS_NAMES`；前端仅提交小写动作枚举，**迁移合法性由后端状态机校验**（`expectedVersion` 可选乐观锁），下图体现动作语义的主要路径：

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : createTenant（套餐必选，可同时创建管理员）

    ACTIVE --> DISABLED : disable
    DISABLED --> ACTIVE : enable
    ACTIVE --> FROZEN : freeze
    FROZEN --> ACTIVE : unfreeze
    ACTIVE --> DEACTIVATED : deactivate
    DEACTIVATED --> ARCHIVED : archive

    DEACTIVATED --> [*]
    ARCHIVED --> [*]
```

- 配额调整（`PUT /{id}/quota`）不改变状态；`maxUsers`/`maxStorageMb` 提交 `null` 表示不限。
- 其他状态（如 `DISABLED`/`FROZEN`）出发的 deactivate/archive 迁移以后端实现为准，图中未画。

### 2.3 办公平台账号绑定

状态过滤枚举见 [src/api/office-platform.ts](../../src/api/office-platform.ts) `listBindingsPage`（`/bindings/page` 服务端过滤）；绑定申请由后端在平台授权登录时生成：

```mermaid
stateDiagram-v2
    [*] --> PENDING : 平台授权登录（后端生成绑定申请）

    PENDING --> APPROVED : review(approved=true, version)
    PENDING --> REJECTED : review(approved=false, version)
    APPROVED --> REVOKED : DELETE /bindings/{id}/unbind（version 乐观锁）

    APPROVED --> [*]
    REJECTED --> [*]
    REVOKED --> [*]
```

- 审批/解绑携带 `version` 乐观锁，并发修改由后端拒绝。
- 办公控制台统计走 `listBindingsPage`：每平台两个 `page=1,size=1` 计数请求（全部状态 / `PENDING`）读取真实 `total`。

## 3. 聚合时序图

### 3.1 我的事项：五域并行聚合

实现见 [src/composables/useAgenda.ts](../../src/composables/useAgenda.ts)，由工作台 [AgendaPanel.vue](../../src/views/dashboard/components/AgendaPanel.vue) 消费：

```mermaid
sequenceDiagram
    autonumber
    participant P as AgendaPanel.vue
    participant U as useAgenda
    participant W as api/workflow
    participant A as api/office-approval
    participant M as api/message
    participant C as api/office-calendar
    participant N as api/notification

    P->>U: loadAll()
    par 五域并行（Promise.allSettled，互不阻塞）
        U->>W: getMyPendingTasks(pageNum=1, pageSize=5)
        W-->>U: PageResponse{list, total}
    and
        U->>A: getPendingApprovals(approverId, pageNum=1, pageSize=5)
        A-->>U: PageResponse{list, total}
    and
        U->>M: listInboxMessages(1, 5)
        M-->>U: 裸数组（无 total）
    and
        U->>C: getCalendarEvents(未来 7 天窗口, pageNum=1, pageSize=5)
        C-->>U: PageResponse{list, total}
    and
        U->>N: listNotifications(page=1, size=5)
        N-->>U: PageResponse{list, total}
    end

    Note over U,P: 单域失败→该区块级 error「暂时无法加载」+ 重试入口（reload(domain)），不弹全局提示
    Note over P: 审批区块 approverId 取 identity.id，缺失→区块错误态；站内信 totalHint「总数未知」；通知标题超 50 字截断

    P->>U: markRead(item)
    U->>N: markNotificationRead(id)
    alt 成功
        N-->>U: 本地 unread=false
    else 失败
        N-->>P: 行内「标记已读失败」
    end
```

面板只做展示与跳转（各域原页面办理），无轮询、无办理操作。

### 3.2 数据总览：D5 跨域聚合

实现见 [src/views/dashboard/index.vue](../../src/views/dashboard/index.vue) `loadCrossOverview`，消费 [src/api/overview.ts](../../src/api/overview.ts)：

```mermaid
sequenceDiagram
    autonumber
    participant V as dashboard/index.vue
    participant API as api/overview.ts
    participant B as 后端聚合接口

    V->>API: getCrossDomainOverview()
    API->>B: GET /api/v2/overview（租户取可信上下文，权限 system:monitor:view）

    alt 聚合成功
        B-->>V: sources{file, workflow, integration}
        V->>V: FIELD_LABELS 映射字段中文名（未登记 key 回退原字段名）
        V->>V: 字节字段 formatBytes；数组值显示「N 项」；嵌套对象不展示
        V->>V: source.result.status=UP → 「可用」，否则显示「降级」
    else 整体失败
        B-->>V: 请求错误
        V->>V: 区块级失败态 + 「重试」按钮（重新 loadCrossOverview）
    end

    Note over V,B: 单源降级返回 sources.*.status=DEGRADED 属正常展示（对应内部端点不可达），不作为页面错误
```

---

**最后更新时间**：2026-11-13
