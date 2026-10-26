/**
 * 数据库配置 API
 * ------------------------------------------------------------------
 * 覆盖：数据库连接测试、部署配置生成、当前数据库信息查询、数据源管理（CRUD 与连接池指标）。
 * 定位：部署配置采集与导出工具 + 数据源台账管理。
 * 安全边界：数据源密码仅创建/更新时提交，后端不回显明文（响应中 url/username 已脱敏）。
 */
import { del, get, post, put } from '@/utils/request'
import type {
  DatabaseConfig,
  DatabaseTestResult,
  DeploymentConfigResult,
  CurrentDatabaseInfo,
  DataSourceInfo,
  DataSourceMetrics,
  DataSourcePayload,
  PageResponse
} from '@/types'

/**
 * 测试数据库连接
 * @param config 数据库配置（含密码，仅用于测试）
 * @returns 连接测试结果
 */
export function testDatabaseConnection(
  config: DatabaseConfig & { password: string }
): Promise<DatabaseTestResult> {
  return post<DatabaseTestResult>('/admin-api/v1/database/test', config)
}

/**
 * 生成部署配置
 * @param config 数据库配置（含密码，用于生成配置）
 * @returns 部署配置（YAML、env、docker-compose 格式）
 */
export function generateDeploymentConfig(
  config: DatabaseConfig & { password: string }
): Promise<DeploymentConfigResult> {
  return post<DeploymentConfigResult>('/admin-api/v1/database/generate-config', config)
}

/**
 * 获取当前数据库信息（只读）
 * @returns 当前数据库类型和版本
 */
export function getCurrentDatabaseInfo(): Promise<CurrentDatabaseInfo> {
  return get<CurrentDatabaseInfo>('/admin-api/v1/database/current')
}

/**
 * 分页查询数据源列表
 * @param pageNum 页码（从 1 开始）
 * @param pageSize 每页条数
 */
export function listDataSources(pageNum: number, pageSize: number): Promise<PageResponse<DataSourceInfo>> {
  return get<PageResponse<DataSourceInfo>>('/admin-api/v1/database/datasources', { pageNum, pageSize })
}

/**
 * 创建数据源
 * @param payload 数据源配置（含密码）
 */
export function createDataSource(payload: DataSourcePayload): Promise<DataSourceInfo> {
  return post<DataSourceInfo>('/admin-api/v1/database/datasources', payload)
}

/**
 * 更新数据源
 * @param id 数据源 ID
 * @param payload 数据源配置（含密码）
 */
export function updateDataSource(id: number, payload: DataSourcePayload): Promise<DataSourceInfo> {
  return put<DataSourceInfo>(`/admin-api/v1/database/datasources/${id}`, payload)
}

/**
 * 删除数据源
 * @param id 数据源 ID
 */
export function deleteDataSource(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/database/datasources/${id}`)
}

/**
 * 查询数据源连接池指标
 * @param id 数据源 ID
 */
export function getDataSourceMetrics(id: number): Promise<DataSourceMetrics> {
  return get<DataSourceMetrics>(`/admin-api/v1/database/datasources/${id}/metrics`)
}
