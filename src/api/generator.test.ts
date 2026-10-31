/**
 * 代码生成器 API 测试
 * ------------------------------------------------------------------
 * 断言数据源/配置基础端点与向导五段能力、异步任务链路
 * 以正确的 HTTP 方法/路径/请求体调用统一请求层。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  listGenTemplates,
  preflightGenerate,
  previewGenerate,
  submitGenTask,
  getGenTaskProgress,
  cancelGenTask,
  listGenTaskArtifacts,
  downloadGenArtifact,
} from './generator'

describe('生成器基础端点', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('数据源与表结构端点路径正确', async () => {
    const { listDataSources, listTables, generateCode, listGenerateHistory } = await import('./generator')
    listDataSources()
    listTables(3)
    generateCode(5)
    listGenerateHistory(5, { page: 1, size: 10 })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/datasources')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/datasources/3/tables')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/generator/configs/5/generate')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/configs/5/history', {
      page: 1,
      size: 10,
    })
  })
})

describe('生成向导 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('模板目录/预检/预览路径与请求体正确', () => {
    listGenTemplates()
    preflightGenerate(10)
    previewGenerate(10)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/templates')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/generator/preflight', { configId: 10 })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/generator/preview', { configId: 10 })
  })
})

describe('异步任务 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('提交任务携带配置 ID 与预览令牌', () => {
    submitGenTask({ configId: 10, previewToken: 'tok', overwrite: true })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/generator/tasks', {
      configId: 10,
      previewToken: 'tok',
      overwrite: true,
    })
  })

  it('进度/取消/产物清单路径正确', () => {
    getGenTaskProgress(9)
    cancelGenTask(9)
    listGenTaskArtifacts(9)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/tasks/9')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/generator/tasks/9/cancel')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/generator/tasks/9/artifacts')
  })

  it('产物下载走二进制流请求', () => {
    downloadGenArtifact(77)
    expect(request.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/admin-api/v1/generator/artifacts/77/download',
      responseType: 'blob',
    })
  })
})
