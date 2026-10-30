/**
 * 工作流API模块
 *
 * 提供工作流相关的HTTP接口调用，包括：
 * - 流程实例的查询和详情获取
 * - 统计数据和趋势分析
 * - 待办任务的查询与办理（后端 complete 固定为通过语义，仅携带审批意见）
 * - 高级任务操作（回退、转办、委派）
 * - 流程实例的挂起和恢复
 *
 * @module api/workflow
 */

import { get, post, put } from '@/utils/request'
import type { PageResponse } from '@/types'
import type {
  WorkflowPendingTask,
  WorkflowStartedInstance,
  WorkflowDefinitionInfo,
  WorkflowDefinitionEntity,
  WorkflowDefinitionCreatePayload,
  WorkflowDefinitionUpdatePayload,
  WorkflowInstance,
  WorkflowInstanceDetail,
  WorkflowStatistics,
  WorkflowTrend,
  InstanceQueryParams,
  RollbackTaskPayload,
  TransferTaskPayload,
  DelegateTaskPayload,
  SuspendInstancePayload,
  ResumeInstancePayload
} from '@/types/workflow'

// ===== 流程实例管理 =====

/**
 * 获取流程实例列表
 * @param params - 查询参数，包含分页、状态、发起人等过滤条件
 * @returns 流程实例列表和总数
 */
export function listWorkflowInstances(params: InstanceQueryParams) {
  return get<{ records: WorkflowInstance[]; total: number }>('/admin-api/v1/workflows/instances', params as any)
}

/**
 * 获取流程实例详情
 * @param id - 流程实例ID
 * @returns 流程实例详细信息，包含流程定义、任务列表等
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
 * @returns 当前用户的待办任务分页结果
 */
export function getMyPendingTasks(params: { pageNum: number; pageSize: number }) {
  return get<PageResponse<WorkflowPendingTask>>('/api/v1/workflows/tasks/pending', params)
}

/**
 * 办理任务（后端 complete 固定为通过语义）
 * @param taskId - 任务ID
 * @param comment - 审批意见（最长 1000 字符）
 */
export function completeTask(taskId: number, comment?: string) {
  return post<void>(`/api/v1/workflows/tasks/${taskId}/complete`, { comment })
}

/**
 * 发起流程实例（发起人取当前登录用户，无需传入）
 * @param workflowCode - 流程定义编码（后端无定义列表接口，需调用方提供）
 * @param payload - businessKey 必填（≤200），contextJson 选填（JSON 字符串，≤10000）
 * @returns 新建的流程实例（status 固定 RUNNING）
 */
export function startWorkflowInstance(
  workflowCode: string,
  payload: { businessKey: string; contextJson?: string }
) {
  return post<WorkflowStartedInstance>(`/api/v1/workflows/${workflowCode}/instances`, payload)
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

// ===== 流程定义管理（/api/v2/workflow-definitions） =====

/**
 * 分页查询流程定义
 * @param params - workflowCode（精确）、status（DRAFT/PUBLISHED/DISABLED）与分页
 */
export function listWorkflowDefinitions(params: {
  workflowCode?: string
  status?: string
  pageNum: number
  pageSize: number
}) {
  return get<PageResponse<WorkflowDefinitionInfo>>('/api/v2/workflow-definitions', params)
}

/**
 * 查询流程定义详情
 * @param definitionId - 流程定义 ID
 */
export function getWorkflowDefinition(definitionId: number) {
  return get<WorkflowDefinitionInfo>(`/api/v2/workflow-definitions/${definitionId}`)
}

/**
 * 创建流程定义（初始为草稿）
 * @param payload - 流程编码、名称与 DAG JSON
 */
export function createWorkflowDefinition(payload: WorkflowDefinitionCreatePayload) {
  return post<WorkflowDefinitionEntity>('/api/v2/workflow-definitions', payload)
}

/**
 * 更新流程定义（仅草稿可改；无流程编码与版本字段）
 * @param definitionId - 流程定义 ID
 * @param payload - 名称、描述与 DAG JSON
 */
export function updateWorkflowDefinition(
  definitionId: number,
  payload: WorkflowDefinitionUpdatePayload
) {
  return put<WorkflowDefinitionEntity>(`/api/v2/workflow-definitions/${definitionId}`, payload)
}

/**
 * 校验流程定义 DAG
 * @param definitionId - 流程定义 ID
 */
export function validateWorkflowDefinition(definitionId: number) {
  return post<void>(`/api/v2/workflow-definitions/${definitionId}/validate`)
}

/**
 * 发布流程定义
 * @param definitionId - 流程定义 ID
 */
export function publishWorkflowDefinition(definitionId: number) {
  return post<WorkflowDefinitionEntity>(`/api/v2/workflow-definitions/${definitionId}/publish`)
}

/**
 * 启用/停用流程定义
 * @param definitionId - 流程定义 ID
 * @param enabled - true=启用
 */
export function toggleWorkflowDefinition(definitionId: number, enabled: boolean) {
  return post<WorkflowDefinitionEntity>(
    `/api/v2/workflow-definitions/${definitionId}/${enabled ? 'enable' : 'disable'}`
  )
}

/**
 * 查询同编码的全部历史版本
 * @param definitionId - 流程定义 ID
 */
export function listWorkflowDefinitionVersions(definitionId: number) {
  return get<WorkflowDefinitionInfo[]>(`/api/v2/workflow-definitions/${definitionId}/versions`)
}
