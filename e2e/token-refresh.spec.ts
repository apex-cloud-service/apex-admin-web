/**
 * 令牌无感刷新 E2E 测试
 * ------------------------------------------------------------------
 * 覆盖：持过期令牌访问时业务请求 401 → 单飞刷新 → 原请求重放成功、
 * 会话令牌被新令牌替换、刷新仅发生一次。
 */
import { expect, test } from '@playwright/test'
import { mockBackend, ok } from './helpers'

test.describe('令牌无感刷新', () => {
  test('401 触发单飞刷新且原请求重放成功', async ({ page }) => {
    // 预置过期访问令牌 + 有效刷新令牌（守卫将走 loadIdentity 建立会话）
    await page.addInitScript(() => {
      localStorage.setItem('apex.admin.token', 'stale-access')
      localStorage.setItem('apex.admin.refresh-token', 'valid-refresh')
    })
    await mockBackend(page)

    let refreshCount = 0
    await page.route(/\/auth\/v1\/refresh/, async (route) => {
      refreshCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // 认证中心刷新端点返回裸 TokenPair（不包 Result）
        body: JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 7200 }),
      })
    })

    // 工作台指标接口首次 401（过期令牌），重放后成功
    let overviewCalls = 0
    await page.route(/\/admin-api\/v1\/monitor\/overview/, async (route) => {
      overviewCalls += 1
      if (overviewCalls === 1) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 401, msg: 'token expired', traceId: 'e2e-401' }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: ok({ cpuUsage: 11 }) })
    })

    await page.goto('/dashboard')

    // 原请求被重放（共两次），刷新恰好一次（单飞）
    await expect.poll(() => overviewCalls, { timeout: 15_000 }).toBe(2)
    expect(refreshCount).toBe(1)

    const token = await page.evaluate(() => localStorage.getItem('apex.admin.token'))
    expect(token).toBe('new-access')
  })
})
