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
 * - 路由生成不读取菜单 status，后端菜单状态不参与注册或过滤；
 * - visible：0=隐藏 1=显示，隐藏菜单仍注册路由（可直接访问）；侧边栏仅按 Root 直接子项的
 *   title/hidden 过滤，目录内子项不会再次过滤 hidden。
 * - 空目录（无可解析子菜单）不生成路由；permissions 参数当前未参与过滤。
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
  'system/job/query': () => import('@/views/system/job/query.vue'),
  'system/generator/index': () => import('@/views/system/generator/index.vue'),
  'system/auth/index': () => import('@/views/system/auth/index.vue'),
  'system/sso/index': () => import('@/views/system/sso/index.vue'),
  'system/masking/index': () => import('@/views/system/masking/index.vue'),
  'system/tenant/index': () => import('@/views/system/tenant/index.vue'),
  'system/tenant-package/index': () => import('@/views/system/tenant-package/index.vue'),
  'system/open-app/index': () => import('@/views/system/open-app/index.vue'),
  'system/capability/index': () => import('@/views/system/capability/index.vue'),
  'system/security/index': () => import('@/views/system/security/index.vue'),
  'monitor/loginlog/index': () => import('@/views/monitor/loginlog/index.vue'),
  'monitor/audit/index': () => import('@/views/monitor/audit/index.vue'),
  'monitor/api-call-log/index': () => import('@/views/monitor/api-call-log/index.vue'),
  'monitor/online/index': () => import('@/views/monitor/online/index.vue'),
  'monitor/session/index': () => import('@/views/monitor/session.vue'),
  'monitor/dashboard/index': () => import('@/views/monitor/dashboard/index.vue'),
  'monitor/runtime-log/index': () => import('@/views/monitor/runtime-log/index.vue'),
  'monitor/operations/index': () => import('@/views/monitor/operations/index.vue'),
  'monitor/business-log/index': () => import('@/views/monitor/business-log/index.vue'),
  'profile/index': () => import('@/views/profile/index.vue'),
  'dashboard/index': () => import('@/views/dashboard/index.vue'),
  'workflow/monitor/index': () => import('@/views/workflow/monitor/index.vue'),
  'workflow/definition/index': () => import('@/views/workflow/definition/index.vue'),
  'data/document/index': () => import('@/views/data/document/index.vue'),
  'data/chart/index': () => import('@/views/data/chart/index.vue'),
  'data/file-share/index': () => import('@/views/data/file-share/index.vue'),
  'office/message/index': () => import('@/views/office/message/index.vue'),
  'office/approval/index': () => import('@/views/office/approval/index.vue'),
  'office/config/index': () => import('@/views/office/config/index.vue'),
  'office/bindings/index': () => import('@/views/office/bindings/index.vue'),
  'office/console/index': () => import('@/views/office/console/index.vue'),
  'office/organization/index': () => import('@/views/office/organization/index.vue'),
  'office/calendar/index': () => import('@/views/office/calendar/index.vue'),
  'office/document/index': () => import('@/views/office/document/index.vue'),
  'office/meeting-room/index': () => import('@/views/office/meeting-room/index.vue'),
  'office/notify/index': () => import('@/views/office/notify/index.vue'),
  'integration/connector/index': () => import('@/views/integration/connector.vue'),
  'iot/device/index': () => import('@/views/iot/device.vue'),
  'iot/device-rule/index': () => import('@/views/iot/device-rule.vue'),
  'knowledge/space/index': () => import('@/views/knowledge/space/index.vue'),
  'knowledge/document/index': () => import('@/views/knowledge/document/index.vue'),
  'knowledge/search/index': () => import('@/views/knowledge/search/index.vue'),
  'knowledge/chat/index': () => import('@/views/knowledge/chat/index.vue'),
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
 * @param _permissions 当前用户权限码；当前未参与过滤，保留参数供后续扩展
 * @returns 路由记录数组（未登记的组件与空目录被跳过）
 */
export async function buildDynamicRoutes(_permissions: string[]): Promise<RouteRecordRaw[]> {
  const menus = await listMenuTree()
  return menus.map(toRouteRecord).filter((r): r is RouteRecordRaw => r !== null)
}
