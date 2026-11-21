/**
 * NotificationCenter 单元测试
 * ------------------------------------------------------------------
 * 覆盖：未读角标展示与隐藏、SSE 订阅/退订与推送刷新、面板打开拉取列表、
 * 单条已读与全部已读、60 秒轮询与卸载清理；不含真实 SSE 流连接与弹层定位。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import NotificationCenter from '@/components/NotificationCenter/index.vue'
import type { SystemNotification } from '@/api/notification'
import type { NotificationPushListener } from '@/utils/notification-stream'
import type { PageResponse } from '@/types'

const mocks = vi.hoisted(() => {
  const unsubscribe = vi.fn<() => void>()
  return {
    getNotificationUnreadCount: vi.fn<() => Promise<number>>(),
    listNotifications: vi.fn<
      (query: { page: number; size: number; unreadOnly?: boolean }) => Promise<PageResponse<SystemNotification>>
    >(),
    markNotificationRead: vi.fn<(id: number) => Promise<boolean>>(),
    markAllNotificationsRead: vi.fn<() => Promise<number>>(),
    subscribeNotificationPush: vi.fn<(listener: NotificationPushListener) => () => void>(() => unsubscribe),
    unsubscribe,
  }
})

vi.mock('@/api/notification', () => ({
  getNotificationUnreadCount: mocks.getNotificationUnreadCount,
  listNotifications: mocks.listNotifications,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
}))
vi.mock('@/utils/notification-stream', () => ({
  subscribeNotificationPush: mocks.subscribeNotificationPush,
}))

/** el-popover 桩：渲染 reference 与默认插槽，open() 模拟入场完成 */
const ElPopoverStub = defineComponent({
  name: 'ElPopover',
  props: {
    visible: { type: Boolean, default: false },
    width: { type: Number, default: 0 },
    placement: { type: String, default: '' },
  },
  emits: ['after-enter'],
  setup(_, { slots, emit, expose }) {
    expose({
      open: () => {
        emit('after-enter')
      },
    })
    return () => h('div', { class: 'popover-stub' }, [slots.reference?.(), slots.default?.()])
  },
})

/** el-tooltip 桩：渲染默认插槽 */
const ElTooltipStub = defineComponent({
  name: 'ElTooltip',
  props: { content: { type: String, default: '' } },
  setup(_, { slots }) {
    return () => h('span', { class: 'tooltip-stub' }, slots.default?.())
  },
})

/** el-badge 桩：透传角标 props 供断言 */
const ElBadgeStub = defineComponent({
  name: 'ElBadge',
  props: {
    value: { type: [Number, String], default: '' },
    hidden: { type: Boolean, default: false },
    max: { type: Number, default: undefined },
  },
  setup(_, { slots }) {
    return () => h('span', { class: 'badge-stub' }, slots.default?.())
  },
})

/** el-button 桩：渲染原生 button 并转发 click */
const ElButtonStub = defineComponent({
  name: 'ElButton',
  props: { loading: { type: Boolean, default: false } },
  emits: ['click'],
  setup(_, { slots, emit }) {
    return () => h('button', { class: 'el-button-stub', onClick: () => emit('click') }, slots.default?.())
  },
})

/** el-empty 桩：透传 description 供断言 */
const ElEmptyStub = defineComponent({
  name: 'ElEmpty',
  props: { description: { type: String, default: '' }, imageSize: { type: Number, default: undefined } },
  setup: () => () => null,
})

const CENTER_STUBS = {
  ElPopover: ElPopoverStub,
  ElTooltip: ElTooltipStub,
  ElBadge: ElBadgeStub,
  ElButton: ElButtonStub,
  ElEmpty: ElEmptyStub,
  ElIcon: true,
}

/** 构造一条通知（createTime 固定，便于断言 formatTime 展示） */
function notification(id: number, readAt: string | null): SystemNotification {
  return {
    id,
    userId: 1,
    msgType: 'WELCOME',
    content: `通知 ${id}`,
    refType: null,
    refId: null,
    readAt,
    createTime: '2026-11-11T10:30:45',
    updateTime: '2026-11-11T10:30:45',
  }
}

/** 构造分页响应 */
function pageOf(list: SystemNotification[]): PageResponse<SystemNotification> {
  return { list, total: list.length, pageNum: 1, pageSize: 10, pages: 1 }
}

/** 挂载组件（v-loading 注册为空指令避免告警） */
function mountCenter() {
  const wrapper = mount(NotificationCenter, {
    global: { stubs: CENTER_STUBS, directives: { loading: {} } },
  })
  return { wrapper, badge: wrapper.findComponent(ElBadgeStub) }
}

/** 打开通知面板并模拟入场完成。 */
async function openPanel(wrapper: ReturnType<typeof mountCenter>['wrapper']) {
  const popover = wrapper.findComponent(ElPopoverStub)
  ;(popover.vm as unknown as { open: () => void }).open()
  await flushPromises()
  return popover
}

describe('NotificationCenter 未读角标与 SSE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('挂载即拉取未读数并以角标展示（上限 99）', async () => {
    mocks.getNotificationUnreadCount.mockResolvedValue(3)
    const { wrapper, badge } = mountCenter()
    await flushPromises()
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(1)
    expect(badge.props('value')).toBe(3)
    expect(badge.props('hidden')).toBe(false)
    expect(badge.props('max')).toBe(99)
    wrapper.unmount()
  })

  it('未读数为 0 或拉取失败时角标隐藏', async () => {
    mocks.getNotificationUnreadCount.mockResolvedValue(0)
    const first = mountCenter()
    await flushPromises()
    expect(first.badge.props('value')).toBe(0)
    expect(first.badge.props('hidden')).toBe(true)
    first.wrapper.unmount()

    mocks.getNotificationUnreadCount.mockRejectedValue(new Error('拉取失败'))
    const second = mountCenter()
    await flushPromises()
    expect(second.badge.props('value')).toBe(0)
    expect(second.badge.props('hidden')).toBe(true)
    second.wrapper.unmount()
  })

  it('挂载订阅 SSE 推送，卸载时退订', async () => {
    mocks.getNotificationUnreadCount.mockResolvedValue(0)
    const { wrapper } = mountCenter()
    await flushPromises()
    expect(mocks.subscribeNotificationPush).toHaveBeenCalledTimes(1)
    expect(typeof mocks.subscribeNotificationPush.mock.calls[0][0]).toBe('function')
    wrapper.unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('SSE 推送触发未读数刷新，面板未打开时不拉列表', async () => {
    mocks.getNotificationUnreadCount.mockResolvedValue(1)
    const { wrapper } = mountCenter()
    await flushPromises()

    const listener = mocks.subscribeNotificationPush.mock.calls[0][0] as NotificationPushListener
    listener('新通知到达')
    await flushPromises()

    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(2)
    expect(mocks.listNotifications).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('NotificationCenter 通知面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getNotificationUnreadCount.mockResolvedValue(2)
    mocks.listNotifications.mockResolvedValue(pageOf([]))
    mocks.markNotificationRead.mockResolvedValue(true)
    mocks.markAllNotificationsRead.mockResolvedValue(0)
  })

  it('面板打开时拉取最近通知列表并渲染时间与未读态', async () => {
    mocks.listNotifications.mockResolvedValue(
      pageOf([notification(1, null), notification(2, '2026-11-11T11:00:00')]),
    )
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)

    expect(mocks.listNotifications).toHaveBeenCalledWith({ page: 1, size: 10 })
    const items = wrapper.findAll('.notification-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('通知 1')
    expect(items[0].find('.item-time').text()).toBe('2026-11-11 10:30')
    expect(items[0].classes()).toContain('unread')
    expect(items[1].classes()).not.toContain('unread')
    wrapper.unmount()
  })

  it('通知列表拉取失败时展示空态', async () => {
    mocks.listNotifications.mockRejectedValue(new Error('拉取失败'))
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)
    expect(wrapper.findComponent(ElEmptyStub).props('description')).toBe('暂无通知')
    wrapper.unmount()
  })

  it('点击未读条目标记已读并刷新角标', async () => {
    mocks.listNotifications.mockResolvedValue(pageOf([notification(1, null)]))
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(1)

    await wrapper.findAll('.notification-item')[0].trigger('click')
    await flushPromises()

    expect(mocks.markNotificationRead).toHaveBeenCalledWith(1)
    expect(wrapper.findAll('.notification-item')[0].classes()).not.toContain('unread')
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('点击已读条目不重复发起已读请求', async () => {
    mocks.listNotifications.mockResolvedValue(pageOf([notification(2, '2026-11-11T11:00:00')]))
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)

    await wrapper.findAll('.notification-item')[0].trigger('click')
    await flushPromises()

    expect(mocks.markNotificationRead).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('全部已读后刷新角标与列表', async () => {
    mocks.listNotifications.mockResolvedValue(pageOf([notification(1, null)]))
    mocks.markAllNotificationsRead.mockResolvedValue(1)
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)

    const button = wrapper.find('.el-button-stub')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('全部已读')
    await button.trigger('click')
    await flushPromises()

    expect(mocks.markAllNotificationsRead).toHaveBeenCalledTimes(1)
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(2)
    expect(mocks.listNotifications).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('未读为 0 时不渲染全部已读按钮', async () => {
    mocks.getNotificationUnreadCount.mockResolvedValue(0)
    const { wrapper } = mountCenter()
    await flushPromises()
    await openPanel(wrapper)
    expect(wrapper.find('.el-button-stub').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('NotificationCenter 未读数轮询', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('每 60 秒轮询刷新未读数，卸载后停止', async () => {
    vi.useFakeTimers()
    mocks.getNotificationUnreadCount.mockResolvedValue(1)
    const { wrapper } = mountCenter()
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60000)
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(180000)
    expect(mocks.getNotificationUnreadCount).toHaveBeenCalledTimes(2)
  })
})
