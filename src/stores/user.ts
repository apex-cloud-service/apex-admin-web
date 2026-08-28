/**
 * 用户会话状态
 * ------------------------------------------------------------------
 * 管理 Token、当前用户身份与登录/登出动作。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, clearSession, setIdentity, getIdentity } from '@/utils/auth'
import { login as loginApi, logout as logoutApi, getMyPermissions } from '@/api/auth'
import { getCurrentUserInfo } from '@/api/user'
import type { LoginResult, UserIdentity } from '@/types'

/** 登录参数（透传给认证 API） */
export interface LoginParams {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

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
    })
    token.value = result.accessToken
    setToken(result.accessToken)
    // 登录成功后拉取身份与权限
    await loadIdentity()
    return result
  }

  /**
   * 拉取当前用户身份信息与权限码（刷新页面后恢复会话用）。
   */
  async function loadIdentity(): Promise<void> {
    const info = await getCurrentUserInfo()
    identity.value = info
    setIdentity(info)
    // 权限码优先取身份信息；身份缺失时回退查询权限接口
    if (info.permissions && info.permissions.length > 0) {
      permissions.value = info.permissions
    } else {
      permissions.value = await getMyPermissions().catch(() => [])
    }
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

  return { token, identity, permissions, initialized, login, loadIdentity, logout, clearLocal }
})
