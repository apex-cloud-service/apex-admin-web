/**
 * 动态路由构建
 * ------------------------------------------------------------------
 * 将后端菜单树（/admin-api/v1/menus）转换为 Vue Router 路由记录：
 * - 目录（menuType=0）：作为分组父节点
 * - 菜单（menuType=1）：挂载到 AdminLayout children
 * - 按钮（menuType=2）：不生成路由，仅用于权限码
 * 组件通过「组件名 → 视图模块」注册表解析，避免动态 import 路径逃逸。
 *
 * 状态语义说明：
 * - 后端 MenuState 枚举定义 status：0=停用 1=正常；但历史种子数据（V2/V8）写入
 *   的 status 取值与枚举不一致。为避免“全量菜单被丢弃导致页面 404”，路由生成
 *   不按 status 过滤（目录/菜单且组件可解析即注册），停用/隐藏仅影响侧边栏展示：
 * - visible：0=隐藏 1=显示，隐藏的菜单仍保留路由（可直接访问）但不出现在侧边栏
 */
import type { RouteRecordRaw } from 'vue-router'
import { listMenuTree } from '@/api/system'
import type { MenuNode } from '@/types'

/** 后端 component 字段 → 前端视图组件注册表 */
const VIEW_REGISTRY: Record<string, () => Promise<unknown>> = {
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'system/role/index': () => import('@/views/system/role/index.vue'),
  'system/menu/index': () => import('@/views/system/menu/index.vue'),
  'system/dept/index': () => import('@/views/system/dept/index.vue'),
  'system/dict/index': () => import('@/views/system/dict/index.vue'),
  'system/config/index': () => import('@/views/system/config/index.vue'),
  'system/database/index': () => import('@/views/system/database/index.vue'),
  'system/job/index': () => import('@/views/system/job/index.vue'),
  'monitor/loginlog/index': () => import('@/views/monitor/loginlog/index.vue'),
  'monitor/audit/index': () => import('@/views/monitor/audit/index.vue'),
  'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue'),
  'monitor/online/index': () => import('@/views/monitor/online/index.vue'),
  'monitor/dashboard/index': () => import('@/views/monitor/dashboard/index.vue'),
  'monitor/runtime-log/index': () => import('@/views/monitor/runtime-log/index.vue'),
  'monitor/business-log/index': () => import('@/views/monitor/business-log/index.vue'),
  'profile/index': () => import('@/views/profile/index.vue'),
  'dashboard/index': () => import('@/views/dashboard/index.vue'),
  'workflow/monitor/index': () => import('@/views/workflow/monitor/index.vue'),
  'data/document/index': () => import('@/views/data/document/index.vue'),
  'data/chart/index': () => import('@/views/data/chart/index.vue'),
}

/**
 * 将单个菜单节点转换为路由记录（递归处理子节点）。
 * @param node 菜单节点
 * @returns 路由记录，或 null（按钮/无效组件不生成）
 */
function toRouteRecord(node: MenuNode): RouteRecordRaw | null {
  // 按钮（menuType=2）不生成路由
  if (node.menuType === 2) return null
  // 目录：作为纯分组，挂载子路由
  if (node.menuType === 0) {
    const children = (node.children || [])
      .map(toRouteRecord)
      .filter((r): r is RouteRecordRaw => r !== null)
    if (children.length === 0) return null
    return {
      path: node.path || `/${node.id}`,
      redirect: children[0].path,
      meta: { title: node.menuName, icon: node.icon, hidden: node.visible === 0 },
      children,
    }
  }
  // 菜单：需可解析的组件
  const component = node.component || ''
  const loader = VIEW_REGISTRY[component]
  if (!loader) return null
  return {
    path: node.path || `/${node.id}`,
    name: `menu-${node.id}`,
    component: loader,
    meta: {
      title: node.menuName,
      icon: node.icon,
      perms: node.perms,
      // 隐藏菜单（visible=0）：路由仍注册，侧边栏不展示
      hidden: node.visible === 0,
    },
  }
}

/**
 * 拉取菜单树并构建动态路由。
 * @param _permissions 当前用户权限码（保留参数，供后续按权限过滤）
 * @returns 路由记录数组
 */
export async function buildDynamicRoutes(_permissions: string[]): Promise<RouteRecordRaw[]> {
  const menus = await listMenuTree()
  return menus.map(toRouteRecord).filter((r): r is RouteRecordRaw => r !== null)
}
