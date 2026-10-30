/**
 * 代码生成器 API
 * ------------------------------------------------------------------
 * 提供数据源管理、表结构扫描、代码生成配置、代码生成与生成历史查询。
 * 当前模块封装数据源、连接测试、表结构扫描、生成配置、代码生成与生成历史；
 * 代码预览、模板管理和生成历史回滚没有对应的前端 API 封装。
 */
import { del, get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types'

/**
 * 数据源配置
 */
export interface DataSource {
  id?: number
  name: string
  dbType: 'mysql' | 'postgresql' | 'oracle' | 'sqlserver'
  host: string
  port: number
  database: string
  username: string
  password?: string
  status: number
  createTime?: string
  updateTime?: string
}

/**
 * 数据表信息
 */
export interface TableInfo {
  tableName: string
  tableComment?: string
  engine?: string
  charset?: string
  createTime?: string
}

/**
 * 表字段信息
 */
export interface ColumnInfo {
  columnName: string
  dataType: string
  columnComment?: string
  columnKey: string
  extra: string
  isNullable: string
  columnDefault?: string
  characterMaximumLength?: number
  numericPrecision?: number
  numericScale?: number
}

/**
 * 代码生成配置
 */
export interface GeneratorConfig {
  id?: number
  datasourceId: number
  tableName: string
  moduleName: string
  packageName: string
  author: string
  tablePrefix?: string
  businessName: string
  className: string
  functionName: string
  createTime?: string
  updateTime?: string
}

/**
 * 生成产物文件（后端 GeneratedFileDTO）
 */
export interface GeneratedFile {
  fileType: string
  filePath: string
  fileName: string
  fileSize?: number
  success?: boolean
  errorMessage?: string
}

/**
 * 代码生成历史记录（后端 GenHistoryDTO，generatedFiles 为文件路径串）
 */
export interface GenerateHistory {
  id: number
  configId: number
  generatedFiles?: string
  outputPath?: string
  status?: string
  errorMessage?: string
  operatorId?: number
  createTime?: string
  updateTime?: string
}

/**
 * 查询数据源列表
 */
export function listDataSources(): Promise<DataSource[]> {
  return get<DataSource[]>('/admin-api/v1/generator/datasources')
}

/**
 * 创建数据源
 */
export function createDataSource(payload: Omit<DataSource, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return post<void>('/admin-api/v1/generator/datasources', payload)
}

/**
 * 更新数据源
 */
export function updateDataSource(id: number, payload: Omit<DataSource, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return put<void>(`/admin-api/v1/generator/datasources/${id}`, payload)
}

/**
 * 删除数据源
 */
export function deleteDataSource(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/generator/datasources/${id}`)
}

/**
 * 测试已保存数据源的连接（按数据源 ID）
 */
export function testDataSourceConnection(id: number): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/generator/datasources/${id}/test`)
}

/**
 * 查询数据源下的表列表
 */
export function listTables(datasourceId: number): Promise<TableInfo[]> {
  return get<TableInfo[]>(`/admin-api/v1/generator/datasources/${datasourceId}/tables`)
}

/**
 * 查询表的字段信息
 */
export function getTableColumns(datasourceId: number, tableName: string): Promise<ColumnInfo[]> {
  return get<ColumnInfo[]>(`/admin-api/v1/generator/datasources/${datasourceId}/tables/${tableName}/columns`)
}

/**
 * 分页查询生成配置列表
 */
export function listGeneratorConfigs(query: PageQuery): Promise<PageResponse<GeneratorConfig>> {
  return get<PageResponse<GeneratorConfig>>('/admin-api/v1/generator/configs', query as unknown as Record<string, unknown>)
}

/**
 * 创建生成配置
 */
export function createGeneratorConfig(payload: Omit<GeneratorConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return post<void>('/admin-api/v1/generator/configs', payload)
}

/**
 * 更新生成配置
 */
export function updateGeneratorConfig(id: number, payload: Omit<GeneratorConfig, 'id' | 'createTime' | 'updateTime'>): Promise<void> {
  return put<void>(`/admin-api/v1/generator/configs/${id}`, payload)
}

/**
 * 删除生成配置
 */
export function deleteGeneratorConfig(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/generator/configs/${id}`)
}

/**
 * 按配置执行代码生成（后端按配置生成全部文件）
 */
export function generateCode(configId: number): Promise<GeneratedFile[]> {
  return post<GeneratedFile[]>(`/admin-api/v1/generator/configs/${configId}/generate`)
}

/**
 * 分页查询指定配置的生成历史
 */
export function listGenerateHistory(configId: number, query: PageQuery): Promise<PageResponse<GenerateHistory>> {
  return get<PageResponse<GenerateHistory>>(`/admin-api/v1/generator/configs/${configId}/history`, query as unknown as Record<string, unknown>)
}
