/**
 * OAuth2 认证 API
 * ------------------------------------------------------------------
 * 覆盖：标准 OAuth2 授权码流程、第三方社交登录（微信/GitHub 等）
 * 
 * 后端接口：
 *   - GET /oauth2/authorize - 授权端点（获取授权码）
 *   - POST /oauth2/token - Token 端点（授权码换取 Token）
 *   - GET /oauth2/userinfo - 获取已授权用户信息
 *   - POST /api/v1/auth/social/* - 第三方社交登录
 */
import { get, post } from '@/utils/request'
import type { LoginResult } from '@/types'

/**
 * OAuth2 授权配置
 */
export interface OAuth2Config {
  /** 客户端 ID */
  clientId: string
  /** 回调地址 */
  redirectUri: string
  /** 授权范围（空格分隔） */
  scope: string
  /** 防 CSRF 攻击的状态码（可选，未传则自动生成） */
  state?: string
  /** 授权提示类型：none=静默授权 / consent=强制重新授权 / select_account=选择账号 */
  prompt?: 'none' | 'consent' | 'select_account'
}

/**
 * OAuth2 Token 请求参数
 */
export interface OAuth2TokenRequest {
  /** 授权类型，固定为 authorization_code */
  grantType: 'authorization_code'
  /** 授权码（从授权端点回调获取） */
  code: string
  /** 回调地址（必须与授权时一致） */
  redirectUri: string
  /** 客户端 ID */
  clientId?: string
  /** 客户端密钥 */
  clientSecret?: string
  /** PKCE 验证码（如启用 PKCE） */
  codeVerifier?: string
}

/**
 * 社交登录请求参数
 */
export interface SocialLoginRequest {
  /** 社交平台类型：wechat / github / google 等 */
  provider: string
  /** 第三方平台返回的授权码 */
  code: string
  /** 第三方平台的 state 参数（防 CSRF） */
  state?: string
}

/**
 * 生成随机状态码（防 CSRF 攻击）
 * @returns 32 位随机字符串
 */
function generateState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 构造 OAuth2 授权 URL
 * @param config OAuth2 配置
 * @returns 授权页面 URL
 */
export function buildAuthUrl(config: OAuth2Config): string {
  const state = config.state || generateState()
  sessionStorage.setItem('oauth2_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  })

  if (config.prompt) {
    params.append('prompt', config.prompt)
  }

  return `/oauth2/authorize?${params.toString()}`
}

/**
 * 使用授权码换取 Access Token
 * @param request Token 请求参数
 * @returns 登录结果（包含 accessToken 和 refreshToken）
 */
export function exchangeToken(request: OAuth2TokenRequest): Promise<LoginResult> {
  return post<LoginResult>('/oauth2/token', {
    grant_type: request.grantType,
    code: request.code,
    redirect_uri: request.redirectUri,
    client_id: request.clientId,
    client_secret: request.clientSecret,
    code_verifier: request.codeVerifier,
  })
}

/**
 * 获取已授权用户信息
 * @returns 用户信息（需已登录，携带 Token）
 */
export function getUserInfo(): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>('/oauth2/userinfo')
}

/**
 * 第三方社交登录（微信/GitHub 等）
 * @param request 社交登录参数
 * @returns 登录结果
 */
export function socialLogin(request: SocialLoginRequest): Promise<LoginResult> {
  return post<LoginResult>(`/api/v1/auth/social/${request.provider}`, {
    code: request.code,
    state: request.state,
  })
}

/**
 * 验证回调 state 参数是否匹配（防 CSRF）
 * @param state 回调 URL 中的 state 参数
 * @returns true=验证通过
 */
export function verifyState(state: string): boolean {
  const savedState = sessionStorage.getItem('oauth2_state')
  sessionStorage.removeItem('oauth2_state')
  return savedState === state
}
