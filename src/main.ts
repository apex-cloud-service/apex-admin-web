/**
 * 应用入口
 * ------------------------------------------------------------------
 * 挂载 Vue 实例，注册：
 * - Element Plus（含图标全局注册）
 * - Pinia 状态管理
 * - Vue Router
 * - v-permission 按钮权限指令
 * - Mock 数据服务（仅开发环境）
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { permission } from './directives/permission'

// Mock 数据服务（仅开发环境生效）
if (import.meta.env.DEV) {
  import('./mock')
}

// 应用根实例
const app = createApp(App)

// Pinia 状态管理（必须先于路由守卫使用 store）
app.use(createPinia())

// Element Plus（中文语言包）
app.use(ElementPlus, { locale: zhCn })

// 路由
app.use(router)

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册按钮权限指令
app.directive('permission', permission)

// 挂载到 DOM
app.mount('#app')
