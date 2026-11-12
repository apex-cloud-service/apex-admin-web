/**
 * 租户管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（分页必须 pageNum/pageSize 而非 page/size、
 * 生命周期动作为小写枚举 disable/enable/freeze/unfreeze/deactivate/archive、
 * 配额 null=不限透传、expectedVersion 乐观锁透传）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { changeTenantStatus, createTenant, listTenants, updateTenantQuota } from './tenant'

describe('租户管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('分页必须使用 pageNum/pageSize（后端不识别 page/size）', () => {
    listTenants({ pageNum: 2, pageSize: 20, tenantCode: 'apex', tenantName: '阿佩克斯', status: 'ACTIVE' })
    expect(request.get).toHaveBeenCalledWith('/api/v2/platform/tenants', {
      pageNum: 2,
      pageSize: 20,
      tenantCode: 'apex',
      tenantName: '阿佩克斯',
      status: 'ACTIVE',
    })
    expect(request.get).toHaveBeenCalledTimes(1)
  })

  it('创建租户以 POST 提交完整载荷（租户编码创建后不可变更）', () => {
    const payload = {
      tenantCode: 'apex-001',
      tenantName: '阿佩克斯科技',
      adminUsername: 'admin',
      adminPassword: 'init-pwd',
      packageCode: 'standard',
      maxUsers: 100,
      remark: '开通引导创建',
    }
    createTenant(payload)
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants', payload)
  })

  it('生命周期动作只接受小写枚举并按 {id}/actions 提交', () => {
    const actions = ['disable', 'enable', 'freeze', 'unfreeze', 'deactivate', 'archive'] as const
    actions.forEach((action, index) => {
      changeTenantStatus(index + 1, { action })
    })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/1/actions', { action: 'disable' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/2/actions', { action: 'enable' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/3/actions', { action: 'freeze' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/4/actions', { action: 'unfreeze' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/5/actions', { action: 'deactivate' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/6/actions', { action: 'archive' })
    expect(request.post).toHaveBeenCalledTimes(6)
  })

  it('生命周期动作透传 expectedVersion 乐观锁', () => {
    changeTenantStatus(7, { action: 'freeze', expectedVersion: 3 })
    expect(request.post).toHaveBeenCalledWith('/api/v2/platform/tenants/7/actions', {
      action: 'freeze',
      expectedVersion: 3,
    })
  })

  it('配额调整走 PUT /{id}/quota 且 null 表示不限制', () => {
    updateTenantQuota(7, { maxUsers: null, maxStorageMb: null, expectedVersion: 4 })
    expect(request.put).toHaveBeenCalledWith('/api/v2/platform/tenants/7/quota', {
      maxUsers: null,
      maxStorageMb: null,
      expectedVersion: 4,
    })
  })

  it('配额设定具体数值时不做转换', () => {
    updateTenantQuota(7, { maxUsers: 500, maxStorageMb: 2048 })
    expect(request.put).toHaveBeenCalledWith('/api/v2/platform/tenants/7/quota', {
      maxUsers: 500,
      maxStorageMb: 2048,
    })
  })
})
