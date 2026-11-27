/**
 * 办公会议室 API
 * ------------------------------------------------------------------
 * 后端接口（apex-office-service，前缀 /api/v2/office/meeting-rooms）：
 * - GET  /                         - 分页（pageNum/pageSize/status/keyword）
 * - GET  /available?startTime=&endTime= - 时间段可用会议室
 * - POST /                         - 创建
 * - PUT  /{roomId}                 - 局部更新
 * - DELETE /{roomId}               - 删除
 * - POST /{roomId}/bookings        - 预订
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
  /** 版本号（乐观锁预留；当前前端更新链路未回传该字段） */
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

/** 会议室分页查询参数 */
export interface MeetingRoomQuery {
  pageNum: number
  pageSize: number
  status?: string
  keyword?: string
}

/**
 * 分页查询会议室。
 * @param query pageNum/pageSize 与可选 status/keyword 筛选
 * @returns MeetingRoom 分页（list/total）；equipment 保留后端 JSON 字符串或数组形态，调用方需兼容
 */
export function listMeetingRooms(query: MeetingRoomQuery): Promise<PageResponse<MeetingRoom>> {
  return get<PageResponse<MeetingRoom>>('/api/v2/office/meeting-rooms', query as unknown as Record<string, unknown>)
}

/**
 * 查询给定时间段的可用会议室。
 * @param startTime 时间范围起点，原样作为 query 参数提交
 * @param endTime 时间范围终点，原样作为 query 参数提交
 * @returns 可用会议室数组，无分页总数；查询可用性本身不预订会议室
 */
export function listAvailableMeetingRooms(startTime: string, endTime: string): Promise<MeetingRoom[]> {
  return get<MeetingRoom[]>('/api/v2/office/meeting-rooms/available', { startTime, endTime })
}

/**
 * 创建会议室。
 * @param payload CreateMeetingRoomPayload，包含编码、名称、容量与可选设备等配置
 * @returns 创建后的 MeetingRoom，由调用方刷新列表
 */
export function createMeetingRoom(payload: CreateMeetingRoomPayload): Promise<MeetingRoom> {
  return post<MeetingRoom>('/api/v2/office/meeting-rooms', payload)
}

/**
 * 局部更新会议室。
 * @param id 会议室数字 ID
 * @param payload UpdateMeetingRoomPayload；本类型和调用链不携带 lockVersion
 * @returns 更新后的 MeetingRoom，不应据此声称实现了乐观锁保护
 */
export function updateMeetingRoom(id: number, payload: UpdateMeetingRoomPayload): Promise<MeetingRoom> {
  return put<MeetingRoom>(`/api/v2/office/meeting-rooms/${id}`, payload)
}

/**
 * 删除会议室。
 * @param id 会议室数字 ID
 * @returns 后端返回的删除布尔结果；操作确认与成功提示由调用方负责
 */
export function deleteMeetingRoom(id: number): Promise<boolean> {
  return del<boolean>(`/api/v2/office/meeting-rooms/${id}`)
}

/**
 * 提交会议室预订。
 * @param id 会议室数字 ID
 * @param payload 标题及起止时间；可用性与冲突由后端校验，本函数不做预检
 * @returns MeetingRoomBooking，包含创建的事件 ID 与预订信息
 */
export function bookMeetingRoom(id: number, payload: BookMeetingRoomPayload): Promise<MeetingRoomBooking> {
  return post<MeetingRoomBooking>(`/api/v2/office/meeting-rooms/${id}/bookings`, payload)
}

