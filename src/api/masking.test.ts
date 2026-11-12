/**
 * 数据脱敏 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（规则只读端点、批量试算以
 * { version, documents } 提交——1~100 文档与 256KB 上限为后端契约，前端无本地校验）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { listMaskingRules, maskBatch } from './masking'

describe('数据脱敏 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('规则查询为只读 GET（启动配置，无 CRUD 端点）', () => {
    listMaskingRules()
    expect(request.get).toHaveBeenCalledWith('/api/v1/masking/rules')
  })

  it('批量试算以 { version, documents } 提交且透传文档数组', () => {
    const documents = [{ phone: '13800138000' }, { name: '张三' }]
    maskBatch('v2', documents)
    expect(request.post).toHaveBeenCalledWith('/api/v1/masking/batch', { version: 'v2', documents })
    expect(request.post).toHaveBeenCalledTimes(1)
  })

  it('边界文档数（1 个与 100 个）直接透传，前端不做本地裁剪或抛错', () => {
    const one = [{ id: 1 }]
    maskBatch('v1', one)
    expect(request.post).toHaveBeenCalledWith('/api/v1/masking/batch', { version: 'v1', documents: one })

    const hundred = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    maskBatch('v1', hundred)
    expect(request.post).toHaveBeenCalledWith('/api/v1/masking/batch', { version: 'v1', documents: hundred })
  })
})
