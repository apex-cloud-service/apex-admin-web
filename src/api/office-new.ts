/**
 * 办公平台 API（匹配后端实际接口）
 * ------------------------------------------------------------------
 * 飞书 / 钉钉 / 企业微信的登录授权、平台配置与账号绑定接口封装。
 * 与 src/api/office.ts（消息/审批/日历/文档业务接口）互补，
 * 本文件聚焦「登录接入」与「管理端配置」两类能力。
 *
 * 后端接口（公开，登录页使用）：
 * - GET /api/v1/office/status   - 查询已启用的平台列表
 * - GET /api/v1/office/login    - 获取平台 OAuth2 授权跳转地址
 * - GET /api/v1/office/callback - 授权回调：授权码换取会话令牌
 *
 * 后端接口（管理端，办公平台配置/绑定页使用）：
 * - GET    /admin-api/v1/office/apps             - 平台应用配置列表
 * - GET    /admin-api/v1/office/apps/{platform}  - 查询单平台配置
 * - POST   /admin-api/v1/office/apps/{platform}  - 新建平台配置
 * - PUT    /admin-api/v1/office/apps/{platform}  - 更新平台配置（带 version 乐观锁）
 * - DELETE /admin-api/v1/office/apps/{platform}  - 删除平台配置（带 version 乐观锁）
 * - GET    /admin-api/v1/office/bindings         - 账号绑定列表（数组响应，向后兼容）
 * - GET    /admin-api/v1/office/bindings/page     - 账号绑定分页列表（真实 total，支持 status 过滤）
 * - POST   /admin-api/v1/office/bindings/{id}/review - 绑定审批（通过/驳回）
 * - DELETE /admin-api/v1/office/bindings/{id}/unbind - 解除绑定（带 version 乐观锁）
 */
import { del, get, post, put } from '@/utils/request'
import type { LoginResult, PageResponse } from '@/types'

/** 办公平台类型：飞书 / 钉钉 / 企业微信 */
export type OfficePlatform = 'FEISHU' | 'DINGTALK' | 'WECOM'

/** 平台标识 → 中文名称映射（下拉选择、文案展示用） */
export const PLATFORM_NAMES: Record<OfficePlatform, string> = {
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企业微信',
}

/** 平台应用配置（后端 OfficeAppResponse） */
export interface OfficeAppResponse {
  /** 配置记录 ID */
  id: number
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台颁发的应用 AppID */
  appId: string
  /** OAuth2 授权回调地址 */
  redirectUri: string
  /** 是否启用（启用后登录页展示该平台入口） */
  enabled: boolean
  /** 版本号（乐观锁，更新/删除时回传） */
  version: number
}

/** 平台应用配置保存请求体（后端 OfficeAppRequest） */
export interface OfficeAppRequest {
  /** 平台颁发的应用 AppID */
  appId: string
  /** 应用密钥的引用标识（后端加密存储，不回显明文） */
  secretReference: string
  /** OAuth2 授权回调地址 */
  redirectUri: string
  /** 消息回调签名密钥的引用标识（可选） */
  signingSecretReference?: string
  /** 是否启用 */
  enabled: boolean
}

/** 平台账号绑定记录（后端 OfficeBindingResponse） */
export interface OfficeBindingResponse {
  /** 绑定记录 ID */
  id: number
  /** 系统用户 ID（待绑定/已绑定的本系统账号） */
  userId: number
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台侧用户唯一标识 */
  externalUserId: string
  /** 绑定状态（如 PENDING=待审批 / APPROVED=已绑定 / UNBOUND=已解绑） */
  status: string
  /** 是否生效 */
  enabled: boolean
  /** 版本号（乐观锁，审批/解绑时回传） */
  version: number
}

/** 绑定审批请求体（后端 OfficeBindingReviewRequest） */
export interface OfficeBindingReviewRequest {
  /** true=通过绑定申请，false=驳回 */
  approved: boolean
  /** 版本号（乐观锁） */
  version: number
}

/** ========== 公开接口（登录页使用） ========== */

/**
 * 查询已启用的办公平台列表
 * @returns 已启用平台标识数组（登录页据此渲染平台登录按钮）
 */
export function getPlatformStatus(): Promise<OfficePlatform[]> {
  return get<OfficePlatform[]>('/api/v1/office/status')
}

/**
 * 发起办公平台登录
 * @param platform 平台类型
 * @returns 平台 OAuth2 授权跳转地址（前端据此重定向）
 */
export function startOfficeLogin(platform: OfficePlatform): Promise<string> {
  return get<string>('/api/v1/office/login', { platform })
}

/**
 * 办公平台授权回调：用授权码换取本系统会话令牌
 *
 * @param platform 平台类型
 * @param code 平台回调携带的授权码（一次性）
 * @param state 防 CSRF 的随机串（回调时原样回传校验）
 * @returns 登录结果（accessToken / refreshToken 等）
 */
export function officeCallback(
  platform: OfficePlatform,
  code: string,
  state: string,
): Promise<LoginResult> {
  return get<LoginResult>('/api/v1/office/callback', { platform, code, state })
}

/** ========== 应用配置管理（管理端） ========== */

/**
 * 查询全部平台应用配置
 * @returns 平台应用配置列表
 */
export function listApps(): Promise<OfficeAppResponse[]> {
  return get<OfficeAppResponse[]>('/admin-api/v1/office/apps')
}

/**
 * 查询单个平台的应用配置
 * @param platform 平台类型
 * @returns 平台应用配置
 */
export function getApp(platform: OfficePlatform): Promise<OfficeAppResponse> {
  return get<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`)
}

/**
 * 新建平台应用配置
 * @param platform 平台类型
 * @param request 配置内容（appId / 密钥引用 / 回调地址等）
 * @returns 创建后的配置（含 id 与 version）
 */
export function createApp(
  platform: OfficePlatform,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return post<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`, request)
}

/**
 * 更新平台应用配置
 * @param platform 平台类型
 * @param version 当前版本号（乐观锁，冲突时后端拒绝）
 * @param request 配置内容
 * @returns 更新后的配置
 */
export function updateApp(
  platform: OfficePlatform,
  version: number,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return put<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`, { ...request, version })
}

/**
 * 删除平台应用配置
 * @param platform 平台类型
 * @param version 当前版本号（乐观锁）
 * @returns true=删除成功
 */
export function deleteApp(platform: OfficePlatform, version: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/office/apps/${platform}?version=${version}`)
}

/** ========== 绑定审批管理（管理端） ========== */

/**
 * 分页查询账号绑定列表
 *
 * @param platform 平台类型
 * @param page 页码（从 1 开始）
 * @param size 每页条数
 * @returns 绑定记录列表（按页返回）
 */
export function listBindings(
  platform: OfficePlatform,
  page: number,
  size: number,
): Promise<OfficeBindingResponse[]> {
  return get<OfficeBindingResponse[]>('/admin-api/v1/office/bindings', { platform, page, size })
}

/**
 * 分页查询账号绑定列表（真实总数，支持按状态过滤）
 *
 * @param platform 平台类型
 * @param status 绑定状态过滤（PENDING/APPROVED/REJECTED/REVOKED），不传则查询全部状态
 * @param page 页码（从 1 开始）
 * @param size 每页条数
 * @returns 分页结果（list / total / pageNum / pageSize）
 */
export function listBindingsPage(
  platform: OfficePlatform,
  status: string | undefined,
  page: number,
  size: number,
): Promise<PageResponse<OfficeBindingResponse>> {
  return get<PageResponse<OfficeBindingResponse>>('/admin-api/v1/office/bindings/page', {
    platform,
    status,
    page,
    size,
  })
}

/**
 * 审批绑定申请（通过后平台账号与系统用户正式绑定）
 * @param id 绑定记录 ID
 * @param request 审批动作（approved=true 通过 / false 驳回）+ 版本号
 * @returns true=审批成功
 */
export function reviewBinding(id: number, request: OfficeBindingReviewRequest): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/office/bindings/${id}/review`, request)
}

/**
 * 解除平台账号绑定
 * @param id 绑定记录 ID
 * @param version 当前版本号（乐观锁）
 * @returns true=解绑成功
 */
export function unbindBinding(id: number, version: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/office/bindings/${id}/unbind?version=${version}`)
}
