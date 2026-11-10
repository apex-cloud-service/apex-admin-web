/**
 * Axios 请求封装单元测试
 * ------------------------------------------------------------------
 * 覆盖 src/utils/request.ts 的 401 自动刷新与重放策略：
 * - 持续 401 时只刷新一次令牌并重放一次
 * - 重放后的非 401 错误保留原状态码
 * - 认证端点自身不触发自动刷新
 * - 并发 401 共享同一次刷新
 * - showError 对 403 授权类错误追加能力订阅引导
 */
import { expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { refreshToken } from '@/api/auth'
import { getTenantId } from '@/utils/auth'
import { ApiError, request, showError } from '@/utils/request'
vi.mock('@/api/auth', () => ({ refreshToken: vi.fn() }))
vi.mock('element-plus/es/components/message/index.mjs', () => ({ ElMessage: { error: vi.fn() } }))
vi.mock('@/utils/auth', () => ({ getToken: () => 'test-access', getRefreshToken: () => 'test-refresh', setToken: vi.fn(), setRefreshToken: vi.fn(), clearSession: vi.fn(), getTenantId: vi.fn(() => ''), setTenantId: vi.fn(), removeTenantId: vi.fn(), setIdentity: vi.fn(), getIdentity: vi.fn(() => null), removeIdentity: vi.fn(), removeToken: vi.fn(), removeRefreshToken: vi.fn() }))
it('持续 401 时最多刷新一次并重放一次', async () => {
  vi.mocked(refreshToken).mockResolvedValue({ accessToken: 'test-new-access' })
  const adapter = vi.fn(async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config })
  })
  await expect(request({ url: '/test', adapter })).rejects.toMatchObject({ code: 401 })
  expect(adapter).toHaveBeenCalledTimes(2)
  expect(refreshToken).toHaveBeenCalledTimes(1)
})
it('重放的其他错误保留原状态', async () => {
  vi.mocked(refreshToken).mockClear()
  let count = 0
  const adapter: typeof axios.defaults.adapter = async (config) => {
    const status = ++count === 1 ? 401 : 503
    throw new AxiosError('Failure', 'ERR_BAD_REQUEST', config, undefined, { status, statusText: 'Failure', headers: {}, data: {}, config })
  }
  await expect(request({ url: '/test', adapter })).rejects.toMatchObject({ code: 503 })
  expect(refreshToken).toHaveBeenCalledTimes(1)
})

it.each(['/api/v1/auth/login', '/api/v1/auth/refresh', '/oauth2/token'])('认证端点 %s 不触发自动刷新', async (url) => {
  vi.mocked(refreshToken).mockClear()
  const adapter = vi.fn(async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config })
  })
  await expect(request({ url, adapter })).rejects.toMatchObject({ code: 401 })
  expect(adapter).toHaveBeenCalledTimes(1)
  expect(refreshToken).not.toHaveBeenCalled()
})
it('并发 401 共享一次刷新', async () => {
  vi.mocked(refreshToken).mockClear()
  let resolveRefresh!: (value: { accessToken: string }) => void
  vi.mocked(refreshToken).mockImplementation(() => new Promise(resolve => { resolveRefresh = resolve }))
  const adapter = vi.fn(async (config) => {
    if (!config.authRetried) {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config })
    }
    return { status: 200, statusText: 'OK', headers: {}, data: { code: 0, data: 'ok' }, config }
  })
  const pending = [request({ url: '/first', adapter }), request({ url: '/second', adapter })]
  await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(2))
  expect(refreshToken).toHaveBeenCalledTimes(1)
  resolveRefresh({ accessToken: 'new-access' })
  await expect(Promise.all(pending)).resolves.toEqual(['ok', 'ok'])
  expect(adapter).toHaveBeenCalledTimes(4)
})

it('会话记录租户时附带 X-Tenant-Id 请求头', async () => {
  vi.mocked(getTenantId).mockReturnValue('acme')
  let captured: Record<string, unknown> | undefined
  const adapter = vi.fn(async (config) => {
    captured = { ...(config.headers as Record<string, unknown>) }
    return { status: 200, statusText: 'OK', headers: {}, data: { code: 0, data: 'ok' }, config }
  })
  await request({ url: '/test', adapter })
  expect(captured?.['X-Tenant-Id']).toBe('acme')
})

it('未记录租户时不附带 X-Tenant-Id 请求头', async () => {
  vi.mocked(getTenantId).mockReturnValue('')
  let captured: Record<string, unknown> | undefined
  const adapter = vi.fn(async (config) => {
    captured = { ...(config.headers as Record<string, unknown>) }
    return { status: 200, statusText: 'OK', headers: {}, data: { code: 0, data: 'ok' }, config }
  })
  await request({ url: '/test', adapter })
  expect(captured?.['X-Tenant-Id']).toBeUndefined()
})

it.each(['能力未开通', 'scope 不足'])('403 授权类错误「%s」追加能力订阅引导', (message) => {
  vi.mocked(ElMessage.error).mockClear()
  showError(new ApiError(message, 403, 'trace-1'))
  expect(ElMessage.error).toHaveBeenCalledWith(`${message}（traceId: trace-1）；可在能力运营页查看当前租户订阅`)
})

it('403 非授权类错误不追加引导', () => {
  vi.mocked(ElMessage.error).mockClear()
  showError(new ApiError('无权访问该资源', 403))
  expect(ElMessage.error).toHaveBeenCalledWith('无权访问该资源')
})

it('非 403 命中关键字不追加引导', () => {
  vi.mocked(ElMessage.error).mockClear()
  showError(new ApiError('能力未开通', 500))
  expect(ElMessage.error).toHaveBeenCalledWith('能力未开通')
})
