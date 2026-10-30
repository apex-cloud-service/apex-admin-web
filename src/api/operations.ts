/**
 * 运维健康 API
 * ------------------------------------------------------------------
 * 后端接口（apex-system OperationsRouter，前缀 /api/v2/operations）：
 * - GET  /health-report                       - 实时健康报告（Result<HealthReport>）
 * - POST /health-snapshots                    - 现场采集并保存快照
 * - GET  /health-snapshots                    - 快照分页（⚠️ page/size 口径，非 pageNum/pageSize）
 * - GET  /health-trend                        - 健康趋势（from 缺省回看 7 天，limit ≤500）
 * - GET  /tenant-health-summary               - 租户健康汇总
 * - POST /health-snapshots/export-tasks       - 提交异步导出任务
 * - GET  /health-snapshots/export-tasks/{id}  - 查询导出任务（⚠️ 无任务列表端点）
 * - GET  /health-snapshots/export-tasks/{id}/download - 下载导出文件（CSV 流）
 * - GET  /health-snapshots/export             - 同步导出（CSV 流，上限 5000 行）
 *
 * ⚠️ 不存在 GET /api/v2/operations 根端点。
 */
import { get, post, request } from '@/utils/request'
import type {
  HealthExportTask,
  HealthReport,
  HealthSnapshot,
  HealthTrend,
  PageResponse,
  TenantHealthSummary,
} from '@/types'

/** 快照查询参数（⚠️ page/size 口径） */
export interface HealthSnapshotQuery {
  from?: string
  to?: string
  status?: string
  page: number
  size: number
}

/** 健康趋势查询参数 */
export interface HealthTrendQuery {
  from?: string
  to?: string
  limit?: number
}

/**
 * 查询实时健康报告
 */
export function getHealthReport(): Promise<HealthReport> {
  return get<HealthReport>('/api/v2/operations/health-report')
}

/**
 * 现场采集并保存健康快照
 */
export function captureHealthSnapshot(): Promise<HealthSnapshot> {
  return post<HealthSnapshot>('/api/v2/operations/health-snapshots')
}

/**
 * 分页查询健康快照
 * @param query 时间范围、状态与分页（page/size）
 */
export function listHealthSnapshots(query: HealthSnapshotQuery): Promise<PageResponse<HealthSnapshot>> {
  return get<PageResponse<HealthSnapshot>>(
    '/api/v2/operations/health-snapshots',
    query as unknown as Record<string, unknown>,
  )
}

/**
 * 查询健康趋势
 * @param query 时间范围与取样上限
 */
export function getHealthTrend(query: HealthTrendQuery = {}): Promise<HealthTrend> {
  return get<HealthTrend>('/api/v2/operations/health-trend', query as unknown as Record<string, unknown>)
}

/**
 * 查询租户健康汇总
 */
export function getTenantHealthSummary(): Promise<TenantHealthSummary> {
  return get<TenantHealthSummary>('/api/v2/operations/tenant-health-summary')
}

/**
 * 提交异步导出任务
 * @param query 导出范围（from/to/status）
 */
export function createHealthExportTask(query: Omit<HealthSnapshotQuery, 'page' | 'size'>): Promise<HealthExportTask> {
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.status) params.set('status', query.status)
  return post<HealthExportTask>(`/api/v2/operations/health-snapshots/export-tasks?${params.toString()}`)
}

/**
 * 查询导出任务状态（后端无任务列表端点，仅支持按 ID 查询）
 * @param id 任务 ID
 */
export function getHealthExportTask(id: number): Promise<HealthExportTask> {
  return get<HealthExportTask>(`/api/v2/operations/health-snapshots/export-tasks/${id}`)
}

/**
 * 下载导出任务结果（CSV 二进制流）
 * @param id 任务 ID
 */
export function downloadHealthExportTask(id: number): Promise<Blob> {
  return request<Blob>({
    method: 'GET',
    url: `/api/v2/operations/health-snapshots/export-tasks/${id}/download`,
    responseType: 'blob',
  })
}

/**
 * 同步导出健康快照（CSV 二进制流，上限 5000 行）
 * @param query 导出范围（from/to/status）
 */
export function exportHealthSnapshots(query: Omit<HealthSnapshotQuery, 'page' | 'size'>): Promise<Blob> {
  return request<Blob>({
    method: 'GET',
    url: '/api/v2/operations/health-snapshots/export',
    params: query,
    responseType: 'blob',
  })
}

/** 健康状态 → 中文名称与标签样式 */
export const HEALTH_STATUS_META: Record<
  string,
  { label: string; tag: 'success' | 'warning' | 'danger' | 'info' }
> = {
  UP: { label: '正常', tag: 'success' },
  DEGRADED: { label: '降级', tag: 'warning' },
  DOWN: { label: '异常', tag: 'danger' },
  UNKNOWN: { label: '未知', tag: 'info' },
}
