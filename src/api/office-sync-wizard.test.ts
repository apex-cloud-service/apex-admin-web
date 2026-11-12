/**
 * 办公组织同步向导 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（模块仅含预检/预览/执行/重试 4 个函数、
 * 全部走 POST；任务分页查询不在本模块）。
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
  executeOrgSync,
  preflightOrgSync,
  previewOrgSync,
  retryWizardSyncTask,
} from './office-sync-wizard'

describe('办公组织同步向导 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('预检以 POST 提交 { platform }', () => {
    preflightOrgSync('FEISHU')
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/sync/preflight', { platform: 'FEISHU' })
  })

  it('预览以 POST 提交 { platform, syncType }', () => {
    previewOrgSync('DINGTALK', 'MEMBER')
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/sync/preview', {
      platform: 'DINGTALK',
      syncType: 'MEMBER',
    })
  })

  it('执行同步以 POST 提交完整 OrgSyncRequest', () => {
    const payload = { platform: 'WECOM', syncType: 'DEPARTMENT' as const, fullSync: true }
    executeOrgSync(payload)
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/sync/tasks', payload)
  })

  it('重试按数字 taskId 拼路径且无请求体', () => {
    retryWizardSyncTask(5)
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/sync/tasks/5/retry')
    expect(request.post).toHaveBeenCalledTimes(1)
  })
})
