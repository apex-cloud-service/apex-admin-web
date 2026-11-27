/**
 * 办公平台状态单元测试
 * ------------------------------------------------------------------
 * 覆盖当前平台设置、各平台绑定状态记录与手动 reset 清理，不验证生产登出接线。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOfficeStore } from '@/stores/office'

describe('office store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态为空', () => {
    const store = useOfficeStore()
    expect(store.currentPlatform).toBe('')
    expect(store.bindingStatus).toEqual({})
  })

  it('setCurrentPlatform 更新当前平台', () => {
    const store = useOfficeStore()
    store.setCurrentPlatform('feishu')
    expect(store.currentPlatform).toBe('feishu')

    store.setCurrentPlatform('dingtalk')
    expect(store.currentPlatform).toBe('dingtalk')
  })

  it('updateBindingStatus 按平台记录绑定状态且互不覆盖', () => {
    const store = useOfficeStore()

    store.updateBindingStatus('feishu', true)
    store.updateBindingStatus('dingtalk', false)

    expect(store.bindingStatus).toEqual({ feishu: true, dingtalk: false })

    store.updateBindingStatus('feishu', false)
    expect(store.bindingStatus.feishu).toBe(false)
    expect(store.bindingStatus.dingtalk).toBe(false)
  })

  it('reset 清空平台与绑定状态（登出语义）', () => {
    const store = useOfficeStore()
    store.setCurrentPlatform('wecom')
    store.updateBindingStatus('wecom', true)

    store.reset()

    expect(store.currentPlatform).toBe('')
    expect(store.bindingStatus).toEqual({})
  })
})
