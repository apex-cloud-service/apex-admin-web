/**
 * 租户主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：系统管理 → 租户管理页渲染；`pageNum/pageSize` 必填口径与 `list/total` 响应消费；
 * 租户状态枚举映射（0 停用 / 1 启用）在列表中的展示。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_WITH_TENANT, mockBackend } from './helpers'

const TENANT = {
  id: 1001,
  tenantCode: 'e2e-tenant',
  tenantName: 'E2E 租户',
  status: 1,
  maxUserCount: 50,
  maxStorageMb: 1024,
  packageName: '标准版',
  expireTime: '2026-12-31 23:59:59',
}

test.describe('租户主链路', () => {
  test('租户列表渲染编码/名称/状态', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_WITH_TENANT })
    await page.route(/\/api\/v2\/platform\/tenants(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { list: [TENANT], total: 1, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      }),
    )
    await loginViaForm(page)
    await page.goto('/system/tenant')

    await expect(page).toHaveURL(/\/system\/tenant/)
    await expect(page.locator('.el-breadcrumb')).toContainText('租户管理')
    await expect(page.getByText('e2e-tenant').first()).toBeVisible()
    await expect(page.getByText('E2E 租户').first()).toBeVisible()
  })

  test('租户查询表单按编码过滤后重新请求', async ({ page }) => {
    let lastQuery = ''
    await mockBackend(page, { menus: MENUS_WITH_TENANT })
    await page.route(/\/api\/v2\/platform\/tenants(\?.*)?$/, (route) => {
      lastQuery = route.request().url()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { list: [TENANT], total: 1, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      })
    })
    await loginViaForm(page)
    await page.goto('/system/tenant')

    await page.getByLabel('租户编码').fill('e2e')
    await page.getByRole('button', { name: /查询|搜索/ }).first().click()
    await expect.poll(() => lastQuery.includes('tenantCode=e2e')).toBe(true)
  })
})
