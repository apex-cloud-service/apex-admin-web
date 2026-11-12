/**
 * 全文搜索 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（types 数组以逗号串行化、page/size
 * 缺省回落 1/20；索引重建 type 可选，缺省时请求体为 undefined）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { rebuildIndex, search } from './search'

describe('全文搜索 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('搜索透传关键词并串行化类型数组与分页参数', () => {
    search({ keyword: '订单', types: ['user', 'role'], page: 2, size: 50 })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/search', {
      keyword: '订单',
      types: 'user,role',
      page: 2,
      size: 50,
    })
  })

  it('未传类型与分页时缺省搜全部类型且 page/size 回落 1/20', () => {
    search({ keyword: '租户' })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/search', {
      keyword: '租户',
      types: undefined,
      page: 1,
      size: 20,
    })
  })

  it('重建索引携带指定资源类型', () => {
    rebuildIndex('user')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/search/rebuild', { type: 'user' })
  })

  it('重建索引缺省类型时请求体为 undefined（重建全部）', () => {
    rebuildIndex()
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/search/rebuild', undefined)
  })
})
