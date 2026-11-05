/**
 * 在线会话管理 API（认证中心）
 * ------------------------------------------------------------------
 * 后端接口（apex-auth-service SessionRouter，前缀 /auth/v1/sessions）：
 * - GET    /user/{userId}      - 查询指定用户的会话列表（裸数组）
 * - DELETE /user/{userId}      - 批量终止该用户全部会话
 * - GET    /online             - 在线用户列表（裸数组，无分页）
 * - GET    /statistics         - 在线用户统计（totalOnlineUsers/timestamp）
 * - DELETE /{sessionId}        - 终止单个会话（sessionId 为会话唯一标识，非数字主键）
 *
 * 说明：全部端点要求管理员角色（后端 @RequireAdminRole），前端仅做展示层权限控制。
 * online 列表后端不分页，页面在前端做关键字过滤。
 */
import { del, get } from '@/utils/request'
import type { AuthSession, OnlineSession, OnlineStatistics } from '@/types'

/**
 * 查询指定用户的会话列表
 * @param userId 用户 ID
 * @param tenantId 可选租户声明（必须与可信租户上下文一致）
 */
export function listUserSessions(userId: number, tenantId?: string): Promise<AuthSession[]> {
  return get<AuthSession[]>(
    `/auth/v1/sessions/user/${userId}`,
    tenantId ? { tenantId } : undefined,
  )
}

/**
 * 批量终止指定用户的全部会话
 * @param userId 用户 ID
 * @param tenantId 可选租户声明
 */
export function terminateUserSessions(userId: number, tenantId?: string): Promise<void> {
  return del<void>(`/auth/v1/sessions/user/${userId}`, tenantId ? { tenantId } : undefined)
}

/**
 * 查询在线用户列表（后端返回裸数组，不分页）
 */
export function listOnlineSessions(): Promise<OnlineSession[]> {
  return get<OnlineSession[]>('/auth/v1/sessions/online')
}

/**
 * 查询在线用户统计
 */
export function getOnlineStatistics(): Promise<OnlineStatistics> {
  return get<OnlineStatistics>('/auth/v1/sessions/statistics')
}

/**
 * 终止单个会话（该会话令牌立即失效，其他会话不受影响）
 * @param sessionId 会话唯一标识
 */
export function terminateSession(sessionId: string): Promise<void> {
  return del<void>(`/auth/v1/sessions/${encodeURIComponent(sessionId)}`)
}
