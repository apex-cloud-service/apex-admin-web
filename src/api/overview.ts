/**
 * 跨域只读聚合概览 API（方案 D5）
 * ------------------------------------------------------------------
 * 后端接口（apex-system PlatformOverviewRouter）：
 * - GET /api/v2/overview - 按当前租户聚合文件存储用量、工作流进行中实例数与
 *   集成设备数；单源不可达时该源 status=DEGRADED 并带 error，整体仍 200。
 *
 * 租户取自可信租户上下文（请求头 X-Tenant-Id 仅作匹配声明，不能覆盖），
 * 权限码 system:monitor:view。集群内部端点 /internal/v1/overview 与之共用聚合门面，
 * 但被网关对 /internal/** 强制 403，浏览器应使用本端点。
 */
import { get } from '@/utils/request'
import type { CrossDomainOverview } from '@/types'

/**
 * 查询当前租户的跨域只读聚合概览
 */
export function getCrossDomainOverview(): Promise<CrossDomainOverview> {
  return get<CrossDomainOverview>('/api/v2/overview')
}
