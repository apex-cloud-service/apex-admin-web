/**
 * Mock 数据服务
 * ------------------------------------------------------------------
 * 提供文档和图表管理的 Mock 数据，用于前端开发和测试。
 * 
 * 使用方式：
 * 1. 在 main.ts 中引入并启用：import './mock'
 * 2. 开发时自动拦截 API 请求并返回 Mock 数据
 * 3. 生产环境自动禁用
 */
import Mock from 'mockjs'
import type { Document, Chart, ChartData, PageResponse } from '@/types'

/** Mock 请求回调参数（mockjs 传入的 options 结构化定义） */
interface MockRequestOptions {
  url: string
  type: string
  body: string | null
}

/** 是否启用 Mock（仅开发环境） */
const MOCK_ENABLED = import.meta.env.DEV

if (MOCK_ENABLED) {
  console.log('📦 Mock 数据服务已启用')
}

/** Mock 配置 */
Mock.setup({
  timeout: '200-600'
})

/* ==================== 文档管理 Mock 数据 ==================== */

/** 生成随机文档数据 */
function generateDocument(id?: string): Document {
  const docTypes = ['contract', 'report', 'proposal', 'manual', 'other']
  const categories = ['tech', 'business', 'finance', 'hr']
  const authors = ['张三', '李四', '王五', '赵六', '钱七']
  
  return {
    id: id || Mock.Random.guid(),
    title: Mock.Random.ctitle(10, 30),
    docType: Mock.Random.pick(docTypes),
    category: Mock.Random.pick(categories),
    content: Mock.Random.cparagraph(5, 10),
    fileUrl: Mock.Random.boolean() ? `https://example.com/files/${Mock.Random.guid()}.pdf` : undefined,
    fileSize: Mock.Random.integer(1024, 10485760),
    authorId: Mock.Random.guid(),
    authorName: Mock.Random.pick(authors),
    status: Mock.Random.integer(0, 2),
    tags: Mock.Random.shuffle(['重要', '紧急', '待审核', '已归档', '草稿']).slice(0, Mock.Random.integer(1, 3)),
    viewCount: Mock.Random.integer(0, 1000),
    downloadCount: Mock.Random.integer(0, 500),
    createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
  }
}

/** 文档 Mock 数据库 */
const documentDatabase: Document[] = Array.from({ length: 50 }, () => generateDocument())

/** GET /admin-api/v1/documents - 分页查询文档列表 */
Mock.mock(/\/admin-api\/v1\/documents(\?.*)?$/, 'get', (options: MockRequestOptions) => {
  const url = new URL(options.url, 'http://localhost')
  const page = parseInt(url.searchParams.get('page') || '1')
  const size = parseInt(url.searchParams.get('size') || '20')
  const keyword = url.searchParams.get('keyword') || ''
  const docType = url.searchParams.get('docType') || ''
  const category = url.searchParams.get('category') || ''
  const status = url.searchParams.get('status')
  
  let filteredList = documentDatabase
  
  if (keyword) {
    filteredList = filteredList.filter(doc => 
      doc.title.includes(keyword) || (doc.content && doc.content.includes(keyword))
    )
  }
  
  if (docType) {
    filteredList = filteredList.filter(doc => doc.docType === docType)
  }
  
  if (category) {
    filteredList = filteredList.filter(doc => doc.category === category)
  }
  
  if (status !== null && status !== undefined && status !== '') {
    filteredList = filteredList.filter(doc => doc.status === parseInt(status))
  }
  
  const total = filteredList.length
  const start = (page - 1) * size
  const end = start + size
  const list = filteredList.slice(start, end)
  
  const response: PageResponse<Document> = {
    list,
    total,
    pageNum: page,
    pageSize: size,
    pages: Math.ceil(total / size),
    hasNext: page * size < total
  }
  
  return {
    code: 0,
    msg: '成功',
    data: response
  }
})

/** GET /admin-api/v1/documents/{id} - 查询文档详情 */
Mock.mock(/\/admin-api\/v1\/documents\/[a-zA-Z0-9-]+$/, 'get', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '')
  const doc = documentDatabase.find(d => d.id === id) || generateDocument(id)
  
  return {
    code: 0,
    msg: '成功',
    data: doc
  }
})

/** POST /admin-api/v1/documents - 创建文档 */
Mock.mock(/\/admin-api\/v1\/documents$/, 'post', (options: MockRequestOptions) => {
  const body = JSON.parse(options.body ?? '{}')
  const newDoc = generateDocument()
  Object.assign(newDoc, body)
  documentDatabase.unshift(newDoc)
  
  return {
    code: 0,
    msg: '创建成功',
    data: null
  }
})

/** PUT /admin-api/v1/documents/{id} - 更新文档 */
Mock.mock(/\/admin-api\/v1\/documents\/[a-zA-Z0-9-]+$/, 'put', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '').split('?')[0]
  const body = JSON.parse(options.body ?? '{}')
  const index = documentDatabase.findIndex(d => d.id === id)
  
  if (index !== -1) {
    Object.assign(documentDatabase[index], body, {
      updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
    })
  }
  
  return {
    code: 0,
    msg: '更新成功',
    data: null
  }
})

/** DELETE /admin-api/v1/documents/{id} - 删除文档 */
Mock.mock(/\/admin-api\/v1\/documents\/[a-zA-Z0-9-]+$/, 'delete', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '')
  const index = documentDatabase.findIndex(d => d.id === id)
  
  if (index !== -1) {
    documentDatabase.splice(index, 1)
  }
  
  return {
    code: 0,
    msg: '删除成功',
    data: null
  }
})

/** PUT /admin-api/v1/documents/{id}/status - 更新文档状态 */
Mock.mock(/\/admin-api\/v1\/documents\/[a-zA-Z0-9-]+\/status$/, 'put', (options: MockRequestOptions) => {
  const id = options.url.split('/')[5]
  const body = JSON.parse(options.body ?? '{}')
  const index = documentDatabase.findIndex(d => d.id === id)
  
  if (index !== -1) {
    documentDatabase[index].status = body.status
    documentDatabase[index].updateTime = Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
  }
  
  return {
    code: 0,
    msg: '状态更新成功',
    data: null
  }
})

/** GET /admin-api/v1/documents/{id}/download - 下载文档 */
Mock.mock(/\/admin-api\/v1\/documents\/[a-zA-Z0-9-]+\/download$/, 'get', () => {
  return {
    code: 0,
    msg: '下载成功',
    data: null
  }
})

/* ==================== 图表管理 Mock 数据 ==================== */

/** 生成随机图表数据 */
function generateChart(id?: string): Chart {
  const chartTypes = ['line', 'bar', 'pie', 'scatter', 'radar']
  const categories = ['business', 'tech', 'operation', 'finance']
  const creators = ['张三', '李四', '王五', '赵六', '钱七']
  
  return {
    id: id || Mock.Random.guid(),
    chartName: Mock.Random.ctitle(5, 15) + '图表',
    chartType: Mock.Random.pick(chartTypes),
    category: Mock.Random.pick(categories),
    description: Mock.Random.csentence(10, 30),
    dataSource: `https://api.example.com/data/${Mock.Random.guid()}`,
    config: {},
    status: Mock.Random.integer(0, 1),
    creatorId: Mock.Random.guid(),
    creatorName: Mock.Random.pick(creators),
    viewCount: Mock.Random.integer(0, 1000),
    createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
  }
}

/** 生成图表数据 */
function generateChartData(chartId: string, chartType: string): ChartData {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  
  if (chartType === 'pie') {
    return {
      chartId,
      chartType: 'pie',
      title: '数据分布图',
      series: [
        {
          name: '数据分布',
          type: 'pie',
          data: [
            Mock.Random.integer(100, 500),
            Mock.Random.integer(100, 500),
            Mock.Random.integer(100, 500),
            Mock.Random.integer(100, 500),
            Mock.Random.integer(100, 500)
          ]
        }
      ]
    }
  }
  
  if (chartType === 'line') {
    return {
      chartId,
      chartType: 'line',
      title: '趋势分析图',
      xAxis: months,
      legend: ['系列1', '系列2'],
      series: [
        {
          name: '系列1',
          type: 'line',
          data: Array.from({ length: 12 }, () => Mock.Random.integer(100, 1000)),
          areaStyle: {}
        },
        {
          name: '系列2',
          type: 'line',
          data: Array.from({ length: 12 }, () => Mock.Random.integer(100, 1000))
        }
      ]
    }
  }
  
  if (chartType === 'bar') {
    return {
      chartId,
      chartType: 'bar',
      title: '对比分析图',
      xAxis: months.slice(0, 6),
      legend: ['产品A', '产品B', '产品C'],
      series: [
        {
          name: '产品A',
          type: 'bar',
          data: Array.from({ length: 6 }, () => Mock.Random.integer(100, 800))
        },
        {
          name: '产品B',
          type: 'bar',
          data: Array.from({ length: 6 }, () => Mock.Random.integer(100, 800))
        },
        {
          name: '产品C',
          type: 'bar',
          data: Array.from({ length: 6 }, () => Mock.Random.integer(100, 800))
        }
      ]
    }
  }
  
  return {
    chartId,
    chartType,
    title: '数据分析图',
    xAxis: months.slice(0, 8),
    legend: ['数据'],
    series: [
      {
        name: '数据',
        type: chartType,
        data: Array.from({ length: 8 }, () => Mock.Random.integer(50, 500))
      }
    ]
  }
}

/** 图表 Mock 数据库 */
const chartDatabase: Chart[] = Array.from({ length: 30 }, () => generateChart())

/** GET /admin-api/v1/charts - 分页查询图表列表 */
Mock.mock(/\/admin-api\/v1\/charts(\?.*)?$/, 'get', (options: MockRequestOptions) => {
  const url = new URL(options.url, 'http://localhost')
  const page = parseInt(url.searchParams.get('page') || '1')
  const size = parseInt(url.searchParams.get('size') || '20')
  const keyword = url.searchParams.get('keyword') || ''
  const chartType = url.searchParams.get('chartType') || ''
  const category = url.searchParams.get('category') || ''
  const status = url.searchParams.get('status')
  
  let filteredList = chartDatabase
  
  if (keyword) {
    filteredList = filteredList.filter(chart => chart.chartName.includes(keyword))
  }
  
  if (chartType) {
    filteredList = filteredList.filter(chart => chart.chartType === chartType)
  }
  
  if (category) {
    filteredList = filteredList.filter(chart => chart.category === category)
  }
  
  if (status !== null && status !== undefined && status !== '') {
    filteredList = filteredList.filter(chart => chart.status === parseInt(status))
  }
  
  const total = filteredList.length
  const start = (page - 1) * size
  const end = start + size
  const list = filteredList.slice(start, end)
  
  const response: PageResponse<Chart> = {
    list,
    total,
    pageNum: page,
    pageSize: size,
    pages: Math.ceil(total / size),
    hasNext: page * size < total
  }
  
  return {
    code: 0,
    msg: '成功',
    data: response
  }
})

/** GET /admin-api/v1/charts/{id} - 查询图表详情 */
Mock.mock(/\/admin-api\/v1\/charts\/[a-zA-Z0-9-]+(?!\/data)$/, 'get', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '')
  const chart = chartDatabase.find(c => c.id === id) || generateChart(id)
  
  return {
    code: 0,
    msg: '成功',
    data: chart
  }
})

/** GET /admin-api/v1/charts/{id}/data - 查询图表数据 */
Mock.mock(/\/admin-api\/v1\/charts\/[a-zA-Z0-9-]+\/data$/, 'get', (options: MockRequestOptions) => {
  const id = options.url.split('/')[5]
  const chart = chartDatabase.find(c => c.id === id)
  const chartType = chart?.chartType || 'line'
  const data = generateChartData(id, chartType)
  
  return {
    code: 0,
    msg: '成功',
    data
  }
})

/** POST /admin-api/v1/charts - 创建图表 */
Mock.mock(/\/admin-api\/v1\/charts$/, 'post', (options: MockRequestOptions) => {
  const body = JSON.parse(options.body ?? '{}')
  const newChart = generateChart()
  Object.assign(newChart, body)
  chartDatabase.unshift(newChart)
  
  return {
    code: 0,
    msg: '创建成功',
    data: null
  }
})

/** PUT /admin-api/v1/charts/{id} - 更新图表 */
Mock.mock(/\/admin-api\/v1\/charts\/[a-zA-Z0-9-]+(?!\/status)$/, 'put', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '').split('?')[0]
  const body = JSON.parse(options.body ?? '{}')
  const index = chartDatabase.findIndex(c => c.id === id)
  
  if (index !== -1) {
    Object.assign(chartDatabase[index], body, {
      updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
    })
  }
  
  return {
    code: 0,
    msg: '更新成功',
    data: null
  }
})

/** DELETE /admin-api/v1/charts/{id} - 删除图表 */
Mock.mock(/\/admin-api\/v1\/charts\/[a-zA-Z0-9-]+$/, 'delete', (options: MockRequestOptions) => {
  const id = (options.url.split('/').pop() ?? '')
  const index = chartDatabase.findIndex(c => c.id === id)
  
  if (index !== -1) {
    chartDatabase.splice(index, 1)
  }
  
  return {
    code: 0,
    msg: '删除成功',
    data: null
  }
})

/** PUT /admin-api/v1/charts/{id}/status - 更新图表状态 */
Mock.mock(/\/admin-api\/v1\/charts\/[a-zA-Z0-9-]+\/status$/, 'put', (options: MockRequestOptions) => {
  const id = options.url.split('/')[5]
  const body = JSON.parse(options.body ?? '{}')
  const index = chartDatabase.findIndex(c => c.id === id)
  
  if (index !== -1) {
    chartDatabase[index].status = body.status
    chartDatabase[index].updateTime = Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
  }
  
  return {
    code: 0,
    msg: '状态更新成功',
    data: null
  }
})

export default Mock
