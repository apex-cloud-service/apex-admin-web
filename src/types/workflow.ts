/**
 * 工作流相关类型定义
 * 
 * 定义工作流系统的所有TypeScript类型，包括：
 * - 工作流定义：流程图节点、边和定义对象
 * - 工作流实例：流程实例和详情
 * - 工作流任务：任务对象和审批记录
 * - 统计数据：统计和趋势分析
 * - 请求参数：各API接口的payload类型
 * 
 * @module types/workflow
 */

// ========== 工作流定义 ==========

/**
 * 工作流节点
 * 
 * 表示工作流流程图中的一个节点，可以是开始节点、用户任务节点、网关节点或结束节点
 */
export interface WorkflowNode {
  /** 节点唯一标识符 */
  nodeId: string
  /** 节点类型：START-开始节点，USER_TASK-用户任务节点，GATEWAY-网关节点，END-结束节点 */
  nodeType: 'START' | 'USER_TASK' | 'GATEWAY' | 'END'
  /** 节点显示名称 */
  nodeName: string
  /** 审批人类型：USER-指定用户，ROLE-指定角色，DEPT-指定部门 */
  approverType?: 'USER' | 'ROLE' | 'DEPT'
  /** 审批人值，根据approverType可能是用户ID、角色ID或部门ID */
  approverValue?: string
  /** 审批策略：ANY-任意一人审批即可，ALL-需要所有人审批 */
  approvalStrategy?: 'ANY' | 'ALL'
  /** 超时时长（小时） */
  timeoutHours?: number
  /** 超时后的处理动作 */
  timeoutAction?: string
  /** 节点在流程图中的位置坐标 */
  position?: { x: number; y: number }
}

/**
 * 工作流连线
 * 
 * 表示工作流流程图中的一条连线，连接两个节点
 */
export interface WorkflowEdge {
  /** 连线唯一标识符 */
  edgeId: string
  /** 源节点ID */
  sourceNodeId: string
  /** 目标节点ID */
  targetNodeId: string
  /** 流转条件表达式，用于网关节点的条件判断 */
  condition?: string
}

/**
 * 工作流定义
 * 
 * 表示一个完整的工作流流程定义，包含所有节点和连线配置
 */
export interface WorkflowDefinition {
  /** 流程定义ID */
  id?: number
  /** 流程编码，全局唯一 */
  code: string
  /** 流程名称 */
  name: string
  /** 流程描述 */
  description?: string
  /** 版本号 */
  version: number
  /** 是否启用 */
  enabled: boolean
  /** 流程节点列表 */
  nodes: WorkflowNode[]
  /** 流程连线列表 */
  edges: WorkflowEdge[]
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
}

// ========== 工作流实例 ==========

/**
 * 工作流实例
 * 
 * 表示一个正在运行或已完成的工作流流程实例
 */
export interface WorkflowInstance {
  /** 实例ID */
  id: number
  /** 流程定义ID */
  definitionId: number
  /** 流程编码 */
  processCode: string
  /** 实例标题 */
  title: string
  /** 实例状态：DRAFT-草稿，RUNNING-运行中，APPROVED-已通过，REJECTED-已拒绝，CANCELLED-已取消，TERMINATED-已终止，SUSPENDED-已挂起 */
  status: 'DRAFT' | 'RUNNING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TERMINATED' | 'SUSPENDED'
  /** 发起人ID */
  initiatorId: number
  /** 发起人姓名 */
  initiatorName: string
  /** 业务主键，用于关联业务数据 */
  businessKey: string
  /** 当前所在节点ID */
  currentNodeId?: string
  /** 流程开始时间 */
  startTime?: string
  /** 流程结束时间 */
  endTime?: string
  /** 创建时间 */
  createTime: string
  /** 是否已挂起 */
  suspended?: boolean
}

/**
 * 工作流实例详情
 * 
 * 包含实例的完整信息，包括流程定义、任务列表等
 */
export interface WorkflowInstanceDetail {
  /** 流程实例基本信息 */
  instance: WorkflowInstance
  /** 流程定义信息 */
  definition: WorkflowDefinition
  /** 任务列表 */
  tasks: WorkflowTask[]
  /** 当前节点ID */
  currentNodeId?: string
}

// ========== 工作流任务 ==========

/**
 * 工作流任务
 * 
 * 表示流程实例中的一个待办任务或已完成任务
 */
export interface WorkflowTask {
  /** 任务ID */
  id: number
  /** 所属流程实例ID */
  instanceId: number
  /** 任务名称 */
  taskName: string
  /** 任务类型 */
  taskType: string
  /** 任务状态：PENDING-待处理，APPROVED-已通过，REJECTED-已拒绝，ROLLED_BACK-已回退，DELEGATED-已委派，CANCELLED-已取消 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ROLLED_BACK' | 'DELEGATED' | 'CANCELLED'
  /** 处理人ID */
  assigneeId: number
  /** 处理人姓名 */
  assigneeName: string
  /** 处理意见 */
  comment?: string
  /** 所在节点ID */
  nodeId: string
  /** 节点编码 */
  nodeCode?: string
  /** 任务开始时间 */
  startTime: string
  /** 任务完成时间 */
  completedTime?: string
  /** 创建时间 */
  createTime: string
  /** 创建时间（兼容字段） */
  createdTime?: string
  /** 超时时间 */
  timeoutAt?: string
  /** 超时处理策略：ESCALATE-升级，AUTO_COMPLETE-自动完成，NOTIFY-通知 */
  timeoutStrategy?: 'ESCALATE' | 'AUTO_COMPLETE' | 'NOTIFY'
  /** 转办来源用户ID */
  transferredFrom?: number
  /** 转办来源用户姓名 */
  transferredFromName?: string
}

// ========== 审批记录 ==========

/**
 * 审批记录
 * 
 * 记录任务的审批历史
 */
export interface ApprovalRecord {
  /** 记录ID */
  id: number
  /** 任务ID */
  taskId: number
  /** 审批人ID */
  approverId: number
  /** 审批人姓名 */
  approverName: string
  /** 审批结果：APPROVED-通过，REJECTED-拒绝 */
  result: 'APPROVED' | 'REJECTED'
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  createTime: string
}

// ========== 统计数据 ==========

/**
 * 工作流统计数据
 * 
 * 提供工作流系统的整体统计信息
 */
export interface WorkflowStatistics {
  /** 今日新增流程实例数 */
  todayStarted: number
  /** 运行中的流程实例总数 */
  runningTotal: number
  /** 待处理任务总数 */
  pendingTaskTotal: number
  /** 平均完成时长（秒） */
  avgCompletionSeconds: number
  /** 各状态的流程实例分布，key为状态，value为数量 */
  statusDistribution: Record<string, number>
  /** 挂起的流程实例数 */
  suspendedCount?: number
  /** 超时的任务数 */
  timeoutCount?: number
  /** 转办的任务数 */
  transferredCount?: number
}

/**
 * 工作流趋势数据
 * 
 * 提供一段时间内工作流的趋势变化
 */
export interface WorkflowTrend {
  /** 日期列表 */
  dates: string[]
  /** 每日新增流程实例数列表 */
  startedCounts: number[]
  /** 每日完成流程实例数列表 */
  completedCounts: number[]
}

// ========== 请求参数 ==========

/**
 * 流程实例查询参数
 *
 * 用于查询流程实例列表的过滤和分页参数
 */
export interface InstanceQueryParams {
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
  /** 流程状态过滤 */
  status?: string
  /** 发起人ID过滤 */
  initiatorId?: number
}

/**
 * 待办任务
 *
 * 对应后端 WorkflowTaskDTO（/api/v1/workflows/tasks/pending），
 * status 枚举与实例任务列表（WorkflowTask）不同
 */export interface WorkflowPendingTask {
  /** 任务 ID */
  id: number
  /** 所属流程实例 ID */
  instanceId: number
  /** 任务名称 */
  taskName: string
  /** 任务类型（USER_TASK/SERVICE_TASK） */
  taskType?: string
  /** 任务状态 */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  /** 办理人 ID */
  assigneeId?: number
  /** 办理人姓名 */
  assigneeName?: string
  /** 开始时间 */
  startTime?: string
  /** 完成时间 */
  completedTime?: string
  /** 审批意见 */
  comment?: string
  /** 所在节点 ID */
  nodeId?: string
  /** 创建时间 */
  createTime?: string
}

/**
 * 发起的流程实例
 *
 * 对应后端 ProcessInstance 领域对象（POST /api/v1/workflows/{code}/instances 响应），
 * 新建实例 status 固定为 RUNNING
 */
export interface WorkflowStartedInstance {
  /** 实例 ID */
  id: number
  /** 流程定义 ID */
  workflowDefinitionId?: number
  /** 业务主键 */
  businessKey: string
  /** 实例状态 */
  status: string
  /** 发起人 ID */
  initiatorId?: number
  /** 流程上下文 JSON 字符串 */
  contextJson?: string
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 创建时间 */
  createTime?: string
}

/**
 * 任务回退参数
 *
 * 用于将任务回退到指定节点
 */
export interface RollbackTaskPayload {
  /** 目标节点编码 */
  targetNodeCode: string
  /** 回退原因 */
  reason: string
}

/**
 * 任务转办参数
 * 
 * 用于将任务转交给其他人处理
 */
export interface TransferTaskPayload {
  /** 新的处理人ID（与 AdminUser.id 同为字符串，避免大整数精度丢失） */
  newAssigneeId: string
  /** 转办原因 */
  reason: string
}

/**
 * 任务委派参数
 * 
 * 用于将任务委派给其他人代为处理
 */
export interface DelegateTaskPayload {
  /** 被委派人ID（与 AdminUser.id 同为字符串，避免大整数精度丢失） */
  delegateToId: string
  /** 委派原因 */
  reason: string
}

/**
 * 流程实例挂起参数
 * 
 * 用于挂起正在运行的流程实例
 */
export interface SuspendInstancePayload {
  /** 挂起原因 */
  reason: string
}

/**
 * 流程实例恢复参数
 * 
 * 用于恢复已挂起的流程实例
 */
export interface ResumeInstancePayload {
  /** 恢复说明 */
  reason: string
}

// ========== 流程定义管理（/api/v2/workflow-definitions） ==========

/** 工作流节点（后端 WorkflowNodeDTO） */
export interface WorkflowDefinitionNode {
  nodeId: string
  /** START/APPROVAL/END */
  nodeType: string
  nodeName: string
  /** SPECIFIED_USER/INITIATOR */
  approverType?: string
  approverValue?: string
  approvalStrategy?: string
  timeoutHours?: number
  timeoutAction?: string
  position?: Record<string, unknown>
}

/** 工作流连线（后端 WorkflowEdgeDTO） */
export interface WorkflowDefinitionEdge {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  condition?: string
}

/** 工作流定义（后端 WorkflowDefinitionDTO，查询接口口径） */
export interface WorkflowDefinitionInfo {
  id: number
  code: string
  name: string
  description?: string
  version: number
  enabled: boolean
  /** DRAFT/PUBLISHED/DISABLED */
  status: string
  publishedAt?: string
  publishedBy?: number
  nodes?: WorkflowDefinitionNode[]
  edges?: WorkflowDefinitionEdge[]
}

/** 工作流定义写操作返回（后端领域对象 WorkflowDefinition，字段与查询 DTO 不同） */
export interface WorkflowDefinitionEntity {
  id: number
  workflowCode: string
  workflowName: string
  description?: string
  version: number
  /** 原始 DAG JSON 字符串 */
  dagJson: string
  /** 1=启用 0=禁用（注意与查询 DTO 的 boolean 不同） */
  enabled: number
  status: string
  publishedAt?: string
  publishedBy?: number
  createTime?: string
  updateTime?: string
}

/** 工作流定义创建请求（后端 CreateWorkflowDefinitionRequest） */
export interface WorkflowDefinitionCreatePayload {
  /** 流程编码（≤100，字母开头，仅字母/数字/下划线/短横线） */
  workflowCode: string
  /** 流程名称（≤200） */
  workflowName: string
  description?: string
  /** DAG JSON（≤60000 字符，含 nodes/edges） */
  dagJson: string
}

/** 工作流定义更新请求（后端 UpdateWorkflowDefinitionRequest，无 code/version） */
export interface WorkflowDefinitionUpdatePayload {
  workflowName: string
  description?: string
  dagJson: string
}
