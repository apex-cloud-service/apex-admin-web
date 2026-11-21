/**
 * E2E 公共装置
 * ------------------------------------------------------------------
 * 提供后端接口打桩（Result 契约包装）、菜单树夹具与表单登录辅助。
 * 全部接口走 page.route 拦截，不依赖真实后端。
 */
import type { Page } from '@playwright/test'

/** 统一成功包装（与后端 Result 契约一致） */
export function ok<T>(data: T): string {
  return JSON.stringify({ code: 0, msg: 'ok', data, traceId: 'e2e' })
}

/** 登录响应（认证中心 LoginResponse 裸契约，不包 Result） */
export const LOGIN_RESULT = {
  accessToken: 'e2e-access',
  refreshToken: 'e2e-refresh',
  tokenType: 'Bearer',
  expiresIn: 7200,
  tenantId: 'default',
}

/** 菜单树夹具：系统管理目录 + 用户管理菜单（component 已在 VIEW_REGISTRY 登记） */
export const MENUS = [
  {
    id: 1,
    parentId: 0,
    menuName: '系统管理',
    menuType: 0,
    path: '/system',
    icon: 'Setting',
    visible: 1,
    status: 1,
    children: [
      {
        id: 11,
        parentId: 1,
        menuName: '用户管理',
        menuType: 1,
        path: 'user',
        component: 'system/user/index',
        perms: 'system:user:list',
        visible: 1,
        status: 1,
        children: [],
      },
    ],
  },
]

/** 扩展菜单树夹具：系统管理（用户/租户）+ 工作流 + 办公审批（FE-003 主链路用例使用） */
export const MENUS_FULL = [
  ...MENUS,
  {
    id: 2,
    parentId: 0,
    menuName: '工作流',
    menuType: 0,
    path: '/workflow',
    icon: 'Share',
    visible: 1,
    status: 1,
    children: [
      {
        id: 21,
        parentId: 2,
        menuName: '流程监控',
        menuType: 1,
        path: 'monitor',
        component: 'workflow/monitor/index',
        perms: 'workflow:monitor:list',
        visible: 1,
        status: 1,
        children: [],
      },
    ],
  },
  {
    id: 3,
    parentId: 0,
    menuName: '办公协同',
    menuType: 0,
    path: '/office',
    icon: 'OfficeBuilding',
    visible: 1,
    status: 1,
    children: [
      {
        id: 31,
        parentId: 3,
        menuName: '审批中心',
        menuType: 1,
        path: 'approval',
        component: 'office/approval/index',
        perms: 'office:approval:list',
        visible: 1,
        status: 1,
        children: [],
      },
    ],
  },
]

/** 租户管理菜单（挂在系统管理目录下） */
export const MENUS_WITH_TENANT = [
  {
    ...MENUS[0],
    children: [
      ...MENUS[0].children,
      {
        id: 12,
        parentId: 1,
        menuName: '租户管理',
        menuType: 1,
        path: 'tenant',
        component: 'system/tenant/index',
        perms: 'system:tenant:list',
        visible: 1,
        status: 1,
        children: [],
      },
    ],
  },
  ...MENUS.slice(1),
]

/** 通用分页空数据（PageResponse 契约） */
export const EMPTY_PAGE = { list: [], total: 0, pageNum: 1, pageSize: 20, pages: 0 }

/** 后端接口前缀（锚定 origin，避免误伤 /src/** 源码模块请求） */
const API_PREFIX = /^https?:\/\/[^/]+\/(api|admin-api|auth|integration|oauth2)\//

/** 后端接口兜底路由：未显式 mock 的接口返回空成功，吸收页面并行请求噪音 */
export async function mockBackend(page: Page, options: { menus?: unknown } = {}): Promise<void> {
  await page.route(API_PREFIX, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok(null),
    }),
  )
  // 具体端点（后注册优先生效）：身份链路与常用列表端点给出可消费的形状
  await page.route(/\/api\/v1\/auth\/captcha/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok({ captchaId: 'e2e-cap', image: 'iVBORw0KGgo=' }) }),
  )
  await page.route(/\/auth\/v1\/login/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOGIN_RESULT) }),
  )
  await page.route(/\/api\/v1\/auth\/logout/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(null) }),
  )
  await page.route(/\/api\/v1\/user\/info/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ id: 1, nickName: 'E2E 用户', phone: '13800000000', status: 1 }),
    }),
  )
  await page.route(/\/api\/v1\/auth\/roles\/my/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok([{ id: 1, code: 'admin', name: '管理员' }]) }),
  )
  await page.route(/\/api\/v1\/auth\/permissions\/my/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok([{ id: 1, code: 'system:user:list', name: '用户查询' }]) }),
  )
  await page.route(/\/admin-api\/v1\/menus/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(options.menus ?? MENUS) }),
  )
  await page.route(/\/admin-api\/v1\/users/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(EMPTY_PAGE) }),
  )
  await page.route(/\/api\/v1\/messages\/unread\/count/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: ok(0) }),
  )
}

/** 表单登录（前置：mockBackend 已挂载） */
export async function loginViaForm(page: Page): Promise<void> {
  await page.goto('/login')
  await page.locator('.captcha-img').waitFor({ state: 'visible' })
  await page.getByPlaceholder('请输入账号').fill('e2e-user')
  await page.getByPlaceholder('请输入密码').fill('e2e-password')
  await page.getByPlaceholder('验证码（点击图片刷新）').fill('1234')
  await page.locator('.login-btn').click()
  await page.waitForURL(/\/dashboard/)
}
