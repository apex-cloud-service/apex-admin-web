/**
 * 办公平台 Store
 * 管理办公平台的全局状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OfficePlatform } from '@/api/office'

export interface PlatformStatus {
  platform: OfficePlatform
  connected: boolean
  bindingStatus: 'approved' | 'pending' | 'rejected' | 'none'
  lastSyncTime?: string
  deptCount?: number
  memberCount?: number
}

export const useOfficeStore = defineStore('office', () => {
  // 状态
  const platformStatuses = ref<PlatformStatus[]>([])
  const currentPlatform = ref<OfficePlatform>()
  const isLoading = ref(false)

  // 计算属性
  const connectedPlatforms = computed(() => 
    platformStatuses.value.filter(s => s.connected)
  )

  const approvedPlatforms = computed(() =>
    platformStatuses.value.filter(s => s.bindingStatus === 'approved')
  )

  const hasConnectedPlatform = computed(() => 
    connectedPlatforms.value.length > 0
  )

  // 方法
  const setPlatformStatus = (status: PlatformStatus) => {
    const index = platformStatuses.value.findIndex(s => s.platform === status.platform)
    if (index >= 0) {
      platformStatuses.value[index] = status
    } else {
      platformStatuses.value.push(status)
    }
  }

  const updatePlatformConnection = (platform: OfficePlatform, connected: boolean) => {
    const status = platformStatuses.value.find(s => s.platform === platform)
    if (status) {
      status.connected = connected
    }
  }

  const updateBindingStatus = (platform: OfficePlatform, bindingStatus: PlatformStatus['bindingStatus']) => {
    const status = platformStatuses.value.find(s => s.platform === platform)
    if (status) {
      status.bindingStatus = bindingStatus
    }
  }

  const setCurrentPlatform = (platform: OfficePlatform) => {
    currentPlatform.value = platform
  }

  const clearPlatformStatus = (platform: OfficePlatform) => {
    const index = platformStatuses.value.findIndex(s => s.platform === platform)
    if (index >= 0) {
      platformStatuses.value.splice(index, 1)
    }
  }

  const reset = () => {
    platformStatuses.value = []
    currentPlatform.value = undefined
    isLoading.value = false
  }

  return {
    // 状态
    platformStatuses,
    currentPlatform,
    isLoading,
    // 计算属性
    connectedPlatforms,
    approvedPlatforms,
    hasConnectedPlatform,
    // 方法
    setPlatformStatus,
    updatePlatformConnection,
    updateBindingStatus,
    setCurrentPlatform,
    clearPlatformStatus,
    reset
  }
})
