/**
 * 认证与路由守卫 E2E 测试
 * ------------------------------------------------------------------
 * 覆盖：未登录访问受保护路由跳转登录并携带回跳地址、
 * 表单登录成功进入工作台并落会话、退出登录清理会话回登录页。
 */
import { expect, test } from '@playwright/test'
import { LOGIN_RESULT, loginViaForm, mockBackend, ok } from './helpers'

test.describe('认证与路由守卫', () => {
  test('未登录访问受保护路由跳转登录页并携带回跳地址', async ({ page }) => {
    await mockBackend(page)

    await page.goto('/system/user')

    await expect(page).toHaveURL(/\/login\?redirect=\/system\/user/)
    await expect(page.locator('.login-btn')).toBeVisible()
  })

  test('表单登录成功进入工作台并写入会话', async ({ page }) => {
    await mockBackend(page)
    let loginPayload: Record<string, unknown> | null = null
    await page.route(/\/auth\/v1\/login/, async (route) => {
      loginPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOGIN_RESULT) })
    })

    await loginViaForm(page)

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('欢迎回来')).toBeVisible()
    expect(loginPayload).toMatchObject({
      username: 'e2e-user',
      captchaCode: '1234',
      deviceId: 'apex-admin-web',
      platform: 'web',
    })
    const token = await page.evaluate(() => localStorage.getItem('apex.admin.token'))
    expect(token).toBe(LOGIN_RESULT.accessToken)
  })

  test('退出登录清理会话并回到登录页', async ({ page }) => {
    await mockBackend(page)
    await page.route(/\/api\/v1\/auth\/logout/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: ok(null) }),
    )

    await loginViaForm(page)

    // 顶栏头像下拉 → 退出登录 → 确认弹窗
    await page.locator('.user-avatar').hover()
    await page.getByText('退出登录').click()
    await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()

    await expect(page).toHaveURL(/\/login/)
    const token = await page.evaluate(() => localStorage.getItem('apex.admin.token'))
    expect(token).toBeNull()
  })
})
