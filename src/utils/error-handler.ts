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
  /** 自定义错误处理器 */
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
 * 网络请求重试（可选指数退避）。
 * @param requestFn 返回 Promise 的请求函数
 * @param maxRetries 最大尝试次数（含首次调用，默认 3 = 首次 + 2 次重试）
 * @param delay 重试基础间隔（毫秒，默认 1000；指数退避时为 delay × 2^已失败次数）
 * @param exponentialBackoff 是否指数退避（默认 true）
 * @returns 任一次尝试成功时的响应数据
 * @throws ApiError 401/403/404 等不可重试错误立即抛出；全部尝试失败时抛出最后一次的原错误
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  exponentialBackoff: boolean = true
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      // 最后一次重试失败，抛出错误
      if (i === maxRetries - 1) {
        throw error
      }

      // 某些错误不应该重试（如 401、403、404）
      if (error instanceof ApiError) {
        if ([401, 403, 404].includes(error.code)) {
          throw error
        }
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
 * 错误边界组件辅助函数（用于 Vue 3）
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
