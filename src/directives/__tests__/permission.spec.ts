/**
 * 按钮权限指令单元测试
 * ------------------------------------------------------------------
 * 覆盖 v-permission 的放行与移除语义：
 * - 空权限码与空权限集合放行
 * - 单码命中、逗号多码任一命中放行
 * - 未命中时元素从 DOM 移除
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, withDirectives } from 'vue'
import { permission } from '@/directives/permission'
import { useUserStore } from '@/stores/user'

/** 构造一个挂载 v-permission 的最小按钮组件（外层容器保留可查询的挂载点） */
function createButton(code: string) {
  return defineComponent({
    setup() {
      return () =>
        h('div', { id: 'container' }, [
          withDirectives(h('button', { id: 'target' }, '新增'), [[permission, code]]),
        ])
    },
  })
}

describe('v-permission 指令', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('权限码为空时放行', () => {
    const wrapper = mount(createButton(''))
    expect(wrapper.find('#target').exists()).toBe(true)
  })

  it('权限集合为空时放行（未配置视为不限制）', () => {
    const wrapper = mount(createButton('system:user:create'))
    expect(wrapper.find('#target').exists()).toBe(true)
  })

  it('拥有权限码时保留元素', () => {
    const userStore = useUserStore()
    userStore.permissions = ['system:user:create']
    const wrapper = mount(createButton('system:user:create'))
    expect(wrapper.find('#target').exists()).toBe(true)
  })

  it('缺少权限码时移除元素', () => {
    const userStore = useUserStore()
    userStore.permissions = ['system:user:delete']
    const wrapper = mount(createButton('system:user:create'))
    expect(wrapper.find('#target').exists()).toBe(false)
  })

  it('逗号分隔的多码满足任一即可', () => {
    const userStore = useUserStore()
    userStore.permissions = ['system:user:delete']
    const wrapper = mount(createButton('system:user:create,system:user:delete'))
    expect(wrapper.find('#target').exists()).toBe(true)
  })
})
