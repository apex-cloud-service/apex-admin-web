/**
 * 文件分享 API
 * ------------------------------------------------------------------
 * 后端接口（apex-file-service FileShareRouter）：
 * - GET    /api/v2/files/{fileId}/shares             - 查询分享分页（仅文件所有者，page/size）
 * - POST   /api/v2/files/{fileId}/shares             - 创建分享（返回一次性明文 token）
 * - DELETE /api/v2/file-shares/{shareId}             - 撤销分享（幂等）
 * - POST   /api/v2/file-shares/exchange              - 凭 token 换取分享元信息（匿名）
 * - POST   /api/v2/file-shares/download              - 凭 token 下载文件（匿名，二进制流）
 *
 * 说明：创建与撤销需登录；exchange/download 为匿名端点（token 即凭证）。
 * token 明文仅在创建响应中出现一次，前端必须立即提示用户保存。
 */
import { del, get, post, request } from '@/utils/request'

/** 分享列表项（不含令牌与摘要） */
export interface FileShareItem {
  shareId: number
  fileId: number
  status: string
  expireAt?: string
  createTime?: string
}

/** 分享列表查询参数 */
export interface FileShareListQuery {
  status?: 'ACTIVE' | 'REVOKED'
  page: number
  size: number
}

/** 分页结果（file 域 PageResponse） */
export interface FileSharePage {
  list: FileShareItem[]
  total: number
  pageNum: number
  pageSize: number
}

/**
 * 查询指定文件的分享列表（仅文件所有者）
 * @param fileId 文件 ID
 * @param query 状态与 page/size 分页参数
 * @returns FileSharePage（list/total），列表项不包含明文分享 token
 */
export function listFileShares(fileId: number, query: FileShareListQuery): Promise<FileSharePage> {
  return get<FileSharePage>(
    `/api/v2/files/${fileId}/shares`,
    query as unknown as Record<string, unknown>,
  )
}

/** 创建分享结果（后端 FileShareCreated，token 仅此一次返回） */
export interface FileShareCreated {
  shareId: number
  fileId: number
  /** 分享令牌（明文，仅创建时返回） */
  token: string
  /** 过期时间 */
  expireAt?: string
}

/** 分享元信息（后端 FileShareExchangeResult） */
export interface FileShareExchangeResult {
  shareId: number
  fileId: number
  originalName: string
  contentType?: string
  fileSize?: number
  expireAt?: string
}

/**
 * 创建文件分享
 * @param fileId 文件 ID
 * @param expireSeconds 有效期秒数（可选，不传由服务端按配置收敛）
 * @returns FileShareCreated，明文 token 仅创建时返回；本函数不持久化或自动展示
 */
export function createFileShare(fileId: number, expireSeconds?: number): Promise<FileShareCreated> {
  return post<FileShareCreated>(
    `/api/v2/files/${fileId}/shares`,
    expireSeconds != null ? { expireSeconds } : {},
  )
}

/**
 * 撤销文件分享（幂等）
 * @param shareId 分享 ID
 */
export function revokeFileShare(shareId: number): Promise<boolean> {
  return del<boolean>(`/api/v2/file-shares/${shareId}`)
}

/**
 * 凭分享令牌换取元信息（匿名）
 * @param token 分享令牌
 */
export function exchangeFileShare(token: string): Promise<FileShareExchangeResult> {
  return post<FileShareExchangeResult>('/api/v2/file-shares/exchange', { token })
}

/**
 * 凭分享令牌下载文件（匿名，返回二进制流）
 * @param token 分享令牌
 * @returns 文件内容 Blob；保存文件与撤销对象 URL 由调用方负责
 */
export function downloadFileShare(token: string): Promise<Blob> {
  return request<Blob>({
    method: 'POST',
    url: '/api/v2/file-shares/download',
    data: { token },
    responseType: 'blob',
  })
}
