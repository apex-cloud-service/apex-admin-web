/**
 * 用户相关 API
 * ------------------------------------------------------------------
 * 覆盖：当前用户信息、后台用户管理（列表/详情/新增/编辑/状态/角色/强退）。
 */
import { del, get, post, put } from '@/utils/request'
import type { AdminUser, PageQuery, PageResponse, StaffRole, UserIdentity } from '@/types'

/** 用户列表查询参数 */
export interface UserListQuery extends PageQuery {
  keyword?: string
  status?: number
}

/** 用户创建/更新请求体 */
export interface AdminUserPayload {
  username?: string
  password?: string
  nickName?: string
  phone?: string
  email?: string
  status?: number
  deptId?: number
}

/**
 * 查询当前登录用户身份信息（含角色与权限）。
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
 * 查询用户详情。
 * @param id 用户 ID
 */
export function getUserDetail(id: number): Promise<AdminUser> {
  return get<AdminUser>(`/admin-api/v1/users/${id}`)
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
export function updateUser(id: number, payload: AdminUserPayload): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}`, payload)
}

/**
 * 启停用户。
 * @param id 用户 ID
 * @param enabled true=启用 false=禁用
 */
export function updateUserStatus(id: number, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}/status`, { enabled })
}

/**
 * 强退用户会话（在线用户管理）。
 * @param id 用户 ID
 */
export function revokeUserSessions(id: number): Promise<void> {
  return post<void>(`/admin-api/v1/users/${id}/sessions/revoke`)
}

/**
 * 查询后台可用角色列表。
 */
export function listStaffRoles(): Promise<StaffRole[]> {
  return get<StaffRole[]>('/admin-api/v1/staff-roles')
}

/**
 * 为用户分配角色。
 * @param id 用户 ID
 * @param roleIds 角色 ID 集合
 */
export function assignUserRoles(id: number, roleIds: number[]): Promise<void> {
  return put<void>(`/admin-api/v1/users/${id}/roles`, { roleIds })
}

/**
 * 删除用户（预留接口，后端当前未暴露 DELETE，保留供后续扩展）。
 * @param id 用户 ID
 */
export function deleteUser(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/users/${id}`)
}
