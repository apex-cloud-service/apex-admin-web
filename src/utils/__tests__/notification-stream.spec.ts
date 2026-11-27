/**
 * 站内通知 SSE 流客户端测试
 * ------------------------------------------------------------------
 * 覆盖：SSE 分帧解析（跨 chunk/注释行/多行 data）、订阅建连与鉴权头、
 * 事件分发、退订中止、建连失败的退避重连。
 * 模块为单例，逐用例 resetModules 重建以保证状态隔离。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({ getToken: vi.fn(() => 'token-1') }))

vi.mock('@/utils/auth', () => authMock)

const fetchMock = vi.fn()

/** 构造返回固定文本分片的 Response 形状 */
function makeResponse(chunks: string[], ok = true, status = 200) {
  let index = 0
  return {
    ok,
    status,
    body: {
      getReader: () => ({
        read: async () =>
          index < chunks.length
            ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
            : { done: true, value: undefined },
      }),
    },
  }
}

/** 每个用例加载全新模块实例（单例状态隔离） */
async function loadModule() {
  vi.resetModules()
  const mod = await import('../notification-stream')
  return mod
}

describe('createSseParser', () => {
  it('解析完整事件帧并分发 notification 事件', () => {
    const mod = { parser: undefined as unknown, events: [] as Array<[string, string]> }
    return loadModule().then(({ createSseParser }) => {
      const parser = createSseParser((name, data) => mod.events.push([name, data]))
      parser.processChunk('event: notification\ndata: 欢迎加入\n\n')
      expect(mod.events).toEqual([['notification', '欢迎加入']])
    })
  // vi.resetModules + 动态 import 在高负载下可能超过默认 5s，本用例显式放宽（不改全局配置）
  }, 15000)

  it('跨 chunk 的不完整行由缓冲拼接', () => {
    return loadModule().then(({ createSseParser }) => {
      const events: Array<[string, string]> = []
      const parser = createSseParser((name, data) => events.push([name, data]))
      parser.processChunk('event: notification\nda')
      parser.processChunk('ta: 第二条通知\n\n')
      expect(events).toEqual([['notification', '第二条通知']])
    })
  })

  it('忽略注释行（心跳）且不分发空事件', () => {
    return loadModule().then(({ createSseParser }) => {
      const events: Array<[string, string]> = []
      const parser = createSseParser((name, data) => events.push([name, data]))
      parser.processChunk(':heartbeat\n\n')
      expect(events).toEqual([])
    })
  })

  it('多行 data 按换行合并，无 event 字段缺省 message', () => {
    return loadModule().then(({ createSseParser }) => {
      const events: Array<[string, string]> = []
      const parser = createSseParser((name, data) => events.push([name, data]))
      parser.processChunk('data: 第一行\ndata: 第二行\n\n')
      expect(events).toEqual([['message', '第一行\n第二行']])
    })
  })
})

describe('subscribeNotificationPush', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    authMock.getToken.mockReturnValue('token-1')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  it('首个订阅者触发建连并携带 Authorization 头', async () => {
    fetchMock.mockResolvedValue(makeResponse([]))
    const { subscribeNotificationPush } = await loadModule()
    const unsubscribe = subscribeNotificationPush(() => {})
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/notifications/stream')
    expect(init.headers.Authorization).toBe('Bearer token-1')
    unsubscribe()
  })

  it('配置 VITE_API_BASE_URL 时按该基地址建连（去尾部斜杠）', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    fetchMock.mockResolvedValue(makeResponse([]))
    const { subscribeNotificationPush } = await loadModule()
    const unsubscribe = subscribeNotificationPush(() => {})
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/notifications/stream')
    unsubscribe()
  })

  it('notification 事件分发给订阅者，其他事件不分发', async () => {
    fetchMock.mockResolvedValue(
      makeResponse(['event: notification\ndata: 新通知\n\n', 'event: other\ndata: 忽略\n\n']),
    )
    const { subscribeNotificationPush } = await loadModule()
    const received: string[] = []
    const unsubscribe = subscribeNotificationPush((content) => received.push(content))
    await vi.waitFor(() => expect(received).toEqual(['新通知']))
    unsubscribe()
  })

  it('最后一个退订者中止连接', async () => {
    let abortSignal: AbortSignal | undefined
    // 长连接形态：read 永不完成，直到信号中止
    fetchMock.mockImplementation((_url, init) => {
      abortSignal = init.signal
      return Promise.resolve({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read: () => new Promise<never>(() => {}) }) },
      })
    })
    const { subscribeNotificationPush } = await loadModule()
    const unsubscribeA = subscribeNotificationPush(() => {})
    const unsubscribeB = subscribeNotificationPush(() => {})
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    unsubscribeA()
    expect(abortSignal?.aborted).toBe(false)
    unsubscribeB()
    expect(abortSignal?.aborted).toBe(true)
  })

  it('建连失败按退避重连', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(makeResponse([], false, 500))
    const { subscribeNotificationPush } = await loadModule()
    subscribeNotificationPush(() => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // 退避 5s 后重试
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
