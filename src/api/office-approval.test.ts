/**
 * 办公平台审批对接 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（审批操作按 processInstanceId 路径参数、
 * approverId 必填上行、列表分页 pageNum/pageSize；approverId 不能为空串）。
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
  approveProcess,
  cancelApproval,
  getApprovalDetail,
  getMyInitiatedApprovals,
  getPendingApprovals,
  initiateApproval,
} from './office-approval'

describe('办公平台审批 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('发起审批以 POST 提交完整请求体', () => {
    const payload = {
      platform: 'FEISHU' as const,
      appId: 1,
      processDefinitionId: 'def-expense',
      initiatorId: 'u-100',
      formData: '{"amount":300}',
    }
    initiateApproval(payload)
    expect(request.post).toHaveBeenCalledWith('/api/office/approvals', payload)
  })

  it('详情与撤销按 processInstanceId 拼路径（非数字主键）', () => {
    getApprovalDetail('pi-88')
    cancelApproval('pi-88')
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/pi-88')
    expect(request.del).toHaveBeenCalledWith('/api/office/approvals/pi-88')
  })

  it('执行审批提交 approverId + action（approverId 非空串必填契约）', () => {
    approveProcess('pi-88', { approverId: 'u-200', action: 'APPROVE', comment: '同意' })
    approveProcess('pi-89', { approverId: 'u-200', action: 'REJECT' })
    expect(request.post).toHaveBeenCalledWith('/api/office/approvals/pi-88/approve', {
      approverId: 'u-200',
      action: 'APPROVE',
      comment: '同意',
    })
    expect(request.post).toHaveBeenCalledWith('/api/office/approvals/pi-89/approve', {
      approverId: 'u-200',
      action: 'REJECT',
    })
  })

  it('待审批列表携带 approverId 与 pageNum/pageSize', () => {
    getPendingApprovals({ platform: 'FEISHU', approverId: 'u-200', pageNum: 1, pageSize: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/pending', {
      platform: 'FEISHU',
      approverId: 'u-200',
      pageNum: 1,
      pageSize: 20,
    })
  })

  it('我发起的列表声明参数为 ApprovalListQuery，透传分页与可选平台', () => {
    getMyInitiatedApprovals({ platform: 'FEISHU', pageNum: 2, pageSize: 10 })
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/initiated', {
      platform: 'FEISHU',
      pageNum: 2,
      pageSize: 10,
    })
  })
})
