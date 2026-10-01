/**
 * 代码生成器 API
 * ------------------------------------------------------------------
 * 提供数据源管理、表结构扫描、代码生成配置、模板管理、生成历史等功能
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
 * 代码生成请求参数
 */
export interface GenerateCodeRequest {
  configId: number
  tables: string[]
  outputPath?: string
  enableSwagger?: boolean
  enableLombok?: boolean
  enableMybatisPlus?: boolean
}

/**
 * 代码生成模板
 */
export interface GeneratorTemplate {
  id?: number
  name: string
  type: 'entity' | 'mapper' | 'service' | 'controller' | 'vue' | 'api'
  content: string
  description?: string
  status: number
  createTime?: string
}

/**
 * 代码生成历史记录
 */
export interface GenerateHistory {
  id: number
  configId: number
  tableName: string
  generatedFiles: string[]
  status: 'success' | 'failed'
  errorMessage?: string
  createTime: string
  createBy: string
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
 * 测试数据源连接
 */
export function testDataSourceConnection(payload: Omit<DataSource, 'id' | 'status' | 'createTime' | 'updateTime'>): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>('/admin-api/v1/generator/datasources/test', payload)
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
 * 执行代码生成
 */
export function generateCode(payload: GenerateCodeRequest): Promise<{ files: string[] }> {
  return post<{ files: string[] }>('/admin-api/v1/generator/generate', payload)
}

/**
 * 预览生成的代码
 */
export function previewCode(configId: number, tableName: string): Promise<Record<string, string>> {
  return get<Record<string, string>>(`/admin-api/v1/generator/preview/${configId}/${tableName}`)
}

/**
 * 查询模板列表
 */
export function listTemplates(): Promise<GeneratorTemplate[]> {
  return get<GeneratorTemplate[]>('/admin-api/v1/generator/templates')
}

/**
 * 创建代码模板
 */
export function createTemplate(payload: Omit<GeneratorTemplate, 'id' | 'createTime'>): Promise<void> {
  return post<void>('/admin-api/v1/generator/templates', payload)
}

/**
 * 更新代码模板
 */
export function updateTemplate(id: number, payload: Omit<GeneratorTemplate, 'id' | 'createTime'>): Promise<void> {
  return put<void>(`/admin-api/v1/generator/templates/${id}`, payload)
}

/**
 * 删除代码模板
 */
export function deleteTemplate(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/generator/templates/${id}`)
}

/**
 * 分页查询生成历史记录
 */
export function listGenerateHistory(query: PageQuery & { configId?: number }): Promise<PageResponse<GenerateHistory>> {
  return get<PageResponse<GenerateHistory>>('/admin-api/v1/generator/history', query as unknown as Record<string, unknown>)
}

/**
 * 回滚代码生成
 */
export function rollbackGenerate(historyId: number): Promise<void> {
  return post<void>(`/admin-api/v1/generator/history/${historyId}/rollback`)
}
