import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { listBindingsPage, unbindBinding, updateApp } from './office-new'

describe('updateApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends the optimistic-lock version in the request body', () => {
    updateApp('FEISHU', 3, {
      appId: 'app-id',
      secretReference: 'FEISHU_APP_SECRET',
      redirectUri: 'https://example.com/callback',
      enabled: true,
    })

    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/office/apps/FEISHU', {
      appId: 'app-id',
      secretReference: 'FEISHU_APP_SECRET',
      redirectUri: 'https://example.com/callback',
      enabled: true,
      version: 3,
    })
  })
})

describe('unbindBinding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends DELETE with the binding version as a query parameter', () => {
    unbindBinding(42, 7)

    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/office/bindings/42/unbind?version=7')
    expect(request.post).not.toHaveBeenCalled()
  })
})

describe('listBindingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends GET with platform, status and pagination as query params', () => {
    listBindingsPage('FEISHU', 'PENDING', 2, 20)

    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/office/bindings/page', {
      platform: 'FEISHU',
      status: 'PENDING',
      page: 2,
      size: 20,
    })
  })

  it('omits status when not provided', () => {
    listBindingsPage('DINGTALK', undefined, 1, 10)

    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/office/bindings/page', {
      platform: 'DINGTALK',
      status: undefined,
      page: 1,
      size: 10,
    })
  })
})
