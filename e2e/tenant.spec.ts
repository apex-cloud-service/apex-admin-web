/**
 * 租户主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：租户管理页渲染（编码/名称/状态标签）、编码查询参数、pageNum/pageSize 分页参数。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_WITH_TENANT, mockBackend } from './helpers'

const TENANT = {
  id: 1001,
  tenantCode: 'e2e-tenant',
  tenantName: 'E2E 租户',
  status: 'ACTIVE',
  maxUserCount: 50,
  maxStorageMb: 1024,
  packageName: '标准版',
  expireTime: '2026-12-31 23:59:59',
}

test.describe('租户主链路', () => {
  test('租户列表渲染编码/名称/状态并带 pageNum/pageSize', async ({ page }) => {
    let listUrl = ''
    await mockBackend(page, { menus: MENUS_WITH_TENANT })
    await page.route(/\/api\/v2\/platform\/tenants(\?.*)?$/, (route) => {
      listUrl = route.request().url()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { list: [TENANT], total: 1, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      })
    })
    await loginViaForm(page)
    await page.goto('/system/tenant')

    await expect(page).toHaveURL(/\/system\/tenant/)
    await expect(page.locator('.el-breadcrumb')).toContainText('租户管理')
    await expect(page.getByText('e2e-tenant').first()).toBeVisible()
    await expect(page.getByText('E2E 租户').first()).toBeVisible()
    // 字符串状态映射：ACTIVE → 正常
    await expect(page.getByText('正常').first()).toBeVisible()

    await expect.poll(() => listUrl).not.toBe('')
    expect(listUrl).toContain('pageNum=1')
    expect(listUrl).toContain('pageSize=')
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
