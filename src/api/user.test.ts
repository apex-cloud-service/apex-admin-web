/**
 * 用户管理 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（用户 ID 为字符串路径参数、创建体不含 username/password 字段、导出走通用 request 且 responseType 为 blob）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  request: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  assignUserRoles,
  createUser,
  exportUsers,
  getCurrentUserInfo,
  getUserDetail,
  listStaffRoles,
  listUsers,
  revokeUserSessions,
  updateUser,
  updateUserStatus,
} from './user'

describe('用户管理 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('当前用户信息走 /api/v1/user/info（不含角色/权限）', () => {
    getCurrentUserInfo()
    expect(request.get).toHaveBeenCalledWith('/api/v1/user/info')
  })

  it('用户列表分页 page/size 与 keyword/status 筛选透传', () => {
    listUsers({ page: 1, size: 20, keyword: '张三', status: 1 })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/users', {
      page: 1,
      size: 20,
      keyword: '张三',
      status: 1,
    })
  })

  it('详情按字符串 ID 路径参数查询（含已分配角色）', () => {
    getUserDetail('42')
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/users/42')
  })

  it('创建用户提交 phone/nickname/gender/birthday（与 AdminUserCreateRequest 对齐，无 username/password）', () => {
    const payload = { phone: '13800000000', nickname: '张三', gender: 1, birthday: '2000-01-01' }
    createUser(payload)
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/users', payload)
  })

  it('更新走 PUT 子路径，启停为 /status 端点并携带 { enabled }', () => {
    const payload = { phone: '13800000000', nickname: '张三三', gender: 2, birthday: '2000-01-01' }
    updateUser('42', payload)
    updateUserStatus('42', false)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/users/42', payload)
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/users/42/status', { enabled: false })
  })

  it('角色分配整体替换 roleIds，强退会话为 POST /sessions/revoke 端点', () => {
    assignUserRoles('42', ['1', '2'])
    revokeUserSessions('42')
    expect(request.put).toHaveBeenCalledWith('/admin-api/v1/users/42/roles', { roleIds: ['1', '2'] })
    expect(request.post).toHaveBeenCalledWith('/admin-api/v1/users/42/sessions/revoke')
  })

  it('后台可用角色列表端点正确', () => {
    listStaffRoles()
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/staff-roles')
  })

  it('导出用户走通用 request（responseType 为 blob，非 get 快捷方法）并返回固定文件名', async () => {
    const blob = new Blob(['export'])
    request.request.mockResolvedValue(blob)
    const result = await exportUsers()
    expect(request.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/admin-api/v1/export/users',
      responseType: 'blob',
    })
    expect(request.get).not.toHaveBeenCalled()
    expect(result.blob).toBe(blob)
    expect(result.filename).toBe('用户列表.xlsx')
  })
})
