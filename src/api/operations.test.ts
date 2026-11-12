/**
 * 运维健康 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（快照分页为 page/size 口径而非
 * pageNum/pageSize、导出任务查询串由 URLSearchParams 构造、CSV 流走
 * 通用 request 且 responseType=blob、不存在根端点）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  captureHealthSnapshot,
  createHealthExportTask,
  downloadHealthExportTask,
  getHealthExportTask,
  getHealthReport,
  getHealthTrend,
  getTenantHealthSummary,
  exportHealthSnapshots,
  listHealthSnapshots,
} from './operations'

describe('运维健康 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('健康报告与租户汇总为只读 GET 子路径', () => {
    getHealthReport()
    getTenantHealthSummary()
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/health-report')
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/tenant-health-summary')
  })

  it('现场采集快照为 POST 且无请求体', () => {
    captureHealthSnapshot()
    expect(request.post).toHaveBeenCalledWith('/api/v2/operations/health-snapshots')
  })

  it('快照分页使用 page/size（非 pageNum/pageSize 口径）', () => {
    listHealthSnapshots({ from: '2026-11-01', to: '2026-11-13', status: 'UP', page: 0, size: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/health-snapshots', {
      from: '2026-11-01',
      to: '2026-11-13',
      status: 'UP',
      page: 0,
      size: 20,
    })
  })

  it('健康趋势透传 from/to/limit，缺省为空对象', () => {
    getHealthTrend({ from: '2026-11-06', limit: 100 })
    getHealthTrend()
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/health-trend', { from: '2026-11-06', limit: 100 })
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/health-trend', {})
  })

  it('异步导出任务以 POST 提交，筛选条件拼入 query 串', () => {
    createHealthExportTask({ from: '2026-11-01', to: '2026-11-13', status: 'UP' })
    expect(request.post).toHaveBeenCalledWith(
      '/api/v2/operations/health-snapshots/export-tasks?from=2026-11-01&to=2026-11-13&status=UP',
    )
  })

  it('异步导出任务无筛选条件时 query 串为空（保留 ? 分隔符）', () => {
    createHealthExportTask({})
    expect(request.post).toHaveBeenCalledWith('/api/v2/operations/health-snapshots/export-tasks?')
  })

  it('导出任务状态查询按数字 ID 拼路径', () => {
    getHealthExportTask(9)
    expect(request.get).toHaveBeenCalledWith('/api/v2/operations/health-snapshots/export-tasks/9')
  })

  it('下载导出文件走通用 request 且 responseType=blob', () => {
    downloadHealthExportTask(9)
    expect(request.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v2/operations/health-snapshots/export-tasks/9/download',
      responseType: 'blob',
    })
  })

  it('同步导出走通用 request，筛选条件作 params 且 responseType=blob', () => {
    exportHealthSnapshots({ from: '2026-11-01', status: 'DEGRADED' })
    expect(request.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v2/operations/health-snapshots/export',
      params: { from: '2026-11-01', status: 'DEGRADED' },
      responseType: 'blob',
    })
  })
})
