/**
 * 站内信 WebSocket 连接管理（模块级单例）
 * ------------------------------------------------------------------
 * 对接后端 office-service 的站内信推送通道：
 *   1. POST /api/v1/messages/ws-ticket 签发一次性票据（30 秒有效，须 Bearer）；
 *   2. GET(WS) /api/v1/messages/ws?ticket=<encodeURIComponent(ticket)> 握手，
 *      票据只能消费一次，重连必须重新签发；
 *   3. 服务端每 20 秒推送 {"type":"ping"}，客户端须回文本 pong（60 秒无 pong 断开）；
 *   4. 连接寿命上限 1 小时，到期由服务端关闭，本管理器按断线处理并自动重连；
 *   5. 推送帧 {"type":"message","messageId":"<id>"} 仅提示有新消息，正文经 HTTP 接口拉取。
 *
 * 使用方式：subscribe(listener) 订阅推送（首订自动建连），返回退订函数；
 * 最后一个订阅者退订时关闭连接并停止重连。
 */

/** 推送事件回调（收到 message 帧时触发，携带服务端给的 messageId 字符串） */
export type MessagePushListener = (messageId: string) => void

/** 连接状态（暴露给调试/展示场景） */
export type MessageSocketState = 'idle' | 'connecting' | 'open' | 'closed'

/** 重连退避区间（毫秒）：5s 起步，指数递增，封顶 30s */
const RECONNECT_DELAY_MIN = 5000
const RECONNECT_DELAY_MAX = 30000

let listeners = new Set<MessagePushListener>()
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let reconnectDelay = RECONNECT_DELAY_MIN
let disposed = false
let state: MessageSocketState = 'idle'

const stateListeners = new Set<(state: MessageSocketState) => void>()

/**
 * 解析服务端推送帧；非 JSON 或未知类型返回 null。
 * @param event 消息事件
 */
function parseFrame(event: MessageEvent): { type: string; messageId?: string } | null {
  if (typeof event.data !== 'string') return null
  try {
    const frame = JSON.parse(event.data) as { type?: string; messageId?: string | number }
    if (!frame || typeof frame.type !== 'string') return null
    return {
      type: frame.type,
      messageId: frame.messageId != null ? String(frame.messageId) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * 计算本次重连等待时间并递增退避。
 */
function nextReconnectDelay(): number {
  const delay = reconnectDelay
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX)
  return delay
}

/**
 * 建立连接：签发票据后握手，绑定帧处理与关闭重连。
 */
async function connect(): Promise<void> {
  if (disposed || socket) return
  state = 'connecting'
  notifyState()
  try {
    const { issueMessageSocketTicket } = await import('@/api/message')
    const { ticket } = await issueMessageSocketTicket()
    if (disposed || listeners.size === 0) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}/api/v1/messages/ws?ticket=${encodeURIComponent(ticket)}`
    socket = new WebSocket(url)
  } catch {
    // 票据签发失败（未登录/服务不可用）：按断线退避重试
    socket = null
    scheduleReconnect()
    return
  }

  socket.onmessage = (event: MessageEvent) => {
    const frame = parseFrame(event)
    if (!frame) return
    if (frame.type === 'ping') {
      socket?.send('pong')
      return
    }
    if (frame.type === 'message') {
      // 新消息推送：重置退避并通知订阅者（正文由订阅者经 HTTP 拉取）
      reconnectDelay = RECONNECT_DELAY_MIN
      listeners.forEach((listener) => listener(frame.messageId ?? ''))
    }
  }

  socket.onclose = () => {
    socket = null
    state = 'closed'
    notifyState()
    if (!disposed && listeners.size > 0) scheduleReconnect()
  }

  socket.onerror = () => {
    // 错误细节由 onclose 统一处理（关闭后触发重连）
    socket?.close()
  }

  state = 'open'
  reconnectDelay = RECONNECT_DELAY_MIN
  notifyState()
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
 * 通知连接状态监听者。
 */
function notifyState(): void {
  stateListeners.forEach((listener) => listener(state))
}

/**
 * 订阅站内信推送；首个订阅者触发建连。
 * @param listener 推送回调
 * @returns 退订函数（最后一个退订者会关闭连接）
 */
export function subscribeMessagePush(listener: MessagePushListener): () => void {
  listeners.add(listener)
  disposed = false
  if (!socket && !reconnectTimer) connect()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      disposed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      socket?.close()
      socket = null
      state = 'idle'
      notifyState()
    }
  }
}

/**
 * 订阅连接状态变化（可选，调试/状态展示用）。
 */
export function subscribeMessageSocketState(listener: (state: MessageSocketState) => void): () => void {
  stateListeners.add(listener)
  listener(state)
  return () => {
    stateListeners.delete(listener)
  }
}
