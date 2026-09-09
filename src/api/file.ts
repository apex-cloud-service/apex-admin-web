/**
 * 文件管理 API
 * ------------------------------------------------------------------
 * 文件上传、删除、URL获取等接口封装
 * 
 * 后端接口：
 * - POST /api/v1/files/generic - 通用文件上传（推荐）
 * - GET /api/v1/files/url - 获取文件访问URL
 * - DELETE /api/v1/files - 删除文件
 * - GET /api/v1/files/exists - 检查文件是否存在
 * - GET /api/v1/files/content - 读取文件内容
 */
import { post, get, del } from '@/utils/request'
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
 * 获取文件访问URL（预签名URL）
 * 
 * @param bucketName 存储桶名称
 * @param fileName 文件对象名（完整路径，如 AF/uuid.jpg）
 * @returns 预签名访问URL
 * 
 * @example
 * ```typescript
 * const url = await getFileUrl('apex', 'AF/abc123.jpg')
 * console.log('预签名URL：', url)
 * ```
 */
export function getFileUrl(bucketName: string, fileName: string): Promise<string> {
  return get<string>('/api/v1/files/url', { bucketName, fileName })
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
  return del<boolean>('/api/v1/files', { bucketName, fileName })
}

/**
 * 检查文件是否存在
 * 
 * @param bucketName 存储桶名称
 * @param fileName 文件对象名
 * @returns 是否存在
 * 
 * @example
 * ```typescript
 * const exists = await checkFileExists('apex', 'AF/abc123.jpg')
 * console.log('文件存在：', exists)
 * ```
 */
export function checkFileExists(bucketName: string, fileName: string): Promise<boolean> {
  return get<boolean>('/api/v1/files/exists', { bucketName, fileName })
}

/**
 * 获取文件内容（流式读取，适用于小文件）
 * 
 * @param fileName 文件对象名
 * @returns 文件URL（可用于浏览器直接访问）
 * 
 * @example
 * ```typescript
 * const contentUrl = getFileContent('AF/abc123.jpg')
 * // 在 <img> 中使用
 * // <img :src="contentUrl" />
 * ```
 */
export function getFileContent(fileName: string): string {
  return `/api/v1/files/content?fileName=${encodeURIComponent(fileName)}`
}
