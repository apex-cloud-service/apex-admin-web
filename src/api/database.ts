/**
 * 数据库配置 API
 * ------------------------------------------------------------------
 * 覆盖：数据库连接测试、部署配置生成、当前数据库信息查询。
 * 定位：部署配置采集与导出工具，不是运行时数据库管理控制台。
 * 安全边界：密码不通过前端保存，仅用于一次性生成配置。
 */
import { get, post } from '@/utils/request'
import type {
  DatabaseConfig,
  DatabaseTestResult,
  DeploymentConfigResult,
  CurrentDatabaseInfo
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
