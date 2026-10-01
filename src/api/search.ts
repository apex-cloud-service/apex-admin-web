/**
 * 全文搜索 API
 * ------------------------------------------------------------------
 * 覆盖：统一搜索、索引重建
 */
import { get, post } from '@/utils/request'
import type { PageResponse } from '@/types'

/**
 * 搜索结果项（后端 SearchHitResponse）
 */
export interface SearchResult {
  /** 资源类型（user/role/menu/dept/dict/config） */
  resourceType: string
  /** 资源 ID（跳转定位用，随 ?id= 传递） */
  resourceId: string
  /** 结果标题 */
  title: string
  /** 副标题（如用户所属部门） */
  subtitle: string
  /** 结果描述 */
  description: string
  /** 命中关键词的高亮片段 */
  highlightSnippet: string
  /** 相关度评分（Meilisearch 排序依据） */
  score: number
  /** 资源状态 */
  status: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 搜索请求参数
 */
export interface SearchParams {
  /** 搜索关键词（必填） */
  keyword: string
  /** 限定搜索的资源类型（缺省搜全部类型） */
  types?: string[]
  /** 页码（从 1 开始） */
  page?: number
  /** 每页条数 */
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
