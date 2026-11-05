/**
 * 通用分页组件单元测试
 * ------------------------------------------------------------------
 * 覆盖 Pagination 的对外事件契约：
 * - 页码变化向上抛出 change(page, size)
 * - 每页条数变化重置到第一页
 * - total 变小时当前页回退到最后一页
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Pagination from '@/components/Pagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/settings'

/** el-pagination 桩组件：暴露按钮触发 current-change / size-change */
const ElPaginationStub = defineComponent({
  name: 'ElPagination',
  props: {
    currentPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: DEFAULT_PAGE_SIZE },
    total: { type: Number, default: 0 },
  },
  emits: ['update:current-page', 'update:page-size', 'current-change', 'size-change'],
  setup(props, { emit, expose }) {
    expose({
      next: () => {
        emit('update:current-page', props.currentPage + 1)
        emit('current-change', props.currentPage + 1)
      },
      changeSize: (size: number) => {
        emit('update:page-size', size)
        emit('size-change', size)
      },
    })
    return () => h('div', { class: 'el-pagination-stub' })
  },
})

/** 挂载 Pagination 并返回 wrapper 与桩实例 */
function mountPagination(total: number) {
  const wrapper = mount(Pagination, {
    props: { total },
    global: { stubs: { 'el-pagination': ElPaginationStub } },
  })
  const stub = wrapper.findComponent(ElPaginationStub)
  return { wrapper, stub }
}

describe('Pagination 组件', () => {
  it('默认每页条数取 settings 中的 DEFAULT_PAGE_SIZE', () => {
    const { stub } = mountPagination(100)
    expect(stub.props('pageSize')).toBe(DEFAULT_PAGE_SIZE)
  })

  it('页码变化抛出 change(page, size)', () => {
    const { wrapper, stub } = mountPagination(100)

    ;(stub.vm as unknown as { next: () => void }).next()

    expect(wrapper.emitted('change')?.[0]).toEqual([2, DEFAULT_PAGE_SIZE])
  })

  it('每页条数变化时重置到第一页', () => {
    const { wrapper, stub } = mountPagination(100)

    ;(stub.vm as unknown as { changeSize: (size: number) => void }).changeSize(50)

    expect(wrapper.emitted('change')?.[0]).toEqual([1, 50])
  })

  it('total 变小导致当前页越界时回退到最后一页', async () => {
    const { wrapper, stub } = mountPagination(200)
    ;(stub.vm as unknown as { next: () => void }).next()
    expect(wrapper.emitted('change')?.[0]).toEqual([2, DEFAULT_PAGE_SIZE])

    await wrapper.setProps({ total: DEFAULT_PAGE_SIZE * 2 })

    expect(wrapper.emitted('change')).toHaveLength(1)
    await wrapper.setProps({ total: 1 })
    expect(wrapper.emitted('change')?.[1]).toEqual([1, DEFAULT_PAGE_SIZE])
  })
})
