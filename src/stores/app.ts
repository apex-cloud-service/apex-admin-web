/**
 * 应用 UI 状态
 * ------------------------------------------------------------------
 * 管理侧边栏折叠、明暗主题等布局偏好（持久化到 localStorage）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 主题类型：light=浅色 dark=深色 */
export type ThemeMode = 'light' | 'dark'

/** 本地存储键 */
const SIDEBAR_KEY = 'apex.admin.sidebarCollapsed'
const THEME_KEY = 'apex.admin.theme'

export const useAppStore = defineStore('app', () => {
  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref<boolean>(localStorage.getItem(SIDEBAR_KEY) === '1')

  /** 当前主题（默认跟随系统浅色） */
  const theme = ref<ThemeMode>((localStorage.getItem(THEME_KEY) as ThemeMode) || 'light')

  /**
   * 切换侧边栏折叠状态并持久化。
   */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  /**
   * 切换明暗主题并应用到根元素（el-config-provider 同步）。
   * @param mode 目标主题
   */
  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    localStorage.setItem(THEME_KEY, mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }

  return { sidebarCollapsed, theme, toggleSidebar, setTheme }
})
