/**
 * 办公平台文档操作 API（/api/office/documents）
 * ------------------------------------------------------------------
 * 用途：
 * 办公平台（飞书/钉钉/企业微信）在线文档的创建、详情、删除与复制，
 * 以及「我的文档」列表查询。列表接口返回裸数组，平台/类型/关键词
 * 筛选与分页由调用方在前端完成；后端无文档更新与分享端点。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post } from '@/utils/request'

/** 文档类型（与后端 CreateDocumentRequest.allowableValues 一致） */
export type DocumentType = 'DOC' | 'SHEET' | 'SLIDE' | 'MINDMAP' | 'FOLDER' | 'FILE'

/** 文档操作类型 */
export type DocumentOperationType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'COPY' | 'MOVE' | 'SHARE'

/** 文档信息（与后端 DocumentInfoResponse 一致） */
export interface DocumentInfo {
  /** 文档ID（数字主键） */
  id: number
  /** 平台类型（后端存储为小写 feishu/dingtalk/wecom） */
  platform: string
  /** 平台文档ID */
  platformDocumentId: string
  /** 文档类型 */
  documentType: DocumentType
  /** 文档标题 */
  title: string
  /** 文档路径 */
  path?: string
  /** 文档URL */
  url?: string
  /** 所有者ID */
  ownerId?: string
  /** 所有者名称 */
  ownerName?: string
  /** 父文件夹ID */
  parentFolderId?: string
  /** 文件大小（字节） */
  fileSize?: number
  /** 文件扩展名 */
  fileExtension?: string
  /** MIME 类型 */
  mimeType?: string
  /** 是否文件夹 */
  isFolder?: boolean
  /** 权限 */
  permission?: string
  /** 协作者ID列表（JSON 字符串） */
  collaboratorIds?: string
  /** 版本 */
  version?: string
  lastModifiedById?: string
  lastModifiedByName?: string
  lastModifiedTime?: string
  /** 是否归档 */
  isArchived?: boolean
  createTime?: string
  updateTime?: string
}

/** 创建文档请求（与后端 CreateDocumentRequest 一致，platform 为小写） */
export interface CreateDocumentRequest {
  /** 平台类型（小写：feishu/dingtalk/wecom） */
  platform: string
  /** 父文件夹ID（可选） */
  folderId?: string
  /** 文档标题 */
  title: string
  /** 文档类型 */
  documentType: DocumentType
  /** 所有者ID（必填） */
  ownerId: string
  /** 所有者姓名（必填） */
  ownerName: string
}

/** 移动文档请求（targetFolderId 走 query 参数；预留契约——后端当前无文档移动端点，模块内亦未封装调用） */
export interface MoveDocumentRequest {
  /** 目标文件夹ID */
  targetFolderId: string
}

/**
 * 创建文档。
 * @param request 创建请求
 */
export function createDocument(request: CreateDocumentRequest): Promise<DocumentInfo> {
  return post<DocumentInfo>('/api/office/documents', request)
}

/**
 * 查询文档详情。
 * @param documentId 文档ID
 */
export function getDocument(documentId: number | string): Promise<DocumentInfo> {
  return get<DocumentInfo>(`/api/office/documents/${documentId}`)
}

/**
 * 删除文档。
 * @param documentId 文档ID
 */
export function deleteDocument(documentId: number | string): Promise<void> {
  return del<void>(`/api/office/documents/${documentId}`)
}

/**
 * 复制文档（targetFolderId 走 query 参数，后端不支持新标题）。
 * @param documentId 文档ID
 * @param targetFolderId 目标文件夹ID（可选）
 */
export function copyDocument(
  documentId: number | string,
  targetFolderId?: string,
): Promise<DocumentInfo> {
  return post<DocumentInfo>(`/api/office/documents/${documentId}/copy?targetFolderId=${encodeURIComponent(targetFolderId || '')}`)
}

/**
 * 查询我创建的文档（裸数组，后端按 ownerId 过滤）。
 * @param ownerId 所有者ID（当前登录用户）
 */
export function getMyDocuments(ownerId: number | string): Promise<DocumentInfo[]> {
  return get<DocumentInfo[]>('/api/office/documents/my', { ownerId })
}
