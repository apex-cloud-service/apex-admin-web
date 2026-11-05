/**
 * 动态路由构建单元测试
 * ------------------------------------------------------------------
 * 覆盖菜单树到路由记录的转换：
 * - 按钮节点不生成路由
 * - 未登记 component 的菜单被跳过
 * - 空目录被跳过，目录 redirect 指向首个子路由
 * - visible=0 保留路由但标记 hidden
 * - status 不参与过滤（历史种子数据 status 口径不一致）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const systemApi = vi.hoisted(() => ({ listMenuTree: vi.fn() }))
vi.mock('@/api/system', () => systemApi)

import { buildDynamicRoutes } from '@/router/dynamic'
import type { MenuNode } from '@/types'

/** 构造菜单节点（补齐必填字段） */
function menu(partial: Partial<MenuNode>): MenuNode {
  return {
    id: 1,
    parentId: 0,
    menuName: '菜单',
    menuType: 1,
    status: 1,
    ...partial,
  }
}

describe('buildDynamicRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('按钮节点不生成路由', async () => {
    systemApi.listMenuTree.mockResolvedValue([menu({ id: 1, menuType: 2, component: 'system/user/index' })])

    expect(await buildDynamicRoutes([])).toEqual([])
  })

  it('未登记的 component 被跳过', async () => {
    systemApi.listMenuTree.mockResolvedValue([menu({ id: 2, path: '/unknown', component: 'not/registered' })])

    expect(await buildDynamicRoutes([])).toEqual([])
  })

  it('已登记菜单生成带 meta 的路由并保留权限码', async () => {
    systemApi.listMenuTree.mockResolvedValue([
      menu({ id: 3, path: '/system/user', component: 'system/user/index', menuName: '用户管理', icon: 'User', perms: 'system:user:list' }),
    ])

    const routes = await buildDynamicRoutes([])

    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      path: '/system/user',
      name: 'menu-3',
      meta: { title: '用户管理', icon: 'User', perms: 'system:user:list', hidden: false },
    })
    expect(typeof routes[0].component).toBe('function')
  })

  it('目录挂载有效子路由并重定向到首个', async () => {
    systemApi.listMenuTree.mockResolvedValue([
      menu({
        id: 10,
        menuType: 0,
        path: '/system',
        menuName: '系统管理',
        children: [
          menu({ id: 11, path: 'user', component: 'system/user/index' }),
          menu({ id: 12, menuType: 2, component: 'system/user/index' }),
        ],
      }),
    ])

    const routes = await buildDynamicRoutes([])

    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/system')
    expect(routes[0].redirect).toBe('user')
    expect(routes[0].children).toHaveLength(1)
  })

  it('没有有效子路由的目录被跳过', async () => {
    systemApi.listMenuTree.mockResolvedValue([
      menu({ id: 20, menuType: 0, path: '/empty', children: [menu({ id: 21, menuType: 2 })] }),
      menu({ id: 22, menuType: 0, path: '/no-children' }),
    ])

    expect(await buildDynamicRoutes([])).toEqual([])
  })

  it('visible=0 保留路由但标记 hidden', async () => {
    systemApi.listMenuTree.mockResolvedValue([
      menu({ id: 30, path: '/hidden', component: 'system/user/index', visible: 0 }),
    ])

    const routes = await buildDynamicRoutes([])

    expect(routes[0].path).toBe('/hidden')
    expect(routes[0].meta?.hidden).toBe(true)
  })

  it('status=0 的菜单仍生成路由', async () => {
    systemApi.listMenuTree.mockResolvedValue([
      menu({ id: 40, path: '/disabled', component: 'system/user/index', status: 0 }),
    ])

    expect(await buildDynamicRoutes([])).toHaveLength(1)
  })
})
