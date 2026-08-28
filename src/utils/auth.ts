/**
 * 会话与身份信息本地存取工具
 * ------------------------------------------------------------------
 * 负责 Token / 用户身份 / 权限集合的 localStorage 读写，
 * 供 store 层与请求层共用。
 */
import { TOKEN_KEY, IDENTITY_KEY } from '@/settings'
import type { UserIdentity } from '@/types'

/**
 * 读取本地 Token。
 * @returns 当前 Token，无会话时返回空字符串
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 保存 Token。
 * @param token 登录/刷新后返回的访问令牌
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 清除 Token（登出或会话失效时调用）。
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 读取本地缓存的用户身份信息。
 * @returns 反序列化后的身份对象，无缓存时返回 null
 */
export function getIdentity(): UserIdentity | null {
  const raw = localStorage.getItem(IDENTITY_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserIdentity
  } catch {
    // 缓存损坏时兜底清除
    removeIdentity()
    return null
  }
}

/**
 * 保存用户身份信息（含角色与权限集合）。
 * @param identity 当前登录用户身份
 */
export function setIdentity(identity: UserIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

/**
 * 清除用户身份缓存。
 */
export function removeIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY)
}

/**
 * 清空全部会话信息（登出/会话失效统一入口）。
 */
export function clearSession(): void {
  removeToken()
  removeIdentity()
}
