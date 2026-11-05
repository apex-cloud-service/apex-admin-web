/**
 * 用户会话 Store 单元测试
 * ------------------------------------------------------------------
 * 覆盖登录/MFA 二步/身份加载/登出与本地清理：
 * - mfaRequired 响应不写入会话令牌
 * - 正式登录写入令牌并按响应记录租户
 * - 角色/权限接口失败降级为空数组
 * - 用户信息失败向外抛出
 * - 登出后端失败仍清理本地
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getMyPermissions: vi.fn(),
  getMyRoles: vi.fn(),
  verifyMfaChallenge: vi.fn(),
  getCaptcha: vi.fn(),
  refreshToken: vi.fn(),
}))
const userApi = vi.hoisted(() => ({ getCurrentUserInfo: vi.fn() }))

vi.mock('@/api/auth', () => authApi)
vi.mock('@/api/user', () => userApi)

import { useUserStore } from '@/stores/user'
import { getTenantId, getToken } from '@/utils/auth'

const identity = { id: 1, username: 'admin', nickname: '管理员', roles: [], permissions: [] }

describe('user store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    userApi.getCurrentUserInfo.mockResolvedValue(identity)
    authApi.getMyRoles.mockResolvedValue(['admin'])
    authApi.getMyPermissions.mockResolvedValue(['system:user:create'])
  })

  it('MFA 挑战响应不写入令牌与身份', async () => {
    authApi.login.mockResolvedValue({ mfaRequired: true, challengeToken: 'challenge' })
    const store = useUserStore()

    const result = await store.login({ username: 'u', password: 'p', captchaId: 'c', captchaCode: '1' })

    expect(result.mfaRequired).toBe(true)
    expect(store.token).toBe('')
    expect(getToken()).toBe('')
    expect(userApi.getCurrentUserInfo).not.toHaveBeenCalled()
  })

  it('登录写入令牌、租户并加载权限', async () => {
    authApi.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', tenantId: 'acme' })
    const store = useUserStore()

    await store.login({ username: 'u', password: 'p', captchaId: 'c', captchaCode: '1' })

    expect(store.token).toBe('access')
    expect(getToken()).toBe('access')
    expect(getTenantId()).toBe('acme')
    expect(store.permissions).toEqual(['system:user:create'])
    expect(store.initialized).toBe(true)
    expect(store.identity?.roles).toEqual(['admin'])
  })

  it('登录请求透传固定 deviceId/platform', async () => {
    authApi.login.mockResolvedValue({ accessToken: 'access' })
    const store = useUserStore()

    await store.login({ username: 'u', password: 'p', captchaId: 'c', captchaCode: '1', tenantId: 'acme' })

    expect(authApi.login).toHaveBeenCalledWith({
      username: 'u',
      password: 'p',
      captchaId: 'c',
      captchaCode: '1',
      deviceId: 'apex-admin-web',
      platform: 'web',
      tenantId: 'acme',
    })
  })

  it('MFA 二步验证成功后写入令牌', async () => {
    authApi.verifyMfaChallenge.mockResolvedValue({ accessToken: 'mfa-access' })
    const store = useUserStore()

    await store.verifyMfaChallenge('challenge', '123456')

    expect(authApi.verifyMfaChallenge).toHaveBeenCalledWith('challenge', '123456')
    expect(store.token).toBe('mfa-access')
  })

  it('角色与权限接口失败时降级为空数组', async () => {
    authApi.getMyRoles.mockRejectedValue(new Error('403'))
    authApi.getMyPermissions.mockRejectedValue(new Error('403'))
    const store = useUserStore()

    await store.loadIdentity()

    expect(store.identity?.roles).toEqual([])
    expect(store.permissions).toEqual([])
    expect(store.initialized).toBe(true)
  })

  it('用户信息接口失败时向外抛出且不标记初始化', async () => {
    userApi.getCurrentUserInfo.mockRejectedValue(new Error('500'))
    const store = useUserStore()

    await expect(store.loadIdentity()).rejects.toThrow('500')
    expect(store.initialized).toBe(false)
  })

  it('身份兼容旧字段 nickName 并回退 username', async () => {
    userApi.getCurrentUserInfo.mockResolvedValue({ id: 2, nickName: '旧昵称', phone: '13800000000' })
    const store = useUserStore()

    await store.loadIdentity()

    expect(store.identity?.username).toBe('旧昵称')
    expect(store.identity?.nickname).toBe('旧昵称')
  })

  it('登出后端失败仍清理本地会话', async () => {
    authApi.login.mockResolvedValue({ accessToken: 'access', tenantId: 'acme' })
    authApi.logout.mockRejectedValue(new Error('network'))
    const store = useUserStore()
    await store.login({ username: 'u', password: 'p', captchaId: 'c', captchaCode: '1' })

    await store.logout()

    expect(store.token).toBe('')
    expect(store.identity).toBeNull()
    expect(store.initialized).toBe(false)
    expect(getTenantId()).toBe('')
  })
})
