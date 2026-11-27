/**
 * 办公组织同步向导 API（/api/v2/office/sync）
 * ------------------------------------------------------------------
 * 预检 → 预览 → 执行与任务重试；任务分页查询由组织同步接口承担。
 */
import { post } from '@/utils/request'
import type { OrgSyncRequest, OrgSyncResult } from '@/types'

/** 预检结果 */
export interface SyncPreflightResult {
  ready: boolean
  missingItems: string[]
}

/** 同步预览结果 */
export interface SyncPreviewResult {
  sampleCount: number
  hasMore: boolean
  mappedCount: number
  newCount: number
}

/**
 * 检查平台组织同步是否就绪。
 * @param platform 办公平台标识，原样提交给后端
 * @returns ready 与 missingItems；ready=false 是预检结果，不等于 HTTP 请求失败
 */
export function preflightOrgSync(platform: string): Promise<SyncPreflightResult> {
  return post<SyncPreflightResult>('/api/v2/office/sync/preflight', { platform })
}

/**
 * 预览组织同步的抽样与映射统计。
 * @param platform 办公平台标识
 * @param syncType 同步对象：DEPARTMENT=部门，MEMBER=成员
 * @returns 抽样数量、是否还有数据、已映射与新增数量，不在本调用中执行同步
 */
export function previewOrgSync(platform: string, syncType: 'DEPARTMENT' | 'MEMBER'): Promise<SyncPreviewResult> {
  return post<SyncPreviewResult>('/api/v2/office/sync/preview', { platform, syncType })
}

/**
 * 提交组织同步任务。
 * @param payload OrgSyncRequest，包含平台、同步对象与全量同步选项
 * @returns OrgSyncResult；提交结果不代表后台同步完成，须通过组织任务接口跟踪
 */
export function executeOrgSync(payload: OrgSyncRequest): Promise<OrgSyncResult> {
  return post<OrgSyncResult>('/api/v2/office/sync/tasks', payload)
}

/**
 * 请求重试指定同步任务。
 * @param taskId 原同步任务的数字 ID
 * @returns OrgSyncResult，由调用方继续查询任务状态；本函数不轮询或自动重试
 */
export function retryWizardSyncTask(taskId: number): Promise<OrgSyncResult> {
  return post<OrgSyncResult>(`/api/v2/office/sync/tasks/${taskId}/retry`)
}
