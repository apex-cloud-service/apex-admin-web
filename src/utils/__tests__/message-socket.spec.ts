/**
 * 站内信 WebSocket 连接管理单元测试
 * ------------------------------------------------------------------
 * 覆盖票据握手 URL、ping/pong 心跳应答、message 帧分发与 messageId
 * 字符串化、非 JSON 帧忽略、断线退避重连、票据失败重试与最后退订清理。
 * 被测模块为模块级单例，用例间通过 vi.resetModules 隔离。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { issueMessageSocketTicketMock } = vi.hoisted(() => ({
  issueMessageSocketTicketMock: vi.fn(),
}))

vi.mock('@/api/message', () => ({ issueMessageSocketTicket: issueMessageSocketTicketMock }))

/** 可控 WebSocket 桩（记录 URL、发送内容与生命周期回调） */
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  sent: string[] = []
  closed = false
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.onclose?.()
  }
}

/** 等待异步建连完成（票据签发 → new WebSocket） */
async function waitForSocket(): Promise<MockWebSocket> {
  await vi.waitFor(() => {
    expect(MockWebSocket.instances).toHaveLength(1)
  })
  return MockWebSocket.instances[0]
}

beforeEach(() => {
  vi.resetModules()
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
  issueMessageSocketTicketMock.mockResolvedValue({ ticket: 't-1', expiresIn: 30 })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** 动态加载被测单例（配合 resetModules 取全新实例） */
async function loadModule() {
  return await import('@/utils/message-socket')
}

describe('message-socket', () => {
  it('首个订阅者触发建连：先签发票据再按 ws 协议握手', async () => {
    const { subscribeMessagePush, subscribeMessageSocketState } = await loadModule()
    const states: string[] = []
    subscribeMessageSocketState((s) => states.push(s))

    subscribeMessagePush(vi.fn())
    const socket = await waitForSocket()

    expect(issueMessageSocketTicketMock).toHaveBeenCalledTimes(1)
    expect(socket.url).toBe(
      `ws://${window.location.host}/api/v1/messages/ws?ticket=${encodeURIComponent('t-1')}`,
    )
    expect(states[states.length - 1]).toBe('open')
  // vi.resetModules + 动态 import 在高负载下可能超过默认 5s，本用例显式放宽（不改全局配置）
  }, 15000)

  it('ping 帧回文本 pong（心跳保活）', async () => {
    const { subscribeMessagePush } = await loadModule()
    subscribeMessagePush(vi.fn())
    const socket = await waitForSocket()

    socket.onmessage?.({ data: JSON.stringify({ type: 'ping' }) })

    expect(socket.sent).toEqual(['pong'])
  })

  it('message 帧分发给订阅者，数字 messageId 转字符串；缺省为空串', async () => {
    const { subscribeMessagePush } = await loadModule()
    const listener = vi.fn()
    subscribeMessagePush(listener)
    const socket = await waitForSocket()

    socket.onmessage?.({ data: JSON.stringify({ type: 'message', messageId: 42 }) })
    socket.onmessage?.({ data: JSON.stringify({ type: 'message' }) })

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(1, '42')
    expect(listener).toHaveBeenNthCalledWith(2, '')
  })

  it('非 JSON 帧与未知类型帧被忽略', async () => {
    const { subscribeMessagePush } = await loadModule()
    const listener = vi.fn()
    subscribeMessagePush(listener)
    const socket = await waitForSocket()

    expect(() => socket.onmessage?.({ data: 'not-json' })).not.toThrow()
    socket.onmessage?.({ data: JSON.stringify({ type: 'unknown' }) })

    expect(listener).not.toHaveBeenCalled()
    expect(socket.sent).toEqual([])
  })

  it('连接关闭后按 5s 起步退避重连并重新签发票据', async () => {
    const { subscribeMessagePush } = await loadModule()
    subscribeMessagePush(vi.fn())
    const socket = await waitForSocket()

    vi.useFakeTimers()
    socket.close()

    // 5s 内不重连，到达后建第二条连接
    await vi.advanceTimersByTimeAsync(4999)
    expect(MockWebSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(2))

    expect(issueMessageSocketTicketMock).toHaveBeenCalledTimes(2)
  })

  it('票据签发失败不建连，按退避重试', async () => {
    issueMessageSocketTicketMock.mockRejectedValue(new Error('401 未登录'))
    const { subscribeMessagePush } = await loadModule()

    // 重连定时器须登记在假时钟上，先于 subscribe 启用假定时器
    vi.useFakeTimers()
    expect(() => subscribeMessagePush(vi.fn())).not.toThrow()
    await vi.advanceTimersByTimeAsync(0)
    await vi.waitFor(() => expect(issueMessageSocketTicketMock).toHaveBeenCalledTimes(1))
    expect(MockWebSocket.instances).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(5000)
    await vi.waitFor(() => expect(issueMessageSocketTicketMock).toHaveBeenCalledTimes(2))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('最后一个订阅者退订后关闭连接并停止重连', async () => {
    const { subscribeMessagePush, subscribeMessageSocketState } = await loadModule()
    const states: string[] = []
    subscribeMessageSocketState((s) => states.push(s))

    const unsubscribe = subscribeMessagePush(vi.fn())
    const socket = await waitForSocket()

    unsubscribe()

    expect(socket.closed).toBe(true)
    expect(states[states.length - 1]).toBe('idle')

    vi.useFakeTimers()
    await vi.advanceTimersByTimeAsync(60000)
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(issueMessageSocketTicketMock).toHaveBeenCalledTimes(1)
  })

  it('多订阅者共享一条连接，仅最后一个退订才关闭', async () => {
    const { subscribeMessagePush } = await loadModule()
    const listenerA = vi.fn()
    const listenerB = vi.fn()
    const unsubA = subscribeMessagePush(listenerA)
    const unsubB = subscribeMessagePush(listenerB)
    const socket = await waitForSocket()

    unsubA()
    expect(socket.closed).toBe(false)
    expect(MockWebSocket.instances).toHaveLength(1)

    socket.onmessage?.({ data: JSON.stringify({ type: 'message', messageId: 'm-1' }) })
    expect(listenerA).not.toHaveBeenCalled()
    expect(listenerB).toHaveBeenCalledWith('m-1')

    unsubB()
    expect(socket.closed).toBe(true)
  })

  it('状态订阅立即收到当前状态，退订后不再接收', async () => {
    const { subscribeMessagePush, subscribeMessageSocketState } = await loadModule()
    const states: string[] = []
    const unsub = subscribeMessageSocketState((s) => states.push(s))

    expect(states).toEqual(['idle'])

    unsub()
    subscribeMessagePush(vi.fn())
    await waitForSocket()

    expect(states).toEqual(['idle'])
  })
})
