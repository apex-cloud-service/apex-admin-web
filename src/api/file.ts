/**
 * 文件管理 API
 * ------------------------------------------------------------------
 * 通用文件上传与删除、大文件分片上传接口封装
 *
 * 后端接口（apex-file-service）：
 * - POST   /api/v1/files/generic      - 通用文件上传（multipart）
 * - DELETE /api/v1/file/delete        - 删除文件
 * - POST   /api/v1/file/chunk/init    - 初始化分片上传
 * - POST   /api/v1/file/chunk/upload  - 上传单个分片（原始字节流）
 * - POST   /api/v1/file/chunk/merge   - 合并分片
 * - GET    /api/v1/file/chunk/status/{fileId} - 查询已上传分片（断点续传）
 */
import { del, get, post } from '@/utils/request'
import type { FileUploadResult } from '@/types'

/**
 * 上传文件（通用接口）
 * 
 * @param file 文件对象
 * @param sex 性别路由参数（0=男/AM，1=女/AF）
 * @returns 上传结果，包含存储路径和访问URL
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0]
 * const result = await uploadFile(file, 0)
 * console.log('访问URL：', result.url)
 * ```
 */
export function uploadFile(file: File, sex: 0 | 1): Promise<FileUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sex', String(sex))
  
  return post<FileUploadResult>('/api/v1/files/generic', formData)
}

/**
 * 删除文件
 *
 * @param bucketName 存储桶名称
 * @param fileName 文件对象名
 * @returns 删除结果（true=成功，false=文件不存在）
 *
 * @example
 * ```typescript
 * const success = await deleteFile('apex', 'AF/abc123.jpg')
 * if (success) {
 *   console.log('删除成功')
 * }
 * ```
 */
export function deleteFile(bucketName: string, fileName: string): Promise<boolean> {
  return del<boolean>('/api/v1/file/delete', { bucketName, fileName })
}

/* ==================== 分片上传（apex-file-service，POST body 为原始字节） ==================== */

/** 分片上传初始化请求（后端 ChunkInitRequest） */
export interface ChunkInitPayload {
  /** 原始文件名（含扩展名） */
  fileName: string
  /** 文件总大小（字节） */
  fileSize: number
  /** 分片大小（字节） */
  chunkSize: number
  /** 分片总数 */
  totalChunks: number
  /** 文件 MD5（可选） */
  md5?: string
  /** 内容类型（可选） */
  contentType?: string
}

/** 分片上传初始化/状态结果（后端 ChunkInitResult） */
export interface ChunkInitResult {
  fileId: number
  bucketName: string
  chunkSize: number
  totalChunks: number
  /** 已成功上传的分片序号列表（升序，用于断点续传） */
  uploadedChunks: number[]
}

/** 单个分片上传结果（后端 ChunkUploadResult） */
export interface ChunkUploadResult {
  fileId: number
  chunkIndex: number
  /** 是否为本次新上传（false=服务端已存在，秒传/续传跳过） */
  uploaded: boolean
  objectName: string
  chunkSize: number
}

/** 分片合并结果（后端 ChunkMergeResult） */
export interface ChunkMergeResult {
  fileId: number
  bucketName: string
  /** 合并后存储的唯一对象名称 */
  fileName: string
  /** 预签名 URL（Local 存储返回需携带认证的 /api/v1/file/content 地址，无 TTL） */
  url: string
  fileSize: number
  md5?: string
}

/**
 * 初始化分片上传（服务端创建 UPLOADING 状态的文件记录）
 * @param payload 初始化参数
 */
export function initChunkUpload(payload: ChunkInitPayload): Promise<ChunkInitResult> {
  return post<ChunkInitResult>('/api/v1/file/chunk/init', payload)
}

/**
 * 上传单个分片（请求体为原始字节流，参数走 query）
 * @param params 分片定位参数
 * @param chunk 分片二进制内容
 */
export function uploadChunk(
  params: { fileId: number; chunkIndex: number; totalChunks: number; md5?: string },
  chunk: Blob,
): Promise<ChunkUploadResult> {
  const query = new URLSearchParams({
    fileId: String(params.fileId),
    chunkIndex: String(params.chunkIndex),
    totalChunks: String(params.totalChunks),
  })
  if (params.md5) query.set('md5', params.md5)
  return post<ChunkUploadResult>(`/api/v1/file/chunk/upload?${query.toString()}`, chunk, {
    headers: { 'Content-Type': 'application/octet-stream' },
  })
}

/**
 * 合并全部分片为最终文件
 * @param payload 合并参数（fileName 缺省沿用初始化登记值）
 */
export function mergeChunks(payload: { fileId: number; fileName?: string }): Promise<ChunkMergeResult> {
  return post<ChunkMergeResult>('/api/v1/file/chunk/merge', payload)
}

/**
 * 查询分片上传状态（用于断点续传，返回已上传分片列表）
 * @param fileId 文件记录主键
 */
export function getChunkStatus(fileId: number): Promise<ChunkInitResult> {
  return get<ChunkInitResult>(`/api/v1/file/chunk/status/${fileId}`)
}
