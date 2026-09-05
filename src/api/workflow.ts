import { get, post, put } from '@/utils/request'
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceDetail,
  WorkflowTask,
  WorkflowStatistics,
  WorkflowTrend,
  InstanceQueryParams,
  WorkflowDefinitionPayload,
  CompleteTaskPayload,
  RollbackTaskPayload,
  TransferTaskPayload,
  DelegateTaskPayload,
  SuspendInstancePayload,
  ResumeInstancePayload
} from '@/types/workflow'

// ===== 流程定义管理 =====

export function getWorkflowDefinition(id: number) {
  return get<WorkflowDefinition>(`/admin-api/v1/workflows/definitions/${id}/detail`)
}

export function createWorkflowDefinition(data: WorkflowDefinitionPayload) {
  return post('/admin-api/v1/workflows/definitions', data)
}

export function updateWorkflowDefinition(id: number, data: WorkflowDefinitionPayload) {
  return put(`/admin-api/v1/workflows/definitions/${id}`, data)
}

export function listWorkflowDefinitions(params?: { pageNum?: number; pageSize?: number }) {
  return get<{ records: WorkflowDefinition[]; total: number }>('/admin-api/v1/workflows/definitions', params)
}

// ===== 流程实例管理 =====

export function listWorkflowInstances(params: InstanceQueryParams) {
  return get<{ records: WorkflowInstance[]; total: number }>('/admin-api/v1/workflows/instances', params)
}

export function getWorkflowInstanceDetail(id: number) {
  return get<WorkflowInstanceDetail>(`/admin-api/v1/workflows/instances/${id}/detail`)
}

// ===== 统计分析 =====

export function getWorkflowStatistics() {
  return get<WorkflowStatistics>('/admin-api/v1/workflows/statistics')
}

export function getWorkflowTrend(days: number = 7) {
  return get<WorkflowTrend>('/admin-api/v1/workflows/statistics/trend', { days })
}

// ===== 待办任务 =====

export function getMyPendingTasks(params: { pageNum: number; pageSize: number }) {
  return get<{ records: WorkflowTask[]; total: number }>('/admin-api/v1/workflows/tasks/my', params)
}

export function approveTask(data: CompleteTaskPayload) {
  return post('/admin-api/v1/workflows/tasks/approve', data)
}

export function rejectTask(data: CompleteTaskPayload) {
  return post('/admin-api/v1/workflows/tasks/reject', data)
}

export function getTaskDetail(taskId: number) {
  return get<WorkflowTask>(`/admin-api/v1/workflows/tasks/${taskId}`)
}

// ===== 高级任务操作 =====

/**
 * 流程回退
 */
export function rollbackTask(taskId: number, data: RollbackTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/rollback`, data)
}

/**
 * 任务转办
 */
export function transferTask(taskId: number, data: TransferTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/transfer`, data)
}

/**
 * 任务委派
 */
export function delegateTask(taskId: number, data: DelegateTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/delegate`, data)
}

/**
 * 挂起流程实例
 */
export function suspendInstance(instanceId: number, data: SuspendInstancePayload) {
  return post(`/api/workflow/instances/${instanceId}/suspend`, data)
}

/**
 * 恢复流程实例
 */
export function resumeInstance(instanceId: number, data: ResumeInstancePayload) {
  return post(`/api/workflow/instances/${instanceId}/resume`, data)
}
