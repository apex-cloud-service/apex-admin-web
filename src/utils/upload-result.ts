/**
 * 上传响应归一化
 * ------------------------------------------------------------------
 * 用途：把文件服务普通上传的 HTTP 响应（FileUploadResponse）转换为
 * 页面消费的前端结果（FileUploadResult）。核心差异是字段名映射：
 * 普通上传 HTTP 响应使用 fileName 表示存储对象键，前端上传结果统一
 * 使用 objectName；bucketName、url 与 expiresIn 原样透传（含 expiresIn=0）。
 */
import type { FileUploadResponse, FileUploadResult } from '@/types'

/**
 * 把普通上传响应转换为前端上传结果
 *
 * @param response 后端上传响应（fileName/bucketName/url/expiresIn）
 * @returns 前端上传结果（objectName 承载响应中的 fileName）
 */
export function toFileUploadResult({ fileName, bucketName, url, expiresIn }: FileUploadResponse): FileUploadResult {
  return { objectName: fileName, bucketName, url, expiresIn }
}
