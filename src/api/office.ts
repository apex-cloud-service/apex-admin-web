/**
 * 办公平台 API
 * ------------------------------------------------------------------
 * 覆盖：飞书/钉钉/企业微信三大平台的状态查询、登录授权、回调处理、
 * 平台配置管理、账号绑定审批/解绑、组织通讯录同步、消息发送、
 * 审批/日历/文件等办公操作台能力。
 *
 * 后端接口前缀：
 *   - 公开接口 /api/v1/office/*（登录页、平台回调使用，无需登录态）
 *   - 管理接口 /admin-api/v1/office/*（管理后台操作，需登录态）
 */
import { del, get, post, put } from '@/utils/request'
import type { LoginResult, PageQuery, PageResponse } from '@/types'

/** 办公平台类型：FEISHU=飞书 DINGTALK=钉钉 WECOM=企业微信 */
export type OfficePlatform = 'FEISHU' | 'DINGTALK' | 'WECOM'

/** 平台启用状态 */
export interface OfficePlatformStatus {
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台中文名 */
  displayName: string
  /** 是否已启用 */
  enabled: boolean
  /** 是否已完成配置 */
  configured: boolean
  /** 当前绑定的应用名称（未配置时为空） */
  appName?: string
  /** 最近一次连通性测试是否成功 */
  connected?: boolean
  /** 最近一次测试时间 */
  lastTestTime?: string
}

/** 平台配置（管理端编辑/查看，密钥以引用形式存储，不回显明文） */
export interface OfficePlatformConfig {
  /** 平台类型 */
  platform: OfficePlatform
  /** 应用 ID（飞书 App ID / 钉钉 AppKey / 企微 CorpID） */
  appId: string
  /** 应用密钥引用标识（后端不返回明文，仅返回引用 Key 用于展示是否已设置） */
  secretReference?: string
  /** 回调地址（OAuth2 授权回调） */
  redirectUri: string
  /** 签名密钥引用标识（用于校验事件回调签名，不回显明文） */
  signingSecretReference?: string
  /** 是否启用 */
  enabled: boolean
  /** 授权范围（空格分隔，如 contact message calendar） */
  scopes: string[]
  /** 额外配置项（不同平台差异字段，JSON 透传） */
  extras?: Record<string, unknown>
}

/** 账号绑定记录（用户 ↔ 第三方办公平台账号） */
export interface OfficeBinding {
  /** 绑定记录 ID */
  id: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台用户唯一标识（openId / unionId） */
  platformUserId: string
  /** 平台用户名称 */
  platformUserName?: string
  /** 平台用户头像 */
  platformAvatar?: string
  /** 平台 unionId（跨应用统一标识，可选） */
  platformUnionId?: string
  /** 本系统用户 ID */
  userId?: string
  /** 本系统用户昵称 */
  userNickname?: string
  /** 绑定状态：PENDING=待审批 APPROVED=已通过 REJECTED=已驳回 UNBOUND=已解绑 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNBOUND'
  /** 绑定时间 */
  bindTime?: string
  /** 审批时间 */
  approveTime?: string
  /** 审批人 */
  approverName?: string
  /** 最近一次同步时间 */
  lastSyncTime?: string
}

/** 组织通讯录同步状态 */
export interface OfficeSyncStatus {
  /** 平台类型 */
  platform: OfficePlatform
  /** 是否正在同步中 */
  syncing: boolean
  /** 同步进度（0~100，syncing=false 时为上次完成进度） */
  progress: number
  /** 最近一次同步开始时间 */
  lastStartTime?: string
  /** 最近一次同步完成时间 */
  lastFinishTime?: string
  /** 最近一次同步是否成功 */
  lastSuccess?: boolean
  /** 最近一次同步错误信息 */
  lastError?: string
  /** 已同步部门数量 */
  deptCount: number
  /** 已同步成员数量 */
  memberCount: number
  /** 上次同步新增数 */
  addedCount?: number
  /** 上次同步更新数 */
  updatedCount?: number
  /** 上次同步删除数 */
  removedCount?: number
}

/** 消息发送请求体 */
export interface OfficeMessageRequest {
  /** 目标平台 */
  platform: OfficePlatform
  /** 接收人类型：user=用户 chat=群聊 */
  receiverType: 'user' | 'chat'
  /** 接收人标识（userId / chatId，多个以逗号分隔） */
  receiverIds: string
  /** 消息类型：text=文本 markdown=Markdown link=链接 card=卡片 */
  msgType: 'text' | 'markdown' | 'link' | 'card'
  /** 消息内容（text/markdown 为正文；link/card 为 JSON 字符串） */
  content: string
}

/** 审批单据（从办公平台拉取的待办/已办审批） */
export interface OfficeApproval {
  /** 审批实例 ID（平台侧） */
  approvalId: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 审批单名称 */
  title: string
  /** 发起人名称 */
  initiatorName: string
  /** 发起人部门 */
  initiatorDept?: string
  /** 审批状态：PENDING=待审批 APPROVED=已通过 REJECTED=已驳回 CANCELED=已撤回 */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'
  /** 发起时间 */
  createTime?: string
  /** 当前审批节点名称 */
  currentNodeName?: string
  /** 审批单链接 */
  approvalUrl?: string
}

/** 日历日程事件 */
export interface OfficeCalendarEvent {
  /** 事件 ID */
  eventId: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 日程标题 */
  summary: string
  /** 日程描述 */
  description?: string
  /** 开始时间（ISO8601） */
  startTime: string
  /** 结束时间（ISO8601） */
  endTime: string
  /** 是否全天事件 */
  allDay?: boolean
  /** 地点 */
  location?: string
  /** 组织者名称 */
  organizerName?: string
  /** 参会人数量 */
  attendeeCount?: number
  /** 日程链接 */
  eventUrl?: string
}

/** 文件信息（办公平台云盘文件） */
export interface OfficeFile {
  /** 文件 ID（平台侧） */
  fileId: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 文件名 */
  name: string
  /** 文件类型：file=文件 folder=文件夹 */
  type: 'file' | 'folder'
  /** 文件大小（字节，文件夹为 0） */
  size?: number
  /** MIME 类型 */
  mimeType?: string
  /** 上传/修改时间 */
  updateTime?: string
  /** 创建者名称 */
  ownerName?: string
  /** 下载链接（临时，带过期时间） */
  downloadUrl?: string
  /** 父目录 ID */
  parentId?: string
}

/** 绑定列表查询参数 */
export interface OfficeBindingQuery extends PageQuery {
  /** 平台筛选 */
  platform?: OfficePlatform
  /** 状态筛选 */
  status?: string
  /** 关键字（用户名/openId） */
  keyword?: string
}

/** 审批列表查询参数 */
export interface OfficeApprovalQuery extends PageQuery {
  /** 平台筛选 */
  platform?: OfficePlatform
  /** 审批状态 */
  status?: string
}

/** 日历日程查询参数 */
export interface OfficeCalendarQuery {
  /** 平台 */
  platform: OfficePlatform
  /** 开始时间（ISO8601） */
  startTime: string
  /** 结束时间（ISO8601） */
  endTime: string
}

/** 文件列表查询参数 */
export interface OfficeFileQuery {
  /** 平台 */
  platform: OfficePlatform
  /** 父目录 ID（不传则查根目录） */
  parentId?: string
  /** 关键字 */
  keyword?: string
}

/** 连通性测试结果 */
export interface OfficeConnectivityResult {
  /** 是否连通 */
  success: boolean
  /** 提示信息 */
  message: string
  /** 响应耗时（毫秒） */
  latency?: number
}

/** 同步触发请求 */
export interface OfficeSyncTriggerRequest {
  /** 平台 */
  platform: OfficePlatform
  /** 是否试运行（不落库） */
  dryRun: boolean
}

/** 办公平台登录请求参数 */
export interface OfficeLoginRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 回调地址（OAuth2 授权回调） */
  redirectUri: string
  /** 防 CSRF 状态码 */
  state?: string
}

/** 办公平台登录响应（返回授权 URL 由前端重定向） */
export interface OfficeLoginResult {
  /** 平台授权 URL（前端 window.location.href 跳转） */
  authorizeUrl: string
  /** 服务端生成的 state（前端回调时回传） */
  state: string
}

/** 办公平台回调处理结果（含登录 Token） */
export interface OfficeCallbackResult extends LoginResult {
  /** 平台类型 */
  platform?: OfficePlatform
  /** 是否新绑定 */
  isNewBinding?: boolean
}

/**
 * 查询全部办公平台启用状态（登录页/首页用于判断是否展示平台登录入口）。
 * 公开接口，无需登录态。
 */
export function getPlatformStatus(): Promise<OfficePlatformStatus[]> {
  return get<OfficePlatformStatus[]>('/api/v1/office/status')
}

/**
 * 发起办公平台登录（获取平台授权 URL）。
 * 公开接口，登录页调用，前端跳转至返回的 authorizeUrl。
 * @param request 登录请求参数
 */
export function startOfficeLogin(request: OfficeLoginRequest): Promise<OfficeLoginResult> {
  return post<OfficeLoginResult>(`/api/v1/office/login/${request.platform}`, {
    redirectUri: request.redirectUri,
    state: request.state,
  })
}

/**
 * 办公平台授权回调处理（平台授权后重定向回前端，前端调用此接口换取登录态）。
 * 公开接口，无需登录态。
 * @param platform 平台类型
 * @param code 授权码
 * @param state 防 CSRF 状态码
 */
export function officeCallback(
  platform: OfficePlatform,
  code: string,
  state: string,
): Promise<OfficeCallbackResult> {
  return post<OfficeCallbackResult>(`/api/v1/office/callback/${platform}`, { code, state })
}

/**
 * 查询单个平台配置（管理端）。
 * @param platform 平台类型
 */
export function getPlatformConfig(platform: OfficePlatform): Promise<OfficePlatformConfig> {
  return get<OfficePlatformConfig>(`/admin-api/v1/office/config/${platform}`)
}

/**
 * 保存平台配置（管理端）。
 * @param platform 平台类型
 * @param config 配置内容
 */
export function savePlatformConfig(
  platform: OfficePlatform,
  config: OfficePlatformConfig,
): Promise<void> {
  return put<void>(`/admin-api/v1/office/config/${platform}`, config)
}

/**
 * 测试平台连通性（管理端，校验 appId/secret 是否可用）。
 * @param platform 平台类型
 */
export function testConnectivity(platform: OfficePlatform): Promise<OfficeConnectivityResult> {
  return post<OfficeConnectivityResult>(`/admin-api/v1/office/config/${platform}/test`)
}

/**
 * 分页查询账号绑定列表（管理端）。
 * @param params 查询参数
 */
export function getBindings(
  params: OfficeBindingQuery,
): Promise<PageResponse<OfficeBinding>> {
  return get<PageResponse<OfficeBinding>>(
    '/admin-api/v1/office/bindings',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 审批通过绑定申请（管理端）。
 * @param id 绑定记录 ID
 */
export function approveBinding(id: string): Promise<void> {
  return post<void>(`/admin-api/v1/office/bindings/${id}/approve`)
}

/**
 * 驳回绑定申请（管理端）。
 * @param id 绑定记录 ID
 * @param reason 驳回原因
 */
export function rejectBinding(id: string, reason?: string): Promise<void> {
  return post<void>(`/admin-api/v1/office/bindings/${id}/reject`, { reason })
}

/**
 * 解除绑定（管理端）。
 * @param id 绑定记录 ID
 */
export function unbindBinding(id: string): Promise<void> {
  return del<void>(`/admin-api/v1/office/bindings/${id}`)
}

/**
 * 查询组织通讯录同步状态（管理端）。
 * @param platform 平台类型
 */
export function getSyncStatus(platform: OfficePlatform): Promise<OfficeSyncStatus> {
  return get<OfficeSyncStatus>(`/admin-api/v1/office/sync/${platform}/status`)
}

/**
 * 触发组织通讯录同步（管理端）。
 * @param request 同步触发请求
 */
export function triggerSync(request: OfficeSyncTriggerRequest): Promise<OfficeSyncStatus> {
  return post<OfficeSyncStatus>(`/admin-api/v1/office/sync/${request.platform}/trigger`, {
    dryRun: request.dryRun,
  })
}

/**
 * 发送消息到办公平台（管理端）。
 * @param request 消息发送请求
 */
export function sendMessage(request: OfficeMessageRequest): Promise<void> {
  return post<void>('/admin-api/v1/office/messages/send', request)
}

/**
 * 分页查询审批列表（管理端）。
 * @param params 查询参数
 */
export function getApprovals(
  params: OfficeApprovalQuery,
): Promise<PageResponse<OfficeApproval>> {
  return get<PageResponse<OfficeApproval>>(
    '/admin-api/v1/office/approvals',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 查询日历日程列表（管理端）。
 * @param params 查询参数
 */
export function getCalendarEvents(params: OfficeCalendarQuery): Promise<OfficeCalendarEvent[]> {
  return get<OfficeCalendarEvent[]>(
    '/admin-api/v1/office/calendar/events',
    params as unknown as Record<string, unknown>,
  )
}

/**
 * 查询文件列表（管理端，办公平台云盘）。
 * @param params 查询参数
 */
export function getFiles(params: OfficeFileQuery): Promise<OfficeFile[]> {
  return get<OfficeFile[]>(
    '/admin-api/v1/office/files',
    params as unknown as Record<string, unknown>,
  )
}
// ==================== 消息发送 API ====================

/** 消息记录详情 */
export interface MessageRecord {
  /** 消息ID */
  messageId: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 消息类型：TEXT, IMAGE, FILE, CARD */
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'CARD'
  /** 接收人类型：user=用户, group=群组 */
  receiverType: 'user' | 'group'
  /** 接收人ID */
  receiverId: string
  /** 接收人名称 */
  receiverName?: string
  /** 消息内容 */
  content: string
  /** 发送状态：SUCCESS, FAILED, PENDING */
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  /** 发送时间 */
  sendTime: string
  /** 错误信息 */
  errorMessage?: string
}

/** 发送文本消息请求 */
export interface SendTextMessageRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 接收人类型 */
  receiverType: 'user' | 'group'
  /** 接收人ID */
  receiverId: string
  /** 消息内容 */
  content: string
}

/** 发送图片消息请求 */
export interface SendImageMessageRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 接收人类型 */
  receiverType: 'user' | 'group'
  /** 接收人ID */
  receiverId: string
  /** 图片URL */
  imageUrl: string
}

/** 发送文件消息请求 */
export interface SendFileMessageRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 接收人类型 */
  receiverType: 'user' | 'group'
  /** 接收人ID */
  receiverId: string
  /** 文件URL */
  fileUrl: string
  /** 文件名 */
  fileName: string
}

/** 发送卡片消息请求 */
export interface SendCardMessageRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 接收人类型 */
  receiverType: 'user' | 'group'
  /** 接收人ID */
  receiverId: string
  /** 卡片内容（JSON字符串） */
  cardContent: string
}

/**
 * 发送文本消息。
 * @param request 发送请求
 */
export function sendTextMessage(request: SendTextMessageRequest): Promise<{ messageId: string }> {
  return post<{ messageId: string }>('/api/office/messages/text', request)
}

/**
 * 发送图片消息。
 * @param request 发送请求
 */
export function sendImageMessage(request: SendImageMessageRequest): Promise<{ messageId: string }> {
  return post<{ messageId: string }>('/api/office/messages/image', request)
}

/**
 * 发送文件消息。
 * @param request 发送请求
 */
export function sendFileMessage(request: SendFileMessageRequest): Promise<{ messageId: string }> {
  return post<{ messageId: string }>('/api/office/messages/file', request)
}

/**
 * 发送卡片消息。
 * @param request 发送请求
 */
export function sendCardMessage(request: SendCardMessageRequest): Promise<{ messageId: string }> {
  return post<{ messageId: string }>('/api/office/messages/card', request)
}

/**
 * 查询消息记录。
 * @param messageId 消息ID
 */
export function getMessageRecord(messageId: string): Promise<MessageRecord> {
  return get<MessageRecord>(`/api/office/messages/${messageId}`)
}

/** 已发送消息查询参数 */
export interface SentMessagesQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 消息类型（可选） */
  messageType?: string
  /** 发送状态（可选） */
  status?: string
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 查询已发送消息列表。
 * @param query 查询参数
 */
export function getSentMessages(query: SentMessagesQuery): Promise<PageResponse<MessageRecord>> {
  return get<PageResponse<MessageRecord>>('/api/office/messages/sent', query as any)
}

// ==================== 审批对接 API ====================

/** 审批状态 */
export type ApprovalStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'TRANSFERRED'

/** 审批流程详情 */
export interface ApprovalProcess {
  /** 流程实例ID */
  processInstanceId: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台审批实例ID */
  platformInstanceId: string
  /** 审批定义代码 */
  approvalCode: string
  /** 审批标题 */
  title: string
  /** 发起人ID */
  initiatorId: string
  /** 发起人名称 */
  initiatorName?: string
  /** 审批状态 */
  status: ApprovalStatus
  /** 审批记录列表 */
  records: ApprovalRecord[]
  /** 审批表单数据（JSON字符串） */
  formData: string
  /** 发起时间 */
  initiateTime: string
  /** 完成时间 */
  finishTime?: string
}

/** 审批记录 */
export interface ApprovalRecord {
  /** 审批人ID */
  approverId: string
  /** 审批人名称 */
  approverName: string
  /** 审批动作：APPROVE=通过, REJECT=拒绝, TRANSFER=转审, ADD_SIGN=加签 */
  action: 'APPROVE' | 'REJECT' | 'TRANSFER' | 'ADD_SIGN'
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  approveTime: string
}

/** 发起审批请求 */
export interface InitiateApprovalRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 审批定义代码 */
  approvalCode: string
  /** 审批标题 */
  title: string
  /** 发起人ID */
  initiatorId: string
  /** 审批表单数据（JSON字符串） */
  formData: string
  /** 审批人ID列表（逗号分隔） */
  approverIds?: string
}

/** 执行审批操作请求 */
export interface ApproveProcessRequest {
  /** 审批人ID */
  approverId: string
  /** 审批动作 */
  action: 'APPROVE' | 'REJECT' | 'TRANSFER' | 'ADD_SIGN'
  /** 审批意见 */
  comment?: string
  /** 转审目标审批人ID（action=TRANSFER时必填） */
  targetApproverId?: string
}

/**
 * 发起审批流程。
 * @param request 发起请求
 */
export function initiateApproval(request: InitiateApprovalRequest): Promise<ApprovalProcess> {
  return post<ApprovalProcess>('/api/office/approvals', request)
}

/**
 * 查询审批详情。
 * @param processInstanceId 流程实例ID
 */
export function getApprovalDetail(processInstanceId: string): Promise<ApprovalProcess> {
  return get<ApprovalProcess>(`/api/office/approvals/${processInstanceId}`)
}

/**
 * 执行审批操作（通过/拒绝/转审/加签）。
 * @param processInstanceId 流程实例ID
 * @param request 审批操作请求
 */
export function approveProcess(
  processInstanceId: string,
  request: ApproveProcessRequest,
): Promise<ApprovalProcess> {
  return post<ApprovalProcess>(`/api/office/approvals/${processInstanceId}/approve`, request)
}

/**
 * 撤销审批。
 * @param processInstanceId 流程实例ID
 */
export function cancelApproval(processInstanceId: string): Promise<void> {
  return del<void>(`/api/office/approvals/${processInstanceId}`)
}

/** 待审批列表查询参数 */
export interface PendingApprovalsQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 审批人ID */
  approverId: string
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 查询待审批列表。
 * @param query 查询参数
 */
export function getPendingApprovals(
  query: PendingApprovalsQuery,
): Promise<PageResponse<ApprovalProcess>> {
  return get<PageResponse<ApprovalProcess>>('/api/office/approvals/pending', query as any)
}

/** 我发起的审批查询参数 */
export interface MyInitiatedApprovalsQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 发起人ID */
  initiatorId: string
  /** 审批状态（可选） */
  status?: ApprovalStatus
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 查询我发起的审批列表。
 * @param query 查询参数
 */
export function getMyInitiatedApprovals(
  query: MyInitiatedApprovalsQuery,
): Promise<PageResponse<ApprovalProcess>> {
  return get<PageResponse<ApprovalProcess>>('/api/office/approvals/initiated', query as any)
}

// ==================== 日历管理 ====================

/** 日历事件状态 */
export type EventStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'

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

/** 事件参与人 */
export interface EventAttendee {
  /** 用户ID */
  userId: string
  /** 用户名称 */
  userName: string
  /** 响应状态：ACCEPTED=已接受 DECLINED=已拒绝 TENTATIVE=待定 NEEDS_ACTION=待回复 */
  responseStatus: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION'
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

/**
 * 查询我的日历事件（指定时间范围）。
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param platform 平台类型（可选）
 */
export function getMyCalendarEvents(
  startTime: string,
  endTime: string,
  platform?: OfficePlatform,
): Promise<CalendarEvent[]> {
  return get<CalendarEvent[]>('/api/office/calendar/events/my', {
    startTime,
    endTime,
    platform,
  } as any)
}

// ==================== 文档操作 ====================

/** 文档类型 */
export type DocumentType = 'DOC' | 'SHEET' | 'SLIDE' | 'MINDNOTE' | 'BITABLE' | 'WIKI'

/** 文档操作类型 */
export type DocumentOperationType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'COPY' | 'MOVE' | 'SHARE'

/** 文档信息 */
export interface DocumentInfo {
  /** 文档ID */
  id: string
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台文档ID */
  platformDocumentId: string
  /** 文档类型 */
  documentType: DocumentType
  /** 文档标题 */
  title: string
  /** 文档URL */
  url: string
  /** 创建人ID */
  creatorId: string
  /** 创建人名称 */
  creatorName?: string
  /** 所有者ID */
  ownerId?: string
  /** 所有者名称 */
  ownerName?: string
  /** 文档大小（字节） */
  size?: number
  /** 最后修改时间 */
  lastModifiedTime?: string
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
}

/** 创建文档请求 */
export interface CreateDocumentRequest {
  /** 平台类型 */
  platform: OfficePlatform
  /** 文档类型 */
  documentType: DocumentType
  /** 文档标题 */
  title: string
  /** 父文件夹ID（可选） */
  parentFolderId?: string
  /** 初始内容（可选） */
  content?: string
}

/** 更新文档请求 */
export interface UpdateDocumentRequest {
  /** 文档标题 */
  title?: string
  /** 文档内容 */
  content?: string
}

/** 复制文档请求 */
export interface CopyDocumentRequest {
  /** 目标文件夹ID */
  targetFolderId?: string
  /** 新文档标题 */
  newTitle?: string
}

/** 移动文档请求 */
export interface MoveDocumentRequest {
  /** 目标文件夹ID */
  targetFolderId: string
}

/** 文档分享请求 */
export interface ShareDocumentRequest {
  /** 分享给用户ID列表 */
  userIds: string[]
  /** 权限类型：VIEW=查看 EDIT=编辑 FULL=完全控制 */
  permission: 'VIEW' | 'EDIT' | 'FULL'
  /** 过期时间（可选） */
  expiresAt?: string
}

/** 文档查询参数 */
export interface DocumentsQuery {
  /** 平台类型（可选） */
  platform?: OfficePlatform
  /** 文档类型（可选） */
  documentType?: DocumentType
  /** 创建人ID（可选） */
  creatorId?: string
  /** 搜索关键词（可选） */
  keyword?: string
  /** 页码 */
  pageNum: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 创建文档。
 * @param request 创建请求
 */
export function createDocument(request: CreateDocumentRequest): Promise<DocumentInfo> {
  return post<DocumentInfo>('/api/office/documents', request)
}

/**
 * 查询文档详情。
 * @param documentId 文档ID
 */
export function getDocument(documentId: string): Promise<DocumentInfo> {
  return get<DocumentInfo>(`/api/office/documents/${documentId}`)
}

/**
 * 更新文档。
 * @param documentId 文档ID
 * @param request 更新请求
 */
export function updateDocument(documentId: string, request: UpdateDocumentRequest): Promise<DocumentInfo> {
  return put<DocumentInfo>(`/api/office/documents/${documentId}`, request)
}

/**
 * 删除文档。
 * @param documentId 文档ID
 */
export function deleteDocument(documentId: string): Promise<void> {
  return del<void>(`/api/office/documents/${documentId}`)
}

/**
 * 复制文档。
 * @param documentId 文档ID
 * @param request 复制请求
 */
export function copyDocument(documentId: string, request: CopyDocumentRequest): Promise<DocumentInfo> {
  return post<DocumentInfo>(`/api/office/documents/${documentId}/copy`, request)
}

/**
 * 移动文档。
 * @param documentId 文档ID
 * @param request 移动请求
 */
export function moveDocument(documentId: string, request: MoveDocumentRequest): Promise<DocumentInfo> {
  return put<DocumentInfo>(`/api/office/documents/${documentId}/move`, request)
}

/**
 * 分享文档。
 * @param documentId 文档ID
 * @param request 分享请求
 */
export function shareDocument(documentId: string, request: ShareDocumentRequest): Promise<void> {
  return post<void>(`/api/office/documents/${documentId}/share`, request)
}

/**
 * 查询文档列表。
 * @param query 查询参数
 */
export function getDocuments(query: DocumentsQuery): Promise<PageResponse<DocumentInfo>> {
  return get<PageResponse<DocumentInfo>>('/api/office/documents', query as any)
}

/**
 * 查询我创建的文档。
 * @param platform 平台类型（可选）
 * @param documentType 文档类型（可选）
 */
export function getMyDocuments(
  platform?: OfficePlatform,
  documentType?: DocumentType,
): Promise<DocumentInfo[]> {
  return get<DocumentInfo[]>('/api/office/documents/my', {
    platform,
    documentType,
  } as any)
}

// ==================== 工具函数 ====================

/** 平台中文名映射 */
export const PLATFORM_NAMES: Record<OfficePlatform, string> = {
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企业微信',
}

/** 消息类型中文名映射 */
export const MESSAGE_TYPE_NAMES: Record<string, string> = {
  TEXT: '文本',
  IMAGE: '图片',
  FILE: '文件',
  CARD: '卡片',
}

/** 审批状态中文名映射 */
export const APPROVAL_STATUS_NAMES: Record<ApprovalStatus, string> = {
  PENDING: '待审批',
  IN_PROGRESS: '审批中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已撤销',
  TRANSFERRED: '已转审',
}

/** 审批动作中文名映射 */
export const APPROVAL_ACTION_NAMES: Record<string, string> = {
  APPROVE: '通过',
  REJECT: '拒绝',
  TRANSFER: '转审',
  ADD_SIGN: '加签',
}

/**
 * 获取平台中文名。
 * @param platform 平台类型
 */
export function getPlatformName(platform: OfficePlatform): string {
  return PLATFORM_NAMES[platform] || platform
}

/**
 * 获取消息类型中文名。
 * @param messageType 消息类型
 */
export function getMessageTypeName(messageType: string): string {
  return MESSAGE_TYPE_NAMES[messageType] || messageType
}

/**
 * 获取审批状态中文名。
 * @param status 审批状态
 */
export function getApprovalStatusName(status: ApprovalStatus): string {
  return APPROVAL_STATUS_NAMES[status] || status
}

/**
 * 获取审批动作中文名。
 * @param action 审批动作
 */
export function getApprovalActionName(action: string): string {
  return APPROVAL_ACTION_NAMES[action] || action
}
