/**
 * 动态菜单与路由 E2E 测试
 * ------------------------------------------------------------------
 * 覆盖：登录后按后端菜单树渲染侧边栏（目录展开后可见子菜单）、
 * VIEW_REGISTRY 登记的动态页面可通过点击与 URL 直达访问。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS, mockBackend, ok } from './helpers'

test.describe('动态菜单与路由', () => {
  test('菜单临时不可用时进入工作台，并在下一次导航恢复菜单', async ({ page }) => {
    await mockBackend(page)
    let requests = 0
    let available = false
    await page.route('**/admin-api/v1/menus', async (route) => {
      requests++
      if (!available) {
        await route.fulfill({ status: 503, json: { code: 3007, msg: 'Service unavailable' } })
        return
      }
      await route.fulfill({ contentType: 'application/json', body: ok([
        ...MENUS,
        { id: 3, menuName: '站内信', menuType: 1, path: '/office/message', component: 'office/message/index' },
      ]) })
    })

    await loginViaForm(page)
    await expect(page.locator('.el-breadcrumb')).toContainText('工作台')
    await expect(page.locator('.layout-aside')).not.toContainText('系统管理')
    expect(requests).toBe(1)

    available = true
    await page.locator('.notice-btn').click()
    await expect(page).toHaveURL(/\/office\/message$/)
    await expect(page.locator('.el-breadcrumb')).toContainText('站内信')
    await expect(page.locator('.layout-aside')).toContainText('系统管理')
    expect(requests).toBe(2)
  })

  test('登录后渲染菜单树，点击子菜单进入动态页面', async ({ page }) => {
    await mockBackend(page)

    await loginViaForm(page)

    // 侧边栏出现目录，展开后子菜单可见
    await expect(page.getByText('系统管理').first()).toBeVisible()
    await page.getByText('系统管理').first().click()
    const menuItem = page.getByRole('menuitem', { name: '用户管理' })
    await expect(menuItem).toBeVisible()

    // 点击菜单跳转动态路由
    await menuItem.click()
    await expect(page).toHaveURL(/\/system\/user/)
    // 面包屑反映当前动态路由标题
    await expect(page.locator('.el-breadcrumb')).toContainText('用户管理')
  })

  test('动态路由支持 URL 直达（刷新后守卫重新注册）', async ({ page }) => {
    await mockBackend(page)

    await loginViaForm(page)
    // 整页刷新等价于冷启动直达：守卫重新加载身份并注册动态路由
    await page.goto('/system/user?status=enabled&tag=a&tag=b#user-list')

    await expect(page).toHaveURL(/\/system\/user\?status=enabled&tag=a&tag=b#user-list$/)
    await expect(page.locator('.el-breadcrumb')).toContainText('用户管理')
  })
})
