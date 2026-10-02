/**
 * 工作流API模块
 * 
 * 提供工作流相关的HTTP接口调用，包括：
 * - 流程定义的创建、查询、更新和列表获取
 * - 流程实例的查询和详情获取
 * - 统计数据和趋势分析
 * - 待办任务的查询和处理（审批、驳回）
 * - 高级任务操作（回退、转办、委派）
 * - 流程实例的挂起和恢复
 * 
 * @module api/workflow
 */

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

/**
 * 获取流程定义详情
 * @param id - 流程定义ID
 * @returns 流程定义详细信息，包含流程图、节点配置等
 */
export function getWorkflowDefinition(id: number) {
  return get<WorkflowDefinition>(`/admin-api/v1/workflows/definitions/${id}/detail`)
}

/**
 * 创建新的流程定义
 * @param data - 流程定义数据，包含名称、流程图、节点配置等
 * @returns 创建成功的流程定义ID
 */
export function createWorkflowDefinition(data: WorkflowDefinitionPayload) {
  return post('/admin-api/v1/workflows/definitions', data)
}

/**
 * 更新流程定义
 * @param id - 流程定义ID
 * @param data - 更新的流程定义数据
 * @returns 更新结果
 */
export function updateWorkflowDefinition(id: number, data: WorkflowDefinitionPayload) {
  return put(`/admin-api/v1/workflows/definitions/${id}`, data)
}

/**
 * 获取流程定义列表
 * @param params - 查询参数，包含分页信息
 * @param params.pageNum - 页码
 * @param params.pageSize - 每页数量
 * @returns 流程定义列表和总数
 */
export function listWorkflowDefinitions(params?: { pageNum?: number; pageSize?: number }) {
  return get<{ records: WorkflowDefinition[]; total: number }>('/admin-api/v1/workflows/definitions', params)
}

// ===== 流程实例管理 =====

/**
 * 获取流程实例列表
 * @param params - 查询参数，包含分页、状态、发起人、流程定义等过滤条件
 * @returns 流程实例列表和总数
 */
export function listWorkflowInstances(params: InstanceQueryParams) {
  return get<{ records: WorkflowInstance[]; total: number }>('/admin-api/v1/workflows/instances', params as any)
}

/**
 * 获取流程实例详情
 * @param id - 流程实例ID
 * @returns 流程实例详细信息，包含审批记录、当前节点等
 */
export function getWorkflowInstanceDetail(id: number) {
  return get<WorkflowInstanceDetail>(`/admin-api/v1/workflows/instances/${id}`)
}

// ===== 统计分析 =====

/**
 * 获取工作流统计数据
 * @returns 工作流各状态的统计数据，包含运行中、已完成、已拒绝等数量
 */
export function getWorkflowStatistics() {
  return get<WorkflowStatistics>('/admin-api/v1/workflows/statistics')
}

/**
 * 获取工作流趋势数据
 * @param days - 统计天数，默认7天
 * @returns 指定天数内的工作流趋势数据，包含每日创建、完成数量等
 */
export function getWorkflowTrend(days: number = 7) {
  return get<WorkflowTrend>('/admin-api/v1/workflows/statistics/trend', { days })
}

// ===== 待办任务 =====

/**
 * 获取我的待办任务列表
 * @param params - 查询参数
 * @param params.pageNum - 页码
 * @param params.pageSize - 每页数量
 * @returns 当前用户的待办任务列表和总数
 */
export function getMyPendingTasks(params: { pageNum: number; pageSize: number }) {
  return get<{ records: WorkflowTask[]; total: number }>('/admin-api/v1/workflows/tasks/my', params)
}

/**
 * 审批通过任务
 * @param data - 审批数据，包含任务ID、审批意见等
 * @returns 审批结果
 */
export function approveTask(data: CompleteTaskPayload) {
  return post('/admin-api/v1/workflows/tasks/approve', data)
}

/**
 * 驳回任务
 * @param data - 驳回数据，包含任务ID、驳回原因等
 * @returns 驳回结果
 */
export function rejectTask(data: CompleteTaskPayload) {
  return post('/admin-api/v1/workflows/tasks/reject', data)
}

/**
 * 获取任务详情
 * @param taskId - 任务ID
 * @returns 任务详细信息，包含任务数据、表单信息等
 */
export function getTaskDetail(taskId: number) {
  return get<WorkflowTask>(`/admin-api/v1/workflows/tasks/${taskId}`)
}

// ===== 高级任务操作 =====

/**
 * 流程回退
 * @param taskId - 任务ID
 * @param data - 回退数据，包含目标节点ID和回退原因
 * @returns 回退结果
 */
export function rollbackTask(taskId: number, data: RollbackTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/rollback`, data)
}

/**
 * 任务转办
 * @param taskId - 任务ID
 * @param data - 转办数据，包含目标用户ID和转办原因
 * @returns 转办结果
 */
export function transferTask(taskId: number, data: TransferTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/transfer`, data)
}

/**
 * 任务委派
 * @param taskId - 任务ID
 * @param data - 委派数据，包含被委派人ID和委派原因
 * @returns 委派结果
 */
export function delegateTask(taskId: number, data: DelegateTaskPayload) {
  return post(`/api/workflow/tasks/${taskId}/delegate`, data)
}

/**
 * 挂起流程实例
 * @param instanceId - 流程实例ID
 * @param data - 挂起数据，包含挂起原因
 * @returns 挂起结果
 */
export function suspendInstance(instanceId: number, data: SuspendInstancePayload) {
  return post(`/api/workflow/instances/${instanceId}/suspend`, data)
}

/**
 * 恢复流程实例
 * @param instanceId - 流程实例ID
 * @param data - 恢复数据，包含恢复说明
 * @returns 恢复结果
 */
export function resumeInstance(instanceId: number, data: ResumeInstancePayload) {
  return post(`/api/workflow/instances/${instanceId}/resume`, data)
}
