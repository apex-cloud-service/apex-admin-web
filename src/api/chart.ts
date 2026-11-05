/**
 * 图表管理 API
 * ------------------------------------------------------------------
 * 提供图表的增删改查与数据查询。
 *
 * 后端接口：
 * - GET /admin-api/v1/charts - 分页查询图表列表
 * - GET /admin-api/v1/charts/{id} - 查询图表详情
 * - GET /admin-api/v1/charts/{id}/data - 查询图表数据
 * - POST /admin-api/v1/charts - 创建图表
 * - PUT /admin-api/v1/charts/{id} - 更新图表
 * - DELETE /admin-api/v1/charts/{id} - 删除图表
 */
import { del, get, post, put } from '@/utils/request'
import type { Chart, ChartData, PageQuery, PageResponse } from '@/types'

/** 图表列表查询参数 */
export interface ChartListQuery extends PageQuery {
  /** 关键词（图表名称） */
  keyword?: string
  /** 图表类型：line=折线图 bar=柱状图 pie=饼图 scatter=散点图 radar=雷达图 */
  chartType?: string
  /** 分类：business=业务 tech=技术 operation=运营 finance=财务 */
  category?: string
  /** 状态：0=草稿 1=正常 */
  status?: number
}

/** 图表创建/更新请求体 */
export interface ChartPayload {
  /** 图表名称 */
  chartName: string
  /** 图表类型：line=折线图 bar=柱状图 pie=饼图 scatter=散点图 radar=雷达图 */
  chartType: string
  /** 分类：business=业务 tech=技术 operation=运营 finance=财务 */
  category?: string
  /** 图表描述 */
  description?: string
  /** 数据源地址 */
  dataSource?: string
  /** 图表配置（ECharts 配置项） */
  config?: Record<string, unknown>
  /** 状态：0=草稿 1=正常 */
  status?: number
}

/**
 * 分页查询图表列表
 * @param params 查询参数（关键词、类型、分类、状态等）
 * @returns 分页结果
 */
export function listCharts(params: ChartListQuery): Promise<PageResponse<Chart>> {
  return get<PageResponse<Chart>>('/admin-api/v1/charts', params as unknown as Record<string, unknown>)
}

/**
 * 查询图表详情
 * @param id 图表ID
 * @returns 图表详情信息
 */
export function getChartDetail(id: string): Promise<Chart> {
  return get<Chart>(`/admin-api/v1/charts/${id}`)
}

/**
 * 查询图表数据
 * @param id 图表ID
 * @returns 图表数据（包含 xAxis、series 等 ECharts 数据）
 */
export function getChartData(id: string): Promise<ChartData> {
  return get<ChartData>(`/admin-api/v1/charts/${id}/data`)
}

/**
 * 创建图表
 * @param payload 图表信息
 */
export function createChart(payload: ChartPayload): Promise<void> {
  return post<void>('/admin-api/v1/charts', payload)
}

/**
 * 更新图表
 * @param id 图表ID
 * @param payload 图表信息
 */
export function updateChart(id: string, payload: ChartPayload): Promise<void> {
  return put<void>(`/admin-api/v1/charts/${id}`, payload)
}

/**
 * 删除图表
 * @param id 图表ID
 */
export function deleteChart(id: string): Promise<void> {
  return del<void>(`/admin-api/v1/charts/${id}`)
}

