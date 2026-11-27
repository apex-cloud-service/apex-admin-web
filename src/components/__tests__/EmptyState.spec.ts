/**
 * EmptyState 单元测试
 * ------------------------------------------------------------------
 * 覆盖：props 默认值、type 场景 SVG 资产、自定义 image/description、默认插槽
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

  it('按 type 解析仓库内场景 SVG 地址（不是裸场景字符串）', () => {
    for (const type of ['search', 'network', 'permission'] as const) {
      const { wrapper, stub } = mountEmpty({ type })
      const image = stub.props('image') as string
      expect(image).not.toBe(type)
      // 生产方式为哈希资源 URL；测试环境 Vite 可能内联为 data:image/svg+xml
      expect(image).toMatch(/^data:image\/svg\+xml|\.svg(\?.*)?$/)
      wrapper.unmount()
    }
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
