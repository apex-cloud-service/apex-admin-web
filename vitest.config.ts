/**
 * Vitest 单元测试配置
 * ------------------------------------------------------------------
 * - 环境：happy-dom（浏览器 DOM 模拟）
 * - 全局装置：src/test/setup.ts（补齐 ResizeObserver/matchMedia）
 * - 覆盖率：v8 provider，输出 text/json/html/lcov 报告
 * - 别名：@ → src/（与 vite.config.ts 保持一致）
 */
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 允许用例中直接使用 describe/it/expect 全局 API
    globals: true,
    // DOM 模拟环境
    environment: 'happy-dom',
    // 用例执行前的全局装置（模拟 jsdom 缺失的浏览器 API）
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ 归 Playwright 执行（vitest 默认 include 会误收 *.spec.ts）
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // 限制并发：vitest 5 默认 pool 已是 forks，但默认 maxWorkers 取 CPU 数-1；
    // 本机 12 CPU 全开时出现 "Failed to start forks worker / Timeout waiting for worker"，
    // 导致用例被跳过或误报失败。此处降低并发（不放宽任何断言或超时标准）。
    maxWorkers: 4,
    coverage: {
      // 使用 v8 内建覆盖率收集
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/',
        '*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
