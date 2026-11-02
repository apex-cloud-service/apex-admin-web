/**
 * 统一通知门面 API（模板与投递留痕）
 * ------------------------------------------------------------------
 * 后端接口（apex-office-service OfficeNotifyRouter，前缀 /api/v2/office/notify）：
 * - GET    /templates                - 模板分页（channel/keyword 过滤，pageNum/pageSize）
 * - POST   /templates                - 创建模板
 * - GET    /templates/{templateId}   - 模板详情
 * - PUT    /templates/{templateId}   - 更新模板
 * - DELETE /templates/{templateId}   - 删除模板
 * - GET    /requests                 - 投递留痕分页（channel/templateCode/status 过滤）
 *
 * 权限码：office:notify:template:read / office:notify:template:manage / office:notify:record:read。
 * 按模板投递走内部契约 POST /internal/v1/notify（集群内直连，不经网关，无管理端入口）。
 */
import { del, get, post, put } from '@/utils/request'
import type {
  NotifyRequestRecord,
  NotifyTemplate,
  NotifyTemplateCreatePayload,
  NotifyTemplateUpdatePayload,
  PageResponse,
} from '@/types'

/** 通知通道 → 中文名称 */
export const NOTIFY_CHANNEL_NAMES: Record<string, string> = {
  INBOX: '站内信',
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企业微信',
  SMS: '短信',
  EMAIL: '邮件',
}

/** 投递状态 → 中文名称与标签样式 */
export const NOTIFY_STATUS_META: Record<string, { label: string; tag: 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING: { label: '待投递', tag: 'warning' },
  SUCCESS: { label: '成功', tag: 'success' },
  FAILED: { label: '失败', tag: 'danger' },
}

/** 模板分页查询参数 */
export interface NotifyTemplateQuery {
  pageNum: number
  pageSize: number
  /** 通道过滤 */
  channel?: string
  /** 编码/名称关键字 */
  keyword?: string
}

/** 投递留痕查询参数 */
export interface NotifyRecordQuery {
  pageNum: number
  pageSize: number
  channel?: string
  templateCode?: string
  /** PENDING / SUCCESS / FAILED */
  status?: string
}

/**
 * 分页查询通知模板
 * @param query 通道、关键字与分页
 */
export function listNotifyTemplates(query: NotifyTemplateQuery): Promise<PageResponse<NotifyTemplate>> {
  return get<PageResponse<NotifyTemplate>>(
    '/api/v2/office/notify/templates',
    query as unknown as Record<string, unknown>,
  )
}

/**
 * 查询通知模板详情
 * @param templateId 模板 ID
 */
export function getNotifyTemplate(templateId: number): Promise<NotifyTemplate> {
  return get<NotifyTemplate>(`/api/v2/office/notify/templates/${templateId}`)
}

/**
 * 创建通知模板
 * @param payload 模板编码、通道与正文
 */
export function createNotifyTemplate(payload: NotifyTemplateCreatePayload): Promise<NotifyTemplate> {
  return post<NotifyTemplate>('/api/v2/office/notify/templates', payload)
}

/**
 * 更新通知模板
 * @param templateId 模板 ID
 * @param payload 变更字段
 */
export function updateNotifyTemplate(
  templateId: number,
  payload: NotifyTemplateUpdatePayload,
): Promise<NotifyTemplate> {
  return put<NotifyTemplate>(`/api/v2/office/notify/templates/${templateId}`, payload)
}

/**
 * 删除通知模板
 * @param templateId 模板 ID
 */
export function deleteNotifyTemplate(templateId: number): Promise<void> {
  return del<void>(`/api/v2/office/notify/templates/${templateId}`)
}

/**
 * 分页查询投递留痕
 * @param query 通道、模板编码、状态与分页
 */
export function listNotifyRecords(query: NotifyRecordQuery): Promise<PageResponse<NotifyRequestRecord>> {
  return get<PageResponse<NotifyRequestRecord>>(
    '/api/v2/office/notify/requests',
    query as unknown as Record<string, unknown>,
  )
}
