/**
 * 错误处理工具
 * 提供统一的错误处理和用户提示
 */
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { ElNotification } from 'element-plus/es/components/notification/index.mjs'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  API = 'API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public traceId?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = ErrorType.API
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends Error {
  constructor(message: string = '网络连接失败') {
    super(message)
    this.name = ErrorType.NETWORK
  }
}

/**
 * 超时错误类
 */
export class TimeoutError extends Error {
  constructor(message: string = '请求超时') {
    super(message)
    this.name = ErrorType.TIMEOUT
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message)
    this.name = ErrorType.VALIDATION
  }
}

/**
 * 授权错误类
 */
export class AuthorizationError extends Error {
  constructor(message: string = '无权访问') {
    super(message)
    this.name = ErrorType.AUTHORIZATION
  }
}

/**
 * 错误处理配置
 */
export interface ErrorHandlerOptions {
  /** 是否显示错误提示 */
  showMessage?: boolean
  /** 是否使用通知而非消息 */
  useNotification?: boolean
  /** 消息显示时长（毫秒） */
  duration?: number
  /** 是否在控制台打印错误 */
  logToConsole?: boolean
  /** 接收原始错误值（类型断言不保证为 Error）；仅返回 false 停止默认提示，true/undefined 继续处理 */
  customHandler?: (error: Error) => boolean | void
}

const defaultOptions: ErrorHandlerOptions = {
  showMessage: true,
  useNotification: false,
  duration: 5000,
  logToConsole: true
}

/**
 * 统一错误处理
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const opts = { ...defaultOptions, ...options }

  // 打印到控制台
  if (opts.logToConsole) {
    console.error('[错误处理]', error)
  }

  // 自定义处理器
  if (opts.customHandler) {
    const handled = opts.customHandler(error as Error)
    if (handled === false) {
      return
    }
  }

  // 不显示提示
  if (!opts.showMessage) {
    return
  }

  let message = '操作失败，请稍后重试'
  let type: 'error' | 'warning' | 'info' = 'error'

  // 根据错误类型处理
  if (error instanceof ApiError) {
    message = error.message
    if (error.traceId) {
      message += ` (TraceID: ${error.traceId})`
    }
    
    // 特殊状态码处理
    if (error.code === 401) {
      message = '登录已过期，请重新登录'
      type = 'warning'
      // 401 的会话清理与跳转由 utils/request.ts 拦截器统一处理，此处仅负责提示文案
    } else if (error.code === 403) {
      message = '无权访问该资源'
      type = 'warning'
    } else if (error.code === 404) {
      message = '请求的资源不存在'
      type = 'warning'
    } else if (error.code >= 500) {
      message = '服务器错误，请稍后重试'
    }
  } else if (error instanceof NetworkError) {
    message = '网络连接失败，请检查网络设置'
  } else if (error instanceof TimeoutError) {
    message = '请求超时，请稍后重试'
  } else if (error instanceof ValidationError) {
    message = error.message
    type = 'warning'
  } else if (error instanceof AuthorizationError) {
    message = error.message
    type = 'warning'
  } else if (error instanceof Error) {
    message = error.message || '操作失败'
  }

  // 显示提示
  if (opts.useNotification) {
    ElNotification({
      title: '错误提示',
      message,
      type,
      duration: opts.duration
    })
  } else {
    ElMessage({
      message,
      type,
      duration: opts.duration
    })
  }
}

/**
 * 异步函数错误包装器
 * 自动捕获并统一提示异步函数中的错误；处理后仍抛出原错误，调用方仍需自行 catch
 */
export function withErrorHandling<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options?: ErrorHandlerOptions
): (...args: A) => Promise<R> {
  return (async (...args: A) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, options)
      throw error
    }
  }) as (...args: A) => Promise<R>
}

/**
 * 从请求层异常中提取业务码，用于判定是否可重试。
 * request.ts 与本地各导出一个 ApiError，两者构造器不同，不能只依赖 instanceof；
 * 这里统一按 name 与数字 code 结构识别（request.ts 的 name 为 'ApiError'）。
 */
function resolveErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { name?: unknown; code?: unknown }
  if (candidate.name !== 'ApiError' && candidate.name !== ErrorType.API) return undefined
  return typeof candidate.code === 'number' ? candidate.code : undefined
}

/**
 * 判断错误是否属于"不可重试"的客户端错误（4xx）。
 * 401/403/404 及其他 4xx 均不应重试：重试无法改变鉴权或资源不存在的结论。
 */
function isNonRetryableClientError(error: unknown): boolean {
  const code = resolveErrorCode(error)
  return code !== undefined && code >= 400 && code < 500
}

/** 仅允许网络/超时或 HTTP 5xx 重试，未知错误与业务校验错误不自动重试。 */
function isRetryableError(error: unknown): boolean {
  const code = resolveErrorCode(error)
  if (code !== undefined) {
    // request.ts 对无 HTTP 状态的网络错误抛 ApiError(msg, -1)；仅负值按网络类重试，
    // code=0 是成功码，不应出现在异常中（若出现也按不可重试处理）
    if (code < 0) return true
    return code >= 500 && code < 600
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) return true
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; name?: unknown }
  return candidate.name === ErrorType.NETWORK || candidate.name === ErrorType.TIMEOUT ||
    (typeof candidate.code === 'string' &&
      ['ERR_NETWORK', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT'].includes(candidate.code))
}

/**
 * 网络请求重试（可选指数退避）。
 *
 * 仅用于幂等读取；非幂等写请求（创建/更新/删除/支付等）禁止使用本函数，
 * 即使传入 shouldRetry 也不应放行写请求失败重试。
 *
 * 默认仅重试网络/超时及 5xx；4xx、未知错误、业务校验错误均立即抛出。
 * shouldRetry 只能进一步收窄，不得放行默认不可重试错误。
 *
 * @param requestFn 返回 Promise 的请求函数（必须幂等）
 * @param maxRetries 最大尝试次数（含首次调用，默认 3 = 首次 + 2 次重试）
 * @param delay 重试基础间隔（毫秒，默认 1000；指数退避时为 delay × 2^已失败次数）
 * @param exponentialBackoff 是否指数退避（默认 true）
 * @param shouldRetry 可选的额外判定；返回 false 时立即抛出，不再重试
 * @returns 任一次尝试成功时的响应数据
 * @throws Error 4xx、shouldRetry 拒绝或全部尝试失败时抛出对应原始错误
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  exponentialBackoff: boolean = true,
  shouldRetry?: (error: unknown) => boolean
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      // 最后一次重试失败，抛出错误
      if (i === maxRetries - 1) {
        throw error
      }

      // 4xx 不重试：识别 request.ts 与本地两种 ApiError 构造器
      if (isNonRetryableClientError(error)) {
        throw error
      }

      if (!isRetryableError(error) || (shouldRetry && !shouldRetry(error))) {
        throw error
      }

      // 计算延迟时间
      const waitTime = exponentialBackoff 
        ? delay * Math.pow(2, i)
        : delay

      console.log(`[重试] 第 ${i + 1} 次重试，等待 ${waitTime}ms...`)
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw new Error('重试次数已用尽')
}

/**
 * 创建供 Vue 3 组件显式接入的 errorCaptured 钩子。
 * @param onError 错误回调，info 当前固定为空串，不透传 Vue 的错误信息参数
 * @returns 正常处理后返回 false 的钩子对象，阻止错误继续向父级传播
 */
export function createErrorBoundary(
  onError: (error: Error, info: string) => void
) {
  return {
    errorCaptured(error: Error) {
      onError(error, '')
      handleError(error, {
        showMessage: true,
        logToConsole: true
      })
      // 返回 false 阻止错误继续传播
      return false
    }
  }
}

/**
 * 导出所有错误类和工具
 */
export default {
  ErrorType,
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
  AuthorizationError,
  handleError,
  withErrorHandling,
  retryRequest,
  createErrorBoundary
}
