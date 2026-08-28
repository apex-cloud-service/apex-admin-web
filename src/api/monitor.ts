/**
 * 监控与审计 API
 * ------------------------------------------------------------------
 * 覆盖：登录日志、操作审计日志、在线用户三类监控资源。
 */
import { get } from '@/utils/request'
import type { AuditLog, LoginLog, OnlineUser, PageQuery, PageResponse } from '@/types'

/** 登录日志查询参数 */
export interface LoginLogQuery extends PageQuery {
  keyword?: string
  status?: number
}

/** 审计日志查询参数 */
export interface AuditLogQuery extends PageQuery {
  keyword?: string
}

/**
 * 分页查询登录日志。
 * @param params 分页与筛选参数
 */
export function listLoginLogs(params: LoginLogQuery): Promise<PageResponse<LoginLog>> {
  return get<PageResponse<LoginLog>>('/admin-api/v1/login-logs', params as unknown as Record<string, unknown>)
}

/**
 * 分页查询操作审计日志。
 * @param params 分页与筛选参数
 */
export function listAuditLogs(params: AuditLogQuery): Promise<PageResponse<AuditLog>> {
  return get<PageResponse<AuditLog>>('/admin-api/v1/audit-logs', params as unknown as Record<string, unknown>)
}

/**
 * 查询在线用户列表。
 */
export function listOnlineUsers(): Promise<OnlineUser[]> {
  return get<OnlineUser[]>('/admin-api/v1/online-users')
}
