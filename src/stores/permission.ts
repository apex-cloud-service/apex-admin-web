/**
 * 权限状态
 * ------------------------------------------------------------------
 * 提供按钮级权限判断能力（配合 v-permission 指令使用）。
 */
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

export const usePermissionStore = defineStore('permission', () => {
  const userStore = useUserStore()

  /** 当前用户权限码集合（派生自用户状态） */
  const permissions = computed(() => userStore.permissions)

  /**
   * 判断当前用户是否拥有指定权限码。
   * @param code 权限码（如 system:user:create）；支持逗号分隔多码（满足其一即可）
   * @returns true=拥有权限
   */
  function hasPermission(code: string): boolean {
    if (!code) return true
    // Pinia setup store 访问时自动解包 ref，直接取数组
    const list = userStore.permissions
    // 空权限集合视为未配置（放行），避免误伤
    if (list.length === 0) return true
    return code.split(',').some((item) => list.includes(item.trim()))
  }

  return { permissions, hasPermission }
})
