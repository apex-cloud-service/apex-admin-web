/**
 * 办公平台 API（匹配后端实际接口）
 */
import { del, get, post, put } from '@/utils/request'
import type { LoginResult } from '@/types'

export type OfficePlatform = 'FEISHU' | 'DINGTALK' | 'WECOM'

export const PLATFORM_NAMES: Record<OfficePlatform, string> = {
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企业微信',
}

export interface OfficeAppResponse {
  id: number
  platform: OfficePlatform
  appId: string
  redirectUri: string
  enabled: boolean
  version: number
}

export interface OfficeAppRequest {
  appId: string
  secretReference: string
  redirectUri: string
  signingSecretReference?: string
  enabled: boolean
}

export interface OfficeBindingResponse {
  id: number
  userId: number
  platform: OfficePlatform
  externalUserId: string
  status: string
  enabled: boolean
  version: number
}

export interface OfficeBindingReviewRequest {
  approved: boolean
  version: number
}

// 公开接口
export function getPlatformStatus(): Promise<OfficePlatform[]> {
  return get<OfficePlatform[]>('/api/v1/office/status')
}

export function startOfficeLogin(platform: OfficePlatform): Promise<string> {
  return get<string>('/api/v1/office/login', { platform })
}

export function officeCallback(
  platform: OfficePlatform,
  code: string,
  state: string,
): Promise<LoginResult> {
  return get<LoginResult>('/api/v1/office/callback', { platform, code, state })
}

// 应用配置管理
export function listApps(): Promise<OfficeAppResponse[]> {
  return get<OfficeAppResponse[]>('/admin-api/v1/office/apps')
}

export function getApp(platform: OfficePlatform): Promise<OfficeAppResponse> {
  return get<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`)
}

export function createApp(
  platform: OfficePlatform,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return post<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`, request)
}

export function updateApp(
  platform: OfficePlatform,
  version: number,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return put<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}?version=${version}`, request)
}

export function deleteApp(platform: OfficePlatform, version: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/office/apps/${platform}?version=${version}`)
}

// 绑定审批管理
export function listBindings(
  platform: OfficePlatform,
  page: number,
  size: number,
): Promise<OfficeBindingResponse[]> {
  return get<OfficeBindingResponse[]>('/admin-api/v1/office/bindings', { platform, page, size })
}

export function reviewBinding(id: number, request: OfficeBindingReviewRequest): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/office/bindings/${id}/review`, request)
}

export function unbindBinding(id: number, version: number): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/office/bindings/${id}/unbind?version=${version}`)
}
