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
