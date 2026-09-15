/**
 * 办公平台路由配置
 * 
 * 本文件需要添加到前端项目的路由配置中
 * 通常路径为：/Users/work/apex-admin-web/src/router/modules/office.ts
 */

import type { RouteRecordRaw } from 'vue-router'

const officeRoutes: RouteRecordRaw = {
  path: '/office',
  name: 'Office',
  component: () => import('@/layout/index.vue'),
  redirect: '/office/organization',
  meta: {
    title: '办公平台',
    icon: 'office-building',
    order: 5,
  },
  children: [
    {
      path: 'organization',
      name: 'OfficeOrganization',
      component: () => import('@/views/office/organization/index.vue'),
      meta: {
        title: '组织同步',
        icon: 'user',
        keepAlive: true,
      },
    },
    {
      path: 'message',
      name: 'OfficeMessage',
      component: () => import('@/views/office/message/index.vue'),
      meta: {
        title: '消息发送',
        icon: 'message',
        keepAlive: true,
      },
    },
    {
      path: 'approval',
      name: 'OfficeApproval',
      component: () => import('@/views/office/approval/index.vue'),
      meta: {
        title: '审批管理',
        icon: 'document-checked',
        keepAlive: true,
      },
    },
    {
      path: 'calendar',
      name: 'OfficeCalendar',
      component: () => import('@/views/office/calendar/index.vue'),
      meta: {
        title: '日历管理',
        icon: 'calendar',
        keepAlive: true,
      },
    },
    {
      path: 'document',
      name: 'OfficeDocument',
      component: () => import('@/views/office/document/index.vue'),
      meta: {
        title: '文档管理',
        icon: 'document',
        keepAlive: true,
      },
    },
  ],
}

export default officeRoutes
