/**
 * 办公会议室 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（分页 pageNum/pageSize、可用查询按
 * startTime/endTime、预订按 {roomId}/bookings；equipment JSON 字符串为响应契约，不涉端点）。
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
  bookMeetingRoom,
  createMeetingRoom,
  deleteMeetingRoom,
  listAvailableMeetingRooms,
  listMeetingRooms,
  updateMeetingRoom,
} from './meeting-room'

describe('办公会议室 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('分页查询透传 pageNum/pageSize 与状态/关键词', () => {
    listMeetingRooms({ pageNum: 1, pageSize: 10, status: 'ENABLED', keyword: 'Harbor' })
    expect(request.get).toHaveBeenCalledWith('/api/v2/office/meeting-rooms', {
      pageNum: 1,
      pageSize: 10,
      status: 'ENABLED',
      keyword: 'Harbor',
    })
  })

  it('可用会议室按时间段查询（startTime/endTime 走 query）', () => {
    listAvailableMeetingRooms('2026-11-13 09:00:00', '2026-11-13 11:00:00')
    expect(request.get).toHaveBeenCalledWith('/api/v2/office/meeting-rooms/available', {
      startTime: '2026-11-13 09:00:00',
      endTime: '2026-11-13 11:00:00',
    })
  })

  it('创建与局部更新提交会议室配置（equipment 为数组上行）', () => {
    const payload = {
      roomCode: 'MR-001',
      roomName: '海纳厅',
      capacity: 12,
      equipment: ['TV', 'WHITEBOARD'],
      status: 'ENABLED' as const,
    }
    createMeetingRoom(payload)
    updateMeetingRoom(3, { capacity: 16, status: 'DISABLED' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/meeting-rooms', payload)
    expect(request.put).toHaveBeenCalledWith('/api/v2/office/meeting-rooms/3', { capacity: 16, status: 'DISABLED' })
  })

  it('删除走 DELETE /{roomId}', () => {
    deleteMeetingRoom(3)
    expect(request.del).toHaveBeenCalledWith('/api/v2/office/meeting-rooms/3')
  })

  it('预订提交到 {roomId}/bookings（startTime/endTime 必填）', () => {
    const booking = { title: '周会', startTime: '2026-11-13 09:00:00', endTime: '2026-11-13 10:00:00' }
    bookMeetingRoom(3, booking)
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/meeting-rooms/3/bookings', booking)
  })
})
