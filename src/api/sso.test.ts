/**
 * SSO 配置管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（会话撤销按数字主键 POST /sessions/{id}/revoke、批量终止为前端循环逐个调用、提供商更新走全量覆盖 PUT）
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
  batchTerminateSSOSessions,
  createSSOProvider,
  deleteSSOProvider,
  getSSOMetadata,
  getSSOStatistics,
  listSSOAuditLogs,
  listSSOProviders,
  listSSOSessions,
  terminateSSOSession,
  testSSOConnection,
  updateSSOProvider,
} from './sso'

describe('SSO 配置管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('提供商列表为裸数组端点，无参调用透传空对象筛选', () => {
    listSSOProviders({ page: 1, size: 20, providerName: 'okta' })
    listSSOProviders()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/providers', {
      page: 1,
      size: 20,
      providerName: 'okta',
    })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/providers', {})
  })

  it('提供商 CRUD：创建 POST、更新为全量覆盖 PUT（携带完整字段）、删除按数字主键', () => {
    const data = {
      providerName: 'okta',
      protocolType: 'OIDC' as const,
      enabled: true,
      metadataUrl: 'https://okta.example.com/.well-known/openid-configuration',
    }
    createSSOProvider(data)
    updateSSOProvider(3, data)
    deleteSSOProvider(3)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/sso/providers', data)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/sso/providers/3', data)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/sso/providers/3')
  })

  it('连接测试显式携带空对象请求体，元数据按 GET 子路径获取', () => {
    testSSOConnection(3)
    getSSOMetadata(3)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/sso/providers/3/test', {})
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/providers/3/metadata')
  })

  it('单会话撤销按数字主键 POST /sessions/{id}/revoke（非 DELETE）且无请求体', () => {
    terminateSSOSession(5)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/sso/sessions/5/revoke')
    expect(request.post.mock.calls[0]).toHaveLength(1)
  })

  it('批量终止为前端循环：逐个调用单条撤销端点（无批量接口）', () => {
    batchTerminateSSOSessions([1, 2])
    expect(request.post).toHaveBeenCalledTimes(2)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/sso/sessions/1/revoke')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/sso/sessions/2/revoke')
  })

  it('会话与审计日志列表为裸数组端点，分页 page/size 与筛选透传', () => {
    listSSOSessions({ page: 1, size: 20, userId: 7, providerId: 2, status: 'ACTIVE' })
    listSSOAuditLogs({
      page: 1,
      size: 20,
      providerId: 2,
      userId: 7,
      operationType: 'LOGIN',
      startTime: '2026-01-01T00:00:00',
      endTime: '2026-01-02T00:00:00',
    })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/sessions', {
      page: 1,
      size: 20,
      userId: 7,
      providerId: 2,
      status: 'ACTIVE',
    })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/audit-logs', {
      page: 1,
      size: 20,
      providerId: 2,
      userId: 7,
      operationType: 'LOGIN',
      startTime: '2026-01-01T00:00:00',
      endTime: '2026-01-02T00:00:00',
    })
  })

  it('统计端点位于 /sessions/statistics（与会话列表路径区分）', () => {
    getSSOStatistics()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/sso/sessions/statistics')
  })
})
