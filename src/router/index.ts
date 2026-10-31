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
    path: '/oauth2/callback',
    name: 'OAuth2Callback',
    component: () => import('@/views/oauth2/callback.vue'),
    meta: { title: 'OAuth2 授权回调', public: true, hidden: true },
  },
  {
    // 办公平台（飞书/钉钉/企微）授权回调页：平台重定向回来时用户尚未登录，
    // 必须 public 放行；页面自行用 code/state 调 /api/v1/office/callback 换取会话。
    path: '/office/callback',
    name: 'OfficeCallback',
    component: () => import('@/views/office/callback.vue'),
    meta: { title: '办公平台授权回调', public: true, hidden: true },
  },
  {
    // 自助密码找回独立页（匿名）：三段式申请/校验/重设，
    // 与登录页内的找回弹窗共用 /auth/v2/password-recovery 契约。
    path: '/password-recovery',
    name: 'PasswordRecovery',
    component: () => import('@/views/public/password-recovery.vue'),
    meta: { title: '密码找回', public: true },
  },
  {
    // 文件分享匿名兑换页（匿名）：凭分享令牌兑换元信息并下载，
    // 令牌即凭证，可经 /share?token=xxx 直达。
    path: '/share',
    name: 'ShareExchange',
    component: () => import('@/views/public/share-exchange.vue'),
    meta: { title: '文件分享兑换', public: true, hidden: true },
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
