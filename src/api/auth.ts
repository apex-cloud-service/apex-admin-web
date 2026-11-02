/**
 * 认证相关 API
 * ------------------------------------------------------------------
 * 覆盖：图形验证码、账号密码登录、登出、角色/权限查询，
 * 以及系统角色与权限的管理（CRUD，与登录链路同源数据域）。
 */
import { del, get, post } from '@/utils/request'
import type { CaptchaVO, LoginResult } from '@/types'

/** 登录请求体 */
export interface LoginPayload {
  /** 登录类型：PASSWORD=账号密码（管理后台固定使用） */
  loginType?: string
  /** 登录账号（sys_user.username） */
  username?: string
  /** 登录密码（BCrypt 哈希比对） */
  password?: string
  /** 图形验证码 ID（登录前先调用 getCaptcha） */
  captchaId?: string
  /** 图形验证码内容 */
  captchaCode?: string
  /** 设备标识（Token 刷新时校验设备一致性） */
  deviceId?: string
  /** 客户端平台标识 */
  platform?: string
  /**
   * 租户 ID 声明（可选，仅用于登录时的租户匹配校验，不能切换租户）。
   * 认证中心登录链路使用；单体登录后端会忽略该字段。缺省时后端使用 default 租户。
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
 * 账号密码登录。
 * @param payload 登录参数（含验证码）
 * @returns 访问令牌信息
 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return post<LoginResult>('/api/v1/auth/login', {
    loginType: 'PASSWORD',
    ...payload,
  })
}

/**
 * MFA 二步验证：以挑战凭据 + TOTP 验证码交换正式令牌。
 * 认证中心端点 POST /auth/v1/mfa/verify；成功返回与登录同构的正式令牌响应。
 * @param challengeToken 登录响应返回的短 TTL 挑战凭据
 * @param code 6 位 TOTP 验证码
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
 * 刷新访问令牌。
 * 仅供 utils/request.ts 的 401 单飞刷新流程调用，页面不应直接使用。
 * @param refreshToken 当前持有的刷新令牌
 * @returns 新的会话令牌（refreshToken 仅在后端返回时存在）
 */
export function refreshToken(refreshToken: string): Promise<LoginResult> {
  return post<LoginResult>('/api/v1/auth/refresh', { refreshToken, deviceId: 'apex-admin-web', platform: 'web' })
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
