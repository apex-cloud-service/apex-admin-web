/**
 * 办公会议室 API
 * ------------------------------------------------------------------
 * 后端接口（apex-office-service，前缀 /api/v2/office/meeting-rooms）：
 * - GET  /                         - 分页（pageNum/pageSize/status/keyword）
 * - GET  /enabled                  - 启用会议室列表
 * - GET  /available?startTime=&endTime= - 时间段可用会议室
 * - GET  /{roomId}                 - 详情
 * - POST /                         - 创建
 * - PUT  /{roomId}                 - 局部更新
 * - DELETE /{roomId}               - 删除
 * - POST /{roomId}/bookings        - 预订
 * - DELETE /{roomId}/bookings/{eventId} - 取消预订
 */
import { del, get, post, put } from '@/utils/request'
import type { PageResponse } from '@/types'

/** 会议室信息 */
export interface MeetingRoom {
  id: number
  tenantId?: string
  roomCode: string
  roomName: string
  capacity: number
  location?: string
  floor?: string
  /** 列表实际响应可能是 JSON 字符串；详情响应通常是数组 */
  equipment?: string | string[]
  status: 'ENABLED' | 'DISABLED' | string
  remark?: string
  createTime?: string
  updateTime?: string
  lockVersion?: number
}

/** 创建会议室请求 */
export interface CreateMeetingRoomPayload {
  roomCode: string
  roomName: string
  capacity: number
  location?: string
  floor?: string
  equipment?: string[]
  status?: 'ENABLED' | 'DISABLED'
  remark?: string
}

/** 更新会议室请求（全部可选的局部更新） */
export type UpdateMeetingRoomPayload = Partial<CreateMeetingRoomPayload>

/** 会议室预订请求 */
export interface BookMeetingRoomPayload {
  title?: string
  startTime: string
  endTime: string
}

/** 会议室预订响应 */
export interface MeetingRoomBooking {
  eventId: number
  meetingRoomId: number
  meetingRoomCode?: string
  title?: string
  organizerId?: string
  organizerName?: string
  startTime: string
  endTime: string
  status?: string
  location?: string
}

export interface MeetingRoomQuery {
  pageNum: number
  pageSize: number
  status?: string
  keyword?: string
}

/** 分页查询会议室（后端列表实际元素为 Entity，equipment 可能是 JSON 字符串） */
export function listMeetingRooms(query: MeetingRoomQuery): Promise<PageResponse<MeetingRoom>> {
  return get<PageResponse<MeetingRoom>>('/api/v2/office/meeting-rooms', query as unknown as Record<string, unknown>)
}

/** 查询启用会议室 */
export function listEnabledMeetingRooms(): Promise<MeetingRoom[]> {
  return get<MeetingRoom[]>('/api/v2/office/meeting-rooms/enabled')
}

/** 查询时间段可用会议室 */
export function listAvailableMeetingRooms(startTime: string, endTime: string): Promise<MeetingRoom[]> {
  return get<MeetingRoom[]>('/api/v2/office/meeting-rooms/available', { startTime, endTime })
}

export function getMeetingRoom(id: number): Promise<MeetingRoom> {
  return get<MeetingRoom>(`/api/v2/office/meeting-rooms/${id}`)
}

export function createMeetingRoom(payload: CreateMeetingRoomPayload): Promise<MeetingRoom> {
  return post<MeetingRoom>('/api/v2/office/meeting-rooms', payload)
}

export function updateMeetingRoom(id: number, payload: UpdateMeetingRoomPayload): Promise<MeetingRoom> {
  return put<MeetingRoom>(`/api/v2/office/meeting-rooms/${id}`, payload)
}

export function deleteMeetingRoom(id: number): Promise<boolean> {
  return del<boolean>(`/api/v2/office/meeting-rooms/${id}`)
}

export function bookMeetingRoom(id: number, payload: BookMeetingRoomPayload): Promise<MeetingRoomBooking> {
  return post<MeetingRoomBooking>(`/api/v2/office/meeting-rooms/${id}/bookings`, payload)
}

export function cancelMeetingRoomBooking(roomId: number, eventId: number): Promise<MeetingRoomBooking> {
  return del<MeetingRoomBooking>(`/api/v2/office/meeting-rooms/${roomId}/bookings/${eventId}`)
}
