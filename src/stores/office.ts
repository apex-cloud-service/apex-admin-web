/**
 * 办公平台状态管理
 * ------------------------------------------------------------------
 * 管理办公平台（飞书、钉钉、企业微信）的配置和绑定状态。
 * 
 * 状态包括：
 *   - 平台配置信息（appId、appSecret 等）
 *   - 用户绑定状态
 *   - 当前选中的平台
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 办公平台 Store
 * 
 * @description 管理办公平台的配置和用户绑定状态
 */
export const useOfficeStore = defineStore('office', () => {
  /**
   * 当前选中的平台类型
   * 
   * @description 可选值：'feishu' | 'dingtalk' | 'wechat'
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
   * 清理所有状态
   * 
   * @description 用户登出时调用
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
