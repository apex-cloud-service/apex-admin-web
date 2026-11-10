/**
 * 站内通知 SSE 流客户端（模块级单例）
 * ------------------------------------------------------------------
 * 对接后端 apex-system 的通知推送通道：
 *   1. GET /api/v1/notifications/stream（text/event-stream，须 Bearer 认证）；
 *   2. 事件帧：event: notification，data: 通知正文（纯文本，与落库 content 一致）；
 *   3. 心跳：服务端每 30 秒发送注释行（:heartbeat），解析时忽略；
 *   4. 网关 JwtSignatureFilter 仅从 Authorization 头解析令牌，原生 EventSource
 *      无法自定义请求头，因此以 fetch + ReadableStream 自行实现 SSE 分帧解析；
 *   5. 断线自动重连：5s 起步指数退避，封顶 30s（与站内信 WebSocket 口径一致）。
 *
 * 使用方式：subscribe(listener) 订阅推送（首订自动建连），返回退订函数；
 * 最后一个订阅者退订时中止连接并停止重连。
 */

import { apiUrl } from '@/utils/api-base'

/** 通知推送回调（收到 notification 事件时触发，携带通知正文） */
export type NotificationPushListener = (content: string) => void

/** 重连退避区间（毫秒）：5s 起步，指数递增，封顶 30s */
const RECONNECT_DELAY_MIN = 5000
const RECONNECT_DELAY_MAX = 30000

let listeners = new Set<NotificationPushListener>()
let abortController: AbortController | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let reconnectDelay = RECONNECT_DELAY_MIN
let disposed = false

/**
 * 计算本次重连等待时间并递增退避。
 */
function nextReconnectDelay(): number {
  const delay = reconnectDelay
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX)
  return delay
}

/**
 * 创建 SSE 文本分帧解析器。
 *
 * 按 SSE 规范处理：字段行（event:/data:）累积事件，空行分发，
 * 冒号开头的注释行（服务端心跳）忽略；跨 chunk 的不完整行由内部缓冲拼接，
 * 多行 data 按 '\n' 合并。
 *
 * @param onEvent 事件分发回调（eventName 缺省为 message）
 */
export function createSseParser(
  onEvent: (eventName: string, data: string) => void,
): { processChunk: (chunk: string) => void } {
  let buffer = ''
  let eventName = ''
  let dataLines: string[] = []
  return {
    processChunk(chunk: string): void {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
        if (line === '') {
          if (dataLines.length > 0) onEvent(eventName || 'message', dataLines.join('\n'))
          eventName = ''
          dataLines = []
          continue
        }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let value = colon === -1 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'event') {
          eventName = value
        } else if (field === 'data') {
          dataLines.push(value)
        }
      }
    },
  }
}

/**
 * 建立连接：携带 Bearer 令牌发起流式请求并循环读取事件帧。
 */
async function connect(): Promise<void> {
  if (disposed || abortController) return
  const controller = new AbortController()
  abortController = controller
  try {
    const { getToken } = await import('@/utils/auth')
    const token = getToken()
    if (!token || disposed || listeners.size === 0) {
      // 未登录或已无人订阅：放弃本次建连，交由退避重试（登录后自动恢复）
      throw new Error('无可用令牌')
    }
    const response = await fetch(apiUrl('/api/v1/notifications/stream'), {
      // Accept 须携带 text/event-stream：后端按此头豁免 30s 全局响应超时
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      // 401/5xx：按断线退避；令牌过期由业务请求的刷新链路恢复后重连自愈
      throw new Error(`SSE 建连失败: ${response.status}`)
    }
    reconnectDelay = RECONNECT_DELAY_MIN
    const parser = createSseParser((eventName, data) => {
      if (eventName !== 'notification') return
      listeners.forEach((listener) => listener(data))
    })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parser.processChunk(decoder.decode(value, { stream: true }))
    }
    // 流结束（服务端关闭/重启）：视为断线，走重连
  } catch {
    // 主动中止（退订）或网络错误：均交给下方统一处理
  } finally {
    const aborted = controller.signal.aborted
    if (abortController === controller) abortController = null
    if (!aborted) {
      if (!disposed && listeners.size > 0) scheduleReconnect()
    }
  }
}

/**
 * 安排一次重连（退避间隔）。
 */
function scheduleReconnect(): void {
  if (disposed || reconnectTimer || listeners.size === 0) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined
    connect()
  }, nextReconnectDelay())
}

/**
 * 订阅站内通知推送；首个订阅者触发建连。
 * @param listener 推送回调
 * @returns 退订函数（最后一个退订者会中止连接）
 */
export function subscribeNotificationPush(listener: NotificationPushListener): () => void {
  listeners.add(listener)
  disposed = false
  if (!abortController && !reconnectTimer) connect()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      disposed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      abortController?.abort()
      abortController = null
    }
  }
}
