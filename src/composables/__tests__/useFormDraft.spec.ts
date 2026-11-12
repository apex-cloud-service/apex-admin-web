/**
 * 表单草稿自动保存 Composable 单元测试
 * ------------------------------------------------------------------
 * 覆盖草稿写入/加载、TTL 过期清理、恢复确认（恢复/放弃）、
 * 卸载前保存与 beforeunload 监听的挂载卸载。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import { useFormDraft, type UseFormDraftOptions } from '@/composables/useFormDraft'

const {
  readJSONMock,
  writeJSONMock,
  readRawMock,
  writeRawMock,
  removeItemMock,
  hasItemMock,
  confirmMock,
} = vi.hoisted(() => ({
  readJSONMock: vi.fn(),
  writeJSONMock: vi.fn(() => true),
  readRawMock: vi.fn(),
  writeRawMock: vi.fn(() => true),
  removeItemMock: vi.fn(),
  hasItemMock: vi.fn(() => false),
  confirmMock: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({
  readJSON: readJSONMock,
  writeJSON: writeJSONMock,
  readRaw: readRawMock,
  writeRaw: writeRawMock,
  removeItem: removeItemMock,
  hasItem: hasItemMock,
}))
vi.mock('@/settings', () => ({
  DRAFT_KEY_PREFIX: 'draft_',
  DRAFT_TIMESTAMP_KEY_SUFFIX: '_timestamp',
}))
vi.mock('element-plus/es/components/message-box/index.mjs', () => ({
  ElMessageBox: { confirm: confirmMock },
}))
vi.mock('@vueuse/core', () => ({
  // 直接透传，使「表单变化→保存」在测试中同步触发
  useDebounceFn: (fn: unknown) => fn,
}))

const STORAGE_KEY = 'draft_user-edit'
const TIMESTAMP_KEY = 'draft_user-edit_timestamp'

/** 挂载使用 useFormDraft 的宿主组件，捕获返回的 API */
function mountDraft(options: UseFormDraftOptions = {}) {
  const form = ref<Record<string, unknown>>({ name: '' })
  let api!: ReturnType<typeof useFormDraft>
  const Host = defineComponent({
    setup() {
      api = useFormDraft('user-edit', form as Ref<Record<string, unknown>>, options)
      return () => null
    },
  })
  const wrapper = mount(Host)
  return { wrapper, form, api: api! }
}

describe('useFormDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeJSONMock.mockReturnValue(true)
    writeRawMock.mockReturnValue(true)
    hasItemMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('表单变化即写入草稿键与独立时间戳键', async () => {
    const { form } = mountDraft()
    await nextTick()

    form.value.name = '张三'
    await nextTick()
    await flushPromises()

    expect(writeJSONMock).toHaveBeenCalledWith(STORAGE_KEY, { name: '张三' })
    expect(writeRawMock).toHaveBeenCalledWith(TIMESTAMP_KEY, expect.any(String))
  })

  it('loadDraft：草稿与时间戳齐全且未过期时返回草稿', () => {
    readJSONMock.mockReturnValue({ name: '旧值' })
    readRawMock.mockReturnValue(String(Date.now() - 1000))

    const { api } = mountDraft({ warnOnLeave: false })

    expect(api.loadDraft()).toEqual({ name: '旧值' })
    expect(readJSONMock).toHaveBeenCalledWith(STORAGE_KEY)
    expect(readRawMock).toHaveBeenCalledWith(TIMESTAMP_KEY)
  })

  it('loadDraft：缺草稿或缺时间戳返回 null', () => {
    readJSONMock.mockReturnValue(null)
    readRawMock.mockReturnValue(String(Date.now()))

    const { api } = mountDraft({ warnOnLeave: false })
    expect(api.loadDraft()).toBeNull()

    readJSONMock.mockReturnValue({ name: 'x' })
    readRawMock.mockReturnValue(null)
    expect(api.loadDraft()).toBeNull()
  })

  it('loadDraft：超过 ttl（默认 7 天）视为过期，清除草稿并返回 null', () => {
    readJSONMock.mockReturnValue({ name: '旧值' })
    readRawMock.mockReturnValue(String(Date.now() - 8 * 24 * 3600 * 1000))

    const { api } = mountDraft({ warnOnLeave: false })

    expect(api.loadDraft()).toBeNull()
    expect(removeItemMock).toHaveBeenCalledWith(STORAGE_KEY)
    expect(removeItemMock).toHaveBeenCalledWith(TIMESTAMP_KEY)
  })

  it('挂载时存在草稿则弹出确认并恢复到表单', async () => {
    hasItemMock.mockReturnValue(true)
    readJSONMock.mockReturnValue({ name: '草稿值' })
    readRawMock.mockReturnValue(String(Date.now() - 1000))
    confirmMock.mockResolvedValue('confirm')

    const { form } = mountDraft({ warnOnLeave: false })
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(
      '检测到未保存的草稿，是否恢复？',
      '恢复草稿',
      expect.objectContaining({ type: 'info' }),
    )
    expect(form.value.name).toBe('草稿值')
  })

  it('恢复确认被拒绝时清除草稿且不改表单', async () => {
    hasItemMock.mockReturnValue(true)
    readJSONMock.mockReturnValue({ name: '草稿值' })
    readRawMock.mockReturnValue(String(Date.now() - 1000))
    confirmMock.mockRejectedValue(new Error('cancel'))

    const { form } = mountDraft({ warnOnLeave: false })
    await flushPromises()

    expect(removeItemMock).toHaveBeenCalledWith(STORAGE_KEY)
    expect(form.value.name).toBe('')
  })

  it('挂载时无草稿不弹确认', async () => {
    hasItemMock.mockReturnValue(false)
    mountDraft({ warnOnLeave: false })
    await flushPromises()

    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('卸载前表单已修改则自动保存草稿', async () => {
    const { wrapper, form } = mountDraft({ warnOnLeave: false })
    await nextTick()

    form.value.name = '离开前输入'
    await nextTick()
    writeJSONMock.mockClear()
    writeRawMock.mockClear()

    wrapper.unmount()

    expect(writeJSONMock).toHaveBeenCalledWith(STORAGE_KEY, { name: '离开前输入' })
  })

  it('warnOnLeave 开启时挂载注册 beforeunload、卸载时移除', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { wrapper } = mountDraft({ warnOnLeave: true })
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))

    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('clearDraft 移除草稿与时间戳键', () => {
    const { api } = mountDraft({ warnOnLeave: false })

    api.clearDraft()

    expect(removeItemMock).toHaveBeenCalledWith(STORAGE_KEY)
    expect(removeItemMock).toHaveBeenCalledWith(TIMESTAMP_KEY)
  })
})
