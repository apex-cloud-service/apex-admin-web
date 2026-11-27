/**
 * 令牌无感刷新 E2E 测试
 * ------------------------------------------------------------------
 * 覆盖：①单个业务请求 401 后刷新一次、重放成功并更新令牌；
 * ②并发两个请求同时 401 时共享同一次刷新（单飞）。
 */
import { expect, test } from '@playwright/test'
import { MENUS, mockBackend, ok } from './helpers'

/** 预置过期访问令牌 + 有效刷新令牌，并按调用次数返回刷新响应 */
async function primeStaleSession(page: import('@playwright/test').Page, menus: unknown = MENUS) {
  await page.addInitScript(() => {
    localStorage.setItem('apex.admin.token', 'stale-access')
    localStorage.setItem('apex.admin.refresh-token', 'valid-refresh')
  })
  await mockBackend(page, { menus })

  let refreshCount = 0
  await page.route(/\/auth\/v1\/refresh/, async (route) => {
    refreshCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 7200 }),
    })
  })
  return () => refreshCount
}

test.describe('令牌无感刷新', () => {
  test('单个 401 触发一次刷新并重放成功', async ({ page }) => {
    const getRefreshCount = await primeStaleSession(page)

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

    // 原请求重放后共两次，刷新恰好一次
    await expect.poll(() => overviewCalls, { timeout: 15_000 }).toBe(2)
    expect(getRefreshCount()).toBe(1)

    const token = await page.evaluate(() => localStorage.getItem('apex.admin.token'))
    expect(token).toBe('new-access')
  })

  test('并发 401 共享同一次刷新（单飞），两个请求都重放成功', async ({ page }) => {
    // 监控大盘首屏以 Promise.all 并发请求 5 个指标接口，适合验证单飞
    const monitorMenus = [
      ...MENUS,
      {
        id: 9,
        parentId: 0,
        menuName: '监控',
        menuType: 0,
        path: '/monitor',
        icon: 'Monitor',
        visible: 1,
        status: 1,
        children: [
          {
            id: 91,
            parentId: 9,
            menuName: '监控大盘',
            menuType: 1,
            path: 'dashboard',
            component: 'monitor/dashboard/index',
            visible: 1,
            status: 1,
            children: [],
          },
        ],
      },
    ]
    const getRefreshCount = await primeStaleSession(page, monitorMenus)

    // 两个业务接口在首屏并发请求，首次都返回 401
    const calls: Record<string, number> = { overview: 0, system: 0 }
    const endpoints: Array<[RegExp, 'overview' | 'system', unknown]> = [
      [/\/admin-api\/v1\/monitor\/overview/, 'overview', { cpuUsage: 11 }],
      [/\/admin-api\/v1\/monitor\/system/, 'system', { cpu: 0.2 }],
    ]
    for (const [pattern, key, payload] of endpoints) {
      await page.route(pattern, async (route) => {
        calls[key] += 1
        if (calls[key] === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ code: 401, msg: 'token expired', traceId: 'e2e-401' }),
          })
          return
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: ok(payload) })
      })
    }

    await page.goto('/monitor/dashboard')
    await expect(page.getByRole('button', { name: /立即刷新/ })).toBeVisible({ timeout: 20_000 })

    // 两路各自重放一次；并发 401 只触发一次刷新
    await expect.poll(() => calls.overview, { timeout: 20_000 }).toBe(2)
    await expect.poll(() => calls.system, { timeout: 20_000 }).toBe(2)
    expect(getRefreshCount()).toBe(1)
  })
})
