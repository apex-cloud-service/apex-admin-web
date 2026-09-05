/**
 * 工作流相关类型定义
 */

// ========== 工作流定义 ==========

export interface WorkflowNode {
  nodeId: string
  nodeType: 'START' | 'USER_TASK' | 'GATEWAY' | 'END'
  nodeName: string
  approverType?: 'USER' | 'ROLE' | 'DEPT'
  approverValue?: string
  approvalStrategy?: 'ANY' | 'ALL'
  timeoutHours?: number
  timeoutAction?: string
  position?: { x: number; y: number }
}

export interface WorkflowEdge {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  condition?: string
}

export interface WorkflowDefinition {
  id?: number
  code: string
  name: string
  description?: string
  version: number
  enabled: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createTime?: string
  updateTime?: string
}

// ========== 工作流实例 ==========

export interface WorkflowInstance {
  id: number
  definitionId: number
  processCode: string
  title: string
  status: 'DRAFT' | 'RUNNING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TERMINATED' | 'SUSPENDED'
  initiatorId: number
  initiatorName: string
  businessKey: string
  currentNodeId?: string
  startTime?: string
  endTime?: string
  createTime: string
  suspended?: boolean
}

export interface WorkflowInstanceDetail {
  instance: WorkflowInstance
  definition: WorkflowDefinition
  tasks: WorkflowTask[]
  currentNodeId?: string
}

// ========== 工作流任务 ==========

export interface WorkflowTask {
  id: number
  instanceId: number
  taskName: string
  taskType: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ROLLED_BACK' | 'DELEGATED' | 'CANCELLED'
  assigneeId: number
  assigneeName: string
  comment?: string
  nodeId: string
  nodeCode?: string
  startTime: string
  completedTime?: string
  createTime: string
  createdTime?: string
  timeoutAt?: string
  timeoutStrategy?: 'ESCALATE' | 'AUTO_COMPLETE' | 'NOTIFY'
  transferredFrom?: number
  transferredFromName?: string
}

// ========== 审批记录 ==========

export interface ApprovalRecord {
  id: number
  taskId: number
  approverId: number
  approverName: string
  result: 'APPROVED' | 'REJECTED'
  comment?: string
  createTime: string
}

// ========== 统计数据 ==========

export interface WorkflowStatistics {
  todayStarted: number
  runningTotal: number
  pendingTaskTotal: number
  avgCompletionSeconds: number
  statusDistribution: Record<string, number>
  suspendedCount?: number
  timeoutCount?: number
  transferredCount?: number
}

export interface WorkflowTrend {
  dates: string[]
  startedCounts: number[]
  completedCounts: number[]
}

// ========== 请求参数 ==========

export interface InstanceQueryParams {
  pageNum: number
  pageSize: number
  status?: string
  initiatorId?: number
}

export interface WorkflowDefinitionPayload {
  code: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface CompleteTaskPayload {
  taskId: number
  result: 'APPROVED' | 'REJECTED'
  comment?: string
}

export interface RollbackTaskPayload {
  targetNodeCode: string
  reason: string
}

export interface TransferTaskPayload {
  newAssigneeId: number
  reason: string
}

export interface DelegateTaskPayload {
  delegateToId: number
  reason: string
}

export interface SuspendInstancePayload {
  reason: string
}

export interface ResumeInstancePayload {
  reason: string
}
