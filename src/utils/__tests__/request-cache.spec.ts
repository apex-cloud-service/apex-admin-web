/**
 * 请求缓存工具单元测试
 * ------------------------------------------------------------------
 * 覆盖缓存命中/过期、并发去重、强制刷新、失败不缓存、预加载与统计；
 * 并发与失效语义（FE-030 Wave C）：旧 TTL 定时器不淘汰新值、清空后
 * 旧请求完成不清除新 pending、清除构成失效屏障（飞行中响应不回填）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CACHE_KEYS,
  cachedRequest,
  clearAllCache,
  clearCache,
  getCacheStats,
  globalCache,
  prefetchRequest,
} from '@/utils/request-cache'

describe('request-cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearAllCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('相同 key 第二次命中缓存，requestFn 只执行一次', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1 })
    const opts = { key: 'user:1' }

    await expect(cachedRequest(fn, opts)).resolves.toEqual({ id: 1 })
    await expect(cachedRequest(fn, opts)).resolves.toEqual({ id: 1 })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('不传 key 时每次独立请求（随机键等效不命中）', async () => {
    const fn = vi.fn().mockResolvedValue('v')

    await cachedRequest(fn)
    await cachedRequest(fn)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('超过 ttl 后缓存失效并重新请求', async () => {
    const fn = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b')

    await expect(cachedRequest(fn, { key: 'k', ttl: 1000 })).resolves.toBe('a')

    vi.advanceTimersByTime(1001)

    await expect(cachedRequest(fn, { key: 'k', ttl: 1000 })).resolves.toBe('b')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('forceRefresh 忽略既有缓存', async () => {
    const fn = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b')
    const opts = { key: 'k' }

    await cachedRequest(fn, opts)
    await expect(cachedRequest(fn, { ...opts, forceRefresh: true })).resolves.toBe('b')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('dedupe：并发相同 key 共享进行中的请求', async () => {
    let resolveFn!: (v: string) => void
    const fn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve
        }),
    )
    const opts = { key: 'shared' }

    const p1 = cachedRequest(fn, opts)
    const p2 = cachedRequest(fn, opts)
    resolveFn('done')

    await expect(p1).resolves.toBe('done')
    await expect(p2).resolves.toBe('done')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('dedupe 关闭时并发请求各自执行', async () => {
    const fn = vi.fn().mockResolvedValue('v')
    const opts = { key: 'k', dedupe: false }

    await Promise.all([cachedRequest(fn, opts), cachedRequest(fn, opts)])

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('请求失败不缓存，下次调用重新发起', async () => {
    // 关闭去重，单独验证失败不缓存以及下一次调用重新执行
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const opts = { key: 'k', dedupe: false }

    await expect(cachedRequest(fn, opts)).rejects.toThrow('boom')
    await expect(cachedRequest(fn, opts)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('prefetchRequest 预加载后 cachedRequest 直接命中', async () => {
    const fn = vi.fn().mockResolvedValue('pre')

    await prefetchRequest(fn, 'pre-key')
    await expect(cachedRequest(vi.fn().mockResolvedValue('other'), { key: 'pre-key' })).resolves.toBe('pre')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('prefetchRequest 失败不向外抛错', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(prefetchRequest(vi.fn().mockRejectedValue(new Error('boom')), 'k')).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('clearCache/clearAllCache 清除后重新请求', async () => {
    const fn = vi.fn().mockResolvedValue('v')

    await cachedRequest(fn, { key: 'a' })
    clearCache('a')
    expect(globalCache.has('a')).toBe(false)

    await cachedRequest(fn, { key: 'b' })
    clearAllCache()
    expect(globalCache.size()).toBe(0)
  })

  it('has 与 getCacheStats 反映缓存状态', async () => {
    expect(globalCache.has('k')).toBe(false)

    await cachedRequest(vi.fn().mockResolvedValue('payload'), { key: 'k' })

    expect(globalCache.has('k')).toBe(true)
    const stats = getCacheStats()
    expect(stats.size).toBe(1)
    expect(stats.items[0]).toMatchObject({ key: 'k', ttl: 5 * 60 * 1000 })
    expect(stats.items[0].size).toBe(JSON.stringify('payload').length)
  })

  it('CACHE_KEYS 键生成符合前缀约定', () => {
    expect(CACHE_KEYS.DICT('gender')).toBe('dict:gender')
    expect(CACHE_KEYS.SYS_CONFIG('site')).toBe('config:site')
    expect(CACHE_KEYS.USER_INFO).toBe('user:info')
  })

  describe('并发与失效语义（FE-030 Wave C）', () => {
    it('旧 TTL 定时器不得淘汰同 key 的新值', () => {
      globalCache.set('k', 'old', 1000)
      vi.advanceTimersByTime(500)
      globalCache.set('k', 'new', 2000)

      // t=1100：旧条目的定时器到期，新条目仍在有效期内
      vi.advanceTimersByTime(600)

      expect(globalCache.get('k')).toBe('new')
    })

    it('清空后旧请求完成不得清除新请求的 pending 记录', async () => {
      const resolvers: Array<(v: string) => void> = []
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve)
          }),
      )

      const p1 = cachedRequest(fn, { key: 'k' })
      clearAllCache()
      const p2 = cachedRequest(fn, { key: 'k' })

      resolvers[0]('one')
      await p1

      // 旧请求的清理不得移除 p2 仍在进行中的记录
      expect(globalCache.getPendingRequest('k')).not.toBeNull()

      resolvers[1]('two')
      await p2
    })

    it('清空缓存后飞行中的响应不得回填缓存', async () => {
      let resolveFn!: (v: string) => void
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveFn = resolve
          }),
      )

      const p = cachedRequest(fn, { key: 'k' })
      clearAllCache()
      resolveFn('stale')
      await p

      expect(globalCache.has('k')).toBe(false)
    })

    it('forceRefresh 只失效已存缓存，dedupe 开启时仍复用同 key 在途请求', async () => {
      const resolvers: Array<(v: string) => void> = []
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve)
          }),
      )

      const inFlight = cachedRequest(fn, { key: 'k' })
      // 强制刷新不会取消或移除尚未完成的 pending 记录
      const forced = cachedRequest(fn, { key: 'k', forceRefresh: true })

      expect(fn).toHaveBeenCalledTimes(1)
      resolvers[0]('shared')
      await expect(inFlight).resolves.toBe('shared')
      await expect(forced).resolves.toBe('shared')
    })

    it('clearCache 不取消在途请求，旧结果仍返回原调用方但不回填', async () => {
      let resolveFn!: (v: string) => void
      const fn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveFn = resolve
          }),
      )

      const p = cachedRequest(fn, { key: 'k' })
      clearCache('k')
      resolveFn('late')

      await expect(p).resolves.toBe('late')
      expect(globalCache.has('k')).toBe(false)
    })
  })
})
