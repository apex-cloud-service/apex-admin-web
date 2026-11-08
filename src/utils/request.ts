/**
 * Axios 请求封装
 * ------------------------------------------------------------------
 * 统一处理：
 *   1. 请求拦截：注入 Bearer Token
 *   2. 响应拦截：解包 Result{code,msg,data,traceId}
 *   3. 401 处理：自动刷新令牌（并发单飞）并单次重放；失败才清除会话并跳转登录页（保留回跳地址）
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
    // 仅当登录响应返回过 tenantId 时携带，值与服务端签发一致，不会触发 403。
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

/** 响应拦截：统一解包 Result 结构 */
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
    const authEndpoint = path === '/api/v1/auth/refresh' || path === '/api/v1/auth/login' || path === '/oauth2/token'
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
      handleUnauthorized()
      return Promise.reject(new ApiError('登录状态已失效，请重新登录', status))
    }
    const msg = error.response?.data?.msg || error.message || '网络异常，请稍后重试'
    return Promise.reject(new ApiError(msg, status || -1))
  },
)

/**
 * 通用请求方法（解包后的业务数据）。
 * @param config axios 请求配置
 * @returns 后端 Result.data 业务数据
 */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return service.request(config) as Promise<T>
}

/**
 * GET 请求快捷方法。
 * @param url 请求地址
 * @param params 查询参数
 */
export function get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'GET', url, params })
}

/**
 * POST 请求快捷方法。
 * @param url 请求地址
 * @param data 请求体
 * @param config 附加 Axios 配置（如自定义 headers）
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
 * @param data 请求体
 */
export function put<T = unknown>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'PUT', url, data })
}

/**
 * DELETE 请求快捷方法。
 * @param url 请求地址
 * @param params 查询参数
 */
export function del<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'DELETE', url, params })
}

/**
 * 统一错误提示（业务异常展示 traceId 便于排障）。
 * @param error 捕获的异常对象
 * @param defaultMsg 自定义默认错误提示
 */
export function showError(error: unknown, defaultMsg?: string): void {
  if (error instanceof ApiError) {
    const trace = error.traceId ? `（traceId: ${error.traceId}）` : ''
    ElMessage.error(`${error.message}${trace}`)
  } else {
    ElMessage.error(defaultMsg || '操作失败，请稍后重试')
  }
}
