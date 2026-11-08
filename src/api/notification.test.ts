/**
 * 站内通知 API 测试
 * ------------------------------------------------------------------
 * 断言各函数以正确的 HTTP 方法/路径/参数调用统一请求层。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  listNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './notification'

describe('站内通知 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listNotifications 以 page/size/unreadOnly 查询收件箱', () => {
    const query = { page: 1, size: 10, unreadOnly: true }
    listNotifications(query)
    expect(request.get).toHaveBeenCalledWith('/api/v1/notifications/inbox', {
      page: 1,
      size: 10,
      unreadOnly: true,
    })
  })

  it('getNotificationUnreadCount 请求未读数端点', () => {
    getNotificationUnreadCount()
    expect(request.get).toHaveBeenCalledWith('/api/v1/notifications/unread-count')
  })

  it('markNotificationRead 以数字主键请求已读端点', () => {
    markNotificationRead(42)
    expect(request.post).toHaveBeenCalledWith('/api/v1/notifications/42/read')
  })

  it('markAllNotificationsRead 请求全部已读端点', () => {
    markAllNotificationsRead()
    expect(request.post).toHaveBeenCalledWith('/api/v1/notifications/read-all')
  })
})
