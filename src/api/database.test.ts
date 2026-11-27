/**
 * 数据库配置 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与含密码请求体的透传、数据源 pageNum/pageSize 分页参数。
 * 请求层为 mock；不验证后端响应脱敏或页面密码回显。
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
  createDataSource,
  deleteDataSource,
  generateDeploymentConfig,
  getCurrentDatabaseInfo,
  getDataSourceMetrics,
  listDataSources,
  testDatabaseConnection,
  updateDataSource,
} from './database'
import type { DatabaseConfig, DataSourcePayload } from '@/types'

const dbConfig: DatabaseConfig & { password: string } = {
  dbType: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'apex',
  username: 'root',
  password: 's3cret',
  environment: 'dev',
}

const dsPayload: DataSourcePayload = {
  name: '业务库',
  type: 'mysql',
  driver: 'com.mysql.cj.jdbc.Driver',
  url: 'jdbc:mysql://127.0.0.1:3306/apex',
  username: 'root',
  password: 's3cret',
  maxPoolSize: 20,
}

describe('数据库配置 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('连接测试与部署配置生成以 POST 提交完整配置（含密码仅上行）', () => {
    testDatabaseConnection(dbConfig)
    generateDeploymentConfig(dbConfig)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/database/test', dbConfig)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/database/generate-config', dbConfig)
  })

  it('当前数据库信息为只读 GET', () => {
    getCurrentDatabaseInfo()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/database/current')
  })

  it('数据源分页使用 pageNum/pageSize', () => {
    listDataSources(2, 50)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/database/datasources', { pageNum: 2, pageSize: 50 })
  })

  it('数据源创建走 POST、更新走 PUT /{id}（密码随请求体上行）', () => {
    createDataSource(dsPayload)
    updateDataSource(7, dsPayload)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/database/datasources', dsPayload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/database/datasources/7', dsPayload)
  })

  it('数据源删除与连接池指标按数字 ID 拼路径', () => {
    deleteDataSource(7)
    getDataSourceMetrics(7)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/database/datasources/7')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/database/datasources/7/metrics')
  })
})
