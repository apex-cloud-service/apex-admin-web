/**
 * 文件分享 API 测试
 * ------------------------------------------------------------------
 * 覆盖：分享列表/创建/撤销/兑换/下载的方法、路径和参数，及下载的 responseType='blob'。
 * 请求层为 mock；不验证所有者鉴权、匿名访问、token 返回生命周期或撤销幂等性。
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
  createFileShare,
  downloadFileShare,
  exchangeFileShare,
  listFileShares,
  revokeFileShare,
} from './file-share'

describe('文件分享 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('分享列表按文件 ID 查询（仅所有者）并透传状态与 page/size', () => {
    listFileShares(9, { status: 'ACTIVE', page: 1, size: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v2/files/9/shares', {
      status: 'ACTIVE',
      page: 1,
      size: 20,
    })
  })

  it('创建分享携带有效期秒数（token 仅在创建响应返回一次）', () => {
    createFileShare(9, 3600)
    expect(request.post).toHaveBeenCalledWith('/api/v2/files/9/shares', { expireSeconds: 3600 })
  })

  it('创建分享未传有效期时提交空对象（由服务端按配置收敛）', () => {
    createFileShare(9)
    expect(request.post).toHaveBeenCalledWith('/api/v2/files/9/shares', {})
  })

  it('撤销分享按 shareId 删除且幂等', () => {
    revokeFileShare(3)
    expect(request.del).toHaveBeenCalledWith('/api/v2/file-shares/3')
  })

  it('exchange 为匿名 POST，凭 token 换取元信息', () => {
    exchangeFileShare('share-token-1')
    expect(request.post).toHaveBeenCalledWith('/api/v2/file-shares/exchange', {
      token: 'share-token-1',
    })
  })

  it('download 为匿名下载，走 request 原始配置并指定 responseType: blob', () => {
    downloadFileShare('share-token-1')
    expect(request.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/v2/file-shares/download',
      data: { token: 'share-token-1' },
      responseType: 'blob',
    })
    expect(request.request).toHaveBeenCalledTimes(1)
  })
})
