/**
 * SSO单点登录配置管理 API
 * ------------------------------------------------------------------
 * 提供SSO提供商管理、会话管理、审计日志、统计信息等功能
 *
 * 支持的SSO协议(与后端 SsoProtocolType 一致):
 * - SAML 2.0 - 企业级单点登录标准协议
 * - CAS - 中央认证服务协议
 * - LDAP - 轻量级目录访问协议
 * - OIDC - OpenID Connect协议
 *
 * 后端接口:
 * - GET/POST/PUT/DELETE /admin-api/v1/sso/providers - SSO提供商管理(列表为裸数组)
 * - POST /admin-api/v1/sso/providers/{id}/test - 测试SSO连接
 * - GET /admin-api/v1/sso/providers/{id}/metadata - 获取SSO元数据
 * - GET /admin-api/v1/sso/sessions - SSO会话列表(裸数组)
 * - POST /admin-api/v1/sso/sessions/{id}/revoke - 撤销单个会话
 * - POST /admin-api/v1/sso/sessions/users/{userId}/revoke - 撤销用户全部会话
 * - GET /admin-api/v1/sso/sessions/statistics - SSO会话统计
 * - GET /admin-api/v1/sso/audit-logs - SSO审计日志(裸数组)
 *
 * 权限码: system:sso:provider:list/add/edit/remove/query/test/metadata、
 * system:sso:session:list/revoke/stat、system:sso:auditlog:list/stat
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery } from '@/types'

/** SSO协议类型(与后端 SsoProtocolType 枚举一致) */
export type SsoProtocolType = 'SAML' | 'CAS' | 'LDAP' | 'OIDC'

/**
 * SSO提供商配置(与后端 SsoProviderDTO / SsoProviderRequest 一致)
 */
export interface SSOProvider {
  id?: number
  /** 提供商名称(租户内唯一) */
  providerName: string
  /** 协议类型 */
  protocolType: SsoProtocolType
  /** 是否启用 */
  enabled: boolean
  /** 认证端点 */
  authEndpoint?: string
  /** 登出端点 */
  logoutEndpoint?: string
  /** 实体ID(SAML) */
  entityId?: string
  /** X.509证书(SAML) */
  certificate?: string
  /** 元数据URL(SAML/OIDC 自动配置) */
  metadataUrl?: string
  /** 协议扩展配置(JSON字符串) */
  configJson?: string
  /** 描述信息 */
  description?: string
  /** 排序权重 */
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * SSO会话信息(与后端 SsoSessionDTO 一致)
 */
export interface SSOSession {
  id: number
  providerId?: number
  /** 提供商名称 */
  providerName?: string
  /** 用户ID */
  userId?: number
  /** 用户名 */
  username?: string
  /** SSO会话令牌 */
  ssoSessionToken?: string
  /** 本地会话ID */
  localSessionId?: string
  /** 登录IP */
  loginIp?: string
  userAgent?: string
  /** 会话状态: ACTIVE/EXPIRED/LOGOUT */
  status?: string
  loginTime?: string
  expireTime?: string
  lastActiveTime?: string
  revokedAt?: string
  revokedBy?: number
  revokeReason?: string
}

/**
 * SSO审计日志(与后端 SsoAuditLogDTO 一致)
 */
export interface SSOAuditLog {
  id: number
  providerId?: number
  providerName?: string
  userId?: number
  username?: string
  /** 操作类型 */
  operationType?: string
  /** 操作结果: SUCCESS/FAILURE */
  result?: string
  /** 失败原因 */
  failureReason?: string
  /** 操作IP */
  operatorIp?: string
  userAgent?: string
  requestParams?: string
  responseResult?: string
  /** 耗时(毫秒) */
  duration?: number
  errorStack?: string
  description?: string
  createdAt?: string
}

/**
 * SSO统计信息(与后端 SsoStatisticsDTO 一致)
 */
export interface SSOStatistics {
  activeSessionCount: number
  todayNewSessionCount: number
  todayRevokedSessionCount: number
  todayLoginCount: number
  todayLoginSuccessCount: number
  todayLoginFailureCount: number
  /** 今日登录成功率(百分比) */
  todayLoginSuccessRate: number
  todayAvgLoginDuration: number
  todayMaxLoginDuration: number
  enabledProviderCount: number
  totalProviderCount: number
  mostUsedProviderName?: string
  mostUsedProviderCount?: number
}

/**
 * 获取SSO提供商列表(裸数组,支持按名称筛选)
 * @param query 分页与筛选参数
 */
export function listSSOProviders(
  query?: PageQuery & { providerName?: string }
): Promise<SSOProvider[]> {
  return get('/admin-api/v1/sso/providers', { ...query })
}

/**
 * 创建SSO提供商
 * @param data 提供商配置数据
 */
export function createSSOProvider(data: SSOProvider): Promise<SSOProvider> {
  return post('/admin-api/v1/sso/providers', data)
}

/**
 * 更新SSO提供商(后端按请求体全量覆盖,须携带完整字段)
 * @param id 提供商ID
 * @param data 提供商配置数据
 */
export function updateSSOProvider(id: number, data: SSOProvider): Promise<SSOProvider> {
  return put(`/admin-api/v1/sso/providers/${id}`, data)
}

/**
 * 删除SSO提供商
 * @param id 提供商ID
 */
export function deleteSSOProvider(id: number): Promise<void> {
  return del(`/admin-api/v1/sso/providers/${id}`)
}

/**
 * 测试SSO连接
 * @param id 提供商ID
 */
export function testSSOConnection(id: number): Promise<{ success: boolean; message: string }> {
  return post(`/admin-api/v1/sso/providers/${id}/test`, {})
}

/**
 * 获取SSO元数据(SAML 返回 SP 元数据,OIDC 返回 Discovery 信息,CAS 返回服务配置)
 * @param id 提供商ID
 */
export function getSSOMetadata(id: number): Promise<unknown> {
  return get(`/admin-api/v1/sso/providers/${id}/metadata`)
}

/**
 * 获取SSO会话列表(裸数组)
 * @param query 分页与筛选参数
 */
export function listSSOSessions(
  query: PageQuery & { userId?: number; providerId?: number; status?: string }
): Promise<SSOSession[]> {
  return get('/admin-api/v1/sso/sessions', { ...query })
}

/**
 * 强制终止SSO会话(强制用户下线,后端按数字主键撤销)
 * @param id 会话主键ID
 */
export function terminateSSOSession(id: number): Promise<void> {
  return post(`/admin-api/v1/sso/sessions/${id}/revoke`)
}

/**
 * 批量强制终止SSO会话(后端无批量端点,并发调用单条撤销)
 * @param ids 会话主键ID列表
 */
export function batchTerminateSSOSessions(ids: number[]): Promise<void> {
  return Promise.all(ids.map((id) => terminateSSOSession(id))).then(() => undefined)
}

/**
 * 获取SSO审计日志列表(裸数组)
 * @param query 分页与筛选参数(时间格式 ISO Date-Time)
 */
export function listSSOAuditLogs(
  query: PageQuery & {
    providerId?: number
    userId?: number
    operationType?: string
    startTime?: string
    endTime?: string
  }
): Promise<SSOAuditLog[]> {
  return get('/admin-api/v1/sso/audit-logs', { ...query })
}

/**
 * 获取SSO统计信息(会话维度)
 */
export function getSSOStatistics(): Promise<SSOStatistics> {
  return get('/admin-api/v1/sso/sessions/statistics')
}
