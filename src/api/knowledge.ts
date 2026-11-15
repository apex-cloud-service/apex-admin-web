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
 * - DELETE /admin-api/v1/kb/documents/{docId}             - 接受删除并软隐藏，后台清理（kb:doc:delete）
 * - GET  /admin-api/v1/kb/document-cleanups               - 清理记录分页（kb:doc:read）
 * - GET  /admin-api/v1/kb/document-cleanups/{docId}       - 清理记录详情（kb:doc:read）
 * - POST /admin-api/v1/kb/document-cleanups/{docId}/retry - 接受清理重试（kb:doc:delete）
 * - POST /admin-api/v1/kb/documents/{docId}/reindex       - 重建索引（kb:doc:reindex）
 * - GET  /api/v1/kb/spaces                                - 可用空间列表（业务端，登录即可）
 * - GET  /api/v1/kb/search                                - 混合检索（kb:search:query）
 * - GET  /api/v1/kb/chat/conversations                    - 会话分页
 * - GET  /api/v1/kb/chat/conversations/{id}/messages      - 会话消息
 * - DELETE /api/v1/kb/chat/conversations/{id}             - 删除会话
 * - POST /api/v1/kb/chat/ask                              - 问答（SSE 流式，kb:chat:ask；
 *                                                          fetch 流式消费见 chat 页面，不走 axios）
 *
 * 注意：分页请求使用 page/size，响应为 PageResponse{list,total}；可用空间与会话消息为数组。
 * 写操作响应不保证摄取或索引引擎任务已完成，具体边界见对应函数说明。
 * 常规请求经 request.ts 解包并转换错误；问答流仅在 chat 页面用 fetch 消费。
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types'
import type {
  KnowledgeSpace,
  KnowledgeDocument,
  KnowledgeDocumentCleanupDTO,
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
  /** 兼容字段：当前后端会话接口只消费 page/size，不按 keyword 筛选 */
  keyword?: string
}

/**
 * 管理端空间分页（GET /admin-api/v1/kb/spaces）。
 * @param params page/size 分页与可选 keyword（空间名称模糊匹配）
 * @returns PageResponse，list 为当前页空间，total 为匹配总数
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
 * 管理端文档分页（GET /admin-api/v1/kb/documents）。
 * @param params page/size 分页，以及可选的空间、解析状态和标题关键词过滤
 * @returns PageResponse，list 为当前页文档，total 为匹配总数
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
 * 上传文档并登记主档（multipart，字段名 file；复用 Axios 请求封装）。
 * 文件类型与字节上限由后端配置校验，上传对象写入后登记文档，再独立触发摄取。
 * @param spaceId 所属的正常空间 ID（后端拒绝不存在或停用的空间）
 * @param file 原始文件对象；文件名与 MIME 类型随 FormData 提交
 * @returns 登记后的文档，不等待解析、分块或索引完成
 */
export function uploadDocument(spaceId: number, file: File): Promise<KnowledgeDocument> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  return post<KnowledgeDocument>(`/admin-api/v1/kb/spaces/${spaceId}/documents`, formData)
}

/**
 * 在线录入文档（JSON 正文直接入库，无对象存储上传）。
 * @param payload 正常空间 ID、标题与正文
 * @returns 登记后的文档；摄取独立执行，不保证分块与索引已完成
 */
export function createManualDocument(payload: ManualDocumentPayload): Promise<KnowledgeDocument> {
  return post<KnowledgeDocument>('/admin-api/v1/kb/manual-documents', payload)
}

/**
 * 接受文档删除并软隐藏，分块、索引与存储资源由后台清理任务处理。
 * 清理失败仍保留任务，可查询清理记录并提交重试；接受不表示资源已清理完成。
 * @param docId 文档 ID
 * @returns 删除请求是否被接受；false 不代表删除成功
 */
export function deleteDocument(docId: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/kb/documents/${docId}`)
}

/** 管理端清理记录分页：page/size 查询，request.ts 解包为 list/total；读取失败向调用方抛出。 */
export function listDocumentCleanups(params: PageQuery): Promise<PageResponse<KnowledgeDocumentCleanupDTO>> {
  return get<PageResponse<KnowledgeDocumentCleanupDTO>>('/admin-api/v1/kb/document-cleanups', {
    page: params.page,
    size: params.size,
  })
}

/** 按文档 ID 读取清理记录；COMPLETED 仅表示最近清理已确认，后台复核不保证永久物理擦除。 */
export function getDocumentCleanup(docId: number): Promise<KnowledgeDocumentCleanupDTO> {
  return get<KnowledgeDocumentCleanupDTO>(`/admin-api/v1/kb/document-cleanups/${docId}`)
}

/** 提交后台清理重试；true 仅表示接受，false 须提示未接受，执行状态仍需查询记录。 */
export function retryDocumentCleanup(docId: number): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/kb/document-cleanups/${docId}/retry`, {})
}

/**
 * 重置文档处理状态并异步触发摄取（POST /admin-api/v1/kb/documents/{docId}/reindex）。
 * @param docId 文档 ID
 * @returns 重置后的文档；不等待摄取或索引任务完成，已有正文时跳过文件解析
 */
export function reindexDocument(docId: number): Promise<KnowledgeDocument> {
  return post<KnowledgeDocument>(`/admin-api/v1/kb/documents/${docId}/reindex`, {})
}

/**
 * 知识检索：查询向量可用时使用 hybrid，向量化未启用或失败时降级词法检索。
 * @param params 非空 keyword；spaceIds 可选，空数组表示不限定空间；page/size 默认 1/10
 * @returns JSON 检索结果（items/total/hybridUsed）；索引未启用时为空，后端将 size 限制为最多 50
 * @throws ApiError 租户上下文缺失或检索请求失败；索引请求失败不等同于无命中
 */
export function searchKnowledge(params: KbSearchQuery): Promise<KbSearchResult> {
  const query: Record<string, unknown> = { keyword: params.keyword, page: params.page ?? 1, size: params.size ?? 10 }
  if (params.spaceIds && params.spaceIds.length > 0) {
    query.spaceIds = params.spaceIds.join(',')
  }
  return get<KbSearchResult>('/api/v1/kb/search', query)
}

/**
 * 查询当前用户的会话分页（租户与用户归属由后端上下文确定）。
 * @param params page/size 分页；keyword 为兼容字段，后端不消费
 * @returns PageResponse，list 为当前页会话，total 为当前用户匹配总数
 */
export function listConversations(params: ConversationListQuery): Promise<PageResponse<KbConversation>> {
  return get<PageResponse<KbConversation>>(
    '/api/v1/kb/chat/conversations',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 查询当前用户会话的最近消息，后端按消息 ID 倒序截取后再升序返回。
 * @param conversationId 当前用户拥有的会话 ID
 * @param limit 最大条数（可选，默认 50，后端至少取 1 条）
 * @returns 最近消息数组，按消息 ID 升序排列；不是分页响应
 */
export function getConversationMessages(conversationId: number, limit = 50): Promise<KbMessage[]> {
  return get<KbMessage[]>(`/api/v1/kb/chat/conversations/${conversationId}/messages`, { limit })
}

/**
 * 删除当前用户拥有的会话（DELETE /api/v1/kb/chat/conversations/{id}）。
 * @param conversationId 会话 ID
 * @returns 后端删除结果；不存在或不属于当前用户时不会删除他人的会话
 */
export function deleteConversation(conversationId: number): Promise<boolean> {
  return del<boolean>(`/api/v1/kb/chat/conversations/${conversationId}`)
}

export type { KbSearchItem }
