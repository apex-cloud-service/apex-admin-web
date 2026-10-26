/**
 * 站内信与消息模板 API
 * ------------------------------------------------------------------
 * 后端接口（站内信，apex-office-service；inbox/sent 返回纯数组而非分页对象）：
 * - POST /api/v1/messages                - 发送站内信（recipientIds 为系统用户 ID 列表）
 * - GET  /api/v1/messages/inbox          - 收件箱（pageNum/pageSize，返回 MessageDTO 数组）
 * - GET  /api/v1/messages/sent           - 已发送（pageNum/pageSize，返回 MessageDTO 数组）
 * - GET  /api/v1/messages/{id}           - 消息详情
 * - PUT  /api/v1/messages/{id}/read      - 标记已读
 * - PUT  /api/v1/messages/read-all       - 全部已读
 * - GET  /api/v1/messages/unread/count   - 未读数
 * - POST /api/v1/messages/ws-ticket      - 签发 30 秒一次性 WebSocket 握手票据
 *
 * 后端接口（消息模板，管理端）：
 * - GET    /admin-api/v1/message-templates             - 启用中的模板列表（数组）
 * - POST   /admin-api/v1/message-templates             - 创建模板
 * - PUT    /admin-api/v1/message-templates/{templateId} - 更新模板
 * - DELETE /admin-api/v1/message-templates/{templateId} - 删除模板
 */
import { get, post, put, del } from '@/utils/request'
import type { InternalMessage, MessageTemplate, SendMessagePayload } from '@/types'

/** 消息类型 → 中文名称 */
export const MESSAGE_TYPE_NAMES: Record<string, string> = {
  SYSTEM: '系统',
  NOTICE: '通知',
  TASK: '任务',
  ALERT: '告警',
}

/** 优先级 → 中文名称 */
export const PRIORITY_NAMES: Record<string, string> = {
  LOW: '低',
  NORMAL: '普通',
  HIGH: '高',
  URGENT: '紧急',
}

/** 优先级 → 标签样式 */
export const PRIORITY_TAG_TYPES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  LOW: 'info',
  NORMAL: 'success',
  HIGH: 'warning',
  URGENT: 'danger',
}

/**
 * 发送站内信
 * @param payload 消息内容与接收人（系统用户 ID 列表，须为绑定办公员工的用户）
 * @returns 发送成功后的消息
 */
export function sendMessage(payload: SendMessagePayload): Promise<InternalMessage> {
  return post<InternalMessage>('/api/v1/messages', payload)
}

/**
 * 查询收件箱
 * @param pageNum 页码（从 1 开始）
 * @param pageSize 每页条数
 * @returns 当前页消息数组（后端不分页包装，total 以数组长度为准）
 */
export function listInboxMessages(pageNum: number, pageSize: number): Promise<InternalMessage[]> {
  return get<InternalMessage[]>('/api/v1/messages/inbox', { pageNum, pageSize })
}

/**
 * 查询已发送消息
 * @param pageNum 页码（从 1 开始）
 * @param pageSize 每页条数
 * @returns 当前页消息数组（后端不分页包装，total 以数组长度为准）
 */
export function listSentMessages(pageNum: number, pageSize: number): Promise<InternalMessage[]> {
  return get<InternalMessage[]>('/api/v1/messages/sent', { pageNum, pageSize })
}

/**
 * 查询消息详情
 * @param id 消息 ID
 */
export function getMessageDetail(id: number): Promise<InternalMessage> {
  return get<InternalMessage>(`/api/v1/messages/${id}`)
}

/**
 * 标记消息已读
 * @param id 消息 ID
 */
export function markMessageRead(id: number): Promise<void> {
  return put<void>(`/api/v1/messages/${id}/read`)
}

/**
 * 全部消息标记已读
 */
export function markAllMessagesRead(): Promise<void> {
  return put<void>('/api/v1/messages/read-all')
}

/**
 * 查询当前用户未读消息数
 */
export function getUnreadCount(): Promise<number> {
  return get<number>('/api/v1/messages/unread/count')
}

/**
 * 签发 WebSocket 握手票据（一次性，30 秒有效，仅供 utils/message-socket 消费）
 */
export function issueMessageSocketTicket(): Promise<{ ticket: string; expiresIn: number }> {
  return post<{ ticket: string; expiresIn: number }>('/api/v1/messages/ws-ticket')
}

/**
 * 查询启用中的消息模板
 * @returns 模板数组（后端无分页，返回全部启用模板）
 */
export function listMessageTemplates(): Promise<MessageTemplate[]> {
  return get<MessageTemplate[]>('/admin-api/v1/message-templates')
}

/**
 * 创建消息模板
 * @param payload 模板内容
 */
export function createMessageTemplate(payload: MessageTemplate): Promise<MessageTemplate> {
  return post<MessageTemplate>('/admin-api/v1/message-templates', payload)
}

/**
 * 更新消息模板
 * @param templateId 模板 ID
 * @param payload 模板内容
 */
export function updateMessageTemplate(
  templateId: number,
  payload: MessageTemplate,
): Promise<MessageTemplate> {
  return put<MessageTemplate>(`/admin-api/v1/message-templates/${templateId}`, payload)
}

/**
 * 删除消息模板
 * @param templateId 模板 ID
 */
export function deleteMessageTemplate(templateId: number): Promise<void> {
  return del<void>(`/admin-api/v1/message-templates/${templateId}`)
}
