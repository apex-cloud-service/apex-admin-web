/**
 * 权限状态单元测试
 * ------------------------------------------------------------------
 * 覆盖 hasPermission 的判定口径：
 * - 空权限码与空权限集合放行
 * - 单码命中、逗号多码任一命中
 * - 查询权限码的逗号片段按 trim 处理；权限集合本身按原值精确匹配
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'

describe('permission store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空权限码直接放行', () => {
    const store = usePermissionStore()
    expect(store.hasPermission('')).toBe(true)
  })

  it('权限集合为空时放行', () => {
    const store = usePermissionStore()
    expect(store.hasPermission('system:user:create')).toBe(true)
  })

  it('单码精确匹配', () => {
    const userStore = useUserStore()
    userStore.permissions = ['system:user:create']
    const store = usePermissionStore()
    expect(store.hasPermission('system:user:create')).toBe(true)
    expect(store.hasPermission('system:user:update')).toBe(false)
  })

  it('逗号分隔多码满足任一即可并裁剪空格', () => {
    const userStore = useUserStore()
    userStore.permissions = ['system:user:update']
    const store = usePermissionStore()
    expect(store.hasPermission('system:user:create, system:user:update')).toBe(true)
  })

  it('permissions 派生自用户 Store', () => {
    const userStore = useUserStore()
    userStore.permissions = ['a:read']
    const store = usePermissionStore()
    expect(store.permissions).toEqual(['a:read'])
  })
})
