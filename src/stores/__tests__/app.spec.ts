/**
 * 应用 UI 状态单元测试
 * ------------------------------------------------------------------
 * 覆盖侧边栏折叠与主题偏好：
 * - 初始值从 localStorage 恢复
 * - 切换后写入持久化键
 * - 暗色主题同步根元素 class
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { SIDEBAR_KEY, THEME_KEY } from '@/settings'

describe('app store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setActivePinia(createPinia())
  })

  it('默认不折叠且为浅色主题', () => {
    const store = useAppStore()
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.theme).toBe('light')
  })

  it('从 localStorage 恢复折叠与主题偏好', () => {
    localStorage.setItem(SIDEBAR_KEY, '1')
    localStorage.setItem(THEME_KEY, 'dark')
    const store = useAppStore()

    expect(store.sidebarCollapsed).toBe(true)
    expect(store.theme).toBe('dark')
  })

  it('切换侧边栏折叠状态并持久化', () => {
    const store = useAppStore()

    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('1')

    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('0')
  })

  it('设置主题时同步根元素 class 并持久化', () => {
    const store = useAppStore()

    store.setTheme('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    store.setTheme('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
