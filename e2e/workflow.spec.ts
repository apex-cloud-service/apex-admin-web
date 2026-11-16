/**
 * 工作流主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：菜单 → 流程监控页 → 统计看板/流程实例/待办任务三个 Tab 渲染；
 * 待办任务列表按 pageNum/pageSize → list/total 口径消费（本仓最易错的契约点）。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_FULL, mockBackend } from './helpers'

const PENDING_TASK = {
  taskId: 'task-e2e-1',
  taskName: '合同审批',
  processInstanceId: 'proc-e2e-1',
  assignee: 'e2e-user',
  createTime: '2026-11-16 10:00:00',
}

test.describe('工作流主链路', () => {
  test('进入流程监控页并切换三个 Tab', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    await loginViaForm(page)

    await page.goto('/workflow/monitor')
    await expect(page).toHaveURL(/\/workflow\/monitor/)
    await expect(page.locator('.el-breadcrumb')).toContainText('工作流监控')

    for (const tab of ['统计看板', '流程实例', '待办任务']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible()
    }
    await page.getByRole('tab', { name: '流程实例' }).click()
    await page.getByRole('tab', { name: '待办任务' }).click()
  })

  test('待办任务列表按 list/total 口径渲染行数据', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    // 待办任务：请求 pageNum/pageSize，响应 PageResponse<list/total>
    await page.route(/\/api\/v1\/workflows\/tasks\/pending/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { list: [PENDING_TASK], total: 1, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      }),
    )
    await loginViaForm(page)
    await page.goto('/workflow/monitor')
    await page.getByRole('tab', { name: '待办任务' }).click()

    await expect(page.getByText('合同审批').first()).toBeVisible()
  })
})
