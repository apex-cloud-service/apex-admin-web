import type { FileUploadResponse, FileUploadResult } from '@/types'

export function toFileUploadResult({ fileName, bucketName, url, expiresIn }: FileUploadResponse): FileUploadResult {
  return { objectName: fileName, bucketName, url, expiresIn }
}
