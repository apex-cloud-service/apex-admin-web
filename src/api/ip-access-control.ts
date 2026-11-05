/**
 * IP 访问控制 API
 * ------------------------------------------------------------------
 * 后端接口（apex-auth-service AuthCenterRouterConfig；⚠️ 写操作参数均在 query string，不是 JSON body）：
 * - GET    /api/ip-access-control/whitelist           - 白名单列表（⚠️ 裸数组）
 * - POST   /api/ip-access-control/whitelist?ipAddress=&description=
 * - GET    /api/ip-access-control/blacklist           - 黑名单列表（⚠️ 裸数组）
 * - POST   /api/ip-access-control/blacklist?ipAddress=&description=&durationMinutes=
 * - PUT    /api/ip-access-control/{ruleId}/enable|disable
 * - DELETE /api/ip-access-control/{ruleId}
 * - POST   /api/ip-access-control/cleanup             - 清理过期规则（Result<number>）
 * - POST   /api/ip-access-control/check?ipAddress=    - 检查是否放行（Result<boolean>）
 */
import { del, get, post, put } from '@/utils/request'
import type { IpAccessRule } from '@/types'

/** 规则类型 */
export type IpRuleType = 'WHITELIST' | 'BLACKLIST'

/** 规则集合路径 */
function listPath(type: IpRuleType): string {
  return `/api/ip-access-control/${type === 'WHITELIST' ? 'whitelist' : 'blacklist'}`
}

/**
 * 查询白名单或黑名单
 * @param type 规则类型
 */
export function listIpRules(type: IpRuleType): Promise<IpAccessRule[]> {
  return get<IpAccessRule[]>(listPath(type))
}

/**
 * 新增 IP 规则（黑名单可指定有效期分钟数，不传为永久）
 * @param type 规则类型
 * @param ipAddress IP 地址（支持 IP/CIDR/通配符）
 * @param description 备注
 * @param durationMinutes 有效期分钟数（仅黑名单）
 */
export function addIpRule(
  type: IpRuleType,
  ipAddress: string,
  description?: string,
  durationMinutes?: number,
): Promise<IpAccessRule> {
  const params = new URLSearchParams({ ipAddress })
  if (description) params.set('description', description)
  if (durationMinutes != null) params.set('durationMinutes', String(durationMinutes))
  return post<IpAccessRule>(`${listPath(type)}?${params.toString()}`)
}

/**
 * 按规则 ID 删除规则
 * @param ruleId 规则 ID
 */
export function deleteIpRule(ruleId: number): Promise<void> {
  return del<void>(`/api/ip-access-control/${ruleId}`)
}

/**
 * 启用/禁用规则
 * @param ruleId 规则 ID
 * @param enabled true=启用
 */
export function toggleIpRule(ruleId: number, enabled: boolean): Promise<void> {
  return put<void>(`/api/ip-access-control/${ruleId}/${enabled ? 'enable' : 'disable'}`)
}

/**
 * 清理已过期规则
 * @returns 清理数量
 */
export function cleanupIpRules(): Promise<number> {
  return post<number>('/api/ip-access-control/cleanup')
}

/**
 * 检查指定 IP 是否放行
 * @param ipAddress IP 地址
 */
export function checkIpAccess(ipAddress: string): Promise<boolean> {
  return post<boolean>(`/api/ip-access-control/check?ipAddress=${encodeURIComponent(ipAddress)}`)
}
