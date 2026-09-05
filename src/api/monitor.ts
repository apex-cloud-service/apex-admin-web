/**
 * 监控与审计 API
 * ------------------------------------------------------------------
 * 覆盖：登录日志、操作审计日志、在线用户、监控大盘四类监控资源。
 * 参数口径已与后端对齐：登录日志 username/status，审计日志 module/operatorName，
 * 在线用户分页返回 PageResponse。
 */
import { get } from '@/utils/request'
import type {
  ApiCallLog,
  AuditLog,
  LoginLog,
  MonitorBusiness,
  MonitorGovernance,
  MonitorMiddleware,
  MonitorOverview,
  MonitorSystem,
  OnlineUser,
  PageQuery,
  PageResponse,
} from '@/types'

/** 登录日志查询参数（后端 username 模糊 + status 精确） */
export interface LoginLogQuery extends PageQuery {
  username?: string
  status?: number
}

/** 审计日志查询参数（后端 module/operatorName 模糊） */
export interface AuditLogQuery extends PageQuery {
  module?: string
  operatorName?: string
}

/** 在线用户查询参数 */
export interface OnlineUserQuery extends PageQuery {
  username?: string
}

/**
 * 分页查询登录日志。
 * @param params 分页与筛选参数（username 模糊、status 0=成功 1=失败）
 */
export function listLoginLogs(params: LoginLogQuery): Promise<PageResponse<LoginLog>> {
  return get<PageResponse<LoginLog>>('/admin-api/v1/login-logs', params as unknown as Record<string, unknown>)
}

/**
 * 分页查询操作审计日志。
 * @param params 分页与筛选参数（module/operatorName 模糊）
 */
export function listAuditLogs(params: AuditLogQuery): Promise<PageResponse<AuditLog>> {
  return get<PageResponse<AuditLog>>('/admin-api/v1/audit-logs', params as unknown as Record<string, unknown>)
}

/**
 * 分页查询在线用户列表。
 * @param params 分页参数
 */
export function listOnlineUsers(params: OnlineUserQuery): Promise<PageResponse<OnlineUser>> {
  return get<PageResponse<OnlineUser>>('/admin-api/v1/online-users', params as unknown as Record<string, unknown>)
}

/* ==================== 监控大盘（/admin-api/v1/monitor） ==================== */

/**
 * 查询监控概览（仪表盘指标卡数据）。
 */
export function getMonitorOverview(): Promise<MonitorOverview> {
  return get<MonitorOverview>('/admin-api/v1/monitor/overview')
}

/**
 * 查询系统资源监控（内存/CPU/磁盘/网络/JVM/线程/GC）。
 */
export function getMonitorSystem(): Promise<MonitorSystem> {
  return get<MonitorSystem>('/admin-api/v1/monitor/system')
}

/**
 * 查询中间件监控（MySQL/Redis/消息中间件/Zipkin）。
 */
export function getMonitorMiddleware(): Promise<MonitorMiddleware> {
  return get<MonitorMiddleware>('/admin-api/v1/monitor/middleware')
}

/**
 * 查询治理监控（Sentinel 熔断/限流 + 网关流量 + 熔断器）。
 */
export function getMonitorGovernance(): Promise<MonitorGovernance> {
  return get<MonitorGovernance>('/admin-api/v1/monitor/governance')
}

/**
 * 查询核心业务监控指标。
 */
export function getMonitorBusiness(): Promise<MonitorBusiness> {
  return get<MonitorBusiness>('/admin-api/v1/monitor/business')
}

/** API 调用日志查询参数（serviceName/status 精确，traceId/path 模糊） */
export interface ApiCallLogQuery extends PageQuery {
  serviceName?: string
  status?: number
  traceId?: string
  path?: string
}

/**
 * 分页查询 API 调用日志（对外 HTTP 调用回溯）。
 * @param params 分页与筛选参数（serviceName/status 精确，traceId/path 模糊）
 */
export function listApiCallLogs(
  params: ApiCallLogQuery
): Promise<PageResponse<ApiCallLog>> {
  return get<PageResponse<ApiCallLog>>(
    '/admin-api/v1/api-call-logs',
    params as unknown as Record<string, unknown>
  )
}
