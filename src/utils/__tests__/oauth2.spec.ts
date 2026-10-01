/**
 * OAuth2 API 单元测试
 * ------------------------------------------------------------------
 * 覆盖 src/api/oauth2.ts 的核心安全逻辑：
 * - buildAuthUrl 生成 S256 PKCE 授权请求
 * - exchangeToken 使用表单编码换取并映射 Token 字段
 * - consumeAuthorization 一次性消费且 verifier 与 challenge 一致
 * - 错误 state 消耗上下文并拒绝授权
 */
import { expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { buildAuthUrl, exchangeToken, consumeAuthorization } from '@/api/oauth2'
import { request } from '@/utils/request'
vi.mock('@/utils/request', () => ({ request: vi.fn(), get: vi.fn(), post: vi.fn() }))
it('生成 S256 PKCE 授权请求', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const url = new URL(await buildAuthUrl({ clientId: 'test-client', redirectUri: 'http://localhost/oauth2/callback', scope: 'read' }), 'http://localhost')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
})
it('使用表单换取并映射 Token', async () => {
  vi.mocked(request).mockResolvedValue({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 3600 })
  const result = await exchangeToken({ grantType: 'authorization_code', code: 'test-code', clientId: 'test-client', redirectUri: 'http://localhost/oauth2/callback', codeVerifier: 'test-verifier' })
  expect(result).toEqual({ accessToken: 'test-access', refreshToken: 'test-refresh', tokenType: 'Bearer', expiresIn: 3600 })
  const config = vi.mocked(request).mock.calls[0]![0]
  expect(config.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
  expect(Object.fromEntries(new URLSearchParams(String(config.data)))).toEqual({ grant_type: 'authorization_code', code: 'test-code', client_id: 'test-client', redirect_uri: 'http://localhost/oauth2/callback', code_verifier: 'test-verifier' })
})

it('授权上下文仅消费一次且 verifier 与 S256 challenge 一致', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const url = new URL(await buildAuthUrl({ clientId: 'client', redirectUri: 'https://example.test/oauth2/callback', scope: 'read' }), 'https://example.test')
  const state = url.searchParams.get('state')!
  const context = consumeAuthorization(state)!
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(context.codeVerifier))
  expect(Buffer.from(digest).toString('base64url')).toBe(url.searchParams.get('code_challenge'))
  expect(consumeAuthorization(state)).toBeNull()
})
it('错误 state 消耗上下文并拒绝授权', async () => {
  const url = new URL(await buildAuthUrl({ clientId: 'client', redirectUri: 'https://example.test/oauth2/callback', scope: 'read' }), 'https://example.test')
  expect(consumeAuthorization('wrong-state')).toBeNull()
  expect(consumeAuthorization(url.searchParams.get('state')!)).toBeNull()
})
