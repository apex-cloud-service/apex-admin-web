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
  /** 状态：1=成功 0=失败（业务日志页按 1 判定成功；注意与登录日志的 0=成功 1=失败 口径相反） */
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
 * @param params 查询参数（startTime/endTime 格式：yyyy-MM-dd HH:mm:ss，limit 可选）
 * @returns RuntimeLog 数组；没有分页 total，limit 是结果数量限制
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
 * @returns BusinessLog 分页（list/total），状态口径见 BusinessLog.status
 */
export function queryBusinessLogs(params: BusinessLogQuery): Promise<PageResponse<BusinessLog>> {
  return get<PageResponse<BusinessLog>>('/admin-api/v1/logs/business', params as unknown as Record<string, unknown>)
}

