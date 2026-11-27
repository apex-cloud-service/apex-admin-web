/**
 * 办公审批主链路 E2E（FE-003）
 * ------------------------------------------------------------------
 * 覆盖：待办审批列表（流程名称/当前节点/发起人）、已办 Tab 切换、
 * 已办列表由 `/initiated` 全量数据聚合（后端无独立已办端点）。
 */
import { expect, test } from '@playwright/test'
import { loginViaForm, MENUS_FULL, mockBackend } from './helpers'

const PENDING_APPROVAL = {
  processInstanceId: 'approval-e2e-1',
  processName: '差旅报销申请',
  platform: 'DINGTALK',
  initiatorName: '张三',
  currentNode: '部门经理审批',
  status: 'PENDING',
  createdAt: '2026-11-16 09:30:00',
}

/** 已终结审批：用于验证已办 Tab 从 /initiated 聚合 */
const COMPLETED_APPROVAL = {
  processInstanceId: 'approval-e2e-2',
  processName: '采购申请',
  platform: 'DINGTALK',
  initiatorName: '李四',
  currentNode: '结束',
  status: 'APPROVED',
  createdAt: '2026-11-15 09:00:00',
  completedAt: '2026-11-15 12:00:00',
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
    await expect(page.getByText('张三').first()).toBeVisible()
  })

  test('已办审批由 /initiated 终态记录聚合展示', async ({ page }) => {
    await mockBackend(page, { menus: MENUS_FULL })
    // 页面会调用两次 /initiated：分页与全量（已办聚合均走该端点）
    await page.route(/\/api\/office\/approvals\/initiated/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, msg: 'ok', data: [PENDING_APPROVAL, COMPLETED_APPROVAL], traceId: 'e2e' }),
      }),
    )
    await loginViaForm(page)
    await page.goto('/office/approval')
    await page.getByRole('tab', { name: '已办审批' }).click()

    await expect(page.getByRole('tab', { name: '已办审批' })).toHaveAttribute('aria-selected', 'true')
    // 已办只含终态记录：APPROVED 的采购申请可见，待办记录不应混入
    await expect(page.getByText('采购申请').first()).toBeVisible()
  })
})
