/**
 * SSO单点登录配置管理 API
 * ------------------------------------------------------------------
 * 提供SSO提供商管理、会话管理、审计日志、统计信息等功能
 * 
 * 支持的SSO协议:
 * - SAML 2.0 - 企业级单点登录标准协议
 * - CAS - 中央认证服务协议
 * - LDAP - 轻量级目录访问协议
 * - OAuth2 - 开放授权协议
 * - OIDC - OpenID Connect协议
 * 
 * 后端接口:
 * - GET/POST/PUT/DELETE /admin-api/v1/sso/providers - SSO提供商管理
 * - POST /admin-api/v1/sso/providers/{id}/test - 测试SSO连接
 * - GET /admin-api/v1/sso/providers/{id}/metadata - 获取SSO元数据
 * - GET/DELETE /admin-api/v1/sso/sessions - SSO会话管理
 * - GET /admin-api/v1/sso/audit-logs - SSO审计日志
 * - GET /admin-api/v1/sso/statistics - SSO统计信息
 * 
 * @author system
 * @date 2024
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types'

/**
 * SSO提供商配置
 */
export interface SSOProvider {
  id?: number
  /** 提供商标识名称(唯一) */
  name: string
  /** SSO类型: SAML/CAS/LDAP/OAUTH2/OIDC */
  type: 'SAML' | 'CAS' | 'LDAP' | 'OAUTH2' | 'OIDC'
  /** 是否启用 */
  enabled: boolean
  /** 显示名称 */
  displayName: string
  /** 描述信息 */
  description?: string
  /** 具体配置(根据type不同而不同) */
  config: Record<string, any>
  createTime?: string
  updateTime?: string
}

/**
 * SAML 2.0 配置
 */
export interface SAMLConfig {
  /** 实体ID */
  entityId: string
  /** 单点登录URL */
  ssoUrl: string
  /** 单点登出URL */
  sloUrl?: string
  /** X.509证书 */
  certificate: string
  /** 名称ID格式 */
  nameIdFormat?: string
  /** 是否签名认证请求 */
  signAuthnRequest?: boolean
  /** 是否要求断言签名 */
  wantAssertionsSigned?: boolean
}

/**
 * CAS协议配置
 */
export interface CASConfig {
  /** CAS服务器地址 */
  serverUrl: string
  /** 登录URL */
  loginUrl: string
  /** 验证URL */
  validateUrl: string
  /** 登出URL */
  logoutUrl?: string
  /** CAS协议版本 */
  protocol: 'CAS_1_0' | 'CAS_2_0' | 'CAS_3_0'
}

/**
 * LDAP目录服务配置
 */
export interface LDAPConfig {
  /** LDAP服务器地址 */
  serverUrl: string
  /** 基础DN */
  baseDn: string
  /** 绑定DN */
  bindDn: string
  /** 绑定密码 */
  bindPassword: string
  /** 用户过滤器 */
  userFilter: string
  /** 用户名属性 */
  usernameAttribute: string
  /** 邮箱属性 */
  emailAttribute?: string
  /** 显示名属性 */
  displayNameAttribute?: string
}

/**
 * OpenID Connect配置
 */
export interface OIDCConfig {
  /** 发行者 */
  issuer: string
  /** 客户端ID */
  clientId: string
  /** 客户端密钥 */
  clientSecret: string
  /** 授权端点 */
  authorizationEndpoint: string
  /** 令牌端点 */
  tokenEndpoint: string
  /** 用户信息端点 */
  userInfoEndpoint: string
  /** 授权范围 */
  scope: string
  /** 响应类型 */
  responseType: string
}

/**
 * SSO会话信息
 */
export interface SSOSession {
  id: number
  /** 用户ID */
  userId: number
  /** 用户名 */
  username: string
  /** SSO提供商 */
  provider: string
  /** 会话ID */
  sessionId: string
  /** IP地址 */
  ipAddress: string
  /** 用户代理(浏览器信息) */
  userAgent?: string
  /** 登录时间 */
  loginTime: string
  /** 最后访问时间 */
  lastAccessTime: string
  /** 过期时间 */
  expiryTime: string
}

/**
 * SSO审计日志
 */
export interface SSOAuditLog {
  id: number
  /** 用户ID */
  userId?: number
  /** 用户名 */
  username: string
  /** SSO提供商 */
  provider: string
  /** 操作类型 */
  action: 'LOGIN' | 'LOGOUT' | 'REFRESH' | 'VALIDATE' | 'ERROR'
  /** 操作结果 */
  result: 'SUCCESS' | 'FAILURE'
  /** IP地址 */
  ipAddress: string
  /** 用户代理 */
  userAgent?: string
  /** 错误信息 */
  errorMessage?: string
  /** 创建时间 */
  createTime: string
}

/**
 * 获取SSO提供商列表
 */
export function listSSOProviders(): Promise<SSOProvider[]> {
  return get('/admin-api/v1/sso/providers')
}

/**
 * 获取SSO提供商详情
 * @param id 提供商ID
 */
export function getSSOProvider(id: number): Promise<SSOProvider> {
  return get(`/admin-api/v1/sso/providers/${id}`)
}

/**
 * 创建SSO提供商
 * @param data 提供商配置数据
 */
export function createSSOProvider(data: SSOProvider): Promise<SSOProvider> {
  return post('/admin-api/v1/sso/providers', data)
}

/**
 * 更新SSO提供商
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
 * 切换SSO提供商启用状态
 * @param id 提供商ID
 * @param enabled 是否启用
 */
export function toggleSSOProvider(id: number, enabled: boolean): Promise<void> {
  return put(`/admin-api/v1/sso/providers/${id}/toggle`, { enabled })
}

/**
 * 获取SSO元数据(SAML/OIDC等协议的元数据XML或JSON)
 * @param id 提供商ID
 */
export function getSSOMetadata(id: number): Promise<string> {
  return get(`/admin-api/v1/sso/providers/${id}/metadata`)
}

/**
 * 获取SSO会话列表
 * @param query 分页查询参数
 */
export function listSSOSessions(query: PageQuery): Promise<PageResponse<SSOSession>> {
  return get('/admin-api/v1/sso/sessions', { ...query })
}

/**
 * 强制终止SSO会话(强制用户下线)
 * @param sessionId 会话ID
 */
export function terminateSSOSession(sessionId: string): Promise<void> {
  return del(`/admin-api/v1/sso/sessions/${sessionId}`)
}

/**
 * 批量强制终止SSO会话
 * @param sessionIds 会话ID列表
 */
export function batchTerminateSSOSessions(sessionIds: string[]): Promise<void> {
  return post('/admin-api/v1/sso/sessions/batch-terminate', { sessionIds })
}

/**
 * 获取SSO审计日志列表
 * @param query 查询参数(支持按提供商、操作、结果筛选)
 */
export function listSSOAuditLogs(
  query: PageQuery & { provider?: string; action?: string; result?: string }
): Promise<PageResponse<SSOAuditLog>> {
  return get('/admin-api/v1/sso/audit-logs', { ...query })
}

/**
 * 获取SSO统计信息
 */
export function getSSOStatistics(): Promise<{
  /** 提供商总数 */
  totalProviders: number
  /** 已启用的提供商数量 */
  enabledProviders: number
  /** 当前活跃会话数 */
  activeSessions: number
  /** 今日登录次数 */
  todayLogins: number
  /** 登录成功率(百分比) */
  loginSuccessRate: number
}> {
  return get('/admin-api/v1/sso/statistics')
}
