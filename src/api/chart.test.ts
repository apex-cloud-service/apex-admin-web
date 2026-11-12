/**
 * 图表管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（列表分页为 page/size 口径、
 * 图表数据为独立 /data 端点；不含状态操作端点——本模块未封装状态更新接口）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  createChart,
  deleteChart,
  getChartData,
  getChartDetail,
  listCharts,
  updateChart,
} from './chart'
import type { ChartListQuery, ChartPayload } from './chart'

describe('图表管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('列表分页使用 page/size 并透传关键词/类型/分类/状态筛选', () => {
    const params: ChartListQuery = {
      page: 1,
      size: 20,
      keyword: '销量',
      chartType: 'bar',
      category: 'business',
      status: 1,
    }
    listCharts(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/charts', params)
  })

  it('详情与数据查询为两个不同端点（/data 返回 ECharts 数据）', () => {
    getChartDetail('12')
    getChartData('12')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/charts/12')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/charts/12/data')
  })

  it('创建、更新与删除路径与请求体正确', () => {
    const payload: ChartPayload = {
      chartName: '月度销量',
      chartType: 'bar',
      category: 'business',
      config: { xAxis: ['1月', '2月'] },
    }
    createChart(payload)
    updateChart('12', payload)
    deleteChart('12')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/charts', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/charts/12', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/charts/12')
  })
})
