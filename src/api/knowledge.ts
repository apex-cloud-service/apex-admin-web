/**
 * 知识库 API
 * ------------------------------------------------------------------
 * 提供知识空间、知识文档、混合检索与智能问答的后端接口封装。
 *
 * 后端接口（apex-knowledge-service，网关 knowledge-domain 路由）：
 * - GET  /admin-api/v1/kb/spaces                          - 管理端空间分页（kb:space:read）
 * - GET  /admin-api/v1/kb/spaces/{spaceId}                - 空间详情（kb:space:read）
 * - POST /admin-api/v1/kb/spaces                          - 创建空间（kb:space:create）
 * - PUT  /admin-api/v1/kb/spaces/{spaceId}                - 更新空间（kb:space:update）
 * - DELETE /admin-api/v1/kb/spaces/{spaceId}              - 删除空间（kb:space:delete）
 * - GET  /admin-api/v1/kb/documents                       - 文档分页（kb:doc:read）
 * - GET  /admin-api/v1/kb/documents/{docId}               - 文档详情（含分块预览，kb:doc:read）
 * - POST /admin-api/v1/kb/spaces/{spaceId}/documents      - multipart 上传（kb:doc:upload）
 * - POST /admin-api/v1/kb/manual-documents                - 在线录入（kb:doc:upload）
 * - DELETE /admin-api/v1/kb/documents/{docId}             - 删除文档（kb:doc:delete）
 * - POST /admin-api/v1/kb/documents/{docId}/reindex       - 重建索引（kb:doc:reindex）
 * - GET  /api/v1/kb/spaces                                - 可用空间列表（业务端，登录即可）
 * - GET  /api/v1/kb/search                                - 混合检索（kb:search:query）
 * - GET  /api/v1/kb/chat/conversations                    - 会话分页
 * - GET  /api/v1/kb/chat/conversations/{id}/messages      - 会话消息
 * - DELETE /api/v1/kb/chat/conversations/{id}             - 删除会话
 * - POST /api/v1/kb/chat/ask                              - 问答（SSE 流式，kb:chat:ask；
 *                                                          fetch 流式消费见 chat 页面，不走 axios）
 *
 * 注意：分页口径为 page/size + PageResponse{list,total}（与 document/notification 一致）。
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types'
import type {
  KnowledgeSpace,
  KnowledgeDocument,
  KnowledgeChunk,
  KbSearchResult,
  KbSearchItem,
  KbConversation,
  KbMessage,
} from '@/types'

/** 空间列表查询参数 */
export interface SpaceListQuery extends PageQuery {
  keyword?: string
}

/** 空间创建/更新请求体 */
export interface SpacePayload {
  name: string
  description?: string
  status?: number
}

/** 文档列表查询参数 */
export interface DocumentListQuery extends PageQuery {
  spaceId?: number
  parseStatus?: string
  keyword?: string
}

/** 在线录入文档请求体 */
export interface ManualDocumentPayload {
  spaceId: number
  title: string
  content: string
}

/** 知识检索查询参数 */
export interface KbSearchQuery {
  keyword: string
  spaceIds?: number[]
  page?: number
  size?: number
}

/** 会话列表查询参数 */
export interface ConversationListQuery extends PageQuery {
  /** 无额外筛选，保留分页口径一致 */
  keyword?: string
}

/**
 * 管理端空间分页。
 * @param params 查询参数
 * @returns 空间分页
 */
export function listSpaces(params: SpaceListQuery): Promise<PageResponse<KnowledgeSpace>> {
  return get<PageResponse<KnowledgeSpace>>('/admin-api/v1/kb/spaces', params as unknown as Record<string, unknown>)
}

/**
 * 空间详情。
 * @param spaceId 空间 ID
 * @returns 空间
 */
export function getSpace(spaceId: number): Promise<KnowledgeSpace> {
  return get<KnowledgeSpace>(`/admin-api/v1/kb/spaces/${spaceId}`)
}

/**
 * 创建空间。
 * @param payload 空间数据
 * @returns 创建后的空间
 */
export function createSpace(payload: SpacePayload): Promise<KnowledgeSpace> {
  return post<KnowledgeSpace>('/admin-api/v1/kb/spaces', payload)
}

/**
 * 更新空间。
 * @param spaceId 空间 ID
 * @param payload 空间数据
 * @returns 更新后的空间
 */
export function updateSpace(spaceId: number, payload: SpacePayload): Promise<KnowledgeSpace> {
  return put<KnowledgeSpace>(`/admin-api/v1/kb/spaces/${spaceId}`, payload)
}

/**
 * 删除空间（空间下仍有文档时后端拒绝）。
 * @param spaceId 空间 ID
 * @returns 是否成功
 */
export function deleteSpace(spaceId: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/kb/spaces/${spaceId}`)
}

/**
 * 业务端可用空间列表（检索/问答选择器）。
 * @returns 空间列表
 */
export function listKbSpaces(): Promise<KnowledgeSpace[]> {
  return get<KnowledgeSpace[]>('/api/v1/kb/spaces')
}

/**
 * 管理端文档分页。
 * @param params 查询参数
 * @returns 文档分页
 */
export function listDocuments(params: DocumentListQuery): Promise<PageResponse<KnowledgeDocument>> {
  return get<PageResponse<KnowledgeDocument>>(
    '/admin-api/v1/kb/documents',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 文档详情（含分块预览）。
 * @param docId 文档 ID
 * @returns 文档与分块列表
 */
export function getDocument(docId: number): Promise<{ document: KnowledgeDocument; chunks: KnowledgeChunk[] }> {
  return get<{ document: KnowledgeDocument; chunks: KnowledgeChunk[] }>(`/admin-api/v1/kb/documents/${docId}`)
}

/**
 * 上传文档（multipart，字段名 file）。
 * @param spaceId 空间 ID
 * @param file 文件对象
 * @returns 登记后的文档
 */
export function uploadDocument(spaceId: number, file: File): Promise<KnowledgeDocument> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  return post<KnowledgeDocument>(`/admin-api/v1/kb/spaces/${spaceId}/documents`, formData)
}

/**
 * 在线录入文档。
 * @param payload 文档数据
 * @returns 登记后的文档
 */
export function createManualDocument(payload: ManualDocumentPayload): Promise<KnowledgeDocument> {
  return post<KnowledgeDocument>('/admin-api/v1/kb/manual-documents', payload)
}

/**
 * 删除文档（同步清理分块与索引）。
 * @param docId 文档 ID
 * @returns 是否成功
 */
export function deleteDocument(docId: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/kb/documents/${docId}`)
}

/**
 * 手动重建索引。
 * @param docId 文档 ID
 * @returns 更新后的文档
 */
export function reindexDocument(docId: number): Promise<KnowledgeDocument> {
  return post<KnowledgeDocument>(`/admin-api/v1/kb/documents/${docId}/reindex`, {})
}

/**
 * 知识检索（hybrid 优先、词法兜底；索引未启用时返回空）。
 * @param params 检索参数
 * @returns 检索结果
 */
export function searchKnowledge(params: KbSearchQuery): Promise<KbSearchResult> {
  const query: Record<string, unknown> = { keyword: params.keyword, page: params.page ?? 1, size: params.size ?? 10 }
  if (params.spaceIds && params.spaceIds.length > 0) {
    query.spaceIds = params.spaceIds.join(',')
  }
  return get<KbSearchResult>('/api/v1/kb/search', query)
}

/**
 * 会话分页（当前用户归属）。
 * @param params 查询参数
 * @returns 会话分页
 */
export function listConversations(params: ConversationListQuery): Promise<PageResponse<KbConversation>> {
  return get<PageResponse<KbConversation>>(
    '/api/v1/kb/chat/conversations',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 会话消息（按时间升序）。
 * @param conversationId 会话 ID
 * @param limit 最大条数
 * @returns 消息列表
 */
export function getConversationMessages(conversationId: number, limit = 50): Promise<KbMessage[]> {
  return get<KbMessage[]>(`/api/v1/kb/chat/conversations/${conversationId}/messages`, { limit })
}

/**
 * 删除会话。
 * @param conversationId 会话 ID
 * @returns 是否成功
 */
export function deleteConversation(conversationId: number): Promise<boolean> {
  return del<boolean>(`/api/v1/kb/chat/conversations/${conversationId}`)
}

export type { KbSearchItem }
