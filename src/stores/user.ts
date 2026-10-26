/**
 * 用户会话状态
 * ------------------------------------------------------------------
 * 管理 Token、当前用户身份与登录/登出动作。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, setRefreshToken, clearSession, setIdentity, getIdentity, setTenantId, getTenantId, removeTenantId } from '@/utils/auth'
import { login as loginApi, logout as logoutApi, getMyPermissions, getMyRoles } from '@/api/auth'
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
   * 账号密码登录（管理后台入口）。
   * @param params 登录参数（含图形验证码）
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
    token.value = result.accessToken
    setToken(result.accessToken)
    if (result.refreshToken) setRefreshToken(result.refreshToken)
    // 刷新租户记录：先清除上次会话残留，避免新令牌租户与旧请求头不一致（403）
    removeTenantId()
    if (result.tenantId) setTenantId(result.tenantId)
    // 登录成功后拉取身份与权限
    await loadIdentity()
    return result
  }

  /**
   * 拉取当前用户身份信息、角色码与权限码（刷新页面后恢复会话用）。
   * 后端 GET /api/v1/user/info 仅返回 UserDTO（无 roles/permissions），
   * 角色与权限码需分别调用 /api/v1/auth/roles/my 与 /permissions/my 获取。
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
   * 退出登录：通知服务端失效 Token 并清空本地会话。
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
    loadIdentity,
    logout,
    clearLocal,
    userInfo
  }
})
