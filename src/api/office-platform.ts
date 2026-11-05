/**
 * 办公平台基础设施 API（登录回调、应用配置、绑定审批、组织同步）
 * ------------------------------------------------------------------
 * 用途：
 * 飞书 / 钉钉 / 企业微信的接入底座：平台标识定义、授权回调换取会话令牌、
 * 管理端应用配置与账号绑定审批、组织通讯录同步。审批/日历/文档业务见
 * 同目录 office-approval.ts、office-calendar.ts、office-document.ts。
 *
 * 覆盖：OfficePlatform / PLATFORM_NAMES 共享定义、officeCallback、
 * 应用配置 CRUD、绑定分页与审批、部门/员工/同步历史查询与部门 CRUD。
 *
 * @author system
 * @date 2026-11-05
 */
import { del, get, post, put } from '@/utils/request'
import type {
  LoginResult,
  OrganizationMapping,
  OrgDepartment,
  OrgEmployee,
  OrgSyncHistory,
  OrgSyncRequest,
  OrgSyncResult,
  OrgSyncTask,
  PageResponse,
} from '@/types'

/** 办公平台类型：飞书 / 钉钉 / 企业微信 */
export type OfficePlatform = 'FEISHU' | 'DINGTALK' | 'WECOM'

/** 平台标识 → 中文名称映射（下拉选择、文案展示用） */
export const PLATFORM_NAMES: Record<OfficePlatform, string> = {
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企业微信',
}

/** 部门创建/更新请求体（后端 DepartmentDTO，根部门 parentId=0） */
export interface OrgDepartmentPayload {
  /** 部门编码（租户内唯一） */
  deptCode: string
  /** 部门名称 */
  deptName: string
  /** 上级部门 ID，根部门为 0 */
  parentId?: number
  /** 部门层级（后端不计算，由调用方按父部门推导） */
  deptLevel?: number
  /** 部门路径（后端不计算，由调用方按父部门推导） */
  deptPath?: string
  /** 排序号 */
  sortOrder?: number
  /** 负责人 ID */
  leaderId?: number
  /** 负责人姓名 */
  leaderName?: string
  /** 联系电话 */
  phone?: string
  /** 邮箱 */
  email?: string
  /** 状态（如 ACTIVE/INACTIVE） */
  status?: string
}

/** 平台应用配置（后端 OfficeAppResponse） */
export interface OfficeAppResponse {
  /** 配置记录 ID */
  id: number
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台颁发的应用 AppID */
  appId: string
  /** OAuth2 授权回调地址 */
  redirectUri: string
  /** 是否启用（启用后登录页展示该平台入口） */
  enabled: boolean
  /** 版本号（乐观锁，更新/删除时回传） */
  version: number
}

/** 平台应用配置保存请求体（后端 OfficeAppRequest） */
export interface OfficeAppRequest {
  /** 平台颁发的应用 AppID */
  appId: string
  /** 应用密钥的引用标识（后端加密存储，不回显明文） */
  secretReference: string
  /** OAuth2 授权回调地址 */
  redirectUri: string
  /** 消息回调签名密钥的引用标识（可选） */
  signingSecretReference?: string
  /** 是否启用 */
  enabled: boolean
}

/** 平台账号绑定记录（后端 OfficeBindingResponse） */
export interface OfficeBindingResponse {
  /** 绑定记录 ID */
  id: number
  /** 系统用户 ID（待绑定/已绑定的本系统账号） */
  userId: number
  /** 平台类型 */
  platform: OfficePlatform
  /** 平台侧用户唯一标识 */
  externalUserId: string
  /** 绑定状态（如 PENDING=待审批 / APPROVED=已绑定 / UNBOUND=已解绑） */
  status: string
  /** 是否生效 */
  enabled: boolean
  /** 版本号（乐观锁，审批/解绑时回传） */
  version: number
}

/** 绑定审批请求体（后端 OfficeBindingReviewRequest） */
export interface OfficeBindingReviewRequest {
  /** true=通过绑定申请，false=驳回 */
  approved: boolean
  /** 版本号（乐观锁） */
  version: number
}

/** ========== 公开接口（登录页使用） ========== */

/**
 * 办公平台授权回调：用授权码换取本系统会话令牌
 *
 * @param platform 平台类型
 * @param code 平台回调携带的授权码（一次性）
 * @param state 防 CSRF 的随机串（回调时原样回传校验）
 * @returns 登录结果（accessToken / refreshToken 等）
 */
export function officeCallback(
  platform: OfficePlatform,
  code: string,
  state: string,
): Promise<LoginResult> {
  return get<LoginResult>('/api/v1/office/callback', { platform, code, state })
}

/** ========== 应用配置管理（管理端） ========== */

/**
 * 查询全部平台应用配置
 * @returns 平台应用配置列表
 */
export function listApps(): Promise<OfficeAppResponse[]> {
  return get<OfficeAppResponse[]>('/admin-api/v1/office/apps')
}

/**
 * 查询单个平台的应用配置
 * @param platform 平台类型
 * @returns 平台应用配置
 */
export function getApp(platform: OfficePlatform): Promise<OfficeAppResponse> {
  return get<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`)
}

/**
 * 新建平台应用配置
 * @param platform 平台类型
 * @param request 配置内容（appId / 密钥引用 / 回调地址等）
 * @returns 创建后的配置（含 id 与 version）
 */
export function createApp(
  platform: OfficePlatform,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return post<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`, request)
}

/**
 * 更新平台应用配置
 * @param platform 平台类型
 * @param version 当前版本号（乐观锁，冲突时后端拒绝）
 * @param request 配置内容
 * @returns 更新后的配置
 */
export function updateApp(
  platform: OfficePlatform,
  version: number,
  request: OfficeAppRequest,
): Promise<OfficeAppResponse> {
  return put<OfficeAppResponse>(`/admin-api/v1/office/apps/${platform}`, { ...request, version })
}

/**
 * 删除平台应用配置
 * @param platform 平台类型
 * @param version 当前版本号（乐观锁）
 * @returns true=删除成功
 */
export function deleteApp(platform: OfficePlatform, version: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/office/apps/${platform}?version=${version}`)
}

/** ========== 绑定审批管理（管理端） ========== */

/**
 * 分页查询账号绑定列表（数组口径，固定 page=1,size=100 时用于统计概览）
 *
 * @param platform 平台类型
 * @param page 页码（从 1 开始）
 * @param size 每页条数
 * @returns 绑定记录列表（按页返回）
 */
export function listBindings(
  platform: OfficePlatform,
  page: number,
  size: number,
): Promise<OfficeBindingResponse[]> {
  return get<OfficeBindingResponse[]>('/admin-api/v1/office/bindings', { platform, page, size })
}

/**
 * 分页查询账号绑定列表（真实总数，支持按状态过滤）
 *
 * @param platform 平台类型
 * @param status 绑定状态过滤（PENDING/APPROVED/REJECTED/REVOKED），不传则查询全部状态
 * @param page 页码（从 1 开始）
 * @param size 每页条数
 * @returns 分页结果（list / total / pageNum / pageSize）
 */
export function listBindingsPage(
  platform: OfficePlatform,
  status: string | undefined,
  page: number,
  size: number,
): Promise<PageResponse<OfficeBindingResponse>> {
  return get<PageResponse<OfficeBindingResponse>>('/admin-api/v1/office/bindings/page', {
    platform,
    status,
    page,
    size,
  })
}

/**
 * 审批绑定申请（通过后平台账号与系统用户正式绑定）
 * @param id 绑定记录 ID
 * @param request 审批动作（approved=true 通过 / false 驳回）+ 版本号
 * @returns true=审批成功
 */
export function reviewBinding(id: number, request: OfficeBindingReviewRequest): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/office/bindings/${id}/review`, request)
}

/**
 * 解除平台账号绑定
 * @param id 绑定记录 ID
 * @param version 当前版本号（乐观锁）
 * @returns true=解绑成功
 */
export function unbindBinding(id: number, version: number): Promise<boolean> {
  return del<boolean>(`/admin-api/v1/office/bindings/${id}/unbind?version=${version}`)
}

/** ========== 组织同步（管理端） ========== */

/**
 * 分页查询同步部门
 * @param params 分页与状态过滤参数
 */
export function listOrgDepartments(params: {
  pageNum: number
  pageSize: number
  status?: string
}): Promise<PageResponse<OrgDepartment>> {
  return get<PageResponse<OrgDepartment>>('/admin-api/v1/org/departments', params)
}

/**
 * 分页查询同步员工
 * @param params 分页、部门与状态过滤参数
 */
export function listOrgEmployees(params: {
  pageNum: number
  pageSize: number
  deptId?: number
  status?: string
}): Promise<PageResponse<OrgEmployee>> {
  return get<PageResponse<OrgEmployee>>('/admin-api/v1/org/employees', params)
}

/**
 * 分页查询同步历史
 * @param params 分页、同步来源与状态过滤参数
 */
export function listOrgSyncHistory(params: {
  pageNum: number
  pageSize: number
  syncSource?: string
  syncStatus?: string
}): Promise<PageResponse<OrgSyncHistory>> {
  return get<PageResponse<OrgSyncHistory>>('/admin-api/v1/org/sync-history', params)
}

/**
 * 触发组织同步（异步任务，结果经同步任务/历史查询跟踪）
 * @param payload 平台、同步对象（部门/成员）与是否全量
 */
export function triggerOrgSync(payload: OrgSyncRequest): Promise<OrgSyncResult> {
  return post<OrgSyncResult>('/api/v1/office/organization/sync', payload)
}

/**
 * 查询同步任务列表
 * @param params 平台过滤与分页（后端此处为 page/size 口径，返回数组无总数）
 */
export function listOrgSyncTasks(params: {
  platform?: string
  page: number
  size: number
}): Promise<OrgSyncTask[]> {
  return get<OrgSyncTask[]>('/api/v1/office/organization/sync/tasks', params)
}

/**
 * 查询平台组织映射列表
 * @param platform 平台类型，不传查询全部
 */
export function listOrgMappings(platform?: string): Promise<OrganizationMapping[]> {
  return get<OrganizationMapping[]>('/api/v1/office/organization/mappings', { platform })
}

/**
 * 创建部门（后端对 DTO 无字段校验且返回体不含生成 id，成功后须刷新列表）。
 * deptPath/deptLevel 由调用方推导，后端照抄存储。
 * @param payload 部门内容（parentId 根部门为 0）
 */
export function createOrgDepartment(payload: OrgDepartmentPayload): Promise<OrgDepartment> {
  return post<OrgDepartment>('/admin-api/v1/org/departments', payload)
}

/**
 * 更新部门
 * @param id 部门 ID
 * @param payload 部门内容
 */
export function updateOrgDepartment(
  id: number,
  payload: OrgDepartmentPayload,
): Promise<OrgDepartment> {
  return put<OrgDepartment>(`/admin-api/v1/org/departments/${id}`, payload)
}

/**
 * 删除部门（后端无级联检查：子部门与员工不受影响，逻辑删除）。
 * @param id 部门 ID
 */
export function deleteOrgDepartment(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/org/departments/${id}`)
}

/**
 * 查询员工详情
 * @param id 员工 ID
 */
export function getOrgEmployee(id: number): Promise<OrgEmployee> {
  return get<OrgEmployee>(`/admin-api/v1/org/employees/${id}`)
}
