/**
 * 知识库 API 测试：断言 HTTP 方法、路径与参数透传。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
const request = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }))
vi.mock('@/utils/request', () => request)
import {
  createManualDocument,
  createSpace,
  deleteConversation,
  deleteDocument,
  deleteSpace,
  getConversationMessages,
  getDocument,
  listConversations,
  listDocuments,
  listKbSpaces,
  listSpaces,
  reindexDocument,
  searchKnowledge,
  updateSpace,
  uploadDocument,
} from './knowledge'

describe('知识库 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空间分页为管理端 GET', () => {
    listSpaces({ page: 1, size: 20, keyword: '产品' })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/kb/spaces', { page: 1, size: 20, keyword: '产品' })
  })

  it('空间创建/更新/删除方法与路径正确', () => {
    createSpace({ name: '新空间' })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/kb/spaces', { name: '新空间' })
    updateSpace(7, { name: '改名' })
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/kb/spaces/7', { name: '改名' })
    deleteSpace(7)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/kb/spaces/7')
  })

  it('业务端空间列表为 /api/v1/kb/spaces', () => {
    listKbSpaces()
    expect(request.get).toHaveBeenCalledWith('/api/v1/kb/spaces')
  })

  it('文档分页与详情走 /admin-api/v1/kb/documents', () => {
    listDocuments({ page: 1, size: 20, spaceId: 2, parseStatus: 'PARSED' })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/kb/documents', {
      page: 1,
      size: 20,
      spaceId: 2,
      parseStatus: 'PARSED',
    })
    getDocument(9)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/kb/documents/9')
  })

  it('上传以 FormData 提交到空间上传端点', () => {
    const file = new File(['内容'], '手册.pdf', { type: 'application/pdf' })
    uploadDocument(2, file)
    const [url, formData] = request.post.mock.calls[0]
    expect(url).toBe('/admin-api/v1/kb/spaces/2/documents')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData.get('file') as File).name).toBe('手册.pdf')
  })

  it('在线录入与重建索引路径正确', () => {
    createManualDocument({ spaceId: 2, title: '标题', content: '正文' })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/kb/manual-documents', {
      spaceId: 2,
      title: '标题',
      content: '正文',
    })
    reindexDocument(9)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/kb/documents/9/reindex', {})
    deleteDocument(9)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/kb/documents/9')
  })

  it('检索 spaceIds 以逗号拼接为查询参数', () => {
    searchKnowledge({ keyword: '质量', spaceIds: [1, 2], page: 1, size: 10 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/kb/search', { keyword: '质量', page: 1, size: 10, spaceIds: '1,2' })
  })

  it('会话消息与删除按归属路径', () => {
    listConversations({ page: 1, size: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/kb/chat/conversations', { page: 1, size: 20 })
    getConversationMessages(5, 30)
    expect(request.get).toHaveBeenCalledWith('/api/v1/kb/chat/conversations/5/messages', { limit: 30 })
    deleteConversation(5)
    expect(request.del).toHaveBeenCalledWith('/api/v1/kb/chat/conversations/5')
  })
})
