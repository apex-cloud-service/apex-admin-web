/**
 * 认证中心审计日志 API（apex-auth-service，/api/v1/auth/audit-logs）
 * ------------------------------------------------------------------
 * 全部端点仅要求登录（无权限码，cleanup 需管理员角色）；
 * tenantId 为必填查询参数（取会话记录值）；响应为裸数组、无分页（后端全量返回）。
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

/** 查询失败事件（eventStatus=FAILURE，裸数组） */
export function listFailedAuthEvents(tenantId: string): Promise<AuthAuditLog[]> {
  return get('/api/v1/auth/audit-logs/failed', { tenantId })
}

/** 查询高风险事件（riskLevel=HIGH，裸数组） */
export function listHighRiskAuthEvents(tenantId: string): Promise<AuthAuditLog[]> {
  return get('/api/v1/auth/audit-logs/high-risk', { tenantId })
}

/** 查询指定用户的认证事件（裸数组） */
export function listAuthEventsByUser(userId: number, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/user/${userId}`, { tenantId })
}

/** 查询指定事件类型的认证事件（裸数组） */
export function listAuthEventsByType(eventType: string, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/event-type/${encodeURIComponent(eventType)}`, { tenantId })
}

/** 查询指定 IP 的认证事件（裸数组） */
export function listAuthEventsByIp(ipAddress: string, tenantId: string): Promise<AuthAuditLog[]> {
  return get(`/api/v1/auth/audit-logs/ip/${encodeURIComponent(ipAddress)}`, { tenantId })
}

/** 查询指定用户在起始时间后的登录失败次数 */
export function countUserLoginFailures(
  userId: number,
  startTime: string,
  tenantId: string,
): Promise<number> {
  return get(`/api/v1/auth/audit-logs/user/${userId}/login-failures`, { startTime, tenantId })
}

/** 按时间范围查询认证事件（裸数组） */
export function listAuthEventsByTimeRange(query: AuthAuditTimeRangeQuery): Promise<AuthAuditLog[]> {
  return post('/api/v1/auth/audit-logs/time-range', query)
}

/** 按时间范围统计认证事件总数 */
export function countAuthEvents(query: AuthAuditTimeRangeQuery): Promise<number> {
  return post('/api/v1/auth/audit-logs/count', query)
}

/** 查询审计事件详情 */
export function getAuthEventDetail(id: number): Promise<AuthAuditLog> {
  return get(`/api/v1/auth/audit-logs/${id}`)
}

/**
 * 清理指定时间之前的审计日志（需管理员角色，危险操作）
 * @param beforeTime ISO 本地日期时间，删除该时间之前的日志
 */
export function cleanupAuthLogs(beforeTime: string): Promise<number> {
  return del<number>('/api/v1/auth/audit-logs/cleanup', { beforeTime })
}
