/**
 * 全文搜索 API
 * ------------------------------------------------------------------
 * 覆盖：统一搜索、索引重建
 */
import { get, post } from '@/utils/request'
import type { PageResponse } from '@/types'

/**
 * 搜索结果接口
 */
export interface SearchResult {
  resourceType: string
  resourceId: string
  title: string
  subtitle: string
  description: string
  highlightSnippet: string
  score: number
  status: number
  createdAt: string
  updatedAt: string
}

/**
 * 搜索参数
 */
export interface SearchParams {
  keyword: string
  types?: string[]
  page?: number
  size?: number
}

/**
 * 全文搜索
 * @param params 搜索参数（keyword 必填，types 可选资源类型数组）
 */
export function search(params: SearchParams): Promise<PageResponse<SearchResult>> {
  return get<PageResponse<SearchResult>>('/admin-api/v1/search', {
    keyword: params.keyword,
    types: params.types?.join(','),
    page: params.page || 1,
    size: params.size || 20,
  } as unknown as Record<string, unknown>)
}

/**
 * 重建搜索索引
 * @param type 资源类型（可选，为空则重建全部）
 */
export function rebuildIndex(type?: string): Promise<number> {
  return post<number>('/admin-api/v1/search/rebuild', type ? { type } : undefined)
}
