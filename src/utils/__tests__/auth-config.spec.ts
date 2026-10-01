/**
 * 认证配置 API 单元测试
 * ------------------------------------------------------------------
 * 覆盖 src/api/auth-config.ts 的关键契约：
 * - 权限码列表的数字类型筛选与内存分页
 * - 写接口的路径与参数契约
 * - 脱敏密钥不得写回（updateJwtConfig 拒掩码）
 * - 编辑 OAuth2 客户端必须显式提供查询未返回的设置
 * - 公共授权码客户端不允许关闭 PKCE
 */
import { expect, it, vi } from 'vitest'
import { listPermissions, updatePermission, forceLogout, listLoginAttempts, deleteOAuth2Client, updateJwtConfig, updateOAuth2Client, createOAuth2Client } from '@/api/auth-config'
import { get, post, del, put } from '@/utils/request'
vi.mock('@/utils/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }))
it('权限数组按数字类型筛选和分页', async () => {
  vi.mocked(get).mockResolvedValue([{ id: 1, type: 1 }, { id: 2, type: 2 }])
  const result = await listPermissions({ page: 1, size: 10, type: 2 })
  expect(result.total).toBe(1)
  expect(result.list[0]?.id).toBe(2)
  expect(get).toHaveBeenCalledWith('/admin-api/v1/auth/config/permissions')
})
it('写接口使用主应用参数契约', async () => {
  await updatePermission(7, { name: '测试', code: 'test:read', type: 3, status: 1 })
  expect(post).toHaveBeenCalledWith('/api/v1/auth/permissions/update', expect.objectContaining({ id: 7, type: 3 }))
  await forceLogout('42')
  expect(post).toHaveBeenCalledWith('/admin-api/v1/users/42/sessions/revoke')
  await deleteOAuth2Client('test/client')
  expect(del).toHaveBeenCalledWith('/admin-api/v1/oauth2/clients/test%2Fclient')
  await listLoginAttempts({ page: 1, size: 10, status: 1 })
  expect(get).toHaveBeenCalledWith('/admin-api/v1/auth/config/login-logs', { page: 1, size: 10, status: 1 })
})

it('拒绝把脱敏密钥作为新密钥写回', async () => {
  vi.mocked(put).mockClear()
  await expect(updateJwtConfig({ secret: '******' } as Parameters<typeof updateJwtConfig>[0])).rejects.toThrow()
  expect(put).not.toHaveBeenCalled()
})
it('编辑客户端必须显式提供查询未返回的设置', async () => {
  vi.mocked(put).mockClear()
  await expect(updateOAuth2Client('public', { clientId: 'public', clientName: 'Public', clientAuthenticationMethods: ['none'], authorizationGrantTypes: ['authorization_code'], redirectUris: ['https://example.test/oauth2/callback'], scopes: ['read'] })).rejects.toThrow()
  expect(put).not.toHaveBeenCalled()
})
it('公共授权码客户端不能关闭 PKCE', async () => {
  vi.mocked(post).mockClear()
  await expect(createOAuth2Client({ clientId: 'public', clientName: 'Public', clientAuthenticationMethods: ['none'], authorizationGrantTypes: ['authorization_code'], redirectUris: ['https://example.test/oauth2/callback'], scopes: ['read'], requireProofKey: false })).rejects.toThrow()
  expect(post).not.toHaveBeenCalled()
})

it('显式客户端设置完整提交且使用 clientId 路径', async () => {
  const payload = { clientId: 'public/client', clientName: 'Public', clientAuthenticationMethods: ['none'], authorizationGrantTypes: ['authorization_code'], redirectUris: ['https://example.test/oauth2/callback'], scopes: ['read'], requireProofKey: true, requireAuthorizationConsent: false, accessTokenTimeToLive: 3600, refreshTokenTimeToLive: 86400, authorizationCodeTimeToLive: 300 }
  await updateOAuth2Client(payload.clientId, payload)
  expect(put).toHaveBeenCalledWith('/admin-api/v1/oauth2/clients/public%2Fclient', payload)
})
