/**
 * 工作流 API（workflow.ts）单元测试
 * ------------------------------------------------------------------
 * 覆盖：实例详情接口走注册路由 /admin-api/v1/workflows/instances/{id}
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { getWorkflowInstanceDetail } from './workflow'

describe('getWorkflowInstanceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the registered instance detail route', () => {
    getWorkflowInstanceDetail(123)

    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/workflows/instances/123')
  })
})
