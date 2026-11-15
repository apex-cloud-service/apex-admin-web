/**
 * Axios 请求封装
 * ------------------------------------------------------------------
 * 统一处理：
 *   1. 请求拦截：注入 Bearer Token
 *   2. 响应拦截：解包 Result{code,msg,data,traceId}，非包装响应原样透传
 *   3. HTTP 401：符合条件时并发单飞刷新并单次重放；刷新失败或不可刷新时清理会话
 *      并跳转登录页（保留回跳地址），/auth/v1/login 的认证失败仅透传原因
 *   4. 业务错误：code !== 0 时抛出带 traceId 的错误信息
 *   5. 请求超时：默认 30s（与后端全局响应超时对齐）
 */
import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { CODE_UNAUTHORIZED, RESULT_SUCCESS } from '@/settings'
import { getRefreshToken, getToken, setRefreshToken, setToken, clearSession, getTenantId } from '@/utils/auth'
import { refreshToken } from '@/api/auth'
import type { Result } from '@/types'

/** 业务异常：携带后端错误码与链路追踪 ID */
export class ApiError extends Error {
  code: number
  traceId?: string

  constructor(message: string, code: number, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
  }
}

/** 共享的令牌刷新 Promise：并发 401 只创建一次刷新请求（单飞），完成后置空 */
let refreshPromise: Promise<string> | null = null

/** axios 实例：baseURL 支持生产环境注入网关地址 */
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
})

/** 请求拦截：注入 Bearer Token 与租户标识 */
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 租户作用域由后端从令牌解析；此头仅作匹配声明（网关会剥离重建）。
    // 仅在会话记录了 tenantId 时携带；服务端仍会校验，前端不能保证匹配声明被接受。
    const tenantId = getTenantId()
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId
    }
    return config
  },
  (error) => Promise.reject(error),
)

/** 会话失效处理：清除本地会话并跳转登录页 */
function handleUnauthorized(): void {
  clearSession()
  const current = window.location.pathname + window.location.search
  // 避免重复跳转登录页
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(current)}`
  }
}

/**
 * 从 HTTP 错误响应中提取后端提示消息。
 * 兼容三种形态：Result 包装（取 msg）、认证中心的纯文本原因（401/403 响应体即消息）、
 * 以及无响应体的网络错误（回退到 Axios message）。
 * @param error Axios 错误对象
 * @param fallback 提取不到时的默认文案
 * @returns 提取到的消息；无可用响应消息时依次回退 fallback、Axios message、空串
 */
function extractServerMessage(error: unknown, fallback = ''): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object' && typeof (data as { msg?: unknown }).msg === 'string') {
    return ((data as { msg: string }).msg || '').trim() || fallback
  }
  const axiosMsg = (error as { message?: string })?.message
  return fallback || axiosMsg || ''
}

/** 响应拦截：解包含数字 code 的 Result，裸响应原样返回 */
service.interceptors.response.use(
  (response: AxiosResponse<Result>) => {
    const newToken = response.headers['x-new-access-token']
    if (newToken) setToken(newToken)
    const result = response.data
    // HTTP 200 且业务成功（code === 0）→ 直接返回业务数据
    if (result && typeof result.code === 'number') {
      if (result.code === RESULT_SUCCESS) {
        return result.data as never
      }
      // 业务失败：抛出带错误码与 traceId 的异常
      const error = new ApiError(result.msg || '请求失败', result.code, result.traceId)
      return Promise.reject(error)
    }
    // 非标准结构（如文件流）原样返回
    return response.data as never
  },
  async (error) => {
    // HTTP 层错误处理
    const status = error.response?.status
    const config = error.config as (InternalAxiosRequestConfig & { authRetried?: boolean }) | undefined
    const path = config?.url?.split('?')[0]
    const authEndpoint =
      path === '/api/v1/auth/refresh' ||
      path === '/api/v1/auth/login' ||
      path === '/auth/v1/login' ||
      path === '/auth/v1/refresh' ||
      path === '/oauth2/token'
    if (status === CODE_UNAUTHORIZED && config && !config.authRetried && !authEndpoint && getRefreshToken()) {
      config.authRetried = true
      if (!refreshPromise) {
        refreshPromise = refreshToken(getRefreshToken()).then((result) => {
          if (!result.accessToken) throw new Error('刷新响应缺少访问令牌')
          setToken(result.accessToken)
          if (result.refreshToken) setRefreshToken(result.refreshToken)
          return result.accessToken
        }).finally(() => { refreshPromise = null })
      }
      try {
        const newToken = await refreshPromise
        config.headers.Authorization = `Bearer ${newToken}`
      } catch {
        handleUnauthorized()
        throw new ApiError('登录状态已失效，请重新登录', status)
      }
      return service.request(config)
    }
    if (status === CODE_UNAUTHORIZED) {
      // 登录端点自身失败（如密码错误）：认证中心以纯文本原因返回 401/403，
      // 向调用方透出真实原因，不触发登出清理（登录页无需跳转回登录页）
      if (path === '/auth/v1/login') {
        return Promise.reject(new ApiError(extractServerMessage(error, '登录失败，请核对账号与密码'), status))
      }
      handleUnauthorized()
      return Promise.reject(new ApiError('登录状态已失效，请重新登录', status))
    }
    const msg = extractServerMessage(error) || '网络异常，请稍后重试'
    return Promise.reject(new ApiError(msg, status || -1))
  },
)

/**
 * 通用请求方法：解包业务响应，兼容认证中心令牌等裸响应。
 * HTTP 401 仅在存在刷新令牌、未重放且不属于排除端点时刷新；业务 code 不触发刷新。
 * @param config Axios 请求配置
 * @returns 数字 code=0 时返回 Result.data；无数字 code 时返回原始 response.data
 * @throws ApiError 业务失败、HTTP 失败或网络错误；刷新成功后的重放仍保留其自身错误语义
 */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return service.request(config) as Promise<T>
}

/**
 * GET 请求快捷方法。
 * @param url 请求地址
 * @param params 查询参数（可选）
 * @returns 经统一响应拦截器解包或原样透传的数据
 */
export function get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'GET', url, params })
}

/**
 * POST 请求快捷方法。
 * @param url 请求地址
 * @param data 请求体（可选）
 * @param config 附加 Axios 配置（可选：headers、timeout、signal）
 * @returns 经统一响应拦截器解包或原样透传的数据
 */
export function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: Pick<AxiosRequestConfig, 'headers' | 'timeout' | 'signal'>,
): Promise<T> {
  return request<T>({ method: 'POST', url, data, ...config })
}

/**
 * PUT 请求快捷方法。
 * @param url 请求地址
 * @param data 请求体（可选）
 * @returns 经统一响应拦截器解包或原样透传的数据
 */
export function put<T = unknown>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'PUT', url, data })
}

/**
 * DELETE 请求快捷方法。
 * @param url 请求地址
 * @param params 查询参数（可选）
 * @returns 经统一响应拦截器解包或原样透传的数据
 */
export function del<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'DELETE', url, params })
}

/** 授权类 403 的错误关键字：命中后追加套餐订阅的定位引导 */
const AUTHORIZATION_ERROR_KEYWORDS = ['能力未开通', 'scope']

/**
 * 统一错误提示（业务异常展示 traceId 便于排障）。
 * 授权类 403（能力门禁 / scope 断言）额外提示可去能力运营页核对订阅。
 * @param error 捕获的异常对象
 * @param defaultMsg 自定义默认错误提示
 */
export function showError(error: unknown, defaultMsg?: string): void {
  if (error instanceof ApiError) {
    const trace = error.traceId ? `（traceId: ${error.traceId}）` : ''
    const hint =
      error.code === 403 && AUTHORIZATION_ERROR_KEYWORDS.some((keyword) => error.message.includes(keyword))
        ? '；可在能力运营页查看当前租户订阅'
        : ''
    ElMessage.error(`${error.message}${trace}${hint}`)
  } else {
    ElMessage.error(defaultMsg || '操作失败，请稍后重试')
  }
}
