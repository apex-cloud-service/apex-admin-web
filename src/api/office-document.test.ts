/**
 * 办公平台文档操作 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（创建必须携带 ownerId/ownerName 且
 * platform 小写、复制 targetFolderId 走 query 且经 encodeURIComponent、
 * 我的文档为裸数组按 ownerId 过滤；后端无更新端点）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  copyDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getMyDocuments,
} from './office-document'

describe('办公平台文档 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('创建文档必须携带 ownerId/ownerName 且 platform 为小写', () => {
    const payload = {
      platform: 'feishu',
      folderId: 'fld-1',
      title: '需求说明',
      documentType: 'DOC' as const,
      ownerId: 'u-100',
      ownerName: '张三',
    }
    createDocument(payload)
    expect(request.post).toHaveBeenCalledWith('/api/office/documents', payload)
    expect(request.post).toHaveBeenCalledTimes(1)
  })

  it('详情与删除按文档 ID 拼路径（后端无更新端点）', () => {
    getDocument(12)
    deleteDocument(12)
    expect(request.get).toHaveBeenCalledWith('/api/office/documents/12')
    expect(request.del).toHaveBeenCalledWith('/api/office/documents/12')
  })

  it('复制文档 targetFolderId 走 query 参数', () => {
    copyDocument(12, 'fld-9')
    expect(request.post).toHaveBeenCalledWith('/api/office/documents/12/copy?targetFolderId=fld-9')
  })

  it('复制文档 targetFolderId 经过 encodeURIComponent（含特殊字符）', () => {
    copyDocument(12, 'fld/a b&c')
    expect(request.post).toHaveBeenCalledWith('/api/office/documents/12/copy?targetFolderId=fld%2Fa%20b%26c')
  })

  it('复制文档未传 targetFolderId 时 query 为空串占位', () => {
    copyDocument(12)
    expect(request.post).toHaveBeenCalledWith('/api/office/documents/12/copy?targetFolderId=')
  })

  it('我的文档为裸数组查询，按 ownerId 过滤', () => {
    getMyDocuments('u-100')
    expect(request.get).toHaveBeenCalledWith('/api/office/documents/my', { ownerId: 'u-100' })
  })
})
