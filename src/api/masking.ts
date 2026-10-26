/**
 * 数据脱敏 API
 * ------------------------------------------------------------------
 * 后端接口（apex-masking-service；规则为启动配置、无 CRUD，租户取自 JWT）：
 * - GET  /api/v1/masking/rules - 查询当前租户授权的规则版本
 *        响应 data：Map<版本, Map<字段路径, {type, customRule}>>
 * - POST /api/v1/masking/batch - 批量脱敏（1~100 个 JSON 文档，请求体上限 256KB）
 *
 * ⚠️ 网关路由现状：dev 有 masking-domain 路由；application-prod.yml 路由列表未声明
 * masking-domain（列表整体覆盖不合并），生产环境该组接口 404，需后端补路由。
 */
import { get, post } from '@/utils/request'
import type { MaskingBatchResult, MaskingRule } from '@/types'

/**
 * 查询当前租户授权的脱敏规则
 * @returns 版本 → 字段路径 → 规则 的两级映射
 */
export function listMaskingRules(): Promise<Record<string, Record<string, MaskingRule>>> {
  return get<Record<string, Record<string, MaskingRule>>>('/api/v1/masking/rules')
}

/**
 * 批量脱敏 JSON 文档
 * @param version 规则版本（须为当前租户已授权版本）
 * @param documents JSON 文档数组（1~100 个）
 * @returns 脱敏后的文档数组（结构与入参一致）
 */
export function maskBatch(version: string, documents: unknown[]): Promise<MaskingBatchResult> {
  return post<MaskingBatchResult>('/api/v1/masking/batch', { version, documents })
}
