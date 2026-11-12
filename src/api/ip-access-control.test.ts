/**
 * IP 访问控制 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（写操作参数走 query string 而非 JSON body、黑白名单列表为裸数组端点）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IpAccessRule } from '@/types'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  addIpRule,
  checkIpAccess,
  cleanupIpRules,
  deleteIpRule,
  listIpRules,
  toggleIpRule,
} from './ip-access-control'

describe('IP 访问控制 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('白/黑名单列表为裸数组端点，路径按规则类型切换', async () => {
    const rules: IpAccessRule[] = [{ id: 1, ipAddress: '10.0.0.5', type: 'WHITELIST', enabled: true }]
    request.get.mockResolvedValue(rules)
    await expect(listIpRules('WHITELIST')).resolves.toBe(rules)
    listIpRules('BLACKLIST')
    expect(request.get).toHaveBeenCalledWith('/api/ip-access-control/whitelist')
    expect(request.get).toHaveBeenCalledWith('/api/ip-access-control/blacklist')
  })

  it('新增规则：参数拼进 query string 而非请求体（黑名单含有效期分钟数）', () => {
    addIpRule('BLACKLIST', '10.0.0.5', 'temp-ban', 30)
    expect(request.post).toHaveBeenCalledWith(
      '/api/ip-access-control/blacklist?ipAddress=10.0.0.5&description=temp-ban&durationMinutes=30',
    )
    expect(request.post.mock.calls[0]).toHaveLength(1)
  })

  it('新增规则省略可选参数时 query 仅含 ipAddress（不带空参数）', () => {
    addIpRule('WHITELIST', '192.168.1.1')
    expect(request.post).toHaveBeenCalledWith('/api/ip-access-control/whitelist?ipAddress=192.168.1.1')
  })

  it('新增规则 CIDR 地址经 URLSearchParams 编码（斜杠转 %2F）', () => {
    addIpRule('BLACKLIST', '10.0.0.0/24')
    expect(request.post).toHaveBeenCalledWith('/api/ip-access-control/blacklist?ipAddress=10.0.0.0%2F24')
  })

  it('删除与启停按数字 ruleId，enable/disable 路径切换且无请求体', () => {
    deleteIpRule(9)
    toggleIpRule(9, true)
    toggleIpRule(9, false)
    expect(request.del).toHaveBeenCalledWith('/api/ip-access-control/9')
    expect(request.put).toHaveBeenCalledWith('/api/ip-access-control/9/enable')
    expect(request.put).toHaveBeenCalledWith('/api/ip-access-control/9/disable')
    expect(request.put.mock.calls[0]).toHaveLength(1)
    expect(request.put.mock.calls[1]).toHaveLength(1)
  })

  it('清理过期规则与 IP 放行检查端点正确，检查 IP 经 encodeURIComponent 拼入 query', () => {
    cleanupIpRules()
    checkIpAccess('10.0.0.5')
    expect(request.post).toHaveBeenCalledWith('/api/ip-access-control/cleanup')
    expect(request.post).toHaveBeenCalledWith('/api/ip-access-control/check?ipAddress=10.0.0.5')
  })
})
