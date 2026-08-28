/**
 * 认证相关 API
 * ------------------------------------------------------------------
 * 覆盖：图形验证码、账号密码登录、登出、角色/权限查询。
 */
import { get, post } from '@/utils/request'
import type { CaptchaVO, LoginResult } from '@/types'

/** 登录请求体 */
export interface LoginPayload {
  /** 登录类型：PASSWORD=账号密码（管理后台固定使用） */
  loginType?: string
  /** 登录账号（sys_user.username） */
  username?: string
  /** 登录密码（BCrypt 哈希比对） */
  password?: string
  /** 图形验证码 ID（登录前先调用 getCaptcha） */
  captchaId?: string
  /** 图形验证码内容 */
  captchaCode?: string
  /** 设备标识（Token 刷新时校验设备一致性） */
  deviceId?: string
  /** 客户端平台标识 */
  platform?: string
}

/**
 * 获取图形验证码。
 * @returns 验证码 ID 与 Base64 PNG 图片（前端拼接 data:image/png;base64, 前缀展示）
 */
export function getCaptcha(): Promise<CaptchaVO> {
  return get<CaptchaVO>('/api/v1/auth/captcha')
}

/**
 * 账号密码登录。
 * @param payload 登录参数（含验证码）
 * @returns 访问令牌信息
 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return post<LoginResult>('/api/v1/auth/login', {
    loginType: 'PASSWORD',
    ...payload,
  })
}

/**
 * 退出登录（服务端失效 Token，需携带登录态）。
 */
export function logout(): Promise<void> {
  return post<void>('/api/v1/auth/logout')
}

/**
 * 查询当前用户角色码集合。
 * @returns 角色码数组（如 ["admin"]）
 */
export function getMyRoles(): Promise<string[]> {
  return get<string[]>('/api/v1/auth/roles/my')
}

/**
 * 查询当前用户权限码集合。
 * @returns 权限码数组（如 ["system:user:list"]）
 */
export function getMyPermissions(): Promise<string[]> {
  return get<string[]>('/api/v1/auth/permissions/my')
}
