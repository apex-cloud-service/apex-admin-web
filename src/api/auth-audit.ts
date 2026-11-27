/**
 * 认证中心审计日志 API（apex-auth-service，/api/v1/auth/audit-logs）
 * ------------------------------------------------------------------
 * 全量列表、时间范围与计数查询显式传 tenantId；详情与清理不另传该参数。
 * 列表查询响应为裸数组、无分页；清理要求管理员角色，不能由前端隐藏按钮替代鉴权。
 * 时间格式为无时区 ISO 本地日期时间（如 2026-01-01T00:00:00）。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post } from '@/utils/request'

/** 认证事件类型 */
export type AuthEventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'TOKEN_ISSUED'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REVOKED'
  | 'PERMISSION_CHANGED'
  | 'ROLE_ASSIGNED'
  | 'SESSION_TERMINATED'

/** 认证审计事件（后端 AuditLogDTO） */
export interface AuthAuditLog {
  id: number
  tenantId?: string
  userId?: number
  username?: string
  /** 事件类型（LOGIN、LOGOUT、TOKEN_ISSUED 等，见 AuthEventType） */
  eventType?: string
  /** 事件状态：SUCCESS / FAILURE / PARTIAL_SUCCESS */
  eventStatus?: string
  /** 资源类型：USER / TOKEN / SESSION / PERMISSION / ROLE */
  resourceType?: string
  resourceId?: string
  /** 操作描述 */
  action?: string
  ipAddress?: string
  userAgent?: string
  location?: string
  /** 事件详情（JSON 字符串） */
  details?: string
  failureReason?: string
  /** 风险等级：LOW / MEDIUM / HIGH / CRITICAL */
  riskLevel?: string
  eventTime?: string
  createdAt?: string
}

/** 时间范围查询请求（后端 AuditLogQueryRequest，仅消费三个字段） */
export interface AuthAuditTimeRangeQuery {
  tenantId: string
  /** ISO 本地日期时间，如 2026-01-01T00:00:00 */
  startTime: string
  endTime: string
}

/**
 * 查询失败的认证事件。
 * @param tenantId 必填租户标识，与当前会话的可信租户作用域一致
 * @returns 完整 AuthAuditLog 数组，不含分页总数
 */
export function listFailedAuthEvents(tenantId: string): Promise<AuthAuditLog[]> {
  return get('/api/v1/auth/audit-logs/failed', { tenantId })
}

/**
 * 查询高风险认证事件。
 * @param tenantId 必填租户标识
 * @returns 高风险事件数组，不在本函数中分页或截断
 */
export function listHighRiskAuthEvents(tenantId: string): Promise<AuthAuditLog[]> {
  return get('/api/v1/auth/audit-logs/high-risk', { tenantId })
}

/**
 * 查询指定用户的认证事件。
 * @param userId 用户数字 ID
 * @param tenantId 必填租户标识
 * @returns 该用户的认证事件数组，无分页包装
 */
export function listAuthEventsByUser(userId: number, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/user/${userId}`, { tenantId })
}

/**
 * 按事件类型查询认证事件。
 * @param eventType 事件类型，作为路径段编码后发送；已知值见 AuthEventType
 * @param tenantId 必填租户标识
 * @returns 匹配事件数组，无分页包装
 */
export function listAuthEventsByType(eventType: string, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/event-type/${encodeURIComponent(eventType)}`, { tenantId })
}

/**
 * 按来源 IP 查询认证事件。
 * @param ipAddress 来源 IP，作为路径段编码后发送
 * @param tenantId 必填租户标识
 * @returns 匹配事件数组，无分页包装
 */
export function listAuthEventsByIp(ipAddress: string, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/ip/${encodeURIComponent(ipAddress)}`, { tenantId })
}

/**
 * 统计指定用户在起始时间后的登录失败次数。
 * @param userId 用户数字 ID
 * @param startTime 无时区 ISO 本地日期时间，例如 2026-01-01T00:00:00
 * @param tenantId 必填租户标识
 * @returns 服务端统计的失败次数，不是事件列表长度
 */
export function countUserLoginFailures(
  userId: number,
  startTime: string,
  tenantId: string,
): Promise<number> {
  return get(`/api/v1/auth/audit-logs/user/${userId}/login-failures`, { startTime, tenantId })
}

/**
 * 按时间范围查询认证事件。
 * @param query 租户标识与无时区 ISO 本地日期时间范围；以 JSON 请求体提交
 * @returns 时间范围内的事件数组，不做客户端截断或分页
 */
export function listAuthEventsByTimeRange(query: AuthAuditTimeRangeQuery): Promise<AuthAuditLog[]> {
  return post('/api/v1/auth/audit-logs/time-range', query)
}

/**
 * 按时间范围统计认证事件总数。
 * @param query 租户标识与无时区 ISO 本地日期时间范围
 * @returns 匹配事件总数
 */
export function countAuthEvents(query: AuthAuditTimeRangeQuery): Promise<number> {
  return post('/api/v1/auth/audit-logs/count', query)
}

/**
 * 查询单条认证审计事件详情。
 * @param id 审计事件数字主键；该端点不另传 tenantId 查询参数
 * @returns AuthAuditLog 详情
 */
export function getAuthEventDetail(id: number): Promise<AuthAuditLog> {
  return get(`/api/v1/auth/audit-logs/${id}`)
}

/**
 * 清理指定时间之前的审计日志（需管理员角色，危险操作）
 * @param beforeTime ISO 本地日期时间，删除该时间之前的日志
 * @returns 服务端返回的清理数量；调用前须由页面确认，函数自身不弹确认框
 */
export function cleanupAuthLogs(beforeTime: string): Promise<number> {
  return del<number>('/api/v1/auth/audit-logs/cleanup', { beforeTime })
}
