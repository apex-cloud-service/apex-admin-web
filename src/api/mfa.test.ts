/**
 * 多因素认证 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（激活/启用参数走 query string 且编码特殊字符、我的配置为裸数组端点）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MfaConfigInfo } from '@/types'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  MFA_STATUS_META,
  MFA_TYPE_NAMES,
  activateTotp,
  disableMfa,
  enableEmailMfa,
  enableSmsMfa,
  enableTotp,
  listMfaConfigs,
  regenerateBackupCodes,
} from './mfa'

describe('多因素认证 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TOTP 启用与激活：动态码经 encodeURIComponent 拼入 query（非请求体）', () => {
    enableTotp()
    activateTotp('123456')
    activateTotp('12+456')
    expect(request.post).toHaveBeenCalledWith('/api/mfa/totp/enable')
    expect(request.post).toHaveBeenCalledWith('/api/mfa/totp/activate?code=123456')
    expect(request.post).toHaveBeenCalledWith('/api/mfa/totp/activate?code=12%2B456')
  })

  it('短信与邮箱 MFA：联系方式走 query string 且编码 + 与 @', () => {
    enableSmsMfa('+8613800000000')
    enableEmailMfa('user@example.com')
    expect(request.post).toHaveBeenCalledWith('/api/mfa/sms/enable?phoneNumber=%2B8613800000000')
    expect(request.post).toHaveBeenCalledWith('/api/mfa/email/enable?email=user%40example.com')
  })

  it('关闭 MFA 为 DELETE /api/mfa/{type}，类型为大写枚举', () => {
    disableMfa('TOTP')
    disableMfa('SMS')
    disableMfa('EMAIL')
    expect(request.del).toHaveBeenCalledWith('/api/mfa/TOTP')
    expect(request.del).toHaveBeenCalledWith('/api/mfa/SMS')
    expect(request.del).toHaveBeenCalledWith('/api/mfa/EMAIL')
  })

  it('我的 MFA 配置为裸数组端点（/api/mfa/configs，无 Result 包装）并透传返回值', async () => {
    const configs: MfaConfigInfo[] = [{ type: 'TOTP', status: 'ACTIVE' }]
    request.get.mockResolvedValue(configs)
    await expect(listMfaConfigs()).resolves.toBe(configs)
    expect(request.get).toHaveBeenCalledWith('/api/mfa/configs')
  })

  it('备用码重新生成端点正确', () => {
    regenerateBackupCodes()
    expect(request.post).toHaveBeenCalledWith('/api/mfa/backup-codes/regenerate')
  })

  it('类型与状态映射包含后端全部枚举键', () => {
    expect(Object.keys(MFA_TYPE_NAMES)).toEqual(
      expect.arrayContaining(['TOTP', 'SMS', 'EMAIL', 'BACKUP_CODE']),
    )
    expect(Object.keys(MFA_STATUS_META)).toEqual(
      expect.arrayContaining(['ACTIVE', 'PENDING', 'DISABLED', 'LOCKED']),
    )
  })
})
