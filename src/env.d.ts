/// <reference types="vite/client" />

/**
 * Vite 环境变量类型声明
 * ------------------------------------------------------------------
 * 为 import.meta.env 提供类型提示（VITE_ 前缀变量）。
 */
interface ImportMetaEnv {
  /** 后端代理目标（开发环境） */
  readonly VITE_API_PROXY_TARGET?: string
  /** 后端网关地址（生产环境，同域可留空） */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** .vue 文件模块声明（Vue SFC 类型支持） */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<object, object, any>
  export default component
}
