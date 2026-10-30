/**
 * 办公组织同步向导 API（/api/v2/office/sync）
 * ------------------------------------------------------------------
 * 预检 → 预览 → 执行 → 任务查询/重试；任务列表使用 page/size 且返回数组。
 */
import { get, post } from '@/utils/request'
import type { OrgSyncRequest, OrgSyncResult, OrgSyncTask } from '@/types'

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

export function preflightOrgSync(platform: string): Promise<SyncPreflightResult> {
  return post<SyncPreflightResult>('/api/v2/office/sync/preflight', { platform })
}

export function previewOrgSync(platform: string, syncType: 'DEPARTMENT' | 'MEMBER'): Promise<SyncPreviewResult> {
  return post<SyncPreviewResult>('/api/v2/office/sync/preview', { platform, syncType })
}

export function executeOrgSync(payload: OrgSyncRequest): Promise<OrgSyncResult> {
  return post<OrgSyncResult>('/api/v2/office/sync/tasks', payload)
}

export function listWizardSyncTasks(params: { platform?: string; page: number; size: number }): Promise<OrgSyncTask[]> {
  return get<OrgSyncTask[]>('/api/v2/office/sync/tasks', params)
}

export function getWizardSyncTask(taskId: number): Promise<OrgSyncTask> {
  return get<OrgSyncTask>(`/api/v2/office/sync/tasks/${taskId}`)
}

export function retryWizardSyncTask(taskId: number): Promise<OrgSyncResult> {
  return post<OrgSyncResult>(`/api/v2/office/sync/tasks/${taskId}/retry`)
}
