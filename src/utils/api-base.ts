/**
 * 接口地址工具
 * ------------------------------------------------------------------
 * 与 Axios 请求层（utils/request.ts 的 baseURL）同一来源：
 * 同域部署基地址为空（相对路径），跨域部署取 VITE_API_BASE_URL，并去掉尾部斜杠。
 * 供不走请求层的原生 fetch（SSE）与 Element Plus/XHR 上传拼接地址，避免各自实现漂移。
 */

/** 接口基地址（不带尾部斜杠） */
export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

/**
 * 拼接接口完整地址。
 * @param path 以 / 开头的接口路径（如 /api/v1/files/generic）
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl()}${normalized}`
}
