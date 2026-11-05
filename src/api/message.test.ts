/**
 * 站内信与消息模板 API 测试
 * ------------------------------------------------------------------
 * 断言各函数以正确的 HTTP 方法/路径/请求体调用统一请求层。
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
  sendMessage,
  listInboxMessages,
  listSentMessages,
  markMessageRead,
  markAllMessagesRead,
  getUnreadCount,
  issueMessageSocketTicket,
  listMessageDeliveries,
  listMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from './message'

describe('站内信 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sendMessage 以 recipientIds 数组请求体发送', () => {
    const payload = { subject: 't', content: 'c', recipientIds: [1, 2] }
    sendMessage(payload)
    expect(request.post).toHaveBeenCalledWith('/api/v1/messages', payload)
  })

  it('inbox/sent 使用 pageNum/pageSize 查询参数', () => {
    listInboxMessages(2, 20)
    listSentMessages(1, 10)
    expect(request.get).toHaveBeenCalledWith('/api/v1/messages/inbox', { pageNum: 2, pageSize: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/messages/sent', { pageNum: 1, pageSize: 10 })
  })

  it('已读/全部已读/未读数路径正确', () => {
    markMessageRead(9)
    markAllMessagesRead()
    getUnreadCount()
    expect(request.put).toHaveBeenCalledWith('/api/v1/messages/9/read')
    expect(request.put).toHaveBeenCalledWith('/api/v1/messages/read-all')
    expect(request.get).toHaveBeenCalledWith('/api/v1/messages/unread/count')
  })

  it('ws-ticket 走 POST 且无请求体', () => {
    issueMessageSocketTicket()
    expect(request.post).toHaveBeenCalledWith('/api/v1/messages/ws-ticket')
  })

  it('投递记录按消息 ID 查询', () => {
    listMessageDeliveries(42)
    expect(request.get).toHaveBeenCalledWith('/api/v1/messages/42/deliveries')
  })
})

describe('消息模板 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('列表/创建路径正确', () => {
    const payload = { templateCode: 'a', templateName: 'A', templateContent: 'x', enabled: true }
    listMessageTemplates()
    createMessageTemplate(payload)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/message-templates')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/message-templates', payload)
  })

  it('更新/删除使用 templateId 路径参数', () => {
    const payload = { templateCode: 'a', templateName: 'A', templateContent: 'x', enabled: false }
    updateMessageTemplate(7, payload)
    deleteMessageTemplate(7)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/message-templates/7', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/message-templates/7')
  })
})
