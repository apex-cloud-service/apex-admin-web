/**
 * 认证审计日志 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（tenantId 为必填查询参数、响应为裸数组无分页、清理端点走 DELETE 携带 beforeTime）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  cleanupAuthLogs,
  countAuthEvents,
  countUserLoginFailures,
  getAuthEventDetail,
  listAuthEventsByIp,
  listAuthEventsByTimeRange,
  listAuthEventsByType,
  listAuthEventsByUser,
  listFailedAuthEvents,
  listHighRiskAuthEvents,
} from './auth-audit'

describe('认证审计日志 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('失败与高风险事件查询：tenantId 必填且为裸数组端点', () => {
    listFailedAuthEvents('default')
    listHighRiskAuthEvents('default')
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/failed', { tenantId: 'default' })
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/high-risk', { tenantId: 'default' })
  })

  it('按用户/事件类型/IP 查询：路径参数与 tenantId 查询参数透传', () => {
    listAuthEventsByUser(7, 'default')
    listAuthEventsByType('PERMISSION_CHANGED', 'default')
    listAuthEventsByIp('10.0.0.1', 'default')
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/user/7', { tenantId: 'default' })
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/event-type/PERMISSION_CHANGED', {
      tenantId: 'default',
    })
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/ip/10.0.0.1', { tenantId: 'default' })
  })

  it('IP 路径参数经 encodeURIComponent 编码（CIDR 斜杠转 %2F）', () => {
    listAuthEventsByIp('10.0.0.0/24', 'default')
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/ip/10.0.0.0%2F24', { tenantId: 'default' })
  })

  it('登录失败计数：userId 进路径、startTime 与 tenantId 走查询参数', () => {
    countUserLoginFailures(7, '2026-01-01T00:00:00', 'default')
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/user/7/login-failures', {
      startTime: '2026-01-01T00:00:00',
      tenantId: 'default',
    })
  })

  it('时间范围查询与计数走 POST，请求体仅含 tenantId/startTime/endTime 三字段', () => {
    const query = {
      tenantId: 'default',
      startTime: '2026-01-01T00:00:00',
      endTime: '2026-01-31T23:59:59',
    }
    listAuthEventsByTimeRange(query)
    countAuthEvents(query)
    expect(request.post).toHaveBeenCalledWith('/api/v1/auth/audit-logs/time-range', query)
    expect(request.post).toHaveBeenCalledWith('/api/v1/auth/audit-logs/count', query)
  })

  it('详情按数字主键查询', () => {
    getAuthEventDetail(42)
    expect(request.get).toHaveBeenCalledWith('/api/v1/auth/audit-logs/42')
  })

  it('清理日志为 DELETE 端点且 beforeTime 走参数（管理员危险操作）', () => {
    cleanupAuthLogs('2026-01-01T00:00:00')
    expect(request.del).toHaveBeenCalledWith('/api/v1/auth/audit-logs/cleanup', {
      beforeTime: '2026-01-01T00:00:00',
    })
  })
})
