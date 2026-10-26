/**
 * 认证配置管理 API
 * ------------------------------------------------------------------
 * 提供 JWT 配置、OAuth2 客户端配置、权限码管理、会话管理、
 * 在线用户管理、安全策略配置、登录尝试记录等功能
 * 
 * 后端接口：
 * - GET/PUT /admin-api/v1/auth/config/jwt - JWT Token 配置
 * - GET/POST/PUT/DELETE /admin-api/v1/auth/config/oauth2/clients - OAuth2 客户端管理
 * - POST/DELETE /api/v1/auth/permissions（更新走 /update 子路径）- 权限码管理
 * - GET /admin-api/v1/auth/config/sessions（踢出会话：POST /admin-api/v1/users/{sessionId}/sessions/revoke）- 会话管理
 * - GET/PUT /admin-api/v1/auth/config/session - 会话配置
 * - GET/PUT /admin-api/v1/auth/config/security - 安全策略配置
 * - GET /admin-api/v1/auth/config/login-logs - 登录尝试记录
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types'

/**
 * JWT Token 配置
 */
export interface JwtConfig {
  secret: string
  accessTokenExpiration: number
  refreshTokenExpiration: number
  refreshWindowSeconds: number
  enableRefreshTokenRotation: boolean
  validateIssuer: boolean
  issuer?: string
  validateAudience: boolean
  audience?: string
}

/**
 * OAuth2 客户端配置
 */
export interface OAuth2ClientConfig {
  id?: string
  clientId: string
  clientName: string
  clientSecret?: string
  clientAuthenticationMethods: string[]
  authorizationGrantTypes: string[]
  redirectUris: string[]
  postLogoutRedirectUris?: string[]
  scopes: string[]
  requireProofKey?: boolean
  requireAuthorizationConsent?: boolean
  accessTokenTimeToLive?: number
  refreshTokenTimeToLive?: number
  authorizationCodeTimeToLive?: number
}

/**
 * 权限码定义
 */
export interface Permission {
  id?: number
  /** 权限码（如 system:user:create） */
  code: string
  /** 权限名称 */
  name: string
  /** 权限描述 */
  description?: string
  /** 所属模块 */
  module?: string
  /** 权限类型：menu=菜单 button=按钮 api=API */
  type: number
  /** 状态：0=停用 1=启用 */
  status: number
  createTime?: string
  updateTime?: string
}

/**
 * 权限与角色关联关系
 */
export interface PermissionRole {
  /** 权限 ID */
  permissionId: number
  /** 角色 ID */
  roleId: number
  /** 角色名称 */
  roleName: string
}

/**
 * 在线用户信息
 */
export interface OnlineUser {
  id: string
  username: string
  nickName?: string
  lastLoginIp?: string
  lastHeartbeatTime?: string
}

/**
 * 会话管理配置
 */
export interface SessionConfig {
  maxConcurrentSessions: number
  sessionTimeout: number
  preventLogin: boolean
  enableSessionFixationProtection: boolean
  enableRememberMe: boolean
  rememberMeDuration: number
  enableActivityTracking: boolean
  cleanupInterval: number
}

/**
 * 登录尝试记录
 */
export interface LoginAttempt {
  id: number
  /** 登录用户名 */
  username: string
  /** 登录 IP 地址 */
  ip: string
  /** 尝试时间 */
  loginTime: string
  /** 是否成功 */
  status: number
  /** 失败原因 */
  message?: string
}

/**
 * 安全策略配置
 */
export interface SecurityPolicy {
  loginFailureLockThreshold: number
  accountLockDuration: number
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireDigit: boolean
  passwordRequireSpecialChar: boolean
  passwordExpirationDays: number
  passwordHistoryLimit: number
  enableCaptcha: boolean
  captchaThreshold: number
  enableTwoFactorAuth: boolean
  enableIpWhitelist: boolean
  ipWhitelist?: string
}

/**
 * 获取 JWT 配置
 * @returns JWT 配置信息
 */
export function getJwtConfig(): Promise<JwtConfig> {
  return get<JwtConfig>('/admin-api/v1/auth/config/jwt')
}

/**
 * 更新 JWT 配置
 * @param payload JWT 配置信息
 */
export async function updateJwtConfig(payload: Omit<JwtConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  if (!payload.secret?.trim() || /^\*+$/.test(payload.secret.trim())) {
    throw new Error('请填写新的 JWT 密钥，不能保存脱敏值')
  }
  return put<void>('/admin-api/v1/auth/config/jwt', payload)
}

/** JWT 配置测试响应（后端 JwtTestResponse） */
export interface JwtTestResult {
  /** 按当前配置生成的测试 Token */
  token: string
  /** 解码后的 Token 载荷 */
  decoded?: Record<string, unknown>
  /** Token 校验是否通过 */
  isValid?: boolean
  issuedAt?: string
  expiresAt?: string
  issuer?: string
}

/**
 * 测试 JWT 配置：按当前配置生成并验证一个测试 Token，用于确认配置正确性
 * @param options.expiresIn 测试 Token 有效期（秒，可选）
 * @param options.payload 自定义载荷（可选）
 */
export function testJwtConfig(options?: { expiresIn?: number; payload?: Record<string, unknown> }): Promise<JwtTestResult> {
  return post<JwtTestResult>('/admin-api/v1/auth/config/jwt/test', {
    expiresIn: options?.expiresIn,
    payload: options?.payload,
  })
}

/**
 * 查询 OAuth2 客户端列表
 * @returns OAuth2 客户端列表
 */
export function listOAuth2Clients(): Promise<OAuth2ClientConfig[]> {
  return get<OAuth2ClientConfig[]>('/admin-api/v1/auth/config/oauth2/clients')
}

/**
 * 创建 OAuth2 客户端
 * @param payload 客户端配置信息
 */
export async function createOAuth2Client(payload: Omit<OAuth2ClientConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  validateOAuth2Settings(payload)
  return post<void>('/admin-api/v1/oauth2/clients', payload)
}

/**
 * 更新 OAuth2 客户端配置
 * @param id 客户端 ID
 * @param payload 客户端配置信息
 */
export async function updateOAuth2Client(id: string, payload: Omit<OAuth2ClientConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  validateOAuth2Settings(payload)
  return put<void>(`/admin-api/v1/oauth2/clients/${encodeURIComponent(id)}`, payload)
}

/**
 * 删除 OAuth2 客户端
 * @param id 客户端 ID
 */
export function deleteOAuth2Client(id: string): Promise<void> {
  return del<void>(`/admin-api/v1/oauth2/clients/${encodeURIComponent(id)}`)
}



/**
 * 分页查询权限码列表
 * @param query 分页查询参数（可选模块、类型筛选）
 * @returns 权限码分页结果
 */
export async function listPermissions(query: PageQuery & { type?: number }): Promise<PageResponse<Permission>> {
  const all = await get<Permission[]>('/admin-api/v1/auth/config/permissions')
  const filtered = all.filter(item => !query.type || item.type === query.type)
  const page = query.page || 1
  const size = query.size || 10
  return { list: filtered.slice((page - 1) * size, page * size), total: filtered.length, pageNum: page, pageSize: size, pages: Math.ceil(filtered.length / size), hasNext: page * size < filtered.length }
}

/**
 * 创建权限码
 * @param payload 权限码信息
 */
export function createPermission(payload: Omit<Permission, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return post<void>('/api/v1/auth/permissions', payload)
}

/**
 * 更新权限码
 * @param id 权限 ID
 * @param payload 权限码信息
 */
export function updatePermission(id: number, payload: Omit<Permission, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return post<void>('/api/v1/auth/permissions/update', { ...payload, id })
}

/**
 * 删除权限码
 * @param id 权限 ID
 */
export function deletePermission(id: number): Promise<void> {
  return del<void>(`/api/v1/auth/permissions/${id}`)
}



/**
 * 同步权限码（从代码注解自动扫描生成）
 * @returns 同步统计信息
 */
export function syncPermissions(): Promise<{ addedPermissions: string[]; removedPermissions: string[] }> {
  return post<{ addedPermissions: string[]; removedPermissions: string[] }>('/admin-api/v1/auth/config/permissions/sync')
}

/**
 * 分页查询在线用户列表
 * @param query 分页查询参数
 * @returns 在线用户分页结果
 */
export function listOnlineUsers(query: PageQuery): Promise<PageResponse<OnlineUser>> {
  return get<PageResponse<OnlineUser>>('/admin-api/v1/auth/config/sessions', query as unknown as Record<string, unknown>)
}

/**
 * 强制用户下线
 * @param sessionId 会话 ID
 */
export function forceLogout(sessionId: string): Promise<void> {
  return post<void>(`/admin-api/v1/users/${encodeURIComponent(sessionId)}/sessions/revoke`)
}

/**
 * 批量强制用户下线
 * @param sessionIds 会话 ID 列表
 */
export async function batchForceLogout(sessionIds: string[]): Promise<void> {
  for (const id of new Set(sessionIds)) await forceLogout(id)
}

/**
 * 获取会话管理配置
 * @returns 会话配置信息
 */
export function getSessionConfig(): Promise<SessionConfig> {
  return get<SessionConfig>('/admin-api/v1/auth/config/session')
}

/**
 * 更新会话管理配置
 * @param payload 会话配置信息
 */
export function updateSessionConfig(payload: Omit<SessionConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return put<void>('/admin-api/v1/auth/config/session', payload)
}

/**
 * 分页查询登录尝试记录
 * @param query 分页查询参数（可选用户名、成功状态筛选）
 * @returns 登录尝试记录分页结果
 */
export function listLoginAttempts(query: PageQuery & { username?: string; status?: number }): Promise<PageResponse<LoginAttempt>> {
  return get<PageResponse<LoginAttempt>>('/admin-api/v1/auth/config/login-logs', query as unknown as Record<string, unknown>)
}

/**
 * 获取安全策略配置
 * @returns 安全策略信息
 */
export function getSecurityPolicy(): Promise<SecurityPolicy> {
  return get<SecurityPolicy>('/admin-api/v1/auth/config/security')
}

/**
 * 更新安全策略配置
 * @param payload 安全策略信息
 */
export function updateSecurityPolicy(payload: Omit<SecurityPolicy, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return put<void>('/admin-api/v1/auth/config/security', payload)
}



function validateOAuth2Settings(payload: OAuth2ClientConfig): void {
  if (payload.clientAuthenticationMethods.includes('none') &&
      payload.authorizationGrantTypes.includes('authorization_code') && payload.requireProofKey !== true) {
    throw new Error('公共授权码客户端必须启用 PKCE')
  }
  if (typeof payload.requireProofKey !== 'boolean' || typeof payload.requireAuthorizationConsent !== 'boolean' ||
      [payload.accessTokenTimeToLive, payload.refreshTokenTimeToLive, payload.authorizationCodeTimeToLive]
        .some(value => !Number.isSafeInteger(value) || value! <= 0)) {
    throw new Error('请明确设置 PKCE、授权确认及三种令牌有效期')
  }
}
