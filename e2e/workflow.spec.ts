/**
 * 工作流主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：流程监控页三个 Tab 的展示/切换，以及待办任务的真实 DTO 渲染。
 * 断言请求按 pageNum/pageSize 发出且响应按 list/total 消费。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_FULL, mockBackend } from './helpers'

/** 与 WorkflowPendingTask 对齐的最小夹具 */
const PENDING_TASK = {
  id: 9001,
  instanceId: 7001,
  taskName: '合同审批',
  taskType: 'USER_TASK',
  status: 'PENDING',
  assigneeId: 1,
  assigneeName: '张三',
  startTime: '2026-11-16 10:00:00',
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

  test('待办任务按 pageNum/pageSize 请求并按 list/total 渲染', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    let pendingUrl = ''
    await page.route(/\/api\/v1\/workflows\/tasks\/pending/, (route) => {
      pendingUrl = route.request().url()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: { list: [PENDING_TASK], total: 1, pageNum: 1, pageSize: 20 }, traceId: 'e2e' }),
      })
    })
    await loginViaForm(page)
    await page.goto('/workflow/monitor')
    await page.getByRole('tab', { name: '待办任务' }).click()

    await expect(page.getByText('合同审批').first()).toBeVisible()
    await expect(page.getByText('张三').first()).toBeVisible()

    // 分页参数口径：工作流待办使用 pageNum/pageSize，而非 page/size
    await expect.poll(() => pendingUrl).not.toBe('')
    expect(pendingUrl).toContain('pageNum=1')
    expect(pendingUrl).toContain('pageSize=')
  })
})
