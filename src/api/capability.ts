/**
 * 能力目录与能力计量 API
 * ------------------------------------------------------------------
 * 后端接口（apex-system，D4 能力运营）：
 * - GET /api/v2/capabilities             - 能力目录（权限码 tenant:read）
 * - GET /api/v2/capabilities/subscribed  - 当前租户已订阅能力（无权限码，租户上下文判定）
 * - GET /api/v2/capability-usage         - 能力调用用量分页（权限码 capability:usage:read）
 *
 * 用量口径：按 租户 × 能力 聚合操作审计日志，只读、不做计费；
 * 时间区间缺省近 7 天，最大跨度 92 天；pageSize 上限 100。
 */
import { get } from '@/utils/request'
import type { CapabilityInfo, CapabilityUsage, PageResponse } from '@/types'

/** 能力用量查询参数（capability 必填） */
export interface CapabilityUsageQuery {
  /** 能力编码（如 file-storage / workflow / user-org / office-message） */
  capability: string
  /** 租户标识；缺省回退当前租户上下文 */
  tenantId?: string
  /** 起始日期（含，yyyy-MM-dd） */
  from?: string
  /** 结束日期（含，yyyy-MM-dd） */
  to?: string
  pageNum?: number
  pageSize?: number
}

/**
 * 查询能力目录
 */
export function listCapabilities(): Promise<CapabilityInfo[]> {
  return get<CapabilityInfo[]>('/api/v2/capabilities')
}

/**
 * 查询当前租户已订阅能力（套餐 features 空集合 = 未订阅）
 */
export function listSubscribedCapabilities(): Promise<CapabilityInfo[]> {
  return get<CapabilityInfo[]>('/api/v2/capabilities/subscribed')
}

/**
 * 查询能力调用用量
 * @param query 能力编码、租户与时间区间
 */
export function queryCapabilityUsage(query: CapabilityUsageQuery): Promise<PageResponse<CapabilityUsage>> {
  return get<PageResponse<CapabilityUsage>>(
    '/api/v2/capability-usage',
    query as unknown as Record<string, unknown>,
  )
}
