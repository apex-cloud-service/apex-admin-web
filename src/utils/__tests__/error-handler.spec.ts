/**
 * 错误处理工具单元测试
 * ------------------------------------------------------------------
 * 覆盖各类错误的提示映射与 traceId 追加、自定义处理器短路、
 * withErrorHandling 包装、retryRequest 重试与不可重试错误。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  AuthorizationError,
  ErrorType,
  NetworkError,
  TimeoutError,
  ValidationError,
  createErrorBoundary,
  handleError,
  retryRequest,
  withErrorHandling,
} from '@/utils/error-handler'

const { elMessageMock, elNotificationMock } = vi.hoisted(() => ({
  elMessageMock: vi.fn(),
  elNotificationMock: vi.fn(),
}))

vi.mock('element-plus/es/components/message/index.mjs', () => ({ ElMessage: elMessageMock }))
vi.mock('element-plus/es/components/notification/index.mjs', () => ({ ElNotification: elNotificationMock }))

describe('handleError 提示映射', () => {
  beforeEach(() => {
    elMessageMock.mockClear()
    elNotificationMock.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ApiError 透传 message 并追加 traceId', () => {
    handleError(new ApiError(400, '参数错误', 'trace-1'))

    expect(elMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: '参数错误 (TraceID: trace-1)', type: 'error' }),
    )
  })

  it('401/403/404 映射为 warning 文案', () => {
    handleError(new ApiError(401, '任意原始信息'))
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '登录已过期，请重新登录', type: 'warning' }),
    )

    handleError(new ApiError(403, '任意原始信息'))
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '无权访问该资源', type: 'warning' }),
    )

    handleError(new ApiError(404, '任意原始信息'))
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '请求的资源不存在', type: 'warning' }),
    )
  })

  it('5xx 映射为服务器错误文案', () => {
    handleError(new ApiError(502, '网关异常'))
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '服务器错误，请稍后重试', type: 'error' }),
    )
  })

  it('网络/超时/验证/授权错误各自映射', () => {
    handleError(new NetworkError())
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '网络连接失败，请检查网络设置' }),
    )

    handleError(new TimeoutError())
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '请求超时，请稍后重试' }),
    )

    handleError(new ValidationError('字段必填', 'name'))
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '字段必填', type: 'warning' }),
    )

    handleError(new AuthorizationError())
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '无权访问', type: 'warning' }),
    )
  })

  it('普通 Error 透传 message；未知值走默认文案', () => {
    handleError(new Error('boom'))
    expect(elMessageMock).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'boom' }))

    handleError('strange')
    expect(elMessageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: '操作失败，请稍后重试' }),
    )
  })

  it('showMessage=false 与 customHandler 返回 false 均不弹提示', () => {
    handleError(new Error('boom'), { showMessage: false })
    expect(elMessageMock).not.toHaveBeenCalled()

    const custom = vi.fn(() => false)
    handleError(new Error('boom'), { customHandler: custom })
    expect(custom).toHaveBeenCalled()
    expect(elMessageMock).not.toHaveBeenCalled()
  })

  it('logToConsole=false 不打印控制台', () => {
    const errorSpy = vi.spyOn(console, 'error')
    handleError(new Error('boom'), { logToConsole: false })
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('useNotification 走通知通道并透传时长', () => {
    handleError(new Error('boom'), { useNotification: true, duration: 2000 })
    expect(elNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom', duration: 2000 }),
    )
    expect(elMessageMock).not.toHaveBeenCalled()
  })

  it('错误类 name 与 ErrorType 枚举一致', () => {
    expect(new ApiError(1, 'x').name).toBe(ErrorType.API)
    expect(new NetworkError().name).toBe(ErrorType.NETWORK)
    expect(new TimeoutError().name).toBe(ErrorType.TIMEOUT)
    expect(new ValidationError('x').name).toBe(ErrorType.VALIDATION)
    expect(new AuthorizationError().name).toBe(ErrorType.AUTHORIZATION)
  })
})

describe('withErrorHandling', () => {
  it('成功时透传返回值与参数', async () => {
    const fn = vi.fn(async (a: number, b: number) => a + b)
    const wrapped = withErrorHandling(fn)

    await expect(wrapped(1, 2)).resolves.toBe(3)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('失败时执行 handleError 并继续抛出', async () => {
    elMessageMock.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapped = withErrorHandling(async () => {
      throw new ApiError(500, 'server down')
    })

    await expect(wrapped()).rejects.toThrow('server down')
    expect(elMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: '服务器错误，请稍后重试' }),
    )
    vi.restoreAllMocks()
  })
})

describe('retryRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('瞬时失败按指数退避重试后成功', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('t1'))
      .mockRejectedValueOnce(new NetworkError('t2'))
      .mockResolvedValue('ok')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const promise = retryRequest(fn, 3, 1000)
    await vi.advanceTimersByTimeAsync(3000)

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('ApiError 401/403/404 不重试直接抛出', async () => {
    for (const code of [401, 403, 404]) {
      const fn = vi.fn().mockRejectedValue(new ApiError(code, 'x'))
      await expect(retryRequest(fn, 3, 1000)).rejects.toThrow('x')
      expect(fn).toHaveBeenCalledTimes(1)
    }
  })

  it('识别 request.ts 的 ApiError（不同构造器、同名不同类）并跳过 4xx 重试', async () => {
    // 模拟 request.ts 抛出的异常：name='ApiError'，非本地类实例
    const foreign = Object.assign(new Error('token expired'), { name: 'ApiError', code: 401 })
    const fn = vi.fn().mockRejectedValue(foreign)

    await expect(retryRequest(fn, 3, 1000)).rejects.toThrow('token expired')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('其他 4xx（如 409/422）同样不重试', async () => {
    for (const code of [409, 422]) {
      const foreign = Object.assign(new Error('conflict'), { name: 'ApiError', code })
      const fn = vi.fn().mockRejectedValue(foreign)
      await expect(retryRequest(fn, 3, 1000)).rejects.toThrow('conflict')
      expect(fn).toHaveBeenCalledTimes(1)
    }
  })

  it('5xx 继续重试', async () => {
    const foreign = Object.assign(new Error('server error'), { name: 'ApiError', code: 500 })
    const fn = vi.fn().mockRejectedValueOnce(foreign).mockResolvedValueOnce('ok')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const promise = retryRequest(fn, 3, 1000)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('shouldRetry 返回 false 时立即停止重试', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('offline'))
    await expect(
      retryRequest(fn, 3, 1000, true, () => false),
    ).rejects.toThrow('offline')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('未知错误默认不重试，即使调用方谓词返回 true', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('validation failed'))
    await expect(retryRequest(fn, 3, 1000, true, () => true)).rejects.toThrow('validation failed')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('request.ts 的网络错误（code=-1）按网络类重试', async () => {
    const foreign = Object.assign(new Error('Network Error'), { name: 'ApiError', code: -1 })
    const fn = vi.fn().mockRejectedValueOnce(foreign).mockResolvedValueOnce('ok')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const promise = retryRequest(fn, 3, 1000)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('shouldRetry 不能放行 4xx', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError(403, 'forbidden'))
    await expect(retryRequest(fn, 3, 1000, true, () => true)).rejects.toThrow('forbidden')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('重试次数用尽后抛出最后一次错误', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('always-fail'))
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const promise = retryRequest(fn, 3, 1000)
    // 先挂上 rejects 断言再推进假时钟，避免拒绝在断言前落入 unhandledRejection
    const assertion = expect(promise).rejects.toThrow('always-fail')
    await vi.advanceTimersByTimeAsync(3000)

    await assertion
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('createErrorBoundary', () => {
  it('errorCaptured 通知回调、处理错误并阻止传播', () => {
    elMessageMock.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()
    const boundary = createErrorBoundary(onError)
    const error = new Error('component boom')

    const result = boundary.errorCaptured(error)

    expect(onError).toHaveBeenCalledWith(error, '')
    expect(elMessageMock).toHaveBeenCalled()
    expect(result).toBe(false)
    vi.restoreAllMocks()
  })
})
