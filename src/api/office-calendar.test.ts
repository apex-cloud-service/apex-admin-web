/**
 * 办公平台日历事件 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（列表分页 pageNum/pageSize、
 * 事件按字符串 eventId 拼路径、更新为局部字段 PUT）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('办公平台日历事件 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('创建事件以 POST 提交完整请求体', () => {
    const payload = {
      platform: 'DINGTALK' as const,
      title: '迭代评审',
      startTime: '2026-11-13 14:00:00',
      endTime: '2026-11-13 15:00:00',
      attendeeIds: ['u-1', 'u-2'],
      allDay: false,
      reminderMinutes: 15,
    }
    createCalendarEvent(payload)
    expect(request.post).toHaveBeenCalledWith('/api/office/calendar/events', payload)
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

  it('列表查询透传筛选条件与 pageNum/pageSize', () => {
    getCalendarEvents({
      platform: 'FEISHU',
      calendarId: 'cal-1',
      startTime: '2026-11-01 00:00:00',
      endTime: '2026-11-30 23:59:59',
      status: 'SCHEDULED',
      creatorId: 'u-1',
      pageNum: 1,
      pageSize: 20,
    })
    expect(request.get).toHaveBeenCalledWith('/api/office/calendar/events', {
      platform: 'FEISHU',
      calendarId: 'cal-1',
      startTime: '2026-11-01 00:00:00',
      endTime: '2026-11-30 23:59:59',
      status: 'SCHEDULED',
      creatorId: 'u-1',
      pageNum: 1,
      pageSize: 20,
    })
  })
})
