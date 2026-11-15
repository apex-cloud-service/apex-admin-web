/**
 * 知识文档清理页面组件测试
 * ------------------------------------------------------------------
 * 覆盖：按需查询、分页与乱序保护、权限、读取失败隔离、确认取消、删除/重试接受语义及加载状态。
 * 接口与组件传输使用桩，不替代真实后台任务、对象存储和索引清理验证。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, provide, type ComputedRef, type DirectiveBinding, type InjectionKey, type PropType } from 'vue'
import DocumentPage from './index.vue'
import type { KnowledgeChunk, KnowledgeDocument, KnowledgeDocumentCleanupDTO, PageResponse } from '@/types'

const mocks = vi.hoisted(() => ({
  createManualDocument: vi.fn<typeof import('@/api/knowledge').createManualDocument>(),
  deleteDocument: vi.fn<typeof import('@/api/knowledge').deleteDocument>(),
  getDocument: vi.fn<typeof import('@/api/knowledge').getDocument>(),
  listDocuments: vi.fn<typeof import('@/api/knowledge').listDocuments>(),
  listDocumentCleanups: vi.fn<typeof import('@/api/knowledge').listDocumentCleanups>(),
  listSpaces: vi.fn<typeof import('@/api/knowledge').listSpaces>(),
  reindexDocument: vi.fn<typeof import('@/api/knowledge').reindexDocument>(),
  retryDocumentCleanup: vi.fn<typeof import('@/api/knowledge').retryDocumentCleanup>(),
  uploadDocument: vi.fn<typeof import('@/api/knowledge').uploadDocument>(),
  confirm: vi.fn<(message: string, title: string, options: { type: string }) => Promise<unknown>>(),
  success: vi.fn(),
  warning: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('@/api/knowledge', () => mocks)
vi.mock('@/utils/request', () => ({ showError: mocks.showError }))
vi.mock('element-plus', () => ({
  ElMessage: { success: mocks.success, warning: mocks.warning },
  ElMessageBox: { confirm: mocks.confirm },
}))

type TableRow = KnowledgeDocument | KnowledgeDocumentCleanupDTO | KnowledgeChunk
const tableRowsKey: InjectionKey<ComputedRef<TableRow[]>> = Symbol('tableRows')

const SlotStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', [slots.header?.(), slots.default?.(), slots.footer?.()])
  },
})

const ElButtonStub = defineComponent({
  name: 'ElButton',
  props: { loading: Boolean, disabled: Boolean },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h('button', {
      disabled: props.loading || props.disabled,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

const ElTableStub = defineComponent({
  name: 'ElTable',
  props: { data: { type: Array as PropType<TableRow[]>, default: () => [] } },
  setup(props, { slots }) {
    provide(tableRowsKey, computed(() => props.data))
    return () => h('div', { class: 'table-stub' }, slots.default?.())
  },
})

const ElTableColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: { prop: String, label: String },
  setup(props, { slots }) {
    const rows = inject(tableRowsKey, computed<TableRow[]>(() => []))
    return () => h('div', { class: 'column-stub' }, [
      h('span', props.label),
      ...rows.value.map(row => h('div', slots.default
        ? slots.default({ row })
        : String(props.prop ? Reflect.get(row, props.prop) ?? '-' : ''))),
    ])
  },
})

const ElOverlayStub = defineComponent({
  props: { modelValue: Boolean, title: String },
  emits: ['update:modelValue', 'close'],
  setup(props, { slots, emit }) {
    return () => props.modelValue ? h('section', [
      h('h2', props.title),
      slots.default?.(),
      slots.footer?.(),
      h('button', { onClick: () => { emit('update:modelValue', false); emit('close') } }, '关闭'),
    ]) : null
  },
})

const ElAlertStub = defineComponent({
  props: { title: String },
  setup(props) {
    return () => h('div', props.title)
  },
})

const PaginationStub = defineComponent({
  name: 'Pagination',
  props: { total: Number },
  emits: ['change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'pagination-stub' }, [
      h('span', `总数 ${props.total}`),
      h('button', { onClick: () => emit('change', 2, 20) }, '下一页'),
      h('button', { onClick: () => emit('change', 1, 50) }, '每页 50 条'),
    ])
  },
})

function document(): KnowledgeDocument {
  return { id: 9, spaceId: 2, title: '现有文档', sourceType: 'MANUAL', parseStatus: 'PARSED', chunkCount: 2, indexStatus: 'INDEXED' }
}

function cleanup(documentId: number, status: KnowledgeDocumentCleanupDTO['status']): KnowledgeDocumentCleanupDTO {
  return {
    documentId,
    title: `清理文档 ${documentId}`,
    status,
    errorMessage: status === 'FAILED' ? '索引服务不可用' : null,
    attempts: status === 'FAILED' ? 3 : 0,
    updatedAt: '2026-11-15T10:00:00',
    nextRetryAt: status === 'PENDING' ? '2026-11-15T10:05:00' : null,
  }
}

function pageOf<T>(list: T[], total = list.length): PageResponse<T> {
  return { list, total, pageNum: 1, pageSize: 20, pages: Math.ceil(total / 20) }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function applyLoading(el: HTMLElement, binding: DirectiveBinding<boolean>) {
  el.dataset.loading = String(binding.value)
}

function mountPage(permissions?: string[]) {
  return mount(DocumentPage, {
    global: {
      stubs: {
        ElCard: SlotStub,
        ElForm: SlotStub,
        ElFormItem: SlotStub,
        ElSelect: SlotStub,
        ElOption: true,
        ElInput: true,
        ElButton: ElButtonStub,
        ElTable: ElTableStub,
        ElTableColumn: ElTableColumnStub,
        ElTag: SlotStub,
        ElDialog: ElOverlayStub,
        ElDrawer: ElOverlayStub,
        ElAlert: ElAlertStub,
        Pagination: PaginationStub,
      },
      directives: {
        loading: { mounted: applyLoading, updated: applyLoading },
        permission: {
          mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
            el.dataset.permission = binding.value
            if (permissions && !permissions.includes(binding.value)) el.remove()
          },
        },
      },
    },
  })
}

type PageWrapper = ReturnType<typeof mountPage>
function buttons(wrapper: PageWrapper, text: string) {
  return wrapper.findAllComponents(ElButtonStub).filter(button => button.text() === text && wrapper.element.contains(button.element))
}
async function clickButton(wrapper: PageWrapper, text: string, index = 0) {
  const button = buttons(wrapper, text)[index]
  expect(button, `应显示按钮「${text}」`).toBeDefined()
  await button.trigger('click')
  await flushPromises()
}
async function openCleanups(wrapper: PageWrapper) {
  await clickButton(wrapper, '清理记录')
  return wrapper.find('.cleanup-drawer')
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.resetAllMocks()
  mocks.listSpaces.mockResolvedValue(pageOf([{ id: 2, name: '产品', status: 1 }]))
  mocks.listDocuments.mockResolvedValue(pageOf([document()]))
  mocks.listDocumentCleanups.mockResolvedValue(pageOf([cleanup(9, 'FAILED')]))
  mocks.deleteDocument.mockResolvedValue(true)
  mocks.retryDocumentCleanup.mockResolvedValue(true)
  mocks.confirm.mockResolvedValue('confirm')
})

describe('知识文档后台清理记录', () => {
  it('按需打开抽屉查询，展示四种状态、错误摘要、尝试次数和 nullable 时间', async () => {
    mocks.listDocumentCleanups.mockResolvedValue(pageOf([
      cleanup(9, 'PENDING'), cleanup(10, 'PROCESSING'), cleanup(11, 'COMPLETED'), cleanup(12, 'FAILED'),
    ], 45))
    const wrapper = mountPage()
    await flushPromises()
    expect(mocks.listDocumentCleanups).not.toHaveBeenCalled()
    const drawer = await openCleanups(wrapper)
    expect(mocks.listDocumentCleanups).toHaveBeenCalledWith({ page: 1, size: 20 })
    for (const text of ['待清理', '清理中', '已完成', '清理失败', '索引服务不可用', '尝试次数', '3',
      '2026-11-15T10:00:00', '2026-11-15T10:05:00', '-', '总数 45',
      '最近清理已确认', '后台复核不保证永久物理擦除']) {
      expect(drawer.text()).toContain(text)
    }
    expect(buttons(wrapper, '清理记录')[0].attributes('data-permission')).toBe('kb:doc:read')
    expect(buttons(wrapper, '重试')).toHaveLength(2)
    for (const button of buttons(wrapper, '重试')) {
      expect(button.attributes('data-permission')).toBe('kb:doc:delete')
    }
  })

  it('无 read 权限不显示入口且不拉清理列表', async () => {
    const wrapper = mountPage(['kb:space:read', 'kb:doc:delete'])
    await flushPromises()
    expect(wrapper.findAll('button').some(button => button.text() === '清理记录')).toBe(false)
    expect(mocks.listDocumentCleanups).not.toHaveBeenCalled()
  })

  it('有 read 无 delete 权限可以查看但不显示重试', async () => {
    const wrapper = mountPage(['kb:doc:read', 'kb:space:read'])
    await flushPromises()
    await openCleanups(wrapper)
    expect(wrapper.find('.cleanup-drawer').text()).toContain('清理文档 9')
    expect(wrapper.find('.cleanup-drawer').findAll('button').some(button => button.text() === '重试')).toBe(false)
  })

  it('手动翻页、改变每页条数与刷新只影响清理列表', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const drawer = await openCleanups(wrapper)
    await drawer.findAll('button').find(button => button.text() === '下一页')!.trigger('click')
    await flushPromises()
    expect(mocks.listDocumentCleanups).toHaveBeenLastCalledWith({ page: 2, size: 20 })
    await clickButton(wrapper, '刷新')
    expect(mocks.listDocumentCleanups).toHaveBeenLastCalledWith({ page: 2, size: 20 })
    await drawer.findAll('button').find(button => button.text() === '每页 50 条')!.trigger('click')
    await flushPromises()
    expect(mocks.listDocumentCleanups).toHaveBeenLastCalledWith({ page: 1, size: 50 })
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
  })

  it('空清理记录仍可刷新，total 来自响应', async () => {
    mocks.listDocumentCleanups.mockResolvedValue(pageOf([]))
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    expect(wrapper.find('.cleanup-table').findComponent(ElTableStub).props('data')).toEqual([])
    expect(wrapper.find('.cleanup-drawer').text()).toContain('总数 0')
    await clickButton(wrapper, '刷新')
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(2)
  })

  it('查询中 loading 隔离并阻止重复刷新，完成后恢复', async () => {
    const pending = deferred<PageResponse<KnowledgeDocumentCleanupDTO>>()
    mocks.listDocumentCleanups.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    expect(wrapper.find('.cleanup-table').attributes('data-loading')).toBe('true')
    expect(wrapper.findAllComponents(ElTableStub)[0].attributes('data-loading')).toBe('false')
    expect(buttons(wrapper, '刷新')[0].props('loading')).toBe(true)
    await buttons(wrapper, '刷新')[0].trigger('click')
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(1)
    pending.resolve(pageOf([cleanup(9, 'FAILED')]))
    await flushPromises()
    expect(wrapper.find('.cleanup-table').attributes('data-loading')).toBe('false')
    expect(buttons(wrapper, '刷新')[0].props('loading')).toBe(false)
  })

  it('read error 显式展示且与文档列表隔离，刷新可恢复', async () => {
    const error = new Error('清理服务不可用')
    mocks.listDocumentCleanups.mockRejectedValueOnce(error)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    expect(mocks.showError).toHaveBeenCalledWith(error, '加载清理记录失败')
    expect(wrapper.find('.cleanup-error').text()).toContain('加载清理记录失败')
    expect(wrapper.text()).toContain('现有文档')
    expect(wrapper.find('.cleanup-table').attributes('data-loading')).toBe('false')
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
    await clickButton(wrapper, '刷新')
    expect(wrapper.find('.cleanup-error').exists()).toBe(false)
    expect(wrapper.find('.cleanup-drawer').text()).toContain('清理文档 9')
  })

  it('刷新失败隐藏旧记录和分页，恢复时保留当前页而非重置页码', async () => {
    mocks.listDocumentCleanups.mockResolvedValue(pageOf([cleanup(9, 'FAILED')], 45))
    const wrapper = mountPage()
    await flushPromises()
    const drawer = await openCleanups(wrapper)
    await drawer.findAll('button').find(button => button.text() === '下一页')!.trigger('click')
    await flushPromises()
    mocks.listDocumentCleanups.mockRejectedValueOnce(new Error('断网'))
    await clickButton(wrapper, '刷新')
    expect(wrapper.find('.cleanup-error').exists()).toBe(true)
    expect(wrapper.find('.cleanup-drawer').text()).not.toContain('清理文档 9')
    expect(wrapper.find('.cleanup-table').findComponent(ElTableStub).props('data')).toEqual([])
    const pagination = wrapper.find('.cleanup-drawer').findComponent(PaginationStub)
    expect(pagination.attributes('style')).toContain('display: none')
    expect(pagination.props('total')).toBe(45)
    await clickButton(wrapper, '刷新')
    expect(mocks.listDocumentCleanups).toHaveBeenLastCalledWith({ page: 2, size: 20 })
    expect(pagination.attributes('style') ?? '').not.toContain('display: none')
  })

  it('翻页时旧请求迟到不会覆盖新页结果或提前结束 loading', async () => {
    const firstPage = deferred<PageResponse<KnowledgeDocumentCleanupDTO>>()
    const secondPage = deferred<PageResponse<KnowledgeDocumentCleanupDTO>>()
    mocks.listDocumentCleanups.mockReturnValueOnce(firstPage.promise).mockReturnValueOnce(secondPage.promise)
    const wrapper = mountPage()
    await flushPromises()
    const drawer = await openCleanups(wrapper)
    await drawer.findAll('button').find(button => button.text() === '下一页')!.trigger('click')
    await flushPromises()
    firstPage.resolve(pageOf([cleanup(9, 'FAILED')], 45))
    await flushPromises()
    expect(wrapper.find('.cleanup-drawer').text()).not.toContain('清理文档 9')
    expect(wrapper.find('.cleanup-table').attributes('data-loading')).toBe('true')
    secondPage.resolve(pageOf([cleanup(10, 'PENDING')], 45))
    await flushPromises()
    expect(wrapper.find('.cleanup-drawer').text()).toContain('清理文档 10')
    expect(wrapper.find('.cleanup-table').attributes('data-loading')).toBe('false')
  })

  it('空间选择器失败不影响文档和清理查询', async () => {
    const error = new Error('无空间读取权限')
    mocks.listSpaces.mockRejectedValueOnce(error)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    expect(mocks.showError).toHaveBeenCalledWith(error, '加载空间列表失败')
    expect(wrapper.text()).toContain('现有文档')
    expect(wrapper.find('.cleanup-drawer').text()).toContain('清理文档 9')
  })
})

describe('清理重试', () => {
  it.each(['FAILED', 'PENDING'] as const)('%s 可确认重试，true 只提示接受并刷新当前清理页', async (status) => {
    mocks.listDocumentCleanups.mockResolvedValue(pageOf([cleanup(9, status)], 45))
    const wrapper = mountPage()
    await flushPromises()
    const drawer = await openCleanups(wrapper)
    await drawer.findAll('button').find(button => button.text() === '下一页')!.trigger('click')
    await flushPromises()
    await clickButton(wrapper, '重试')
    expect(mocks.confirm).toHaveBeenCalledWith(expect.stringContaining('清理文档 9'), '重试确认', { type: 'warning' })
    expect(mocks.retryDocumentCleanup).toHaveBeenCalledWith(9)
    expect(mocks.success).toHaveBeenCalledWith('清理重试已接受，请稍后刷新查看状态')
    expect(mocks.listDocumentCleanups).toHaveBeenLastCalledWith({ page: 2, size: 20 })
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(3)
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
  })

  it.each(['COMPLETED', 'PROCESSING'] as const)('%s 不提供重试动作', async (status) => {
    mocks.listDocumentCleanups.mockResolvedValue(pageOf([cleanup(9, status)]))
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    expect(buttons(wrapper, '重试')).toHaveLength(0)
    expect(mocks.retryDocumentCleanup).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'close'])('确认 %s 不调用重试也不显示失败', async (reason) => {
    mocks.confirm.mockRejectedValueOnce(reason)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    await clickButton(wrapper, '重试')
    expect(mocks.retryDocumentCleanup).not.toHaveBeenCalled()
    expect(mocks.showError).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(buttons(wrapper, '重试')[0].props('loading')).toBe(false)
  })

  it('重试 loading 覆盖确认和请求，阻止重复提交，false 不报 success 且恢复按钮', async () => {
    const confirmation = deferred<unknown>()
    const retry = deferred<boolean>()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    mocks.retryDocumentCleanup.mockReturnValueOnce(retry.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    await clickButton(wrapper, '重试')
    expect(buttons(wrapper, '重试')[0].props('loading')).toBe(true)
    await buttons(wrapper, '重试')[0].trigger('click')
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    expect(mocks.retryDocumentCleanup).not.toHaveBeenCalled()
    confirmation.resolve('confirm')
    await flushPromises()
    expect(buttons(wrapper, '重试')[0].props('loading')).toBe(true)
    retry.resolve(false)
    await flushPromises()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.warning).toHaveBeenCalledWith('清理重试未被接受，请刷新记录后再试')
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(1)
    expect(buttons(wrapper, '重试')[0].props('loading')).toBe(false)
  })

  it('重试异常保留记录，显示错误并解除 loading', async () => {
    const error = new Error('版本冲突')
    mocks.retryDocumentCleanup.mockRejectedValueOnce(error)
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    await clickButton(wrapper, '重试')
    expect(mocks.showError).toHaveBeenCalledWith(error, '清理重试提交失败')
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(1)
    expect(buttons(wrapper, '重试')[0].props('loading')).toBe(false)
  })
})

describe('删除接受语义', () => {
  it('确认明确软隐藏和后台清理，true 提示接受并刷新文档和已打开的清理记录', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openCleanups(wrapper)
    await clickButton(wrapper, '删除')
    expect(mocks.confirm).toHaveBeenCalledWith(expect.stringMatching(/后台清理/), '删除确认', { type: 'warning' })
    expect(mocks.confirm.mock.calls[0][0]).toContain('隐藏')
    expect(mocks.deleteDocument).toHaveBeenCalledWith(9)
    expect(mocks.success).toHaveBeenCalledWith('删除请求已接受，文档已隐藏，后台清理状态可在清理记录中查看')
    expect(mocks.listDocuments).toHaveBeenCalledTimes(2)
    expect(mocks.listDocumentCleanups).toHaveBeenCalledTimes(2)
  })

  it('未打开清理抽屉时删除不自动拉取记录', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await clickButton(wrapper, '删除')
    expect(mocks.listDocumentCleanups).not.toHaveBeenCalled()
    expect(mocks.listDocuments).toHaveBeenCalledTimes(2)
  })

  it.each(['cancel', 'close'])('删除确认 %s 不提交也不报失败', async (reason) => {
    mocks.confirm.mockRejectedValueOnce(reason)
    const wrapper = mountPage()
    await flushPromises()
    await clickButton(wrapper, '删除')
    expect(mocks.deleteDocument).not.toHaveBeenCalled()
    expect(mocks.showError).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(buttons(wrapper, '删除')[0].props('loading')).toBe(false)
  })

  it('删除 false 不报 success、不刷新且显示未接受', async () => {
    mocks.deleteDocument.mockResolvedValueOnce(false)
    const wrapper = mountPage()
    await flushPromises()
    await clickButton(wrapper, '删除')
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.warning).toHaveBeenCalledWith('删除请求未被接受，请刷新文档后再试')
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
    expect(buttons(wrapper, '删除')[0].props('loading')).toBe(false)
  })

  it('删除请求 loading 阻止重复提交，异常结束后保留文档并显示错误', async () => {
    const deletion = deferred<boolean>()
    mocks.deleteDocument.mockReturnValueOnce(deletion.promise)
    const wrapper = mountPage()
    await flushPromises()
    await clickButton(wrapper, '删除')
    expect(buttons(wrapper, '删除')[0].props('loading')).toBe(true)
    await buttons(wrapper, '删除')[0].trigger('click')
    expect(mocks.deleteDocument).toHaveBeenCalledTimes(1)
    const error = new Error('删除服务不可用')
    deletion.reject(error)
    await flushPromises()
    expect(mocks.showError).toHaveBeenCalledWith(error, '文档删除请求失败')
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.listDocuments).toHaveBeenCalledTimes(1)
    expect(buttons(wrapper, '删除')[0].props('loading')).toBe(false)
  })
})
