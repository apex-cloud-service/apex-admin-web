/**
 * 用户会话状态
 * ------------------------------------------------------------------
 * 管理 Token、当前用户身份与登录/登出动作。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, setRefreshToken, clearSession, setIdentity, getIdentity, setTenantId, getTenantId, removeTenantId } from '@/utils/auth'
import { login as loginApi, logout as logoutApi, getMyPermissions, getMyRoles, verifyMfaChallenge as verifyMfaChallengeApi } from '@/api/auth'
import { getCurrentUserInfo } from '@/api/user'
import type { LoginResult, UserIdentity } from '@/types'

/** 登录参数（透传给认证 API） */
export interface LoginParams {
  username: string
  password: string
  captchaId: string
  captchaCode: string
  /** 租户 ID 声明（可选，仅认证中心登录链路使用） */
  tenantId?: string
}

/** 用户会话 Store：管理 Token、身份信息与登录/登出动作 */
export const useUserStore = defineStore('user', () => {
  /** 访问令牌（初始化时从本地缓存恢复） */
  const token = ref<string>(getToken())

  /** 当前用户身份信息 */
  const identity = ref<UserIdentity | null>(getIdentity())

  /** 当前用户权限码集合（按钮级权限判断依据） */
  const permissions = ref<string[]>([])

  /** 会话是否已加载完成（登录后身份初始化） */
  const initialized = ref(false)

  /**
   * 账号密码登录并初始化身份（管理后台入口）。
   * 正式令牌响应先写入会话，再加载身份；身份加载失败向调用方抛出，当前方法不回滚令牌。
   * @param params 登录参数（含图形验证码；当前认证中心不校验验证码字段）
   * @returns 登录响应；mfaRequired=true 时不写入会话，须调用 verifyMfaChallenge 完成二步验证
   */
  async function login(params: LoginParams): Promise<LoginResult> {
    const result = await loginApi({
      username: params.username,
      password: params.password,
      captchaId: params.captchaId,
      captchaCode: params.captchaCode,
      deviceId: 'apex-admin-web',
      platform: 'web',
      tenantId: params.tenantId,
    })
    // MFA 挑战模式：后端仅返回短 TTL challengeToken，不签发正式令牌，也不写会话
    if (result.mfaRequired) return result
    await applyLoginResult(result)
    return result
  }

  /**
   * MFA 二步验证：交换正式令牌后写入会话并加载身份。
   * 身份初始化失败仍向调用方抛出；本方法不负责回滚已写入的令牌。
   * @param challengeToken 登录响应返回的挑战凭据
   * @param code 6 位 TOTP 验证码
   * @returns 身份初始化完成后的正式登录响应
   */
  async function verifyMfaChallenge(challengeToken: string, code: string): Promise<LoginResult> {
    const result = await verifyMfaChallengeApi(challengeToken, code)
    await applyLoginResult(result)
    return result
  }

  /**
   * 写入会话令牌并加载身份（登录与 MFA 二步共用）。
   * 先清除旧租户标识再保存响应中的 tenantId；未返回 refreshToken 时保留已有刷新令牌。
   * 身份请求失败不会撤销已写入的会话；调用方收到拒绝后自行决定恢复或清理。
   * @param result 含正式令牌的登录响应
   * @returns 身份、权限与 initialized 状态更新完成
   */
  async function applyLoginResult(result: LoginResult): Promise<void> {
    token.value = result.accessToken
    setToken(result.accessToken)
    if (result.refreshToken) setRefreshToken(result.refreshToken)
    // 刷新租户记录：先清除上次会话残留，避免新令牌租户与旧请求头不一致（403）
    removeTenantId()
    if (result.tenantId) setTenantId(result.tenantId)
    // 登录成功后拉取身份与权限
    await loadIdentity()
  }

  /**
   * 拉取并合并当前用户信息、角色码与权限码（登录与页面刷新共用）。
   * 三个请求并行：角色或权限请求失败降级为空数组，用户信息失败则拒绝并保留当前状态。
   * 仅在用户信息成功返回后更新 identity、permissions 与 initialized；空权限数组不代表已授权，
   * 当前前端权限检查会对空数组放行，服务端接口仍须独立鉴权。
   * @returns 身份合并并持久化完成；权限与角色来自各自的“我的”接口
   */
  async function loadIdentity(): Promise<void> {
    const [info, roles, perms] = await Promise.all([
      getCurrentUserInfo(),
      getMyRoles().catch(() => [] as string[]),
      getMyPermissions().catch(() => [] as string[]),
    ])
    identity.value = {
      ...info,
      // 兼容旧字段：UserDTO 无 username，回退为手机号/昵称
      username: info.username || info.nickName || info.phone || '',
      nickname: info.nickname || info.nickName || '',
      roles,
      permissions: perms,
      // 租户 ID 来自登录响应（后端 /user/info 不返回该字段）
      tenantId: getTenantId() || undefined,
    }
    setIdentity(identity.value)
    permissions.value = perms
    initialized.value = true
  }

  /**
   * 退出登录：尝试通知服务端，再清空本地会话。
   * 服务端请求失败被吞掉，finally 仍调用 clearLocal；本地退出不保证服务端撤销成功。
   * @returns 本地令牌、身份、权限及初始化标记清理完成
   */
  async function logout(): Promise<void> {
    try {
      await logoutApi()
    } catch {
      // 服务端登出失败不阻塞本地清理
    } finally {
      clearLocal()
    }
  }

  /**
   * 清空本地会话状态（会话失效/登出统一入口）。
   */
  function clearLocal(): void {
    clearSession()
    token.value = ''
    identity.value = null
    permissions.value = []
    initialized.value = false
  }

  const userInfo = computed(() => identity.value)

  return {
    token,
    identity,
    permissions,
    initialized,
    login,
    verifyMfaChallenge,
    loadIdentity,
    logout,
    clearLocal,
    userInfo
  }
})
