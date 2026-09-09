/**
 * 路由表
 * ------------------------------------------------------------------
 * - 静态路由：登录页、根布局（AdminLayout）
 * - 动态路由：由后端菜单树驱动生成（见 buildDynamicRoutes）
 * - 全局守卫：未登录跳登录页；已登录但身份未加载时拉取身份并生成动态路由
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { buildDynamicRoutes } from '@/router/dynamic'

/** 静态路由（不参与权限控制） */
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    name: 'Root',
    component: AdminLayout,
    redirect: '/dashboard',
    // 工作台为登录后默认页，不依赖后端菜单，须作为静态路由注册；
    // 否则未登录访问 / 时因 dashboard 动态路由尚未生成而命中 404 而非跳转登录页。
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'Odometer' },
      },
      {
        path: 'workflow/monitor/dashboard',
        redirect: 'workflow/monitor',
      },
      {
        path: 'workflow/monitor',
        name: 'WorkflowMonitor',
        component: () => import('@/views/workflow/monitor/index.vue'),
        meta: { title: '工作流监控', hidden: true },
      },
      {
        path: 'workflow/instances/:id',
        name: 'WorkflowInstanceDetail',
        component: () => import('@/views/workflow/monitor/InstanceDetail.vue'),
        meta: { title: '流程详情', hidden: true, activeMenu: '/workflow/monitor' },
      },
      {
        path: 'demo/file-upload',
        name: 'FileUploadDemo',
        component: () => import('@/views/demo/FileUploadDemo.vue'),
        meta: { title: '文件上传测试', icon: 'Upload', hidden: true },
      },
      {
        path: 'demo/file-upload-enhanced',
        name: 'FileUploadEnhancedDemo',
        component: () => import('@/views/demo/FileUploadEnhancedDemo.vue'),
        meta: { title: '文件上传增强版', icon: 'Upload', hidden: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes,
})

/** 动态路由是否已生成标记 */
let dynamicRoutesAdded = false

/**
 * 登录后（或刷新后）生成菜单驱动的动态路由。
 * 由前端路由守卫调用；失败时静默降级（仅静态路由可用）。
 */
export async function setupDynamicRoutes(): Promise<void> {
  if (dynamicRoutesAdded) return
  const userStore = useUserStore()
  try {
    const routes = await buildDynamicRoutes(userStore.permissions)
    // 找到根布局路由，将动态子路由挂入
    const root = router.getRoutes().find((r) => r.name === 'Root')
    const rootRecord = router.options.routes.find((r) => r.name === 'Root')
    if (rootRecord && Array.isArray(rootRecord.children)) {
      routes.forEach((route) => rootRecord.children!.push(route))
      dynamicRoutesAdded = true
      // 重新解析路由表
      router.addRoute(rootRecord)
    }
    void root
  } catch {
    // 菜单加载失败时保留静态路由（登录页可用），记录日志便于排查
    console.warn('[router] 动态路由生成失败，已降级为静态路由')
  }
}

/** 全局前置守卫 */
router.beforeEach(async (to) => {
  const hasToken = !!getToken()
  // 公开页面（登录/404）直接放行
  if (to.meta.public) return true
  // 未登录 → 登录页并携带回跳地址
  if (!hasToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  const userStore = useUserStore()
  if (!userStore.initialized) {
    try {
      await userStore.loadIdentity()
    } catch {
      userStore.clearLocal()
      return { path: '/login' }
    }
  }
  if (!dynamicRoutesAdded) {
    await setupDynamicRoutes()
    const resolved = router.resolve(to.fullPath)
    if (resolved.name !== 'NotFound') {
      return { path: to.fullPath, replace: true }
    }
  }
  return true
})

export default router
