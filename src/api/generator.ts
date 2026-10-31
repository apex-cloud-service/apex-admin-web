/**
 * 代码生成器 API
 * ------------------------------------------------------------------
 * 提供数据源管理、表结构扫描、代码生成配置、代码生成与生成历史查询，
 * 以及向导五段能力（模板目录/预检/预览/执行/下载）与异步任务链路。
 * 后端接口（apex-system GeneratorAdminRouter，前缀 /admin-api/v1/generator）：
 * - GET  /templates                  - 模板目录（内置模板只读共享，权限 system:generator:template:list）
 * - POST /preflight                  - 结构预检（system:generator:preflight）
 * - POST /preview                    - 纯渲染预览，签发绑定输入摘要的预览令牌（system:generator:preview）
 * - POST /tasks                      - 提交异步任务（须携带 previewToken，system:generator:task:create）
 * - GET  /tasks/{id}                 - 任务进度（system:generator:task:read）
 * - GET  /tasks/{id}/artifacts       - 任务产物清单（system:generator:task:read）
 * - POST /tasks/{id}/cancel          - 取消任务（system:generator:task:cancel）
 * - GET  /artifacts/{id}/download    - 按产物 ID 下载（system:generator:artifact:download）
 *
 * 异步闭环：预览拿令牌 → 提交任务 → 轮询进度 → 列产物 → 按产物 ID 下载。
 * 预览令牌绑定配置版本/模板摘要/字段映射/表集合，任一输入变化后旧令牌失效。
 */
import { del, get, post, put, request } from '@/utils/request'
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

/**
 * 模板目录项（后端 GenTemplateCatalogDTO）
 */
export interface GenTemplateCatalogItem {
  templateId: number
  templateName: string
  templateType: string
  fileSuffix?: string
  templatePath?: string
  /** 内置模板（system 租户只读共享） */
  builtin: boolean
  readOnly: boolean
  /** 引擎标识，当前仅支持 VARIABLE_SUBSTITUTION（${variable} 变量替换） */
  engine: string
  /** 模板内容摘要（16 位十六进制） */
  contentSha256: string
}

/** 预检/预览问题项（后端 GenIssueDTO） */
export interface GenIssue {
  /** 级别：ERROR / WARN */
  level: string
  code: string
  field?: string
  message: string
}

/** 预检结果（后端 GenPreflightResponse） */
export interface GenPreflightResult {
  ready: boolean
  issues: GenIssue[]
  tableCount: number
  templateCount: number
  artifactCount: number
  /** 输出根目录别名（不回传真实绝对路径） */
  outputRootAlias?: string
}

/** 预览文件片段（后端 GenPreviewResponse.GenPreviewFileDTO） */
export interface GenPreviewFile {
  tableName: string
  templateId: number
  templateType?: string
  relativePath: string
  contentSize?: number
  lineCount?: number
  contentDigest?: string
  /** 内容片段（最长 4000 字符，截断时 truncated=true） */
  contentPreview?: string
  truncated?: boolean
}

/** 预览结果（后端 GenPreviewResponse） */
export interface GenPreviewResult {
  ready: boolean
  /** 预览令牌（绑定输入摘要，提交任务时须原样回传） */
  previewToken: string
  inputDigest: string
  issues: GenIssue[]
  files: GenPreviewFile[]
}

/** 异步任务提交结果 */
export interface GenTaskSubmitResult {
  taskId: number
  status: string
}

/** 异步任务进度（后端 GenTaskDTO） */
export interface GenTaskProgress {
  id: number
  configId: number
  historyId?: number
  /** PENDING / RUNNING / COMPLETED / FAILED / CANCELED */
  status: string
  totalCount: number
  processedCount: number
  failedCount: number
  /** 进度百分比（后端向下取整、封顶 100，总量未知为 0） */
  progressPercent: number
  operatorId?: number
  errorMessage?: string
  attempts: number
  completedAt?: string
  canceledAt?: string
  createTime?: string
}

/** 任务产物（后端 GenArtifactDTO） */
export interface GenArtifact {
  id: number
  taskId: number
  configId: number
  historyId?: number
  tableName?: string
  templateType?: string
  relativePath?: string
  fileName?: string
  fileSize?: number
  /** PUBLISHED / FAILED / PARTIAL */
  status: string
  errorMessage?: string
  createTime?: string
}

/** 异步任务提交参数（与预览输入一致，令牌失效时后端拒绝） */
export interface GenTaskSubmitPayload {
  configId: number
  previewToken: string
  overwrite?: boolean
}

/**
 * 查询模板目录
 */
export function listGenTemplates(): Promise<GenTemplateCatalogItem[]> {
  return get<GenTemplateCatalogItem[]>('/admin-api/v1/generator/templates')
}

/**
 * 结构化预检
 * @param configId 生成配置 ID
 */
export function preflightGenerate(configId: number): Promise<GenPreflightResult> {
  return post<GenPreflightResult>('/admin-api/v1/generator/preflight', { configId })
}

/**
 * 纯渲染预览（不写盘），返回绑定输入摘要的预览令牌
 * @param configId 生成配置 ID
 */
export function previewGenerate(configId: number): Promise<GenPreviewResult> {
  return post<GenPreviewResult>('/admin-api/v1/generator/preview', { configId })
}

/**
 * 提交异步生成任务
 * @param payload 配置 ID、预览令牌与覆盖开关
 */
export function submitGenTask(payload: GenTaskSubmitPayload): Promise<GenTaskSubmitResult> {
  return post<GenTaskSubmitResult>('/admin-api/v1/generator/tasks', payload)
}

/**
 * 查询异步任务进度
 * @param taskId 任务 ID
 */
export function getGenTaskProgress(taskId: number): Promise<GenTaskProgress> {
  return get<GenTaskProgress>(`/admin-api/v1/generator/tasks/${taskId}`)
}

/**
 * 取消异步任务（PENDING 直接取消；RUNNING 在下一项推进时停止）
 * @param taskId 任务 ID
 */
export function cancelGenTask(taskId: number): Promise<boolean> {
  return post<boolean>(`/admin-api/v1/generator/tasks/${taskId}/cancel`)
}

/**
 * 查询任务的产物清单
 * @param taskId 任务 ID
 */
export function listGenTaskArtifacts(taskId: number): Promise<GenArtifact[]> {
  return get<GenArtifact[]>(`/admin-api/v1/generator/tasks/${taskId}/artifacts`)
}

/**
 * 按产物 ID 下载产物文件（二进制流）
 * @param artifactId 产物 ID
 */
export function downloadGenArtifact(artifactId: number): Promise<Blob> {
  return request<Blob>({
    method: 'GET',
    url: `/admin-api/v1/generator/artifacts/${artifactId}/download`,
    responseType: 'blob',
  })
}
