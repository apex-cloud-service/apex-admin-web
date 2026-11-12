/**
 * 监控与审计 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（四类日志/在线用户列表均为 page/size
 * 分页的 PageResponse 口径；监控大盘五个端点为无参只读 GET）。
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
  getMonitorBusiness,
  getMonitorGovernance,
  getMonitorMiddleware,
  getMonitorOverview,
  getMonitorSystem,
  listApiCallLogs,
  listAuditLogs,
  listLoginLogs,
  listOnlineUsers,
} from './monitor'

describe('监控日志与在线用户 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('登录日志按 username 模糊 + status 精确分页查询', () => {
    const params = { page: 1, size: 20, username: 'admin', status: 1 }
    listLoginLogs(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/login-logs', params)
  })

  it('审计日志按 module/operatorName 模糊分页查询', () => {
    const params = { page: 2, size: 10, module: 'user', operatorName: '张三' }
    listAuditLogs(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/audit-logs', params)
  })

  it('在线用户分页查询透传 username 筛选', () => {
    const params = { page: 1, size: 20, username: 'test' }
    listOnlineUsers(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/online-users', params)
  })

  it('API 调用日志透传 serviceName/status/traceId/path 筛选', () => {
    const params = {
      page: 1,
      size: 50,
      serviceName: 'apex-system',
      status: 500,
      traceId: 'trace-1',
      path: '/api/v1/users',
    }
    listApiCallLogs(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/api-call-logs', params)
  })
})

describe('监控大盘 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('概览/系统/中间件/治理/业务五个端点均为无参只读 GET', () => {
    getMonitorOverview()
    getMonitorSystem()
    getMonitorMiddleware()
    getMonitorGovernance()
    getMonitorBusiness()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/monitor/overview')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/monitor/system')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/monitor/middleware')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/monitor/governance')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/monitor/business')
    expect(request.get).toHaveBeenCalledTimes(5)
  })
})
