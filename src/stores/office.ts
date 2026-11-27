/**
 * 办公平台状态管理
 * ------------------------------------------------------------------
 * 仅保存当前选中的平台标识与各平台绑定布尔状态，不保存 appId/appSecret
 * 等平台配置，也不发起绑定或登录请求。该 Store 当前仅被测试引用，未接入
 * 生产页面或登出流程；reset 只提供手动清空能力。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 办公平台 Store
 * 
 * @description 保存当前平台字符串与各平台绑定布尔状态，不管理平台应用配置或持久化
 */
export const useOfficeStore = defineStore('office', () => {
  /**
   * 当前选中的平台标识
   * 
   * @description 任意字符串，setter 不校验；当前无生产调用方，不构成办公 API 的平台枚举契约
   */
  const currentPlatform = ref<string>('')

  /**
   * 用户绑定状态
   * 
   * @description 记录用户在各平台的绑定状态
   */
  const bindingStatus = ref<Record<string, boolean>>({})

  /**
   * 设置当前平台
   * 
   * @param platform 平台类型
   */
  const setCurrentPlatform = (platform: string) => {
    currentPlatform.value = platform
  }

  /**
   * 更新绑定状态
   * 
   * @param platform 平台类型
   * @param status 绑定状态
   */
  const updateBindingStatus = (platform: string, status: boolean) => {
    bindingStatus.value[platform] = status
  }

  /**
   * 清理内存中的平台与绑定状态
   * 
   * @description 提供手动重置能力，当前未接入生产登出链路
   */
  const reset = () => {
    currentPlatform.value = ''
    bindingStatus.value = {}
  }

  return {
    currentPlatform,
    bindingStatus,
    setCurrentPlatform,
    updateBindingStatus,
    reset
  }
})
