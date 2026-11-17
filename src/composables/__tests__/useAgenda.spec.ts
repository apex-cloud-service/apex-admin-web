/**
 * 我的事项聚合 Composable 单元测试
 * ------------------------------------------------------------------
 * 覆盖 useAgenda 的五域适配与失败隔离语义：
 * - 各域成功路径：items 映射正确、totalHint 取真实 total
 * - 站内信裸数组：条数 ≥5 时 truncated=true，totalHint 为「总数未知」
 * - 任一域失败：仅该域 error 置位，其余域数据正常
 * - 单域重试：重载成功后 error 清空
 * - truncated 判定：total > list.length 才为 true
 * - 通知标记已读：成功后本地更新未读状态；失败文案留在条目行内
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageResponse } from '@/types'
import type { ApprovalProcess } from '@/api/office-approval'
import type { CalendarEvent } from '@/api/office-calendar'
import type { SystemNotification } from '@/api/notification'
import { useAgenda } from '@/composables/useAgenda'

const {
  getMyPendingTasksMock,
  getPendingApprovalsMock,
  listInboxMessagesMock,
  getCalendarEventsMock,
  listNotificationsMock,
  markNotificationReadMock,
} = vi.hoisted(() => ({
  getMyPendingTasksMock: vi.fn(),
  getPendingApprovalsMock: vi.fn(),
  listInboxMessagesMock: vi.fn(),
  getCalendarEventsMock: vi.fn(),
  listNotificationsMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
}))

vi.mock('@/api/workflow', () => ({ getMyPendingTasks: getMyPendingTasksMock }))
vi.mock('@/api/office-approval', () => ({ getPendingApprovals: getPendingApprovalsMock }))
vi.mock('@/api/message', () => ({ listInboxMessages: listInboxMessagesMock }))
vi.mock('@/api/office-calendar', () => ({ getCalendarEvents: getCalendarEventsMock }))
vi.mock('@/api/notification', () => ({
  listNotifications: listNotificationsMock,
  markNotificationRead: markNotificationReadMock,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ identity: { id: 42 } }),
}))

/** 构造分页响应 */
function page<T>(list: T[], total: number): PageResponse<T> {
  return { list, total, pageNum: 1, pageSize: 5, pages: 1 }
}

/** 默认成功响应（workflow 2 条 + total 6 用于 truncated 判定） */
function mockAllSuccess(): void {
  getMyPendingTasksMock.mockResolvedValue(
    page([{ id: 1, taskName: '任务A', assigneeName: '张三', startTime: '2026-11-11 10:00:00' }], 6),
  )
  getPendingApprovalsMock.mockResolvedValue(
    page<ApprovalProcess>([
      { id: 2, platform: 'FEISHU', processInstanceId: 'pi-2', processName: '请假审批', currentNode: '主管审批', createdAt: '2026-11-11 09:00:00', status: 'PENDING' },
    ], 1),
  )
  listInboxMessagesMock.mockResolvedValue([
    { id: 3, subject: '系统维护通知', senderName: '管理员', sendTime: '2026-11-11 08:00:00', readStatus: false, messageType: 'SYSTEM' },
  ])
  getCalendarEventsMock.mockResolvedValue(
    page<CalendarEvent>([
      { id: 'e1', platform: 'FEISHU', platformEventId: 'p1', title: '周会', startTime: '2026-11-12 14:00:00', endTime: '2026-11-12 15:00:00', attendeeIds: [], status: 'CONFIRMED', allDay: false, creatorId: '42' },
    ], 1),
  )
  listNotificationsMock.mockResolvedValue(
    page<SystemNotification>([
      { id: 9, userId: 42, msgType: 'WELCOME', content: '欢迎使用 Apex 管理后台', refType: null, refId: null, readAt: null, createTime: '2026-11-11 07:00:00', updateTime: '2026-11-11 07:00:00' },
    ], 1),
  )
}

describe('useAgenda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAllSuccess()
  })

  it('各域成功路径：items 映射正确且 totalHint 取真实 total', async () => {
    const { sections, loadAll } = useAgenda()
    await loadAll()

    const workflow = sections.value.find((s) => s.domain === 'workflow')!
    expect(workflow.error).toBeNull()
    expect(workflow.items[0]).toMatchObject({
      domain: 'workflow',
      kind: 'TASK',
      title: '任务A',
      subtitle: '张三',
      time: '2026-11-11 10:00:00',
      href: '/workflow/monitor',
    })
    expect(workflow.totalHint).toBe('共 6 条')

    const approval = sections.value.find((s) => s.domain === 'office-approval')!
    expect(approval.items[0]).toMatchObject({
      domain: 'office-approval',
      title: '请假审批',
      subtitle: '主管审批',
    })
    expect(getPendingApprovalsMock).toHaveBeenCalledWith({ approverId: '42', pageNum: 1, pageSize: 5 })
    expect(approval.totalHint).toBe('共 1 条')
    expect(approval.truncated).toBe(false)

    const message = sections.value.find((s) => s.domain === 'message')!
    expect(message.items[0]).toMatchObject({
      domain: 'message',
      title: '系统维护通知',
      unread: true,
    })

    const calendar = sections.value.find((s) => s.domain === 'calendar')!
    expect(calendar.items[0]).toMatchObject({
      domain: 'calendar',
      kind: 'EVENT',
      title: '周会',
    })

    const notification = sections.value.find((s) => s.domain === 'notification')!
    expect(notification.items[0]).toMatchObject({
      domain: 'notification',
      kind: 'WELCOME',
      unread: true,
    })
    expect(notification.items[0].href).toBeUndefined()
  })

  it('站内信裸数组：条数达到单页上限时 truncated=true 且 totalHint 为「总数未知」', async () => {
    listInboxMessagesMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        subject: `消息${i + 1}`,
        senderName: '管理员',
        sendTime: '2026-11-11 08:00:00',
        readStatus: true,
        messageType: 'SYSTEM',
      })),
    )
    const { sections, loadAll } = useAgenda()
    await loadAll()

    const message = sections.value.find((s) => s.domain === 'message')!
    expect(message.items).toHaveLength(5)
    expect(message.truncated).toBe(true)
    expect(message.totalHint).toBe('总数未知（接口返回列表）')
  })

  it('任一域失败仅该域 error 置位，其余域数据正常', async () => {
    getMyPendingTasksMock.mockRejectedValueOnce(new Error('boom'))
    const { sections, loadAll } = useAgenda()
    await loadAll()

    const workflow = sections.value.find((s) => s.domain === 'workflow')!
    expect(workflow.error).toBe('暂时无法加载')
    expect(workflow.items).toHaveLength(0)
    expect(workflow.loading).toBe(false)

    for (const domain of ['office-approval', 'message', 'calendar', 'notification'] as const) {
      const section = sections.value.find((s) => s.domain === domain)!
      expect(section.error).toBeNull()
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('单域重试成功后 error 清空且数据回填', async () => {
    getMyPendingTasksMock.mockRejectedValueOnce(new Error('boom'))
    const { sections, loadAll, reload } = useAgenda()
    await loadAll()

    await reload('workflow')

    const workflow = sections.value.find((s) => s.domain === 'workflow')!
    expect(workflow.error).toBeNull()
    expect(workflow.items[0].title).toBe('任务A')
  })

  it('truncated 判定：仅 total > list.length 时为 true', async () => {
    const { sections, loadAll } = useAgenda()
    await loadAll()

    // workflow total=6 > list 1 条 → true；approval total=1 = list 1 条 → false
    expect(sections.value.find((s) => s.domain === 'workflow')!.truncated).toBe(true)
    expect(sections.value.find((s) => s.domain === 'office-approval')!.truncated).toBe(false)
  })

  it('通知标记已读：成功后本地更新未读状态', async () => {
    markNotificationReadMock.mockResolvedValue(true)
    const { sections, loadAll, markRead } = useAgenda()
    await loadAll()

    const notification = sections.value.find((s) => s.domain === 'notification')!
    const item = notification.items[0]
    expect(item.unread).toBe(true)

    await markRead(item)

    expect(markNotificationReadMock).toHaveBeenCalledWith(9)
    expect(item.unread).toBe(false)
    expect(item.actionError).toBeUndefined()
  })

  it('通知标记已读失败：文案留在条目行内且不影响其他条目', async () => {
    markNotificationReadMock.mockRejectedValueOnce(new Error('boom'))
    const { sections, loadAll, markRead } = useAgenda()
    await loadAll()

    const notification = sections.value.find((s) => s.domain === 'notification')!
    const item = notification.items[0]

    await markRead(item)

    expect(item.unread).toBe(true)
    expect(item.actionError).toBe('标记已读失败')
    expect(notification.error).toBeNull()
    expect(notification.items).toHaveLength(1)
  })
})
