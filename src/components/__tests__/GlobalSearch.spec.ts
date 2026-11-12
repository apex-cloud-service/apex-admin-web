/**
 * GlobalSearch 单元测试
 * ------------------------------------------------------------------
 * 覆盖：弹层打开、关键词防抖搜索与重置、Enter 立即搜索、结果渲染与跳转、
 * 重建索引、结果分页翻页；不含真实 Meilisearch 检索与弹层定位。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import GlobalSearch from '@/components/GlobalSearch/index.vue'
import type { SearchResult } from '@/api/search'

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  rebuildIndex: vi.fn(),
  routerPush: vi.fn(),
  showError: vi.fn<(error: unknown, defaultMsg?: string) => void>(),
  messageSuccess: vi.fn<(msg?: string) => void>(),
  messageError: vi.fn<(msg?: string) => void>(),
}))

vi.mock('@/api/search', () => ({
  search: mocks.search,
  rebuildIndex: mocks.rebuildIndex,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))
vi.mock('@/utils/request', () => ({ showError: mocks.showError }))
vi.mock('element-plus/es/components/message/index.mjs', () => ({
  ElMessage: { success: mocks.messageSuccess, error: mocks.messageError },
}))

/** el-input 桩：渲染原生 input，转发 update:modelValue/focus/keyup */
const ElInputStub = defineComponent({
  name: 'ElInput',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue', 'focus', 'keyup'],
  setup(props, { emit, expose }) {
    expose({ focus: () => emit('focus') })
    return () =>
      h('input', {
        class: 'input-stub',
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
        onFocus: () => emit('focus'),
        onKeyup: (event: KeyboardEvent) => emit('keyup', event),
      })
  },
})

/** el-popover 桩：渲染 reference 与默认插槽 */
const ElPopoverStub = defineComponent({
  name: 'ElPopover',
  props: { visible: { type: Boolean, default: false }, width: { type: Number, default: 0 } },
  emits: ['update:visible', 'show'],
  setup(_, { slots }) {
    return () => h('div', { class: 'popover-stub' }, [slots.reference?.(), slots.default?.()])
  },
})

/** el-button 桩：渲染原生 button 并转发 click（声明 emits 后 onClick 不再落入 attrs） */
const ElButtonStub = defineComponent({
  name: 'ElButton',
  emits: ['click'],
  setup(_, { slots, emit }) {
    return () => h('button', { class: 'el-button-stub', onClick: () => emit('click') }, slots.default?.())
  },
})

/** el-tag 桩：透传 type 供断言 */
const ElTagStub = defineComponent({
  name: 'ElTag',
  props: { type: { type: String, default: '' }, size: { type: String, default: '' } },
  setup(_, { slots }) {
    return () => h('span', { class: 'el-tag-stub' }, slots.default?.())
  },
})

/** el-pagination 桩：暴露 changePage 触发 current-change */
const ElPaginationStub = defineComponent({
  name: 'ElPagination',
  props: {
    currentPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
  },
  emits: ['update:current-page', 'current-change'],
  setup(_, { emit, expose }) {
    expose({
      changePage: (next: number) => {
        emit('update:current-page', next)
        emit('current-change', next)
      },
    })
    return () => h('div', { class: 'el-pagination-stub' })
  },
})

const SEARCH_STUBS = {
  ElPopover: ElPopoverStub,
  ElInput: ElInputStub,
  ElButton: ElButtonStub,
  ElTag: ElTagStub,
  ElPagination: ElPaginationStub,
}

/** 构造一条搜索结果 */
function hit(resourceType: string, resourceId: string, title: string): SearchResult {
  return {
    resourceType,
    resourceId,
    title,
    subtitle: '',
    description: '',
    highlightSnippet: '',
    score: 1,
    status: 1,
    createdAt: '2026-11-11T10:00:00',
    updatedAt: '2026-11-11T10:00:00',
  }
}

/** 挂载组件（v-loading 注册为空指令避免告警） */
function mountSearch() {
  return mount(GlobalSearch, {
    global: { stubs: SEARCH_STUBS, directives: { loading: {} } },
  })
}

/** 输入关键词后按 Enter 立即搜索，并冲刷防抖定时器与微任务 */
async function searchNow(wrapper: ReturnType<typeof mountSearch>, keyword: string) {
  const input = wrapper.find('input.input-stub')
  await input.setValue(keyword)
  await input.trigger('keyup.enter')
  await vi.advanceTimersByTimeAsync(0)
}

describe('GlobalSearch 弹层与搜索', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('输入框聚焦后弹层可见', async () => {
    const wrapper = mountSearch()
    const popover = wrapper.findComponent(ElPopoverStub)
    expect(popover.props('visible')).toBe(false)
    await wrapper.find('input.input-stub').trigger('focus')
    expect(popover.props('visible')).toBe(true)
    wrapper.unmount()
  })

  it('关键词输入防抖 300ms 后触发一次搜索并携带分页参数', async () => {
    mocks.search.mockResolvedValue({ list: [], total: 0 })
    const wrapper = mountSearch()
    await wrapper.find('input.input-stub').setValue('用户')
    expect(mocks.search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(299)
    expect(mocks.search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.search).toHaveBeenCalledTimes(1)
    expect(mocks.search).toHaveBeenCalledWith({ keyword: '用户', page: 1, size: 10 })
    wrapper.unmount()
  })

  it('连续输入重置防抖，仅最后一次触发', async () => {
    mocks.search.mockResolvedValue({ list: [], total: 0 })
    const wrapper = mountSearch()
    const input = wrapper.find('input.input-stub')
    await input.setValue('a')
    await vi.advanceTimersByTimeAsync(200)
    await input.setValue('ab')
    await vi.advanceTimersByTimeAsync(200)
    expect(mocks.search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(mocks.search).toHaveBeenCalledTimes(1)
    expect(mocks.search).toHaveBeenCalledWith({ keyword: 'ab', page: 1, size: 10 })
    wrapper.unmount()
  })

  it('清空关键词清空结果且不再触发搜索', async () => {
    mocks.search.mockResolvedValue({ list: [], total: 0 })
    const wrapper = mountSearch()
    const input = wrapper.find('input.input-stub')
    await input.setValue('用户')
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.search).toHaveBeenCalledTimes(1)
    await input.setValue('')
    await vi.advanceTimersByTimeAsync(300)
    expect(mocks.search).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('请输入关键词搜索')
    wrapper.unmount()
  })

  it('Enter 立即触发搜索，无需等待防抖', async () => {
    mocks.search.mockResolvedValue({ list: [], total: 0 })
    const wrapper = mountSearch()
    await searchNow(wrapper, '角色')
    expect(mocks.search).toHaveBeenCalledTimes(1)
    expect(mocks.search).toHaveBeenCalledWith({ keyword: '角色', page: 1, size: 10 })
    wrapper.unmount()
  })

  it('空关键词按 Enter 不发起搜索', async () => {
    const wrapper = mountSearch()
    await searchNow(wrapper, '')
    expect(mocks.search).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('GlobalSearch 结果渲染与跳转', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('搜索结果渲染类型标签与标题', async () => {
    mocks.search.mockResolvedValue({
      list: [hit('user', 'u1', '张三'), hit('role', 'r1', '管理员')],
      total: 2,
    })
    const wrapper = mountSearch()
    await searchNow(wrapper, '张')

    const items = wrapper.findAll('.result-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('用户')
    expect(items[0].text()).toContain('张三')
    expect(items[1].text()).toContain('角色')
    expect(items[1].text()).toContain('管理员')

    const tags = wrapper.findAllComponents(ElTagStub)
    expect(tags[0].props('type')).toBe('success')
    expect(tags[1].props('type')).toBe('warning')
    wrapper.unmount()
  })

  it('点击结果跳转对应管理页并关闭弹层', async () => {
    mocks.search.mockResolvedValue({ list: [hit('user', 'u1', '张三')], total: 1 })
    const wrapper = mountSearch()
    await searchNow(wrapper, '张')

    await wrapper.findAll('.result-item')[0].trigger('click')
    expect(mocks.routerPush).toHaveBeenCalledWith('/system/user?id=u1')
    expect(wrapper.findComponent(ElPopoverStub).props('visible')).toBe(false)
    wrapper.unmount()
  })

  it('未知资源类型仅关闭弹层不跳转', async () => {
    mocks.search.mockResolvedValue({ list: [hit('report', 'x9', '未知资源')], total: 1 })
    const wrapper = mountSearch()
    await searchNow(wrapper, '未知')

    await wrapper.findAll('.result-item')[0].trigger('click')
    expect(mocks.routerPush).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ElPopoverStub).props('visible')).toBe(false)
    wrapper.unmount()
  })

  it('搜索失败调用 showError', async () => {
    const error = new Error('搜索服务不可用')
    mocks.search.mockRejectedValue(error)
    const wrapper = mountSearch()
    await searchNow(wrapper, '张')
    expect(mocks.showError).toHaveBeenCalledWith(error, '搜索失败')
    wrapper.unmount()
  })
})

describe('GlobalSearch 索引重建与分页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('重建索引成功后提示', async () => {
    mocks.rebuildIndex.mockResolvedValue(1)
    const wrapper = mountSearch()
    await wrapper.find('.el-button-stub').trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.rebuildIndex).toHaveBeenCalledWith()
    expect(mocks.messageSuccess).toHaveBeenCalledWith('索引重建任务已提交')
    wrapper.unmount()
  })

  it('重建索引失败调用 showError', async () => {
    const error = new Error('重建失败')
    mocks.rebuildIndex.mockRejectedValue(error)
    const wrapper = mountSearch()
    await wrapper.find('.el-button-stub').trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.showError).toHaveBeenCalledWith(error, '索引重建提交失败')
    wrapper.unmount()
  })

  it('结果超过每页条数时渲染分页并按页码重新搜索', async () => {
    mocks.search.mockResolvedValue({ list: [hit('user', 'u1', '张三')], total: 25 })
    const wrapper = mountSearch()
    await searchNow(wrapper, '张')

    const pagination = wrapper.findComponent(ElPaginationStub)
    expect(pagination.exists()).toBe(true)
    expect(pagination.props('total')).toBe(25)

    ;(pagination.vm as unknown as { changePage: (next: number) => void }).changePage(2)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.search).toHaveBeenLastCalledWith({ keyword: '张', page: 2, size: 10 })
    wrapper.unmount()
  })

  it('结果不超过每页条数时不渲染分页', async () => {
    mocks.search.mockResolvedValue({ list: [hit('user', 'u1', '张三')], total: 5 })
    const wrapper = mountSearch()
    await searchNow(wrapper, '张')
    expect(wrapper.findComponent(ElPaginationStub).exists()).toBe(false)
    wrapper.unmount()
  })
})
