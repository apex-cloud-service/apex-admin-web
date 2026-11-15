/**
 * 认证相关 API
 * ------------------------------------------------------------------
 * 覆盖：图形验证码、统一认证登录、MFA 二步验证、令牌刷新与登出，
 * 以及主应用的角色/权限查询和管理；认证中心与主应用不是同一用户数据表。
 *
 * 登录/刷新走认证中心（apex-auth-service，网关 /auth/v1/**）：
 * - POST /auth/v1/login 签发 RS256 访问令牌（claims 含 tokenType/userId/tenantId，
 *   供各业务服务共享 JWKS 独立验签），响应为裸 LoginResponse（不包 Result）；
 * - POST /auth/v1/refresh 以一次性刷新令牌轮换新令牌对，响应为裸 TokenPair；
 * - 两者失败时后端返回 HTTP 401/403 与纯文本原因，由 request.ts 转换为 ApiError。
 * 图形验证码仍取自 system（GET /api/v1/auth/captcha），认证中心登录不校验验证码字段。
 */
import { del, get, post } from '@/utils/request'
import type { CaptchaVO, LoginResult } from '@/types'

/** 登录请求体 */
export interface LoginPayload {
  /** 登录类型兼容字段（前端默认 PASSWORD，当前认证中心忽略该字段） */
  loginType?: string
  /** 登录账号（认证中心 auth_user.username；主应用账户通过 accountId 关联） */
  username?: string
  /** 登录密码（BCrypt 哈希比对） */
  password?: string
  /** 图形验证码 ID（由 getCaptcha 获取；当前认证中心忽略该字段） */
  captchaId?: string
  /** 图形验证码内容（当前认证中心忽略该字段） */
  captchaCode?: string
  /** 登录设备标识；刷新时后端沿用旧令牌记录，不校验本次请求的设备标识 */
  deviceId?: string
  /** 客户端平台标识 */
  platform?: string
  /**
   * 租户 ID 声明（可选，仅用于登录时的租户匹配校验，不能切换租户）。
   * 未提供时使用后端 auth-center.login.default-tenant 配置（缺省 default），不保证所有部署同值。
   */
  tenantId?: string
}

/**
 * 获取图形验证码。
 * @returns 验证码 ID 与 Base64 PNG 图片（前端拼接 data:image/png;base64, 前缀展示）
 */
export function getCaptcha(): Promise<CaptchaVO> {
  return get<CaptchaVO>('/api/v1/auth/captcha')
}

/**
 * 账号密码登录（POST /auth/v1/login，统一认证中心）。
 * loginType、图形验证码与 platform 为兼容字段，当前后端忽略；本函数不写入本地会话。
 * @param payload 登录账号、密码及可选设备/租户声明，验证码字段仅透传
 * @returns 裸 LoginResponse；mfaRequired=true 时为挑战响应，不含正式令牌
 * @throws ApiError 认证中心拒绝凭证/租户或请求失败；登录 401/403 透传后端原因
 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return post<LoginResult>('/auth/v1/login', {
    loginType: 'PASSWORD',
    ...payload,
  })
}

/**
 * MFA 二步验证：以挑战凭据 + TOTP 验证码交换正式令牌。
 * 认证中心端点 POST /auth/v1/mfa/verify；成功返回与登录同构的正式令牌响应。
 * @param challengeToken 登录响应返回的短 TTL 挑战凭据
 * @param code 6 位 TOTP 验证码
 * @returns 正式登录响应；令牌持久化与身份初始化由 user Store 负责
 */
export function verifyMfaChallenge(challengeToken: string, code: string): Promise<LoginResult> {
  return post<LoginResult>('/auth/v1/mfa/verify', { challengeToken, code })
}

/**
 * 退出登录（服务端失效 Token，需携带登录态）。
 */
export function logout(): Promise<void> {
  return post<void>('/api/v1/auth/logout')
}

/**
 * 权限码 DTO（后端 /api/v1/auth/permissions/my 实际返回结构为对象数组，非字符串数组）。
 */
export interface PermissionCode {
  id?: number
  name?: string
  code: string
  description?: string
}

/**
 * 角色码 DTO（后端 /api/v1/auth/roles/my 实际返回结构为对象数组，非字符串数组）。
 */
export interface RoleCode {
  id?: number
  name?: string
  code: string
}

/**
 * 查询当前用户角色码集合。
 * @returns 角色码数组（兼容后端返回的 DTO 对象数组，统一取 code 字段）
 */
export async function getMyRoles(): Promise<string[]> {
  const data = await get<unknown[]>('/api/v1/auth/roles/my')
  return (data || [])
    .map((r) => (typeof r === 'string' ? r : (r as RoleCode).code))
    .filter((c): c is string => !!c)
}

/**
 * 查询当前用户权限码集合。
 * @returns 权限码数组（兼容后端返回的 DTO 对象数组，统一取 code 字段）
 */
export async function getMyPermissions(): Promise<string[]> {
  const data = await get<unknown[]>('/api/v1/auth/permissions/my')
  return (data || [])
    .map((p) => (typeof p === 'string' ? p : (p as PermissionCode).code))
    .filter((c): c is string => !!c)
}


/**
 * 刷新访问令牌（POST /auth/v1/refresh，刷新令牌一次性消费后轮换）。
 * 供 utils/request.ts 的 401 单飞刷新使用；调用成功不自动持久化令牌，页面不应另建刷新机制。
 * deviceId/platform 仍随请求提交，但当前后端只消费 refreshToken，设备信息沿用旧令牌记录。
 * @param refreshToken 当前持有的刷新令牌，不应对同一令牌并行请求刷新
 * @returns 裸 TokenPair（accessToken/refreshToken/tokenType/expiresIn），有效期单位为秒
 */
export function refreshToken(refreshToken: string): Promise<LoginResult> {
  return post<LoginResult>('/auth/v1/refresh', { refreshToken, deviceId: 'apex-admin-web', platform: 'web' })
}

/** ========== 系统角色与权限管理 ========== */

/** 系统角色（后端 RoleDTO） */
export interface SystemRole {
  id: number
  name: string
  code: string
  description?: string
  /** 0=禁用 1=正常 */
  status?: number
  createTime?: string
}

/** 系统角色创建/更新请求体（后端 RoleRequest） */
export interface SystemRolePayload {
  /** 更新时必填 */
  id?: number
  name: string
  code: string
  description?: string
  /** 0=禁用 1=正常，默认 1 */
  status?: number
}

/** 系统权限（后端 PermissionDTO） */
export interface SystemPermission {
  id: number
  name: string
  code: string
  description?: string
  /** 1=菜单 2=按钮 3=接口 */
  type: number
  status?: number
  createTime?: string
}

/** 系统权限创建/更新请求体（后端 PermissionRequest，code 格式为 模块:操作） */
export interface SystemPermissionPayload {
  /** 更新时必填 */
  id?: number
  name: string
  code: string
  description?: string
  /** 1=菜单 2=按钮 3=接口 */
  type: number
  status?: number
}

/**
 * 查询全部系统角色。
 */
export function listSystemRoles(): Promise<SystemRole[]> {
  return get<SystemRole[]>('/api/v1/auth/roles')
}

/**
 * 创建系统角色。
 * @param payload 角色内容
 */
export function createSystemRole(payload: SystemRolePayload): Promise<SystemRole> {
  return post<SystemRole>('/api/v1/auth/roles', payload)
}

/**
 * 更新系统角色。
 * @param payload 角色内容（id 必填）
 */
export function updateSystemRole(payload: SystemRolePayload): Promise<SystemRole> {
  return post<SystemRole>('/api/v1/auth/roles/update', payload)
}

/**
 * 删除系统角色（存在关联数据时后端返回 409）。
 * @param id 角色 ID
 */
export function deleteSystemRole(id: number): Promise<void> {
  return del<void>(`/api/v1/auth/roles/${id}`)
}

/**
 * 查询全部系统权限。
 */
export function listSystemPermissions(): Promise<SystemPermission[]> {
  return get<SystemPermission[]>('/api/v1/auth/permissions')
}

/**
 * 创建系统权限。
 * @param payload 权限内容
 */
export function createSystemPermission(payload: SystemPermissionPayload): Promise<SystemPermission> {
  return post<SystemPermission>('/api/v1/auth/permissions', payload)
}

/**
 * 更新系统权限。
 * @param payload 权限内容（id 必填）
 */
export function updateSystemPermission(payload: SystemPermissionPayload): Promise<SystemPermission> {
  return post<SystemPermission>('/api/v1/auth/permissions/update', payload)
}

/**
 * 删除系统权限（存在关联数据时后端返回 409）。
 * @param id 权限 ID
 */
export function deleteSystemPermission(id: number): Promise<void> {
  return del<void>(`/api/v1/auth/permissions/${id}`)
}
