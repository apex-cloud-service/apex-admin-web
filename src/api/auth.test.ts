/**
 * 认证 API 契约单元测试
 * ------------------------------------------------------------------
 * 覆盖登录链路的关键契约：
 * - 登录固定 loginType=PASSWORD 并透传验证码与租户声明
 * - 我的角色/权限兼容后端对象数组，统一取 code 字段
 * - MFA 二步验证走 /auth/v1/mfa/verify
 * - 刷新令牌携带 deviceId/platform
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))
vi.mock('@/utils/request', () => request)

import { getMyPermissions, getMyRoles, login, refreshToken, verifyMfaChallenge } from '@/api/auth'

describe('auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('登录固定 PASSWORD 类型并透传参数', async () => {
    request.post.mockResolvedValue({ accessToken: 'a' })

    await login({ username: 'admin', password: 'p', captchaId: 'cid', captchaCode: '1234', tenantId: 'acme' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      loginType: 'PASSWORD',
      username: 'admin',
      password: 'p',
      captchaId: 'cid',
      captchaCode: '1234',
      tenantId: 'acme',
    })
  })

  it('MFA 二步验证路径与请求体正确', async () => {
    request.post.mockResolvedValue({ accessToken: 'a' })

    await verifyMfaChallenge('challenge', '123456')

    expect(request.post).toHaveBeenCalledWith('/auth/v1/mfa/verify', {
      challengeToken: 'challenge',
      code: '123456',
    })
  })

  it('我的角色兼容对象数组与字符串数组', async () => {
    request.get.mockResolvedValue([{ id: 1, code: 'admin' }, 'auditor', { id: 2 }])

    expect(await getMyRoles()).toEqual(['admin', 'auditor'])
  })

  it('我的权限兼容对象数组并过滤空码', async () => {
    request.get.mockResolvedValue([{ code: 'system:user:list' }, '', { id: 2 }, 'system:role:list'])

    expect(await getMyPermissions()).toEqual(['system:user:list', 'system:role:list'])
  })

  it('角色/权限接口返回空值时降级为空数组', async () => {
    request.get.mockResolvedValue(null)

    expect(await getMyRoles()).toEqual([])
    expect(await getMyPermissions()).toEqual([])
  })

  it('刷新令牌携带 deviceId 与 platform', async () => {
    request.post.mockResolvedValue({ accessToken: 'new' })

    await refreshToken('refresh-x')

    expect(request.post).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      refreshToken: 'refresh-x',
      deviceId: 'apex-admin-web',
      platform: 'web',
    })
  })
})
