/**
 * 文档管理 API
 * ------------------------------------------------------------------
 * 提供文档的增删改查、状态管理、下载等功能。
 * 
 * 后端接口：
 * - GET /admin-api/v1/documents - 分页查询文档列表
 * - GET /admin-api/v1/documents/{id} - 查询文档详情
 * - POST /admin-api/v1/documents - 创建文档
 * - PUT /admin-api/v1/documents/{id} - 更新文档
 * - DELETE /admin-api/v1/documents/{id} - 删除文档
 * - PUT /admin-api/v1/documents/{id}/status - 更新文档状态
 * - GET /admin-api/v1/documents/{id}/download - 下载文档
 */
import { del, get, post, put } from '@/utils/request'
import type { Document, PageQuery, PageResponse } from '@/types'

/** 文档列表查询参数 */
export interface DocumentListQuery extends PageQuery {
  /** 关键词（标题/内容） */
  keyword?: string
  /** 文档类型：contract=合同 report=报告 proposal=方案 manual=手册 other=其他 */
  docType?: string
  /** 分类：tech=技术 business=业务 finance=财务 hr=人力 */
  category?: string
  /** 状态：0=草稿 1=正常 2=归档 */
  status?: number
  /** 开始日期（创建时间筛选） */
  startDate?: string
  /** 结束日期（创建时间筛选） */
  endDate?: string
}

/** 文档创建/更新请求体 */
export interface DocumentPayload {
  /** 文档标题 */
  title: string
  /** 文档类型：contract=合同 report=报告 proposal=方案 manual=手册 other=其他 */
  docType: string
  /** 分类：tech=技术 business=业务 finance=财务 hr=人力 */
  category?: string
  /** 文档内容（富文本或纯文本） */
  content?: string
  /** 附件文件URL */
  fileUrl?: string
  /** 文档标签 */
  tags?: string[]
  /** 状态：0=草稿 1=正常 2=归档 */
  status?: number
}

/**
 * 分页查询文档列表
 * @param params 查询参数（关键词、类型、分类、状态、日期范围等）
 * @returns 分页结果
 */
export function listDocuments(params: DocumentListQuery): Promise<PageResponse<Document>> {
  return get<PageResponse<Document>>('/admin-api/v1/documents', params as unknown as Record<string, unknown>)
}

/**
 * 查询文档详情
 * @param id 文档ID
 * @returns 文档详情信息
 */
export function getDocumentDetail(id: string): Promise<Document> {
  return get<Document>(`/admin-api/v1/documents/${id}`)
}

/**
 * 创建文档
 * @param payload 文档信息
 */
export function createDocument(payload: DocumentPayload): Promise<void> {
  return post<void>('/admin-api/v1/documents', payload)
}

/**
 * 更新文档
 * @param id 文档ID
 * @param payload 文档信息
 */
export function updateDocument(id: string, payload: DocumentPayload): Promise<void> {
  return put<void>(`/admin-api/v1/documents/${id}`, payload)
}

/**
 * 删除文档
 * @param id 文档ID
 */
export function deleteDocument(id: string): Promise<void> {
  return del<void>(`/admin-api/v1/documents/${id}`)
}

/**
 * 更新文档状态
 * @param id 文档ID
 * @param status 状态：0=草稿 1=正常 2=归档
 */
export function updateDocumentStatus(id: string, status: number): Promise<void> {
  return put<void>(`/admin-api/v1/documents/${id}/status`, { status })
}

/**
 * 下载文档
 * @param id 文档ID
 * @returns 文件二进制数据
 */
export function downloadDocument(id: string): Promise<Blob> {
  return get<Blob>(`/admin-api/v1/documents/${id}/download`)
}
