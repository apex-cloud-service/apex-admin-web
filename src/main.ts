/**
 * 应用入口
 * ------------------------------------------------------------------
 * 挂载 Vue 实例，注册：
 * - Element Plus 全局配置（模板组件经 unplugin-vue-components 按需解析与引入样式）
 * - Pinia 状态管理
 * - Vue Router
 * - v-permission 按钮权限指令
 * - Mock 数据服务（仅开发环境）
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 函数式组件走深路径导入：主入口重导出全量安装器，会把未使用组件一并拖入产物
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElNotification } from 'element-plus/es/components/notification/index.mjs'
import { provideGlobalConfig } from 'element-plus/es/components/config-provider/src/hooks/use-global-config'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 函数式组件为命令式调用、渲染在应用树之外，样式无法随模板解析，须全局引入
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/es/components/loading/style/css'

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

// Element Plus 全局配置：语言包在应用级 provide，树内组件与树外函数式组件均可读取。
// 函数式组件（ElMessage/ElMessageBox/ElNotification）原本由 app.use(ElementPlus)
// 安装时回填 _context；按需引入下改为显式回填，否则其渲染上下文为空、语言回退英文。
// _context 为 EP 2.14 内部约定（withInstallFunction 写入），公开类型未声明，此处窄化断言。
provideGlobalConfig({ locale: zhCn }, app)
const functionalComponents = [ElMessage, ElMessageBox, ElNotification] as unknown as Array<{
  _context: unknown
}>
for (const fn of functionalComponents) {
  fn._context = app._context
}

// 路由
app.use(router)

// 全局注册 Element Plus 图标（动态菜单图标按后端返回的名称解析，依赖全局注册）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册按钮权限指令
app.directive('permission', permission)

// 挂载到 DOM
app.mount('#app')
