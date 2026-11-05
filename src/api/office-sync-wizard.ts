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

/** 同步预检：返回是否就绪与缺失项 */
export function preflightOrgSync(platform: string): Promise<SyncPreflightResult> {
  return post<SyncPreflightResult>('/api/v2/office/sync/preflight', { platform })
}

/** 同步预览：返回抽样数量与映射/新增统计 */
export function previewOrgSync(platform: string, syncType: 'DEPARTMENT' | 'MEMBER'): Promise<SyncPreviewResult> {
  return post<SyncPreviewResult>('/api/v2/office/sync/preview', { platform, syncType })
}

/** 执行组织同步（创建同步任务） */
export function executeOrgSync(payload: OrgSyncRequest): Promise<OrgSyncResult> {
  return post<OrgSyncResult>('/api/v2/office/sync/tasks', payload)
}

/** 重试同步任务 */
export function retryWizardSyncTask(taskId: number): Promise<OrgSyncResult> {
  return post<OrgSyncResult>(`/api/v2/office/sync/tasks/${taskId}/retry`)
}
