/**
 * EmptyState 单元测试
 * ------------------------------------------------------------------
 * 覆盖：props 默认值、type 内置空态图映射、自定义 image/description、默认插槽
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import EmptyState from '@/components/EmptyState.vue'

/** el-empty 桩：透传 props 并渲染默认插槽 */
const ElEmptyStub = defineComponent({
  name: 'ElEmpty',
  props: {
    description: { type: String, default: '' },
    image: { type: String, default: undefined },
    imageSize: { type: Number, default: undefined },
  },
  setup(_, { slots }) {
    return () => h('div', { class: 'el-empty-stub' }, [slots.default?.()])
  },
})

/** EmptyState 的入参（与组件 Props 对齐） */
interface EmptyProps {
  description?: string
  image?: string
  imageSize?: number
  type?: 'default' | 'search' | 'network' | 'permission'
}

/** 挂载组件并返回 wrapper 与 el-empty 桩 */
function mountEmpty(props: EmptyProps = {}) {
  const wrapper = mount(EmptyState, {
    props,
    global: { stubs: { ElEmpty: ElEmptyStub } },
  })
  return { wrapper, stub: wrapper.findComponent(ElEmptyStub) }
}

describe('EmptyState 组件', () => {
  it('默认渲染「暂无数据」与 200 图片尺寸，default 类型交给 el-empty 默认图', () => {
    const { wrapper, stub } = mountEmpty()
    expect(stub.props('description')).toBe('暂无数据')
    expect(stub.props('imageSize')).toBe(200)
    expect(stub.props('image')).toBeUndefined()
    wrapper.unmount()
  })

  it('按 type 映射内置空态图标识', () => {
    const search = mountEmpty({ type: 'search' })
    expect(search.stub.props('image')).toBe('search')
    search.wrapper.unmount()
    const network = mountEmpty({ type: 'network' })
    expect(network.stub.props('image')).toBe('network')
    network.wrapper.unmount()
    const permission = mountEmpty({ type: 'permission' })
    expect(permission.stub.props('image')).toBe('permission')
    permission.wrapper.unmount()
  })

  it('自定义 image 优先于 type 内置图', () => {
    const { wrapper, stub } = mountEmpty({ type: 'search', image: 'https://cdn.example.com/empty.png' })
    expect(stub.props('image')).toBe('https://cdn.example.com/empty.png')
    wrapper.unmount()
  })

  it('自定义 description 透传', () => {
    const { wrapper, stub } = mountEmpty({ description: '暂无用户数据' })
    expect(stub.props('description')).toBe('暂无用户数据')
    wrapper.unmount()
  })

  it('默认插槽渲染操作内容', () => {
    const wrapper = mount(EmptyState, {
      global: { stubs: { ElEmpty: ElEmptyStub } },
      slots: { default: '<button class="slot-action">新增用户</button>' },
    })
    expect(wrapper.find('.slot-action').exists()).toBe(true)
    wrapper.unmount()
  })
})
