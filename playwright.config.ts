/**
 * Playwright E2E 配置
 * ------------------------------------------------------------------
 * 集成测试（真实浏览器）：webServer 起 Vite 开发服务器，
 * 后端接口在用例内经 page.route 打桩，不依赖真实后端。
 * 运行前须执行 `npx playwright install chromium` 安装浏览器。
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['junit', { outputFile: 'reports/e2e-results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
