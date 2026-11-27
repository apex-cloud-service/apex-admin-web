/**
 * 系统管理 API
 * ------------------------------------------------------------------
 * 覆盖：菜单、部门、字典、参数配置、定时任务五类系统管理资源。
 * 口径说明：
 * - 部门字段为 name/orderNum（与后端 DeptEntity/DeptDTO 对齐）
 * - 参数配置/定时任务列表接口后端返回全量数组（非分页）
 */
import { del, get, post, put } from '@/utils/request'
import type { DeptNode, DictData, DictId, DictType, JobLog, MenuNode, PageResponse, SysConfig, SysJob } from '@/types'

/* ==================== 菜单管理 ==================== */

/** 菜单创建/更新请求体 */
export interface MenuPayload {
  parentId: number
  menuName: string
  /** 0=目录 1=菜单 2=按钮 */
  menuType: number
  path?: string
  component?: string
  perms?: string
  icon?: string
  sort?: number
  /** 显示状态：0=隐藏 1=显示（与 MenuNode.visible 口径一致） */
  visible?: number
  /** 状态：0=停用 1=正常 */
  status?: number
}

/**
 * 查询菜单树（后端返回树形结构）。
 */
export function listMenuTree(): Promise<MenuNode[]> {
  return get<MenuNode[]>('/admin-api/v1/menus')
}

/**
 * 创建菜单。
 * @param payload 菜单信息
 */
export function createMenu(payload: MenuPayload): Promise<void> {
  return post<void>('/admin-api/v1/menus', payload)
}

/**
 * 更新菜单。
 * @param id 菜单 ID
 * @param payload 菜单信息
 */
export function updateMenu(id: number, payload: MenuPayload): Promise<void> {
  return put<void>(`/admin-api/v1/menus/${id}`, payload)
}

/**
 * 删除菜单。
 * @param id 菜单 ID
 */
export function deleteMenu(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/menus/${id}`)
}

/**
 * 启停菜单。
 * @param id 菜单 ID
 * @param enabled true=启用 false=停用
 */
export function updateMenuStatus(id: number, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/menus/${id}/status`, { enabled })
}

/* ==================== 部门管理 ==================== */

/** 部门创建/更新请求体（后端 DeptEntity 字段） */
export interface DeptPayload {
  parentId?: number
  /** 部门名称 */
  name: string
  /** 显示顺序 */
  orderNum?: number
  leader?: string
  phone?: string
  email?: string
  /** 0=停用 1=正常 */
  status?: number
}

/**
 * 查询部门树。
 */
export function listDeptTree(): Promise<DeptNode[]> {
  return get<DeptNode[]>('/admin-api/v1/depts')
}

/**
 * 创建部门。
 * @param payload 部门信息
 */
export function createDept(payload: DeptPayload): Promise<void> {
  return post<void>('/admin-api/v1/depts', payload)
}

/**
 * 更新部门。
 * @param id 部门 ID
 * @param payload 部门信息
 */
export function updateDept(id: number, payload: DeptPayload): Promise<void> {
  return put<void>(`/admin-api/v1/depts/${id}`, payload)
}

/**
 * 删除部门。
 * @param id 部门 ID
 */
export function deleteDept(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/depts/${id}`)
}

/* ==================== 字典管理 ==================== */

/** 校验并返回字典 ID 路径段；DictId 允许后端返回字符串 ID，非法值（非正整数形态）提前抛错而非拼出坏 URL */
function dictIdSegment(id: DictId): string {
  if (typeof id === 'string' ? !/^[1-9][0-9]*$/.test(id) : !Number.isSafeInteger(id) || id <= 0) {
    throw new Error('字典 ID 无效，请刷新列表后重试')
  }
  return String(id)
}

/** 字典类型请求体 */
export interface DictTypePayload {
  dictName: string
  dictType: string
  remark?: string
}

/** 字典数据请求体 */
export interface DictDataPayload {
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort?: number
  /** 是否默认：1=默认 0=否 */
  isDefault?: number
  remark?: string
}

/** 查询字典类型列表（全量数组） */
export function listDictTypes(): Promise<DictType[]> {
  return get<DictType[]>('/admin-api/v1/dict/types')
}

/** 创建字典类型 */
export function createDictType(payload: DictTypePayload): Promise<void> {
  return post<void>('/admin-api/v1/dict/types', payload)
}

/**
 * 更新字典类型。
 * @param id 正整数字符串或正安全整数，保留大整数字符串的精度
 * @param payload 字典名称、编码与可选备注
 * @returns 请求完成的 Promise，不返回更新记录
 * @throws Error ID 形态非法或数字超出安全整数范围；同步抛出且不发送请求
 */
export function updateDictType(id: DictId, payload: DictTypePayload): Promise<void> {
  return put<void>(`/admin-api/v1/dict/types/${dictIdSegment(id)}`, payload)
}

/**
 * 删除字典类型。
 * @param id 正整数字符串或正安全整数
 * @returns 请求完成的 Promise；操作确认由调用方负责
 * @throws Error ID 无效；同步抛出且不发送请求
 */
export function deleteDictType(id: DictId): Promise<void> {
  return del<void>(`/admin-api/v1/dict/types/${dictIdSegment(id)}`)
}

/**
 * 启停字典类型。
 * @param id 正整数字符串或正安全整数
 * @param enabled true=启用，false=停用；以 JSON 布尔值提交
 * @returns 请求完成的 Promise，不返回更新记录
 * @throws Error ID 无效；同步抛出且不发送请求
 */
export function updateDictTypeStatus(id: DictId, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/dict/types/${dictIdSegment(id)}/status`, { enabled })
}

/** 按字典类型编码查询字典数据（dictType 必填） */
export function listDictData(dictType: string): Promise<DictData[]> {
  return get<DictData[]>('/admin-api/v1/dict/data', { dictType })
}

/** 创建字典数据 */
export function createDictData(payload: DictDataPayload): Promise<void> {
  return post<void>('/admin-api/v1/dict/data', payload)
}

/**
 * 更新字典数据项。
 * @param id 正整数字符串或正安全整数
 * @param payload 字典编码、标签、值与可选排序/默认标记
 * @returns 请求完成的 Promise，不返回更新记录
 * @throws Error ID 无效；同步抛出且不发送请求
 */
export function updateDictData(id: DictId, payload: DictDataPayload): Promise<void> {
  return put<void>(`/admin-api/v1/dict/data/${dictIdSegment(id)}`, payload)
}

/**
 * 删除字典数据项。
 * @param id 正整数字符串或正安全整数
 * @returns 请求完成的 Promise；操作确认由调用方负责
 * @throws Error ID 无效；同步抛出且不发送请求
 */
export function deleteDictData(id: DictId): Promise<void> {
  return del<void>(`/admin-api/v1/dict/data/${dictIdSegment(id)}`)
}

/**
 * 启停字典数据项。
 * @param id 正整数字符串或正安全整数
 * @param enabled true=启用，false=停用；以 JSON 布尔值提交
 * @returns 请求完成的 Promise，不返回更新记录
 * @throws Error ID 无效；同步抛出且不发送请求
 */
export function updateDictDataStatus(id: DictId, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/dict/data/${dictIdSegment(id)}/status`, { enabled })
}

/* ==================== 参数配置 ==================== */

/** 参数配置请求体 */
export interface ConfigPayload {
  configName: string
  configKey: string
  configValue: string
  remark?: string
}

/** 查询参数配置列表（后端返回全量数组） */
export function listConfigs(): Promise<SysConfig[]> {
  return get<SysConfig[]>('/admin-api/v1/configs')
}

/** 创建参数配置 */
export function createConfig(payload: ConfigPayload): Promise<void> {
  return post<void>('/admin-api/v1/configs', payload)
}

/** 更新参数配置 */
export function updateConfig(id: number, payload: ConfigPayload): Promise<void> {
  return put<void>(`/admin-api/v1/configs/${id}`, payload)
}

/** 删除参数配置 */
export function deleteConfig(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/configs/${id}`)
}

/** 启停参数配置 */
export function updateConfigStatus(id: number, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/configs/${id}/status`, { enabled })
}

/* ==================== 定时任务 ==================== */

/** 定时任务请求体 */
export interface JobPayload {
  jobName: string
  jobGroup?: string
  invokeTarget: string
  cronExpression: string
  /** 0=允许并发 1=禁止并发 */
  concurrent?: number
  remark?: string
}

/**
 * 定时任务查询参数（支持分页和筛选）
 */
export interface JobQueryParams extends Record<string, unknown> {
  /** 当前页码 */
  pageNum: number
  /** 每页条数 */
  pageSize: number
  /** 任务名称（模糊匹配） */
  jobName?: string
  /** 任务分组（精确匹配） */
  jobGroup?: string
  /** 任务状态（0-禁用，1-启用） */
  status?: number
}

/**
 * 查询定时任务列表（后端返回全量数组）
 * @returns 定时任务列表
 */
export function listJobs(): Promise<SysJob[]> {
  return get<SysJob[]>('/admin-api/v1/jobs')
}

/**
 * 分页查询定时任务列表
 * 
 * @param params 查询参数（支持分页、任务名称、分组、状态筛选）
 * @returns SysJob 分页（list/total）；使用 pageNum/pageSize，不是全量 listJobs 数组接口
 * 
 * @example
 * ```typescript
 * // 查询第1页，每页20条
 * const firstPage = await pageJobs({ pageNum: 1, pageSize: 20 })
 * 
 * // 按任务名称筛选
 * const byName = await pageJobs({ pageNum: 1, pageSize: 20, jobName: '数据同步' })
 * 
 * // 按分组和状态筛选
 * const byGroup = await pageJobs({
 *   pageNum: 1, 
 *   pageSize: 20, 
 *   jobGroup: 'DEFAULT',
 *   status: 1 
 * })
 * ```
 */
export function pageJobs(params: JobQueryParams): Promise<PageResponse<SysJob>> {
  return get<PageResponse<SysJob>>('/admin-api/v1/jobs/page', params)
}

/** 创建定时任务 */
export function createJob(payload: JobPayload): Promise<void> {
  return post<void>('/admin-api/v1/jobs', payload)
}

/** 更新定时任务 */
export function updateJob(id: number, payload: JobPayload): Promise<void> {
  return put<void>(`/admin-api/v1/jobs/${id}`, payload)
}

/** 删除定时任务 */
export function deleteJob(id: number): Promise<void> {
  return del<void>(`/admin-api/v1/jobs/${id}`)
}

/** 启停定时任务 */
export function updateJobStatus(id: number, enabled: boolean): Promise<void> {
  return put<void>(`/admin-api/v1/jobs/${id}/status`, { enabled })
}

/** 手动触发一次定时任务 */
export function runJobOnce(id: number): Promise<void> {
  return post<void>(`/admin-api/v1/jobs/${id}/run`)
}

/**
 * 查询某任务的最近执行日志。
 * @param id 定时任务数字 ID
 * @param limit 返回条数上限（可选，默认 20）
 * @returns JobLog 数组，不包含分页总数
 */
export function listJobLogs(id: number, limit = 20): Promise<JobLog[]> {
  return get<JobLog[]>(`/admin-api/v1/jobs/${id}/logs`, { limit })
}
