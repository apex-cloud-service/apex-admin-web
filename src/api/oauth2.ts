/**
 * OAuth2 认证 API
 * ------------------------------------------------------------------
 * 覆盖：标准 OAuth2 授权码流程、用户授权同意、第三方社交登录（微信/GitHub 等）
 * 
 * 后端接口：
 *   - GET  /oauth2/authorize - 授权端点（获取授权码；无有效同意记录时返回 consent_required）
 *   - POST /oauth2/consent   - 记录/撤销用户授权同意（表单提交，需已登录）
 *   - POST /oauth2/token     - Token 端点（授权码换取 Token）
 *   - GET  /oauth2/userinfo  - 获取已授权用户信息
 *   - POST /api/v1/auth/social/* - 第三方社交登录
 */
import { get, post, request as sendRequest } from '@/utils/request'
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
  clientId: string
  /** 客户端密钥 */
  clientSecret?: string
  /** PKCE 验证码（如启用 PKCE） */
  codeVerifier: string
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
export async function buildAuthUrl(config: OAuth2Config): Promise<string> {
  if (!config.clientId) throw new Error("未配置 OAuth2 客户端 ID")
  const codeVerifier = generateState() + generateState()
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const state = config.state || generateState()
  sessionStorage.setItem('oauth2_state', state)
  sessionStorage.setItem('oauth2_context', JSON.stringify({ clientId: config.clientId, redirectUri: config.redirectUri, codeVerifier }))

  const params = new URLSearchParams({
    code_challenge: challenge,
    code_challenge_method: 'S256',
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
export async function exchangeToken(request: OAuth2TokenRequest): Promise<LoginResult> {
  const data = new URLSearchParams({
    grant_type: request.grantType,
    code: request.code,
    redirect_uri: request.redirectUri,
    client_id: request.clientId,
    code_verifier: request.codeVerifier,
  })
  const result = await sendRequest<{ access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }>({
    method: 'POST', url: '/oauth2/token', data: data.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!result.access_token) throw new Error('授权响应缺少访问令牌')
  return { accessToken: result.access_token, refreshToken: result.refresh_token, tokenType: result.token_type, expiresIn: result.expires_in }
}

/**
 * 校验并消费一次性授权上下文（state 防 CSRF）。
 * 上下文在读取后立即从 sessionStorage 删除：无论校验是否通过均只能消费一次（防重放/伪造回调）。
 * @param state 回调携带的 state 参数
 * @returns 校验通过时返回 clientId / redirectUri / codeVerifier，否则返回 null
 */
export function consumeAuthorization(state: string): Pick<OAuth2TokenRequest, 'clientId' | 'redirectUri' | 'codeVerifier'> | null {
  const raw = sessionStorage.getItem('oauth2_context')
  sessionStorage.removeItem('oauth2_context')
  if (!verifyState(state) || !raw) return null
  try {
    const context = JSON.parse(raw)
    if (typeof context.clientId !== 'string' || !context.clientId || typeof context.redirectUri !== 'string' || typeof context.codeVerifier !== 'string') return null
    return context
  } catch {
    return null
  }
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

/**
 * 授权同意提交参数
 */
export interface ConsentPayload {
  /** 客户端 ID */
  clientId: string
  /** 申请/同意的 scope（空格分隔，缺省沿用授权请求） */
  scope?: string
  /** approve=同意；deny=拒绝并撤销既有同意 */
  decision: 'approve' | 'deny'
}

/**
 * 提交用户授权同意（表单提交，后端按 decision 记录或撤销同意）。
 * 端点要求已登录主体；成功返回 { consented: boolean }。
 * @param payload 客户端、scope 与决定
 */
export function submitConsent(payload: ConsentPayload): Promise<{ consented: boolean }> {
  const form = new URLSearchParams({
    client_id: payload.clientId,
    decision: payload.decision,
  })
  if (payload.scope) form.append('scope', payload.scope)
  return sendRequest<{ consented: boolean }>({
    method: 'POST',
    url: '/oauth2/consent',
    data: form.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
