/**
 * 我的事项聚合 Composable
 * ------------------------------------------------------------------
 * 用途：
 * 为工作台「我的事项」面板（AgendaPanel.vue）提供聚合数据源。
 * 工作流待办、办公审批、站内信、近期日程、系统通知五个领域并行加载、
 * 失败隔离；只做展示与跳转，办理操作在各领域原页面完成。
 *
 * @author anqli
 * @date 2026-11-12
 */
import { ref } from 'vue'
import type { AgendaDomain, AgendaItem, AgendaSection } from '@/types'
import { useUserStore } from '@/stores/user'
import { getMyPendingTasks } from '@/api/workflow'
import { getPendingApprovals } from '@/api/office-approval'
import { listInboxMessages } from '@/api/message'
import { getCalendarEvents } from '@/api/office-calendar'
import { listNotifications, markNotificationRead } from '@/api/notification'

/** 各区块单次拉取条数 */
const PAGE_SIZE = 5
/** 通知标题截断长度 */
const NOTIFICATION_TITLE_MAX = 50
/** 近期日程时间窗口（未来 7 天） */
const CALENDAR_WINDOW_MS = 7 * 24 * 3600 * 1000

/** 区块标签（固定顺序渲染依据） */
const SECTION_LABELS: Record<AgendaDomain, string> = {
  workflow: '工作流待办',
  'office-approval': '办公审批',
  message: '站内信',
  calendar: '近期日程',
  notification: '系统通知',
}

function createSection(domain: AgendaDomain): AgendaSection {
  return {
    domain,
    label: SECTION_LABELS[domain],
    items: [],
    loading: true,
    error: null,
    truncated: false,
  }
}

/** 超长通知正文截断为标题 */
function truncateTitle(content: string): string {
  return content.length > NOTIFICATION_TITLE_MAX ? `${content.slice(0, NOTIFICATION_TITLE_MAX)}…` : content
}

/**
 * 我的事项聚合数据源
 * - 五个领域各自独立加载、独立失败，区块级降级不弹全局提示
 * - 仅展示与跳转，不提供任何办理操作（办理均在原域页面完成）
 */
export function useAgenda() {
  const userStore = useUserStore()

  const sections = ref<AgendaSection[]>([
    createSection('workflow'),
    createSection('office-approval'),
    createSection('message'),
    createSection('calendar'),
    createSection('notification'),
  ])

  const setSection = (domain: AgendaDomain, patch: Partial<AgendaSection>) => {
    const section = sections.value.find((s) => s.domain === domain)
    if (section) Object.assign(section, patch)
  }

  async function loadWorkflow(): Promise<void> {
    setSection('workflow', { loading: true, error: null })
    try {
      const page = await getMyPendingTasks({ pageNum: 1, pageSize: PAGE_SIZE })
      const list = page.list ?? []
      setSection('workflow', {
        loading: false,
        items: list.map((t) => ({
          domain: 'workflow' as const,
          kind: 'TASK',
          id: t.id,
          title: t.taskName || `任务 #${t.id}`,
          subtitle: t.assigneeName || undefined,
          time: t.startTime,
          href: '/workflow/monitor',
          hrefLabel: '去办理',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('workflow', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadApprovals(): Promise<void> {
    setSection('office-approval', { loading: true, error: null })
    const approverId = String(userStore.identity?.id ?? '')
    if (!approverId) {
      setSection('office-approval', { loading: false, error: '暂无用户身份，无法加载' })
      return
    }
    try {
      const page = await getPendingApprovals({ approverId, pageNum: 1, pageSize: PAGE_SIZE })
      const list = page.list ?? []
      setSection('office-approval', {
        loading: false,
        items: list.map((a) => ({
          domain: 'office-approval' as const,
          kind: 'APPROVAL',
          id: a.id,
          title: a.processName,
          subtitle: a.currentNode || undefined,
          time: a.createdAt,
          href: '/office/approval',
          hrefLabel: '去审批',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('office-approval', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadMessages(): Promise<void> {
    setSection('message', { loading: true, error: null })
    try {
      const list = await listInboxMessages(1, PAGE_SIZE)
      setSection('message', {
        loading: false,
        items: list.map((m) => ({
          domain: 'message' as const,
          kind: m.messageType || 'MESSAGE',
          id: m.id,
          title: m.subject,
          subtitle: m.senderName || undefined,
          time: m.sendTime,
          unread: m.readStatus === false,
          href: '/office/message',
          hrefLabel: '去查看',
        })),
        truncated: list.length >= PAGE_SIZE,
        totalHint: '总数未知（接口返回列表）',
      })
    } catch {
      setSection('message', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadCalendar(): Promise<void> {
    setSection('calendar', { loading: true, error: null })
    try {
      const now = new Date()
      const end = new Date(now.getTime() + CALENDAR_WINDOW_MS)
      const page = await getCalendarEvents({
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        pageNum: 1,
        pageSize: PAGE_SIZE,
      })
      const list = page.list ?? []
      setSection('calendar', {
        loading: false,
        items: list.map((e) => ({
          domain: 'calendar' as const,
          kind: 'EVENT',
          id: e.id,
          title: e.title,
          subtitle: e.platform,
          time: e.startTime,
          href: '/office/calendar',
          hrefLabel: '查看日程',
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('calendar', { loading: false, error: '暂时无法加载' })
    }
  }

  async function loadNotifications(): Promise<void> {
    setSection('notification', { loading: true, error: null })
    try {
      const page = await listNotifications({ page: 1, size: PAGE_SIZE })
      const list = page.list ?? []
      setSection('notification', {
        loading: false,
        items: list.map((n) => ({
          domain: 'notification' as const,
          kind: n.msgType,
          id: n.id,
          title: truncateTitle(n.content),
          time: n.createTime,
          unread: n.readAt === null,
        })),
        truncated: (page.total ?? 0) > list.length,
        totalHint: `共 ${page.total} 条`,
      })
    } catch {
      setSection('notification', { loading: false, error: '暂时无法加载' })
    }
  }

  /** 全量加载：各域并行、互不阻塞 */
  async function loadAll(): Promise<void> {
    await Promise.allSettled([loadWorkflow(), loadApprovals(), loadMessages(), loadCalendar(), loadNotifications()])
  }

  /** 单域重载（区块失败重试入口） */
  async function reload(domain: AgendaDomain): Promise<void> {
    switch (domain) {
      case 'workflow':
        return loadWorkflow()
      case 'office-approval':
        return loadApprovals()
      case 'message':
        return loadMessages()
      case 'calendar':
        return loadCalendar()
      case 'notification':
        return loadNotifications()
    }
  }

  /** 标记单条通知已读（成功后本地更新未读状态；失败文案留在条目行内） */
  async function markRead(item: AgendaItem): Promise<void> {
    if (item.domain !== 'notification' || typeof item.id !== 'number' || !item.unread) return
    try {
      await markNotificationRead(item.id)
      item.unread = false
      item.actionError = undefined
    } catch {
      item.actionError = '标记已读失败'
    }
  }

  return { sections, loadAll, reload, markRead }
}
