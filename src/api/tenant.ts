/**
 * 租户管理 API（平台运维域）
 * ------------------------------------------------------------------
 * 后端接口（apex-system PlatformTenantRouter，前缀 /api/v2/platform/tenants）：
 * - GET  /                          - 租户分页（pageNum/pageSize 必填，tenantCode/tenantName 模糊、status 精确）
 * - GET  /{id}                      - 租户详情
 * - POST /                          - 创建租户（租户编码全局唯一，创建后不可变更）
 * - POST /{id}/actions              - 生命周期动作（disable/enable/freeze/unfreeze/deactivate/archive）
 * - PUT  /{id}/quota                - 调整配额（null 表示不限制）
 *
 * 权限码：tenant:read / tenant:create / tenant:lifecycle / tenant:quota。
 */
import { get, post, put } from '@/utils/request'
import type {
  PageResponse,
  TenantActionPayload,
  TenantCreatePayload,
  TenantInfo,
  TenantQuotaPayload,
} from '@/types'

/** 租户分页查询参数（pageNum/pageSize 必填） */
export interface TenantQuery {
  pageNum: number
  pageSize: number
  /** 租户编码（模糊） */
  tenantCode?: string
  /** 租户名称（模糊） */
  tenantName?: string
  /** 状态（精确） */
  status?: string
}

/**
 * 分页查询租户
 * @param query 分页与筛选参数
 */
export function listTenants(query: TenantQuery): Promise<PageResponse<TenantInfo>> {
  return get<PageResponse<TenantInfo>>('/api/v2/platform/tenants', query as unknown as Record<string, unknown>)
}

/**
 * 查询租户详情
 * @param id 租户 ID
 */
export function getTenant(id: number): Promise<TenantInfo> {
  return get<TenantInfo>(`/api/v2/platform/tenants/${id}`)
}

/**
 * 创建租户
 * @param payload 租户创建请求
 */
export function createTenant(payload: TenantCreatePayload): Promise<TenantInfo> {
  return post<TenantInfo>('/api/v2/platform/tenants', payload)
}

/**
 * 执行租户生命周期动作
 * @param id 租户 ID
 * @param payload 动作（disable/enable/freeze/unfreeze/deactivate/archive）+ 可选乐观锁版本
 */
export function changeTenantStatus(id: number, payload: TenantActionPayload): Promise<TenantInfo> {
  return post<TenantInfo>(`/api/v2/platform/tenants/${id}/actions`, payload)
}

/**
 * 调整租户配额
 * @param id 租户 ID
 * @param payload 配额（null 表示不限制）+ 可选乐观锁版本
 */
export function updateTenantQuota(id: number, payload: TenantQuotaPayload): Promise<TenantInfo> {
  return put<TenantInfo>(`/api/v2/platform/tenants/${id}/quota`, payload)
}

/** 租户状态 → 中文名称 */
export const TENANT_STATUS_NAMES: Record<string, string> = {
  ACTIVE: '正常',
  DISABLED: '已停用',
  FROZEN: '已冻结',
  DEACTIVATED: '已注销',
  ARCHIVED: '已归档',
}

/** 租户状态 → 标签样式 */
export const TENANT_STATUS_TAG_TYPES: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  DISABLED: 'info',
  FROZEN: 'warning',
  DEACTIVATED: 'danger',
  ARCHIVED: 'info',
}

/** 生命周期动作 → 中文名称 */
export const TENANT_ACTION_NAMES: Record<string, string> = {
  disable: '停用',
  enable: '启用',
  freeze: '冻结',
  unfreeze: '解冻',
  deactivate: '注销',
  archive: '归档',
}

/** 生命周期动作 → 危险/常规样式 */
export const TENANT_DANGER_ACTIONS: ReadonlyArray<string> = ['disable', 'freeze', 'deactivate', 'archive']
