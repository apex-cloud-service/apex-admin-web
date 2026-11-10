/**
 * 租户套餐 API
 * ------------------------------------------------------------------
 * 后端接口（apex-system TenantPackageRouter，前缀 /api/v2/tenant-packages）：
 * - GET  /                 - 套餐列表（裸数组，非分页）
 * - POST /                 - 创建套餐
 * - PUT  /                 - 更新套餐（按请求体 packageCode 定位）
 *
 * 权限码：tenant:package:read / create / update。
 * menuIds / permissionCodes 的空集合语义为「该维度全量放行」；
 * features 的空集合语义为「未订阅任何能力」，全量须显式提交能力目录全部编码。
 */
import { get, post, put } from '@/utils/request'
import type { TenantPackage, TenantPackagePayload } from '@/types'

/**
 * 查询套餐列表（后端返回数组）
 */
export function listTenantPackages(): Promise<TenantPackage[]> {
  return get<TenantPackage[]>('/api/v2/tenant-packages')
}

/**
 * 创建套餐
 * @param payload 套餐配置
 */
export function createTenantPackage(payload: TenantPackagePayload): Promise<TenantPackage> {
  return post<TenantPackage>('/api/v2/tenant-packages', payload)
}

/**
 * 更新套餐（后端从请求体 packageCode 定位记录，路径不带编码）
 * @param payload 套餐配置
 */
export function updateTenantPackage(payload: TenantPackagePayload): Promise<TenantPackage> {
  return put<TenantPackage>('/api/v2/tenant-packages', payload)
}
