/**
 * Vitest 全局测试环境搭建
 * ------------------------------------------------------------------
 * 在所有用例执行前补充 jsdom 缺失的浏览器 API：
 *   - ResizeObserver：ECharts/布局组件依赖
 *   - window.matchMedia：Element Plus 响应式断点依赖
 * 由 vitest.config.ts 的 setupFiles 引入。
 */
import { vi } from 'vitest'

// 模拟 ResizeObserver（jsdom 未实现，ECharts 等库初始化时依赖）
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
