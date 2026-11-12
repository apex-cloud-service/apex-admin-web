/**
 * 密码找回 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（三步流程 requests/verifications/confirmations 均为 POST 且请求体字段不可混用）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PasswordRecoveryConfirmResult } from './password-recovery'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  confirmPasswordRecovery,
  initiatePasswordRecovery,
  verifyPasswordRecovery,
} from './password-recovery'

describe('密码找回 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('第一步发起找回：POST /requests 携带 channel 与 contact（EMAIL/SMS 两种通道）', () => {
    initiatePasswordRecovery('EMAIL', 'user@example.com')
    initiatePasswordRecovery('SMS', '13800138000')
    expect(request.post).toHaveBeenCalledWith('/auth/v2/password-recovery/requests', {
      channel: 'EMAIL',
      contact: 'user@example.com',
    })
    expect(request.post).toHaveBeenCalledWith('/auth/v2/password-recovery/requests', {
      channel: 'SMS',
      contact: '13800138000',
    })
  })

  it('第二步校验验证码：POST /verifications 携带 recoveryId 与 code（换一次性 confirmToken）', () => {
    verifyPasswordRecovery('rec-1', '123456')
    expect(request.post).toHaveBeenCalledWith('/auth/v2/password-recovery/verifications', {
      recoveryId: 'rec-1',
      code: '123456',
    })
  })

  it('第三步确认重设：POST /confirmations 携带 recoveryId/confirmToken/newPassword 三字段', () => {
    confirmPasswordRecovery('rec-1', 'confirm-token-1', 'NewPass#123')
    expect(request.post).toHaveBeenCalledWith('/auth/v2/password-recovery/confirmations', {
      recoveryId: 'rec-1',
      confirmToken: 'confirm-token-1',
      newPassword: 'NewPass#123',
    })
  })

  it('确认结果透传 sessionRevocation 状态（PENDING 表示会话撤销未完成）', async () => {
    const result: PasswordRecoveryConfirmResult = { status: 'OK', sessionRevocation: 'PENDING' }
    request.post.mockResolvedValue(result)
    await expect(confirmPasswordRecovery('rec-1', 'confirm-token-1', 'NewPass#123')).resolves.toBe(result)
    expect(result.sessionRevocation).toBe('PENDING')
  })
})
