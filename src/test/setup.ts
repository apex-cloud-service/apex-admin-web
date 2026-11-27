/**
 * Vitest 全局测试环境搭建
 * ------------------------------------------------------------------
 * 提供确定性的浏览器 API 桩，无条件覆盖 ResizeObserver 与 window.matchMedia。
 * ResizeObserver 仅提供方法形状；matchMedia 固定 matches=false，不模拟媒体查询变化。
 * 由 vitest.config.ts 的 setupFiles 引入，不等同真实浏览器行为。
 */
import { vi } from 'vitest'

// 模拟 ResizeObserver（happy-dom 未实现，ECharts 等库初始化时依赖）
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟 matchMedia（Element Plus 主题/断点相关能力依赖）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
