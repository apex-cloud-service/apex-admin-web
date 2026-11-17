/**
 * 办公平台审批对接 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（审批操作按 processInstanceId 路径参数、
 * approverId/initiatorId 必填上行）；后端 pending/initiated 返回裸数组，
 * 前端按平台筛选后再做客户端真分页（total/pages/hasNext 与切片一致）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalProcess } from './office-approval'

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
  listMyInitiatedApprovals,
} from './office-approval'

/** 构造审批记录（仅填充断言关心的字段）。 */
function approval(id: string, platform: 'FEISHU' | 'DINGTALK' = 'FEISHU'): ApprovalProcess {
  return { processInstanceId: id, platform, processName: id, status: 'PENDING' }
}

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

  it('待审批：只上送 approverId，返回裸数组按平台筛选后客户端分页', async () => {
    request.get.mockResolvedValueOnce([
      approval('a1'),
      approval('a2', 'DINGTALK'),
      approval('a3'),
      approval('a4'),
    ])
    const result = await getPendingApprovals({
      platform: 'FEISHU',
      approverId: 'u-200',
      pageNum: 2,
      pageSize: 2,
    })
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/pending', {
      approverId: 'u-200',
    })
    // FEISHU 命中 a1/a3/a4 共 3 条；pageSize=2 时第 2 页只有 a4
    expect(result.list.map((item) => item.processInstanceId)).toEqual(['a4'])
    expect(result.total).toBe(3)
    expect(result.pages).toBe(2)
    expect(result.hasNext).toBe(false)
  })

  it('待审批缺少 approverId 时直接拒绝，不发请求', async () => {
    await expect(
      getPendingApprovals({ approverId: '  ', pageNum: 1, pageSize: 10 }),
    ).rejects.toThrow('审批人ID不能为空')
    expect(request.get).not.toHaveBeenCalled()
  })

  it('我发起的：必带 initiatorId，状态筛选后分页', async () => {
    request.get.mockResolvedValueOnce([
      { ...approval('i1'), status: 'APPROVED' },
      { ...approval('i2'), status: 'PENDING' },
      { ...approval('i3'), status: 'APPROVED' },
    ])
    const result = await getMyInitiatedApprovals({
      initiatorId: '42',
      status: 'APPROVED',
      pageNum: 1,
      pageSize: 1,
    })
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/initiated', {
      initiatorId: '42',
    })
    expect(result.list).toHaveLength(1)
    expect(result.total).toBe(2)
    expect(result.hasNext).toBe(true)
  })

  it('我发起的全量查询保留完整数组，供已办区块独立分页', async () => {
    const all = [approval('x1'), approval('x2')]
    request.get.mockResolvedValueOnce(all)
    await expect(listMyInitiatedApprovals({ initiatorId: '42', pageNum: 1, pageSize: 1 }))
      .resolves.toEqual(all)
    expect(request.get).toHaveBeenCalledWith('/api/office/approvals/initiated', {
      initiatorId: '42',
    })
  })
})
