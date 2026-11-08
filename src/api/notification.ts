/**
 * 站内通知 API（system 域 /api/v1/notifications 命名空间）
 * ------------------------------------------------------------------
 * 后端为 apex-system 的 SystemMessageRouter + NotificationRouter（78ce5060 起可用）。
 * 与 office 域的站内信（/api/v1/messages/**，面向人工消息）是两套独立通道：
 * 本模块面向系统事件通知（注册欢迎、订阅变更等业务侧推送）。
 *
 * 实时推送走 SSE（GET /api/v1/notifications/stream），因网关仅认 Authorization 头、
 * 原生 EventSource 无法自定义请求头，流式订阅由 utils/notification-stream.ts 以
 * fetch + ReadableStream 实现，本文件只封装 4 个 REST 端点。
 *
 * 分页口径：page/size + PageResponse{list, total}；unreadOnly 仅返回未读。
 */
import { get, post } from '@/utils/request'
import type { PageResponse } from '@/types'

/** 站内通知条目（SystemMessageEntity 序列化字段） */
export interface SystemNotification {
  /** 消息 ID（数字主键） */
  id: number
  /** 归属用户 ID */
  userId: number
  /** 消息类型（如 WELCOME、订阅类事件码） */
  msgType: string
  /** 通知正文（纯文本，与 SSE 推送的 data 一致） */
  content: string
  /** 关联业务类型 */
  refType: string | null
  /** 关联业务 ID */
  refId: number | null
  /** 已读时间；null 表示未读 */
  readAt: string | null
  createTime: string
  updateTime: string
}

/** 通知收件箱查询参数（page/size 必填，unreadOnly 可选） */
export interface NotificationInboxQuery {
  page: number
  size: number
  unreadOnly?: boolean
}

/**
 * 分页查询当前用户的通知收件箱。
 * @param query 分页与过滤参数
 * @returns 分页数据（PageResponse 包装）
 */
export function listNotifications(query: NotificationInboxQuery): Promise<PageResponse<SystemNotification>> {
  return get<PageResponse<SystemNotification>>('/api/v1/notifications/inbox', { ...query })
}

/**
 * 查询当前用户未读通知数量（用于角标展示）。
 * @returns 未读数量
 */
export function getNotificationUnreadCount(): Promise<number> {
  return get<number>('/api/v1/notifications/unread-count')
}

/**
 * 将单条通知标记为已读（幂等）。
 * @param id 通知 ID（数字主键）
 * @returns 本次是否由未读转为已读
 */
export function markNotificationRead(id: number): Promise<boolean> {
  return post<boolean>(`/api/v1/notifications/${id}/read`)
}

/**
 * 将当前用户全部未读通知标记为已读。
 * @returns 本次实际标记的条数
 */
export function markAllNotificationsRead(): Promise<number> {
  return post<number>('/api/v1/notifications/read-all')
}
