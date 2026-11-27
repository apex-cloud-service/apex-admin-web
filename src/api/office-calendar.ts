/**
 * 办公平台日历事件 API（/api/office/calendar/events）
 * ------------------------------------------------------------------
 * 用途：
 * 办公平台（飞书/钉钉/企业微信）日历事件的创建、查询、更新与删除。
 * 列表接口为裸数组，客户端按时间范围查询并在本地完成筛选与分页。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post, put } from '@/utils/request'
import type { PageResponse } from '@/types'
import type { OfficePlatform } from './office-platform'

/** 日历事件类型（后端 CalendarEventType 枚举；创建时必填） */
export type EventType = 'MEETING' | 'TASK' | 'REMINDER' | 'VACATION' | 'BIRTHDAY' | 'OTHER'

/** 事件类型中文名 */
export const EVENT_TYPE_NAMES: Record<EventType, string> = {
  MEETING: '会议',
  TASK: '任务',
  REMINDER: '提醒',
  VACATION: '假期',
  BIRTHDAY: '生日',
  OTHER: '其他',
}

/** 日历事件状态（与后端 CalendarEvent 实体一致：CONFIRMED/TENTATIVE/CANCELLED） */
export type EventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'

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
  /** 平台类型（后端存小写自由字符串，读取后归一为大写枚举） */
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
  /** 事件类型（后端必填） */
  eventType: EventType
  /** 组织者ID（后端必填，取当前登录用户） */
  organizerId: string
  /** 组织者姓名（后端必填，取当前登录用户） */
  organizerName: string
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
 *
 * 后端按 `<platform>CalendarClient` Bean 名选择实现；本函数将调用方的
 * 大写 OfficePlatform 枚举转换为小写 feishu/dingtalk/wecom 后再提交。
 *
 * @param request 创建请求，组织者和事件类型由调用方提供
 * @returns 后端创建的 CalendarEvent；本函数不对详情响应的 platform 字段再归一
 */
export function createCalendarEvent(request: CreateEventRequest): Promise<CalendarEvent> {
  return post<CalendarEvent>('/api/office/calendar/events', toWireEvent(request))
}

/** 平台枚举 → 后端要求的写路径小写标识。 */
function toWirePlatform(platform: OfficePlatform): string {
  return String(platform).toLowerCase()
}

/** 写请求体：平台转小写，其余字段原样透传。 */
function toWireEvent<T extends CreateEventRequest | UpdateEventRequest>(request: T): T {
  return 'platform' in request
    ? ({ ...request, platform: toWirePlatform(request.platform) } as T)
    : request
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
 *
 * 后端列表端点 `GET /api/office/calendar/events/range` 使用无时区的
 * `LocalDateTime` 参数，返回裸数组，不提供该端点的服务端分页与附加筛选。
 * 本函数转换时间格式，将列表中的平台标识归一为大写，再按平台/状态/
 * 日历/创建人筛选并切页；缺失的时间边界回退为浏览器本地自然月边界。
 *
 * @param query 查询参数；pageNum/pageSize 用于客户端分页，时间范围可选
 * @returns PageResponse：list 为当前页事件，total 为筛选后的全量事件数
 */
export async function getCalendarEvents(
  query: CalendarEventsQuery,
): Promise<PageResponse<CalendarEvent>> {
  const { startTime, endTime } = resolveRange(query.startTime, query.endTime)
  const events = await get<CalendarEvent[]>('/api/office/calendar/events/range', {
    startTime: toLocalDateTime(startTime),
    endTime: toLocalDateTime(endTime),
  })
  const platform = query.platform ? (String(query.platform).toUpperCase() as OfficePlatform) : undefined
  const filtered = toArray(events).filter(
    (event) =>
      (!platform || event.platform === platform) &&
      (!query.calendarId || event.calendarId === query.calendarId) &&
      (!query.status || event.status === query.status) &&
      (!query.creatorId || event.creatorId === query.creatorId),
  )
  const pageSize = Math.max(1, query.pageSize)
  const pages = Math.ceil(filtered.length / pageSize)
  const start = (Math.max(1, query.pageNum) - 1) * pageSize
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length,
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    pages,
    hasNext: query.pageNum < pages,
  }
}

/** 默认查询当前自然月；显式时间缺失时补齐边界，避免后端 LocalDateTime.parse 失败。 */
function resolveRange(startTime?: string, endTime?: string): { startTime: string; endTime: string } {
  const now = new Date()
  return {
    startTime: startTime || formatLocalDateTime(new Date(now.getFullYear(), now.getMonth(), 1)),
    endTime:
      endTime ||
      formatLocalDateTime(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)),
  }
}

/**
 * 转换为后端可解析的无时区 LocalDateTime 文本。
 *
 * Date 控件的值形如 `2026-11-17 09:30:00`，先补 `T`；带 `Z` 或
 * `+08:00` 偏移的时间按浏览器本地墙钟重新格式化，而不是粗暴删掉时区
 * 后缀，避免跨时区把 09:30 送成 01:30。
 */
function toLocalDateTime(value: string): string {
  const local = value.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(local)) {
    return local.length === 16 ? `${local}:00` : local
  }
  const parsed = new Date(local)
  return Number.isNaN(parsed.getTime()) ? local : formatLocalDateTime(parsed)
}

/** 按本地时间格式化为 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime 可直接解析）。 */
function formatLocalDateTime(date: Date): string {
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** 后端字段为裸数组；兼容空响应，但不把对象误当列表。 */
function toArray(value: CalendarEvent[] | undefined): CalendarEvent[] {
  return Array.isArray(value) ? value.map(normalizeEvent) : []
}

/** 后端平台列存小写（feishu/dingtalk/wecom），统一归一为大写枚举供页面比较与展示。 */
function normalizeEvent(event: CalendarEvent): CalendarEvent {
  return { ...event, platform: String(event.platform).toUpperCase() as OfficePlatform }
}
