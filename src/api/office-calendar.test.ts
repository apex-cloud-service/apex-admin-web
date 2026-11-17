/**
 * 办公平台日历事件 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（事件按字符串 eventId 拼路径、更新为
 * 局部字段 PUT）；列表走真实 /range 端点，无时区 LocalDateTime、客户端筛选与
 * 真分页、默认当前月边界。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from './office-calendar'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from './office-calendar'

/** 构造日历事件（仅填充断言关心的字段）。 */
function event(id: string, platform: 'FEISHU' | 'DINGTALK' = 'FEISHU'): CalendarEvent {
  return {
    id,
    platform,
    platformEventId: `p-${id}`,
    title: id,
    startTime: '2026-11-17T09:00:00',
    endTime: '2026-11-17T10:00:00',
    attendeeIds: [],
    status: 'CONFIRMED',
    allDay: false,
    creatorId: '42',
  }
}

describe('办公平台日历事件 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 17, 9, 30, 0))
  })

  afterEach(() => vi.useRealTimers())

  it('创建事件携带后端必填的 eventType/organizerId/organizerName', () => {
    const payload = {
      platform: 'DINGTALK' as const,
      eventType: 'MEETING' as const,
      organizerId: '1001',
      organizerName: '系统管理员',
      title: '迭代评审',
      startTime: '2026-11-13 14:00:00',
      endTime: '2026-11-13 15:00:00',
      attendeeIds: ['u-1', 'u-2'],
      allDay: false,
      reminderMinutes: 15,
    }
    createCalendarEvent(payload)
    // 平台必须转小写：后端按 <platform>CalendarClient Bean 名选择实现，大写返回 400
    expect(request.post).toHaveBeenCalledWith('/api/office/calendar/events', {
      ...payload,
      platform: 'dingtalk',
    })
    // 回归：这三项后端 @NotBlank，缺失会 400（真实联调已复现）
    const body = request.post.mock.calls[0][1] as Record<string, unknown>
    expect(body.eventType).toBe('MEETING')
    expect(body.organizerId).toBe('1001')
    expect(body.organizerName).toBe('系统管理员')
  })

  it('详情与删除按字符串 eventId 拼路径', () => {
    getCalendarEvent('evt-42')
    deleteCalendarEvent('evt-42')
    expect(request.get).toHaveBeenCalledWith('/api/office/calendar/events/evt-42')
    expect(request.del).toHaveBeenCalledWith('/api/office/calendar/events/evt-42')
  })

  it('更新事件为 PUT 局部字段', () => {
    updateCalendarEvent('evt-42', { title: '迭代评审（改期）', startTime: '2026-11-14 10:00:00' })
    expect(request.put).toHaveBeenCalledWith('/api/office/calendar/events/evt-42', {
      title: '迭代评审（改期）',
      startTime: '2026-11-14 10:00:00',
    })
  })

  it('列表查询走 /range：空格转 T、UTC 时间换算本地墙钟而非删后缀', async () => {
    request.get.mockResolvedValueOnce([])
    await getCalendarEvents({
      startTime: '2026-11-17 00:00:00',
      endTime: '2026-11-30T23:59:59.000Z',
      pageNum: 1,
      pageSize: 20,
    })
    const [, params] = request.get.mock.calls[0]
    expect(request.get.mock.calls[0][0]).toBe('/api/office/calendar/events/range')
    // 断言不依赖机器时区：期望值为同一 UTC 时刻的本地墙钟格式化结果
    const local = new Date('2026-11-30T23:59:59.000Z')
    const pad = (value: number): string => String(value).padStart(2, '0')
    const expectedEnd =
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
      `T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`
    expect(params.startTime).toBe('2026-11-17T00:00:00')
    expect(params.endTime).toBe(expectedEnd)
    // 关键回归：不是粗暴删掉 Z 得到 23:59:59
    expect(params.endTime.endsWith('Z')).toBe(false)
  })

  it('未选时间时默认当前自然月起止（本地时间，无时区后缀）', async () => {
    request.get.mockResolvedValueOnce([])
    await getCalendarEvents({ pageNum: 1, pageSize: 20 })
    expect(request.get.mock.calls[0][1]).toEqual({
      startTime: '2026-11-01T00:00:00',
      endTime: '2026-11-30T23:59:59',
    })
  })

  it('平台/日历/状态/创建人筛选后才切页，total 为筛选后全量', async () => {
    request.get.mockResolvedValueOnce([
      { ...event('e1'), calendarId: 'cal-1' },
      { ...event('e2', 'DINGTALK'), calendarId: 'cal-1' },
      { ...event('e3'), calendarId: 'cal-2' },
      { ...event('e4'), calendarId: 'cal-1', status: 'CANCELLED' },
      { ...event('e5'), calendarId: 'cal-1' },
    ])
    const result = await getCalendarEvents({
      platform: 'FEISHU',
      calendarId: 'cal-1',
      status: 'CONFIRMED',
      creatorId: '42',
      pageNum: 2,
      pageSize: 1,
    })
    expect(result.list.map((item) => item.id)).toEqual(['e5'])
    expect(result.total).toBe(2)
    expect(result.pages).toBe(2)
    expect(result.hasNext).toBe(false)
  })

  it('空响应与越界页返回空列表而非异常', async () => {
    request.get.mockResolvedValueOnce([event('e1')])
    const result = await getCalendarEvents({ pageNum: 9, pageSize: 20 })
    expect(result.list).toEqual([])
    expect(result.total).toBe(1)
    expect(result.hasNext).toBe(false)
  })
})
