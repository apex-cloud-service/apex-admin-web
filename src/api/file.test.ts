/**
 * 文件管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（分片上传契约：upload 为原始字节流且
 * 定位参数走 query、status 为 GET /{fileId} 断点续传端点；本模块全部函数均经
 * 统一请求层，不含组件级 Element Plus/XHR 上传通道）。
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
  deleteFile,
  getChunkStatus,
  initChunkUpload,
  mergeChunks,
  uploadChunk,
  uploadFile,
} from './file'
import type { ChunkInitPayload } from './file'

describe('通用文件上传/删除 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('上传以 FormData 携带文件且 sex 序列化为字符串（经统一请求层）', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' })
    uploadFile(file, 1)
    expect(request.post).toHaveBeenCalledWith('/api/v1/files/generic', expect.any(FormData))
    const body = request.post.mock.calls[0]?.[1] as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('sex')).toBe('1')
  })

  it('删除文件按桶名与对象名以 query 参数提交', () => {
    deleteFile('apex', 'AF/abc123.jpg')
    expect(request.del).toHaveBeenCalledWith('/api/v1/file/delete', {
      bucketName: 'apex',
      fileName: 'AF/abc123.jpg',
    })
  })
})

describe('分片上传 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('初始化提交文件名/大小/分片大小/分片总数', () => {
    const payload: ChunkInitPayload = {
      fileName: 'big-video.mp4',
      fileSize: 1024,
      chunkSize: 256,
      totalChunks: 4,
      md5: 'digest',
      contentType: 'video/mp4',
    }
    initChunkUpload(payload)
    expect(request.post).toHaveBeenCalledWith('/api/v1/file/chunk/init', payload)
  })

  it('分片上传请求体为原始字节流、定位参数走 query 并带 octet-stream 头', () => {
    const chunk = new Blob([new Uint8Array([7, 8, 9])])
    uploadChunk({ fileId: 101, chunkIndex: 2, totalChunks: 5 }, chunk)
    expect(request.post).toHaveBeenCalledWith(
      '/api/v1/file/chunk/upload?fileId=101&chunkIndex=2&totalChunks=5',
      chunk,
      { headers: { 'Content-Type': 'application/octet-stream' } },
    )
  })

  it('分片可选 md5 追加在 query 末尾', () => {
    const chunk = new Blob([new Uint8Array([1])])
    uploadChunk({ fileId: 101, chunkIndex: 3, totalChunks: 5, md5: 'abc123' }, chunk)
    expect(request.post).toHaveBeenCalledWith(
      '/api/v1/file/chunk/upload?fileId=101&chunkIndex=3&totalChunks=5&md5=abc123',
      chunk,
      { headers: { 'Content-Type': 'application/octet-stream' } },
    )
  })

  it('合并分片提交 fileId 与缺省沿用初始化登记的 fileName', () => {
    mergeChunks({ fileId: 101, fileName: 'big-video.mp4' })
    expect(request.post).toHaveBeenCalledWith('/api/v1/file/chunk/merge', {
      fileId: 101,
      fileName: 'big-video.mp4',
    })
  })

  it('分片状态查询为 GET /{fileId}（断点续传读已上传分片列表）', () => {
    getChunkStatus(101)
    expect(request.get).toHaveBeenCalledWith('/api/v1/file/chunk/status/101')
  })
})
