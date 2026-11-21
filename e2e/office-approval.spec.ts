/**
 * 办公审批主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：办公协同 → 审批中心 → 待办/已办 Tab；
 * 待办审批接口返回裸数组，前端执行平台筛选与分页，列表字段 processName/currentNode/createdAt。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_FULL, mockBackend } from './helpers'

const PENDING_APPROVAL = {
  processInstanceId: 'approval-e2e-1',
  processName: '差旅报销申请',
  platform: 'dingtalk',
  initiatorName: '张三',
  currentNode: '部门经理审批',
  status: 0,
  createdAt: '2026-11-16 09:30:00',
}

test.describe('办公审批主链路', () => {
  test('待办审批列表渲染标题/发起人/当前节点', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    await page.route(/\/api\/office\/approvals\/pending/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: [PENDING_APPROVAL], traceId: 'e2e' }),
      }),
    )
    await loginViaForm(page)
    await page.goto('/office/approval')

    await expect(page).toHaveURL(/\/office\/approval/)
    await expect(page.locator('.el-breadcrumb')).toContainText('审批中心')
    await expect(page.getByRole('tab', { name: '待办审批' })).toBeVisible()
    await expect(page.getByText('差旅报销申请').first()).toBeVisible()
    await expect(page.getByText('部门经理审批').first()).toBeVisible()
  })

  test('已办审批 Tab 可切换', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    await page.route(/\/api\/office\/approvals\/completed/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { records: [], total: 0, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      }),
    )
    await loginViaForm(page)
    await page.goto('/office/approval')
    await page.getByRole('tab', { name: '已办审批' }).click()
    await expect(page.getByRole('tab', { name: '已办审批' })).toHaveAttribute('aria-selected', 'true')
  })
})
