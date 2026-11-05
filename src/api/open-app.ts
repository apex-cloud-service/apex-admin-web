/**
 * 开放平台应用 API
 * ------------------------------------------------------------------
 * 管理面（apex-system OpenAppAdminRouter，前缀 /api/v1/open-apps）：
 * - GET  /                            - 分页查询开放应用（page/size，返回数组）
 * - POST /                            - 创建应用（响应含一次性明文 clientSecret）
 * - GET  /scopes                      - 平台 scope 目录与权限码映射（与创建校验同源注册表）
 * - GET  /{clientId}                  - 应用详情
 * - PUT  /{clientId}                  - 更新应用
 * - POST /{clientId}/reset-secret     - 重置密钥（响应含一次性明文 clientSecret）
 *
 * 权限码：open:app:read / open:app:manage。明文密钥仅创建/重置响应返回一次，不落本地。
 */
import { get, post, put } from '@/utils/request'
import type {
  OpenApp,
  OpenAppImportItem,
  OpenAppMigrationSummary,
  OpenAppPayload,
  OpenAppScope,
} from '@/types'

/** 开放应用分页查询参数（page 从 0 开始） */
export interface OpenAppQuery {
  page: number
  size: number
}

/**
 * 分页查询开放应用
 * @param query page 从 0 开始、size 上限 100
 */
export function listOpenApps(query: OpenAppQuery): Promise<OpenApp[]> {
  return get<OpenApp[]>('/api/v1/open-apps', query as unknown as Record<string, unknown>)
}

/**
 * 创建开放应用
 * @param payload 应用注册信息（clientId / appName 必填）
 */
export function createOpenApp(payload: OpenAppPayload): Promise<OpenApp> {
  return post<OpenApp>('/api/v1/open-apps', payload)
}

/**
 * 更新开放应用
 * @param clientId 客户端 ID
 * @param payload 变更字段（缺省字段保持原值）
 */
export function updateOpenApp(clientId: string, payload: OpenAppPayload): Promise<OpenApp> {
  return put<OpenApp>(`/api/v1/open-apps/${encodeURIComponent(clientId)}`, payload)
}

/**
 * 重置开放应用密钥（明文仅本响应返回一次）
 * @param clientId 客户端 ID
 */
export function resetOpenAppSecret(clientId: string): Promise<OpenApp> {
  return post<OpenApp>(`/api/v1/open-apps/${encodeURIComponent(clientId)}/reset-secret`)
}

/**
 * 查询平台 scope 目录（scope → 权限码映射）
 */
export function listOpenAppScopes(): Promise<OpenAppScope[]> {
  return get<OpenAppScope[]>('/api/v1/open-apps/scopes')
}

/**
 * 导出存量开放应用迁移清单（含密钥哈希，不含明文；平台管理员专用）
 */
export function exportOpenAppMigration(): Promise<OpenAppImportItem[]> {
  return get<OpenAppImportItem[]>('/admin-api/v1/open-apps/migration/export')
}

/**
 * 批量导入存量开放应用（逐条写入，单条失败不影响其余）
 * @param items 迁移清单（通常来自 export 响应）
 */
export function importOpenAppMigration(items: OpenAppImportItem[]): Promise<OpenAppMigrationSummary> {
  return post<OpenAppMigrationSummary>('/admin-api/v1/open-apps/migration/import', items)
}
