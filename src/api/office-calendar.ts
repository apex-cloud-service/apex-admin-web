/**
 * 办公平台日历事件 API（/api/office/calendar/events）
 * ------------------------------------------------------------------
 * 用途：
 * 办公平台（飞书/钉钉/企业微信）日历事件的创建、查询、更新与删除。
 * 列表接口返回 PageResponse，查询参数使用 pageNum/pageSize。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post, put } from '@/utils/request'
import type { PageResponse } from '@/types'
import type { OfficePlatform } from './office-platform'

/** 日历事件状态 */
export type EventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'

/** 事件参与人 */
export interface EventAttendee {
  /** 用户ID */
  userId: string
  /** 用户名称 */
  userName: string
  /** 响应状态：ACCEPTED=已接受 DECLINED=已拒绝 TENTATIVE=待定 NEEDS_ACTION=待回复 */
  responseStatus: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION'
}

/** 日历事件信息 */
export interface CalendarEvent {
  /** 事件ID */
  id: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台事件ID */
  platformEventId: string
  /** 事件标题 */
  title: string
  /** 事件描述 */
  description?: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 地点 */
  location?: string
  /** 参与人ID列表 */
  attendeeIds: string[]
  /** 参与人信息列表 */
  attendees?: EventAttendee[]
  /** 事件状态 */
  status: EventStatus
  /** 是否全天事件 */
  allDay: boolean
  /** 提醒时间（分钟） */
  reminderMinutes?: number
  /** 日历ID */
  calendarId?: string
  /** 创建人ID */
  creatorId: string
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
}

/** 创建日历事件请求 */
export interface CreateEventRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 事件标题 */
  title: string
  /** 事件描述 */
  description?: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 地点 */
  location?: string
  /** 参与人ID列表 */
  attendeeIds: string[]
  /** 是否全天事件 */
  allDay: boolean
  /** 提醒时间（分钟） */
  reminderMinutes?: number
  /** 日历ID */
  calendarId?: string
}

/** 更新日历事件请求 */
export interface UpdateEventRequest {
  /** 事件标题 */
  title?: string
  /** 事件描述 */
  description?: string
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 地点 */
  location?: string
  /** 参与人ID列表 */
  attendeeIds?: string[]
  /** 是否全天事件 */
  allDay?: boolean
  /** 提醒时间（分钟） */
  reminderMinutes?: number
}

/** 日历事件查询参数 */
export interface CalendarEventsQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 日历ID（可选） */
  calendarId?: string
  /** 开始时间（查询此时间之后的事件） */
  startTime?: string
  /** 结束时间（查询此时间之前的事件） */
  endTime?: string
  /** 事件状态（可选） */
  status?: EventStatus
  /** 创建人ID（可选） */
  creatorId?: string
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 创建日历事件。
 * @param request 创建请求
 */
export function createCalendarEvent(request: CreateEventRequest): Promise<CalendarEvent> {
  return post<CalendarEvent>('/api/office/calendar/events', request)
}

/**
 * 查询日历事件详情。
 * @param eventId 事件ID
 */
export function getCalendarEvent(eventId: string): Promise<CalendarEvent> {
  return get<CalendarEvent>(`/api/office/calendar/events/${eventId}`)
}

/**
 * 更新日历事件。
 * @param eventId 事件ID
 * @param request 更新请求
 */
export function updateCalendarEvent(eventId: string, request: UpdateEventRequest): Promise<CalendarEvent> {
  return put<CalendarEvent>(`/api/office/calendar/events/${eventId}`, request)
}

/**
 * 删除（取消）日历事件。
 * @param eventId 事件ID
 */
export function deleteCalendarEvent(eventId: string): Promise<void> {
  return del<void>(`/api/office/calendar/events/${eventId}`)
}

/**
 * 查询日历事件列表。
 * @param query 查询参数
 */
export function getCalendarEvents(query: CalendarEventsQuery): Promise<PageResponse<CalendarEvent>> {
  return get<PageResponse<CalendarEvent>>('/api/office/calendar/events', query as any)
}
