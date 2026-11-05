/**
 * 办公平台审批对接 API（/api/office/approvals）
 * ------------------------------------------------------------------
 * 用途：
 * 办公平台（飞书/钉钉/企业微信）审批流程的发起、查询与办理。列表接口
 * 返回 PageResponse；审批操作的路径参数为 processInstanceId，审批人
 * approverId 必填（后端 @NotBlank）。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post } from '@/utils/request'
import type { PageResponse } from '@/types'
import type { OfficePlatform } from './office-platform'

/** 审批状态（后端 ApprovalStatus） */
export type ApprovalStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

/** 审批记录（后端 ApprovalRecord） */
export interface ApprovalRecord {
  /** 审批人ID */
  approverId: string
  /** 审批人名称 */
  approverName?: string
  /** 审批动作 */
  action: 'APPROVE' | 'REJECT'
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  approveTime?: string
}

/** 审批流程（后端 ApprovalProcessResponse） */
export interface ApprovalProcess {
  /** 记录 ID */
  id?: number
  /** 平台类型 */
  platform: OfficePlatform
  /** 流程定义 ID */
  processDefinitionId?: string
  /** 流程实例 ID（审批操作的路径参数） */
  processInstanceId: string
  /** 平台侧实例 ID */
  platformInstanceId?: string
  /** 流程名称 */
  processName: string
  /** 发起人 ID */
  initiatorId?: string
  /** 发起人名称 */
  initiatorName?: string
  /** 审批状态 */
  status: ApprovalStatus
  /** 当前节点 */
  currentNode?: string
  /** 当前审批人 ID 列表 */
  currentApproverIds?: string[]
  /** 表单数据（JSON 字符串） */
  formData?: string
  /** 审批记录 */
  records?: ApprovalRecord[]
  /** 发起时间 */
  createdAt?: string
  /** 完成时间 */
  completedAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/** 发起审批请求（后端 InitiateApprovalRequest，全部必填） */
export interface InitiateApprovalRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 应用 ID */
  appId: number
  /** 流程定义 ID */
  processDefinitionId: string
  /** 发起人 ID */
  initiatorId: string
  /** 表单数据（JSON 字符串） */
  formData: string
}

/** 执行审批操作请求（后端 ApproveRequest） */
export interface ApproveProcessRequest {
  /** 审批人 ID（必填，不能为空串） */
  approverId: string
  /** 审批动作 */
  action: 'APPROVE' | 'REJECT'
  /** 审批意见 */
  comment?: string
}

/** 审批列表查询参数（后端 pending/initiated 的查询口径） */
export interface ApprovalListQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 审批人ID（pending 必填；initiated 不传） */
  approverId?: string
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/** 我发起的审批查询参数 */
export interface MyInitiatedApprovalsQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 发起人ID */
  initiatorId: string
  /** 审批状态（可选） */
  status?: ApprovalStatus
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 发起审批流程。
 * @param request 发起请求
 */
export function initiateApproval(request: InitiateApprovalRequest): Promise<ApprovalProcess> {
  return post<ApprovalProcess>('/api/office/approvals', request)
}

/**
 * 查询审批详情。
 * @param processInstanceId 流程实例ID
 */
export function getApprovalDetail(processInstanceId: string): Promise<ApprovalProcess> {
  return get<ApprovalProcess>(`/api/office/approvals/${processInstanceId}`)
}

/**
 * 执行审批操作（通过/拒绝）。
 * @param processInstanceId 流程实例ID
 * @param request 审批操作请求（approverId 必填）
 */
export function approveProcess(
  processInstanceId: string,
  request: ApproveProcessRequest,
): Promise<ApprovalProcess> {
  return post<ApprovalProcess>(`/api/office/approvals/${processInstanceId}/approve`, request)
}

/**
 * 撤销审批。
 * @param processInstanceId 流程实例ID
 */
export function cancelApproval(processInstanceId: string): Promise<void> {
  return del<void>(`/api/office/approvals/${processInstanceId}`)
}

/**
 * 查询待我审批列表。
 * @param query 查询参数（approverId 必填）
 */
export function getPendingApprovals(
  query: ApprovalListQuery,
): Promise<PageResponse<ApprovalProcess>> {
  return get<PageResponse<ApprovalProcess>>('/api/office/approvals/pending', query as any)
}

/**
 * 查询我发起的审批列表。
 * @param query 查询参数
 */
export function getMyInitiatedApprovals(
  query: ApprovalListQuery,
): Promise<PageResponse<ApprovalProcess>> {
  return get<PageResponse<ApprovalProcess>>('/api/office/approvals/initiated', query as any)
}

/** 审批状态中文名映射 */
export const APPROVAL_STATUS_NAMES: Record<ApprovalStatus, string> = {
  PENDING: '待审批',
  IN_PROGRESS: '审批中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已撤销',
}

/** 审批动作中文名映射 */
export const APPROVAL_ACTION_NAMES: Record<string, string> = {
  APPROVE: '通过',
  REJECT: '拒绝',
  TRANSFER: '转审',
  ADD_SIGN: '加签',
}
