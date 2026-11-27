/**
 * 知识问答页面流式错误测试
 * ------------------------------------------------------------------
 * 覆盖：JSON/旧纯文本错误、部分答案保留、终止帧、读取异常、UTF-8 跨分片与状态复位。
 * 正常 done 用例检查内容、释放锁及会话刷新，不断言 done 后 reader.read 次数。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ChatPage from './index.vue'

const api = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getConversationMessages: vi.fn(),
  deleteConversation: vi.fn(),
}))
vi.mock('@/api/knowledge', () => api)
vi.mock('@/utils/auth', () => ({ getToken: () => 'test-token' }))
vi.mock('@/utils/request', () => ({ showError: vi.fn() }))

const Card = defineComponent({
  setup(_, { slots }) {
    return () => h('section', [slots.header?.(), slots.default?.()])
  },
})
const Input = defineComponent({
  props: { modelValue: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('textarea', {
      value: props.modelValue,
      disabled: props.disabled,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
    })
  },
})
const Button = defineComponent({
  props: { disabled: Boolean, loading: Boolean },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h('button', {
      disabled: props.disabled || props.loading,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

function response(chunks: Array<Uint8Array | Error>) {
  let index = 0
  const reader = {
    read: vi.fn(async () => {
      const chunk = chunks[index++]
      if (chunk instanceof Error) throw chunk
      return chunk ? { done: false, value: chunk } : { done: true, value: undefined }
    }),
    cancel: vi.fn(async () => {}),
    releaseLock: vi.fn(),
  }
  return { reader, value: { ok: true, status: 200, body: { getReader: () => reader } } }
}

function bytes(text: string) {
  return new TextEncoder().encode(text)
}

async function ask(value: ReturnType<typeof response>['value']) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(value))
  const wrapper = mount(ChatPage, {
    global: {
      stubs: { ElCard: Card, ElInput: Input, ElButton: Button, ElEmpty: true, ElIcon: true, ElTag: true, ElDivider: true },
      directives: { loading: {} },
    },
  })
  await flushPromises()
  await wrapper.get('textarea').setValue('测试问题')
  const send = wrapper.findAll('button').find(button => button.text() === '发送')!
  await send.trigger('click')
  await flushPromises()
  return wrapper
}

describe('知识问答 SSE 错误', () => {
  beforeEach(() => {
    api.listConversations.mockResolvedValue({ list: [], total: 0 })
    vi.clearAllMocks()
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['{"code":"500","message":"模型暂不可用"}', '模型暂不可用'],
    ['处理失败', '处理失败'],
    ['null', '服务暂时不可用'],
    ['{"message":42}', '服务暂时不可用'],
    ['{"message":', '服务暂时不可用'],
  ])('兼容错误数据 %s 并保留已生成正文', async (data, expected) => {
    const stream = response([bytes(`event: delta\ndata: 已生成正文\n\nevent: error\ndata: ${data}\n\n`)])
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toContain(`已生成正文\n\n[回答失败] ${expected}`)
    expect(wrapper.findAll('.cursor')).toHaveLength(0)
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(stream.reader.cancel).toHaveBeenCalled()
    expect(stream.reader.releaseLock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('终止错误帧之后不再消费同分片正文或重复失败', async () => {
    const stream = response([bytes('event: error\ndata: 处理失败\n\nevent: delta\ndata: 不应追加\n\nevent: error\ndata: 重复失败\n\n')])
    const wrapper = await ask(stream.value)
    const text = wrapper.get('.assistant .message-content').text()
    expect(text).toBe('[回答失败] 处理失败')
    expect(stream.reader.read).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('读取失败保留部分正文并释放流锁', async () => {
    const stream = response([bytes('event: delta\ndata: 部分答案\n\n'), new Error('连接中断')])
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toContain('部分答案\n\n[回答失败] 连接中断')
    expect(stream.reader.cancel).toHaveBeenCalledOnce()
    expect(stream.reader.releaseLock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('未结束的流实时展示正文与引用，而非等待下一次页面状态变化', async () => {
    let continueReading: (() => void) | undefined
    let reads = 0
    const stream = response([])
    stream.reader.read.mockImplementation(async () => {
      reads++
      if (reads === 1) return { done: false, value: bytes('event: delta\ndata: 实时正文\n\nevent: citations\ndata: [{"index":1,"documentTitle":"来源","snippet":"引用片段"}]\n\n') }
      return new Promise(resolve => {
        continueReading = () => resolve({ done: false, value: bytes('event: done\ndata: {"conversationId":"7"}\n\n') })
      })
    })
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toContain('实时正文')
    expect(wrapper.get('.citation-snippet').text()).toBe('引用片段')
    expect(wrapper.find('.cursor').exists()).toBe(true)
    continueReading!()
    await flushPromises()
    expect(wrapper.find('.cursor').exists()).toBe(false)
    wrapper.unmount()
  })

  it('正常 EOF 缺少 done 时明确展示中断提示', async () => {
    const stream = response([bytes('event: delta\ndata: 不完整回答\n\n')])
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toContain('不完整回答\n\n[回答失败] 回答流中断，请重试')
    expect(wrapper.findAll('.cursor')).toHaveLength(0)
    wrapper.unmount()
  })

  it('流取消失败不会覆盖原始错误或阻止生成状态复位', async () => {
    const stream = response([bytes('event: error\ndata: 处理失败\n\n')])
    stream.reader.cancel.mockRejectedValueOnce(new Error('流已关闭'))
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toBe('[回答失败] 处理失败')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(stream.reader.releaseLock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('中文 UTF-8 字节跨分片和 CRLF 正常解码，done 后停止读取', async () => {
    const encoded = bytes('event: delta\r\ndata: 中文答案\r\n\r\nevent: done\r\ndata: {"conversationId":"7"}\r\n\r\n')
    const split = bytes('event: delta\r\ndata: ').length + 1
    const stream = response([encoded.slice(0, split), encoded.slice(split)])
    const wrapper = await ask(stream.value)
    expect(wrapper.get('.assistant .message-content').text()).toBe('中文答案')
    expect(stream.reader.releaseLock).toHaveBeenCalledOnce()
    expect(api.listConversations).toHaveBeenCalledTimes(2)
    // done 帧后必须停止读取：仅供两块数据，读取次数不应超过块数
    expect(stream.reader.read).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
