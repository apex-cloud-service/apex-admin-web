/**
 * 文档管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（状态操作为 PUT /{id}/status 且
 * status 放请求体；下载为独立 GET /{id}/download 端点，返回 Blob）。
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
  createDocument,
  deleteDocument,
  downloadDocument,
  getDocumentDetail,
  listDocuments,
  updateDocument,
  updateDocumentStatus,
} from './document'
import type { DocumentListQuery, DocumentPayload } from './document'

describe('文档管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('列表分页使用 page/size 并透传关键词/类型/分类/状态/日期范围', () => {
    const params: DocumentListQuery = {
      page: 1,
      size: 20,
      keyword: '合同',
      docType: 'contract',
      category: 'business',
      status: 1,
      startDate: '2026-11-01',
      endDate: '2026-11-13',
    }
    listDocuments(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/documents', params)
  })

  it('详情/创建/更新/删除路径与请求体正确', () => {
    const payload: DocumentPayload = {
      title: '采购合同',
      docType: 'contract',
      category: 'business',
      content: '正文',
      tags: ['2026'],
    }
    getDocumentDetail('3')
    createDocument(payload)
    updateDocument('3', payload)
    deleteDocument('3')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/documents/3')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/documents', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/documents/3', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/documents/3')
  })

  it('状态操作为 PUT /{id}/status 且 status 数字放请求体', () => {
    updateDocumentStatus('3', 2)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/documents/3/status', { status: 2 })
  })

  it('下载走独立 GET /{id}/download 端点', () => {
    downloadDocument('3')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/documents/3/download')
  })
})
