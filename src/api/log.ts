/**
 * 日志查询 API
 * ------------------------------------------------------------------
 * 覆盖：运行时日志查询、业务日志统一查询
 */
import { get } from '@/utils/request'
import type { PageResponse } from '@/types'

/**
 * 运行时日志
 */
export interface RuntimeLog {
  timestamp: string
  level: string
  logger: string
  message: string
  thread: string
  exception?: string
  tenantId?: string
  userId?: string
  traceId?: string
}

/**
 * 业务日志
 */
export interface BusinessLog {
  id: string
  logType: string
  timestamp: string
  username: string
  module: string
  operation: string
  ipAddress: string
  browser?: string
  operatingSystem?: string
  duration?: number
  status: number
  message?: string
}

/**
 * 运行时日志查询参数
 */
export interface RuntimeLogQuery {
  startTime?: string
  endTime?: string
  level?: string
  logger?: string
  message?: string
  limit?: number
}

/**
 * 业务日志查询参数
 */
export interface BusinessLogQuery {
  logType?: string
  startTime?: string
  endTime?: string
  username?: string
  module?: string
  page?: number
  size?: number
}

/**
 * 查询运行时日志
 * @param params 查询参数（startTime/endTime 格式：yyyy-MM-dd HH:mm:ss）
 */
export function queryRuntimeLogs(params: RuntimeLogQuery): Promise<RuntimeLog[]> {
  return get<RuntimeLog[]>('/admin-api/v1/logs/runtime', params as unknown as Record<string, unknown>)
}

/**
 * 统计运行时日志数量
 * @param params 统计参数（startTime/endTime/level）
 */
export function countRuntimeLogs(params: Pick<RuntimeLogQuery, 'startTime' | 'endTime' | 'level'>): Promise<number> {
  return get<number>('/admin-api/v1/logs/runtime/count', params as unknown as Record<string, unknown>)
}

/**
 * 查询业务日志（分页）
 * @param params 查询参数（logType: login/operation/api，时间格式：yyyy-MM-dd HH:mm:ss）
 */
export function queryBusinessLogs(params: BusinessLogQuery): Promise<PageResponse<BusinessLog>> {
  return get<PageResponse<BusinessLog>>('/admin-api/v1/logs/business', params as unknown as Record<string, unknown>)
}

/**
 * 统计业务日志数量
 * @param params 统计参数（logType/startTime/endTime）
 */
export function countBusinessLogs(params: Pick<BusinessLogQuery, 'logType' | 'startTime' | 'endTime'>): Promise<number> {
  return get<number>('/admin-api/v1/logs/business/count', params as unknown as Record<string, unknown>)
}
