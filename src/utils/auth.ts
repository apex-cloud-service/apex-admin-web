/**
 * 认证工具函数
 * ------------------------------------------------------------------
 * 封装 Token 和用户身份信息的本地存储管理。
 * 
 * 存储键：
 *   - apex.admin.token - 访问令牌（有效期较短，如 2 小时）
 *   - apex.admin.refresh-token - 刷新令牌（有效期较长，如 7 天）
 *   - apex.admin.identity - 用户身份信息（缓存用户信息和权限）
 *   - apex.admin.tenant-id - 当前租户 ID（登录响应返回 tenantId 时记录）
 */

import { TOKEN_KEY, REFRESH_TOKEN_KEY, IDENTITY_KEY, TENANT_ID_KEY } from '@/settings'
import type { UserIdentity } from '@/types'

/**
 * 获取访问令牌
 * 
 * @returns 访问令牌字符串，未登录返回空字符串
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 保存访问令牌
 * 
 * @param token 访问令牌
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除访问令牌
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 获取刷新令牌
 * 
 * @returns 刷新令牌字符串，不存在返回空字符串
 */
export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

/**
 * 保存刷新令牌
 * 
 * @param token 刷新令牌
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

/**
 * 移除刷新令牌
 */
export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * 获取用户身份信息
 * 
 * @returns 已存身份缓存；键缺失或 JSON 解析失败时 null，不表示当前登录有效
 * 本函数不检查令牌；Storage 访问异常可能向外抛出。
 */
export function getIdentity(): UserIdentity | null {
  const identity = localStorage.getItem(IDENTITY_KEY)
  if (!identity) return null
  try {
    return JSON.parse(identity)
  } catch {
    return null
  }
}

/**
 * 保存用户身份信息
 * 
 * @param identity 用户身份对象
 */
export function setIdentity(identity: UserIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

/**
 * 获取当前租户 ID
 *
 * @returns 租户 ID 字符串，未记录返回空字符串
 */
export function getTenantId(): string {
  return localStorage.getItem(TENANT_ID_KEY) || ''
}

/**
 * 保存当前租户 ID（登录响应返回 tenantId 时调用）
 *
 * @param tenantId 租户 ID
 */
export function setTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_ID_KEY, tenantId)
}

/**
 * 移除当前租户 ID
 */
export function removeTenantId(): void {
  localStorage.removeItem(TENANT_ID_KEY)
}

/**
 * 移除用户身份信息
 */
export function removeIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY)
}

/**
 * 清理所有会话信息
 * 
 * @description 登出或会话失效时调用，清理所有本地存储的认证信息
 */
export function clearSession(): void {
  removeToken()
  removeRefreshToken()
  removeIdentity()
  removeTenantId()
}
