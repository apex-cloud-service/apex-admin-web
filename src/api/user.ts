/**
 * 用户相关 API
 * ------------------------------------------------------------------
 * 覆盖：当前用户信息、后台用户管理（列表/详情/新增/编辑/状态/角色/强退）。
 * 后台用户字段已与后端 AdminUserCreateRequest 对齐：
 * 必填 phone/nickname/gender/birthday，无 username/password 字段。
 */
import { get, post, put, request } from '@/utils/request'
import type { AdminUser, AdminUserDetail, PageQuery, PageResponse, StaffRole, UserIdentity } from '@/types'

/** 用户列表查询参数（后端 page/size/keyword/status） */
export interface UserListQuery extends PageQuery {
  keyword?: string
  status?: number
}

/** 用户创建/更新请求体（与后端 AdminUserCreateRequest 对齐） */
export interface AdminUserPayload {
  /** 手机号（11 位，必填） */
  phone?: string
  /** 昵称（必填） */
  nickname?: string
  /** 性别 1=男 2=女（必填） */
  gender?: number
  /** 生日 YYYY-MM-DD（必填） */
  birthday?: string
  country?: string
  province?: string
  city?: string
  datingGoal?: string
  mbti?: string
  heightCm?: number
  school?: string
  educationLevel?: string
  job?: string
  bio?: string
}

/**
 * 查询当前登录用户身份信息（UserDTO，不含角色/权限）。
 */
export function getCurrentUserInfo(): Promise<UserIdentity> {
  return get<UserIdentity>('/api/v1/user/info')
}

/**
 * 分页查询后台用户列表。
 * @param params 分页与筛选参数
 */
export function listUsers(params: UserListQuery): Promise<PageResponse<AdminUser>> {
  return get<PageResponse<AdminUser>>('/admin-api/v1/users', params as unknown as Record<string, unknown>)
}

/**
 * 查询用户详情（含已分配角色 roles）。
 * @param id 用户 ID（字符串序列化）
 */
export function getUserDetail(id: string): Promise<AdminUserDetail> {
  return get<AdminUserDetail>(`/admin-api/v1/users/${id}`)
}

/**
 * 创建后台用户。
 * @param payload 用户信息
 */
export function createUser(payload: AdminUserPayload): Promise<void> {
  return post<void>('/admin-api/v1/users', payload)
}

/**
 * 更新后台用户。
 * @param id 用户 ID
 * @param payload 用户信息
 */
export function updateUser(id: string, payload: AdminUserPayload): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}`, payload)
}

/**
 * 启停用户。
 * @param id 用户 ID
 * @param enabled true=启用 false=禁用
 */
export function updateUserStatus(id: string, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}/status`, { enabled })
}

/**
 * 强退用户会话（在线用户管理）。
 * @param id 用户 ID
 */
export function revokeUserSessions(id: string): Promise<void> {
  return post<void>(`/admin-api/v1/users/${id}/sessions/revoke`)
}

/**
 * 查询后台可用角色列表。
 */
export function listStaffRoles(): Promise<StaffRole[]> {
  return get<StaffRole[]>('/admin-api/v1/staff-roles')
}

/**
 * 为用户分配角色（整体替换）。
 * @param id 用户 ID
 * @param roleIds 角色 ID 集合
 */
export function assignUserRoles(id: string, roleIds: string[]): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}/roles`, { roleIds })
}

/**
 * 导出用户列表 Excel（后端固定返回最近创建的前 100 条，Excel 二进制流）。
 * @returns Blob 文件内容与建议文件名
 */
export async function exportUsers(): Promise<{ blob: Blob; filename: string }> {
  const response = await request<Blob>({
    method: 'GET',
    url: '/admin-api/v1/export/users',
    responseType: 'blob',
  })
  const blob =
    response instanceof Blob ? response : new Blob([response as unknown as BlobPart])
  return { blob, filename: '用户列表.xlsx' }
}
