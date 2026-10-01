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
