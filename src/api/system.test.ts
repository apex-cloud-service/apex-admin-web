/**
 * 系统管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（易错契约：部门字段为 name/orderNum；
 * 参数配置与定时任务列表为全量数组、任务分页才走 /jobs/page 的
 * pageNum/pageSize；各资源启停统一提交 { enabled } 布尔请求体）。
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
  createConfig,
  createDept,
  createDictData,
  createDictType,
  createJob,
  createMenu,
  deleteConfig,
  deleteDept,
  deleteDictData,
  deleteDictType,
  deleteJob,
  deleteMenu,
  listConfigs,
  listDeptTree,
  listDictData,
  listDictTypes,
  listJobLogs,
  listJobs,
  listMenuTree,
  pageJobs,
  runJobOnce,
  updateConfig,
  updateConfigStatus,
  updateDept,
  updateDictData,
  updateDictDataStatus,
  updateDictType,
  updateDictTypeStatus,
  updateJob,
  updateJobStatus,
  updateMenu,
  updateMenuStatus,
} from './system'
import type {
  ConfigPayload,
  DeptPayload,
  DictDataPayload,
  DictTypePayload,
  JobPayload,
  JobQueryParams,
  MenuPayload,
} from './system'

describe('菜单管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('菜单树查询与创建路径正确', () => {
    const payload: MenuPayload = { parentId: 0, menuName: '平台管理', menuType: 0, path: '/platform' }
    listMenuTree()
    createMenu(payload)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/menus')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/menus', payload)
  })

  it('菜单更新/删除/启停路径正确且启停提交 enabled 布尔', () => {
    const payload: MenuPayload = { parentId: 0, menuName: '平台管理', menuType: 0 }
    updateMenu(5, payload)
    deleteMenu(5)
    updateMenuStatus(5, false)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/menus/5', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/menus/5')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/menus/5/status', { enabled: false })
  })
})

describe('部门管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('部门树查询与创建（字段为 name/orderNum，非 deptName）', () => {
    const payload: DeptPayload = { parentId: 1, name: '研发部', orderNum: 2, status: 1 }
    listDeptTree()
    createDept(payload)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/depts')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/depts', payload)
  })

  it('部门更新与删除路径正确', () => {
    const payload: DeptPayload = { name: '研发中心', orderNum: 3 }
    updateDept(3, payload)
    deleteDept(3)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/depts/3', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/depts/3')
  })
})

describe('字典管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('字典类型列表（全量数组）与创建/更新/删除/启停', () => {
    const payload: DictTypePayload = { dictName: '是否', dictType: 'sys_yes_no', remark: '通用' }
    listDictTypes()
    createDictType(payload)
    updateDictType(7, payload)
    deleteDictType(7)
    updateDictTypeStatus(7, false)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/dict/types')
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/dict/types', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/dict/types/7', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/dict/types/7')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/dict/types/7/status', { enabled: false })
  })

  it('字典数据按 dictType 查询且创建/更新/删除/启停路径正确', () => {
    const payload: DictDataPayload = { dictType: 'sys_yes_no', dictLabel: '是', dictValue: 'Y', dictSort: 1 }
    listDictData('sys_yes_no')
    createDictData(payload)
    updateDictData(9, payload)
    deleteDictData(9)
    updateDictDataStatus(9, true)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/dict/data', { dictType: 'sys_yes_no' })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/dict/data', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/dict/data/9', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/dict/data/9')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/dict/data/9/status', { enabled: true })
  })
})

describe('参数配置 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('列表为全量数组（无分页参数）且 CRUD/启停路径正确', () => {
    const payload: ConfigPayload = { configName: '默认密码', configKey: 'sys.password', configValue: '******' }
    listConfigs()
    createConfig(payload)
    updateConfig(4, payload)
    deleteConfig(4)
    updateConfigStatus(4, true)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/configs')
    expect(request.get).toHaveBeenCalledTimes(1)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/configs', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/configs/4', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/configs/4')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/configs/4/status', { enabled: true })
  })
})

describe('定时任务 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('任务列表为全量数组（无分页参数）', () => {
    listJobs()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/jobs')
    expect(request.get).toHaveBeenCalledTimes(1)
  })

  it('任务分页查询走 /jobs/page 且使用 pageNum/pageSize', () => {
    const params: JobQueryParams = { pageNum: 2, pageSize: 20, jobName: '数据同步', jobGroup: 'DEFAULT', status: 1 }
    pageJobs(params)
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/jobs/page', params)
  })

  it('任务创建/更新/删除/启停路径与请求体正确', () => {
    const payload: JobPayload = {
      jobName: '数据同步',
      invokeTarget: 'syncTask.run',
      cronExpression: '0 0 2 * * ?',
      concurrent: 1,
    }
    createJob(payload)
    updateJob(6, payload)
    deleteJob(6)
    updateJobStatus(6, false)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/jobs', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/jobs/6', payload)
    expect(request.del).toHaveBeenCalledWith('/admin-api/v1/jobs/6')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/jobs/6/status', { enabled: false })
  })

  it('手动触发走 /run，执行日志 limit 缺省 20 且可自定义', () => {
    runJobOnce(6)
    listJobLogs(6)
    listJobLogs(6, 50)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/jobs/6/run')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/jobs/6/logs', { limit: 20 })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/jobs/6/logs', { limit: 50 })
  })
})
