/**
 * FileUploadEnhanced 单元测试
 * ------------------------------------------------------------------
 * 覆盖：上传地址与请求层同源拼接（VITE_API_BASE_URL）、props 缺省与提示文案生成、
 * beforeUpload 大小/类型校验、enableChunk 分片编排与结果映射（含 sex 表单值
 * 映射与 fileName→objectName 归一）、document 粘贴监听注册与注销；不含
 * Canvas/裁剪与真实分片传输。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type ComponentInternalInstance } from 'vue'
import FileUploadEnhanced from '@/components/FileUploadEnhanced.vue'
import { MAX_UPLOAD_SIZE } from '@/settings'
import type {
  ChunkInitPayload,
  ChunkInitResult,
  ChunkMergeResult,
  ChunkUploadResult,
} from '@/api/file'

const mocks = vi.hoisted(() => ({
  getToken: vi.fn<() => string>(),
  initChunkUpload: vi.fn<(payload: ChunkInitPayload) => Promise<ChunkInitResult>>(),
  uploadChunk: vi.fn<
    (params: { fileId: number; chunkIndex: number; totalChunks: number }, chunk: Blob) => Promise<ChunkUploadResult>
  >(),
  mergeChunks: vi.fn<(payload: { fileId: number; fileName?: string }) => Promise<ChunkMergeResult>>(),
  showError: vi.fn<(error: unknown, defaultMsg?: string) => void>(),
  messageSuccess: vi.fn<(msg?: string) => void>(),
  messageError: vi.fn<(msg?: string) => void>(),
}))

vi.mock('@/utils/auth', () => ({ getToken: mocks.getToken }))
vi.mock('@/api/file', () => ({
  initChunkUpload: mocks.initChunkUpload,
  uploadChunk: mocks.uploadChunk,
  mergeChunks: mocks.mergeChunks,
}))
vi.mock('@/utils/request', () => ({ showError: mocks.showError }))
vi.mock('element-plus/es/components/message/index.mjs', () => ({
  ElMessage: { success: mocks.messageSuccess, error: mocks.messageError },
}))
vi.mock('cropperjs', () => ({ default: vi.fn() }))
vi.mock('cropperjs/dist/cropper.css', () => ({}))

/** el-upload 桩：保留断言所需 props 并渲染 default/tip 插槽 */
const ElUploadStub = defineComponent({
  name: 'ElUpload',
  props: {
    action: { type: String, default: '' },
    headers: { type: Object, default: () => ({}) },
    data: { type: Object, default: () => ({}) },
    accept: { type: String, default: '' },
    limit: { type: Number, default: undefined },
    listType: { type: String, default: 'text' },
    multiple: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    drag: { type: Boolean, default: false },
    beforeUpload: { type: Function, default: null },
    onSuccess: Function,
  },
  setup(_, { slots }) {
    return () => h('div', { class: 'el-upload-stub' }, [slots.default?.(), slots.tip?.()])
  },
})

/** FileUploadEnhanced 的入参（与组件 Props 对齐） */
interface EnhancedProps {
  sex?: 0 | 1
  limit?: number
  listType?: 'text' | 'picture' | 'picture-card'
  accept?: string
  tip?: string
  disabled?: boolean
  drag?: boolean
  multiple?: boolean
  enableCompress?: boolean
  enableCropper?: boolean
  enablePaste?: boolean
  enableChunk?: boolean
  chunkMaxSizeMB?: number
}

const UPLOAD_STUBS = {
  ElUpload: ElUploadStub,
  ElDialog: true,
  ElImage: true,
  ElProgress: true,
  ElSpace: true,
  ElButton: true,
  ElIcon: true,
}

/** 挂载组件 */
function mountEnhanced(props: EnhancedProps = {}) {
  const wrapper = mount(FileUploadEnhanced, {
    props,
    global: { stubs: UPLOAD_STUBS },
  })
  return { wrapper, stub: wrapper.findComponent(ElUploadStub) }
}

/** 从 el-upload 桩上取回组件传入的 before-upload 回调 */
function getBeforeUpload(stub: ReturnType<typeof mountEnhanced>['stub']) {
  return stub.props('beforeUpload') as unknown as (rawFile: File) => Promise<boolean | File>
}

describe('FileUploadEnhanced 上传地址', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('同域部署使用相对路径', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { wrapper, stub } = mountEnhanced()
    await flushPromises()
    expect(stub.props('action')).toBe('/api/v1/files/generic')
    wrapper.unmount()
  })

  it('跨域部署按基地址拼接（去尾部斜杠）', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    const { wrapper, stub } = mountEnhanced()
    await flushPromises()
    expect(stub.props('action')).toBe('https://api.example.com/api/v1/files/generic')
    wrapper.unmount()
  })
})

describe('FileUploadEnhanced props 缺省与提示文案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockReturnValue('test-token')
  })

  it('缺省 accept/limit/listType 等透传 el-upload', async () => {
    const { wrapper, stub } = mountEnhanced()
    await flushPromises()
    expect(stub.props('accept')).toBe('image/jpeg,image/png,image/gif,image/webp')
    expect(stub.props('limit')).toBe(1)
    expect(stub.props('listType')).toBe('picture-card')
    expect(stub.props('multiple')).toBe(false)
    expect(stub.props('drag')).toBe(false)
    expect(stub.props('disabled')).toBe(false)
    wrapper.unmount()
  })

  it.each([[0, '1'], [1, '2']] as const)('直传携带 Bearer 令牌并将 sex=%i 映射为 %s', async (sex, expected) => {
    const { wrapper, stub } = mountEnhanced({ sex })
    await flushPromises()
    expect(stub.props('headers')).toEqual({ Authorization: 'Bearer test-token' })
    expect(stub.props('data')).toEqual({ sex: expected })
    wrapper.unmount()
  })

  it('直传成功事件使用存储对象键', () => {
    vi.useFakeTimers()
    const { wrapper, stub } = mountEnhanced()
    try {
      const metadata = { bucketName: 'apex', url: '/files/AF/stored.png', expiresIn: 0 }
      stub.props('onSuccess')?.({ code: 0, data: { ...metadata, fileName: 'AF/stored.png' } })
      expect(wrapper.emitted('success')).toEqual([[{ ...metadata, objectName: 'AF/stored.png' }]])
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('启用裁剪但上传非图片时仍走默认通道并 emit success', () => {
    vi.useFakeTimers()
    const metadata = { bucketName: 'apex', url: '/files/AM/report.pdf', expiresIn: 0 }
    const { wrapper, stub } = mountEnhanced({ enableCropper: true, accept: 'image/png,application/pdf' })
    try {
      stub.props('onSuccess')?.(
        { code: 0, data: { ...metadata, fileName: 'AM/report.pdf' } },
        { uid: 1, name: 'report.pdf', raw: new File(['x'], 'report.pdf', { type: 'application/pdf' }) },
      )
      expect(wrapper.emitted('success')).toEqual([[{ ...metadata, objectName: 'AM/report.pdf' }]])
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('粘贴多个文件时单个因 MIME 被拒不影响后续项上传', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('XMLHttpRequest', class extends EventTarget {
      upload = new EventTarget()
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = vi.fn()
      status = 200
      responseText = JSON.stringify({ code: 0, data: { fileName: 'AM/b.png', bucketName: 'apex', url: '/b.png', expiresIn: 0 } })
      constructor() {
        super()
        setTimeout(() => this.dispatchEvent(new Event('load')), 0)
      }
    })
    // 坏项也是图片，才能在 beforeUpload 阶段因 MIME 不被 accept 而返回 false（而非被外层图片判断过滤）
    const { wrapper } = mountEnhanced({ enablePaste: true, enableCompress: false, enableCropper: false, accept: 'image/png' })
    try {
      const bad = new File(['x'], 'bad.bmp', { type: 'image/bmp' })
      const good = new File(['y'], 'b.png', { type: 'image/png' })
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { items: [
          { type: 'image/bmp', getAsFile: () => bad },
          { type: 'image/png', getAsFile: () => good },
        ] },
      })
      wrapper.element.dispatchEvent(event)
      await vi.advanceTimersByTimeAsync(1500)
      expect(mocks.messageError).toHaveBeenCalled()
      // 只有合法项上传成功；若实现误用 return，后续项被跳过则为 0
      expect(wrapper.emitted('success')).toHaveLength(1)
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })

  it.each([[0, '1'], [1, '2']] as const)('粘贴上传将 sex=%i 写入 FormData 为 %s', async (sex, expected) => {
    const send = vi.fn<(body: FormData) => void>()
    const objectName = `${sex === 0 ? 'AM' : 'AF'}/stored.png`
    const metadata = { bucketName: 'apex', url: `/files/${objectName}`, expiresIn: 0 }
    vi.useFakeTimers()
    vi.stubGlobal('XMLHttpRequest', class extends EventTarget {
      upload = new EventTarget()
      open = vi.fn()
      setRequestHeader = vi.fn()
      status = 200
      responseText = JSON.stringify({ code: 0, data: { ...metadata, fileName: objectName } })
      send(body: FormData) {
        send(body)
        this.dispatchEvent(new Event('load'))
      }
    })
    const { wrapper } = mountEnhanced({ sex, enablePaste: true, enableCompress: false, enableCropper: false })
    try {
      const file = new File(['fixture'], 'paste.png', { type: 'image/png' })
      const paste = new Event('paste', { cancelable: true })
      Object.defineProperty(paste, 'clipboardData', { value: { items: [{ type: file.type, getAsFile: () => file }] } })
      document.dispatchEvent(paste)
      await flushPromises()
      expect(send).toHaveBeenCalledTimes(1)
      const body = send.mock.calls[0][0]
      expect(body.get('file')).toBe(file)
      expect(body.get('sex')).toBe(expected)
      await vi.advanceTimersByTimeAsync(1000)
      expect(wrapper.emitted('success')).toEqual([[{ ...metadata, objectName }]])
    } finally {
      wrapper.unmount()
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('缺省 tip 按 accept 与 10MB 上限自动生成并含压缩提示', async () => {
    const { wrapper } = mountEnhanced()
    await flushPromises()
    const tip = wrapper.find('.el-upload__tip').text()
    expect(tip).toContain('支持 JPEG/PNG/GIF/WEBP，大小不超过 10MB')
    expect(tip).toContain('已启用自动压缩')
    wrapper.unmount()
  })

  it('自定义 tip 优先，关闭压缩后不再展示压缩提示', async () => {
    const { wrapper } = mountEnhanced({ tip: '仅支持 PNG 格式', enableCompress: false })
    await flushPromises()
    const tip = wrapper.find('.el-upload__tip').text()
    expect(tip).toContain('仅支持 PNG 格式')
    expect(tip).not.toContain('已启用自动压缩')
    wrapper.unmount()
  })
})

describe('FileUploadEnhanced beforeUpload 校验', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockReturnValue('test-token')
  })

  it('超过大小上限且未启用分片时拒绝并提示', async () => {
    // 关闭压缩：happy-dom 无 canvas，压缩路径无法在此环境执行；本用例只验证大小拒绝
    const { wrapper, stub } = mountEnhanced({ enableCompress: false })
    await flushPromises()
    const big = new File([new ArrayBuffer(MAX_UPLOAD_SIZE + 1)], 'big.png', { type: 'image/png' })
    const result = await getBeforeUpload(stub)(big)
    expect(result).toBe(false)
    expect(mocks.messageError).toHaveBeenCalledWith('文件大小不能超过 10 MB')
    wrapper.unmount()
  })

  it('类型不在 accept 内时拒绝并提示', async () => {
    const { wrapper, stub } = mountEnhanced()
    await flushPromises()
    const file = new File([new ArrayBuffer(16)], 'doc.txt', { type: 'text/plain' })
    const result = await getBeforeUpload(stub)(file)
    expect(result).toBe(false)
    expect(mocks.messageError).toHaveBeenCalledWith('仅支持上传 JPEG/PNG/GIF/WEBP 格式的文件')
    wrapper.unmount()
  })

  it('合法文件且关闭压缩时原样返回', async () => {
    const { wrapper, stub } = mountEnhanced({ enableCompress: false })
    await flushPromises()
    const file = new File([new ArrayBuffer(64)], 'pic.png', { type: 'image/png' })
    const result = await getBeforeUpload(stub)(file)
    expect(result).toBe(file)
    wrapper.unmount()
  })

  it('enableChunk 开启时超限文件按 5MB 分片上传并在合并后映射 success', async () => {
    mocks.initChunkUpload.mockResolvedValue({
      fileId: 77,
      bucketName: 'apex',
      chunkSize: 5 * 1024 * 1024,
      totalChunks: 3,
      uploadedChunks: [],
    })
    mocks.uploadChunk
      .mockResolvedValueOnce({ fileId: 77, chunkIndex: 0, uploaded: true, objectName: 'c0', chunkSize: 5 * 1024 * 1024 })
      .mockResolvedValueOnce({ fileId: 77, chunkIndex: 1, uploaded: true, objectName: 'c1', chunkSize: 5 * 1024 * 1024 })
      .mockResolvedValueOnce({ fileId: 77, chunkIndex: 2, uploaded: true, objectName: 'c2', chunkSize: 2 * 1024 * 1024 })
    mocks.mergeChunks.mockResolvedValue({
      fileId: 77,
      bucketName: 'apex-bucket',
      fileName: 'AF/big.bin',
      url: 'https://cdn.example.com/AF/big.bin',
      fileSize: 12 * 1024 * 1024,
    })

    const { wrapper, stub } = mountEnhanced({ enableChunk: true, accept: 'image/png,application/octet-stream' })
    await flushPromises()
    const big = new File([new ArrayBuffer(12 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' })
    const result = await getBeforeUpload(stub)(big)
    expect(result).toBe(false)
    await flushPromises()

    expect(mocks.initChunkUpload).toHaveBeenCalledWith({
      fileName: 'big.bin',
      fileSize: 12 * 1024 * 1024,
      chunkSize: 5 * 1024 * 1024,
      totalChunks: 3,
      contentType: 'application/octet-stream',
    })
    expect(mocks.uploadChunk).toHaveBeenCalledTimes(3)
    expect(mocks.uploadChunk.mock.calls.map(([params]) => params.chunkIndex)).toEqual([0, 1, 2])
    expect(mocks.uploadChunk.mock.calls.map(([, chunk]) => chunk.size)).toEqual([
      5 * 1024 * 1024,
      5 * 1024 * 1024,
      2 * 1024 * 1024,
    ])
    expect(mocks.uploadChunk.mock.calls.every(([params]) => params.fileId === 77 && params.totalChunks === 3)).toBe(true)
    expect(mocks.mergeChunks).toHaveBeenCalledWith({ fileId: 77 })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('上传成功')
    expect(wrapper.emitted('success')?.[0]).toEqual([
      {
        bucketName: 'apex-bucket',
        objectName: 'AF/big.bin',
        url: 'https://cdn.example.com/AF/big.bin',
        expiresIn: 0,
      },
    ])
    wrapper.unmount()
  })

  it('超限文件类型不在 accept 内时不触发分片（MIME 校验先于分片）', async () => {
    const { wrapper, stub } = mountEnhanced({ enableChunk: true })
    await flushPromises()
    const big = new File([new ArrayBuffer(12 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' })
    const result = await getBeforeUpload(stub)(big)
    expect(result).toBe(false)
    expect(mocks.initChunkUpload).not.toHaveBeenCalled()
    expect(mocks.messageError).toHaveBeenCalledWith('仅支持上传 JPEG/PNG/GIF/WEBP 格式的文件')
    wrapper.unmount()
  })

  it('未超限的非图片文件不触发分片并原样返回', async () => {
    const { wrapper, stub } = mountEnhanced({ enableChunk: true, accept: 'image/png,application/octet-stream' })
    await flushPromises()
    const small = new File([new ArrayBuffer(64)], 'small.bin', { type: 'application/octet-stream' })
    const result = await getBeforeUpload(stub)(small)
    expect(mocks.initChunkUpload).not.toHaveBeenCalled()
    expect(result).toBe(small)
    wrapper.unmount()
  })
})

/** 仅模拟解码与 Canvas 导出，用于验证处理后的尺寸/字节量和传输分支，不代表真实 Canvas 验收。 */
function mockImageProcessing(outputSize: number) {
  class Reader {
    onload: ((event: { target: { result: string } }) => void) | null = null
    readAsDataURL() {
      queueMicrotask(() => this.onload?.({ target: { result: 'data:image/png;base64,test' } }))
    }
  }
  class ImageStub {
    width = 1920
    height = 1500
    onload: (() => void) | null = null
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('FileReader', Reader)
  vi.stubGlobal('Image', ImageStub)
  const dimensions: Array<[number, number]> = []
  const context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect' | 'drawImage'> = {
    fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
    dimensions.push([this.width, this.height])
    callback(new Blob([new ArrayBuffer(outputSize)], { type: 'image/png' }))
  })
  return dimensions
}

describe('FileUploadEnhanced 图片处理与传输分支', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockReturnValue('test-token')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('压缩后低于上限时返回处理后文件，不再按原大小启动分片', async () => {
    const dimensions = mockImageProcessing(64)
    const { wrapper, stub } = mountEnhanced({ enableChunk: true, enableCompress: true })
    const raw = new File([new ArrayBuffer(12 * 1024 * 1024)], 'large.png', { type: 'image/png' })
    const result = await getBeforeUpload(stub)(raw)
    expect(result).toBeInstanceOf(File)
    expect((result as File).size).toBe(64)
    expect(mocks.initChunkUpload).not.toHaveBeenCalled()
    expect(dimensions[0][0]).toBeLessThanOrEqual(1920)
    expect(dimensions[0][1]).toBeLessThanOrEqual(1080)
    wrapper.unmount()
  })

  it('压缩后仍超限时分片使用处理后大小，且不进入裁剪或默认上传', async () => {
    mockImageProcessing(12 * 1024 * 1024)
    mocks.initChunkUpload.mockResolvedValue({ fileId: 88, bucketName: 'apex', chunkSize: 5 * 1024 * 1024, totalChunks: 3, uploadedChunks: [] })
    mocks.uploadChunk.mockResolvedValue({ fileId: 88, chunkIndex: 0, uploaded: true, objectName: 'chunk', chunkSize: 5 * 1024 * 1024 })
    mocks.mergeChunks.mockResolvedValue({ fileId: 88, bucketName: 'apex', fileName: 'AM/large.png', url: '/large.png', fileSize: 12 * 1024 * 1024 })
    const { wrapper, stub } = mountEnhanced({ enableChunk: true, enableCompress: true, enableCropper: true })
    const raw = new File([new ArrayBuffer(15 * 1024 * 1024)], 'large.png', { type: 'image/png' })
    expect(await getBeforeUpload(stub)(raw)).toBe(false)
    await flushPromises()
    expect(mocks.initChunkUpload).toHaveBeenCalledWith(expect.objectContaining({ fileSize: 12 * 1024 * 1024 }))
    expect(mocks.uploadChunk).toHaveBeenCalledTimes(3)
    expect(wrapper.emitted('success')).toHaveLength(1)
    wrapper.unmount()
  })

  it('普通图片启用裁剪时中断默认通道，不启动分片', async () => {
    mockImageProcessing(64)
    const { wrapper, stub } = mountEnhanced({ enableChunk: true, enableCompress: true, enableCropper: true })
    const raw = new File([new ArrayBuffer(64)], 'small.png', { type: 'image/png' })
    expect(await getBeforeUpload(stub)(raw)).toBe(false)
    expect(mocks.initChunkUpload).not.toHaveBeenCalled()
    expect(mocks.messageError).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

/** 访问组件内部上传 Promise 验证终结时机，不将该方法新增到生产对外接口。 */
function getProcessedUpload(wrapper: ReturnType<typeof mountEnhanced>['wrapper']) {
  const instance = wrapper.vm.$ as ComponentInternalInstance & {
    setupState: { uploadProcessedFile: (file: File) => Promise<void> }
  }
  return instance.setupState.uploadProcessedFile
}

describe('FileUploadEnhanced XHR 终结语义', () => {
  const instances: XhrStub[] = []
  class XhrStub extends EventTarget {
    upload = new EventTarget()
    status = 0
    responseText = ''
    timeout = 0
    open = vi.fn()
    setRequestHeader = vi.fn()
    send = vi.fn()
    constructor() {
      super()
      instances.push(this)
    }
  }
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    instances.length = 0
    mocks.getToken.mockReturnValue('test-token')
    vi.stubGlobal('XMLHttpRequest', XhrStub)
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('Promise 在 load 成功前保持 pending，成功后返回对象键且只发一次事件', async () => {
    const { wrapper } = mountEnhanced({ enableCompress: false })
    const upload = getProcessedUpload(wrapper)
    let completed = false
    const pending = upload(new File(['data'], 'small.png', { type: 'image/png' }))
    const completion = pending.then(() => { completed = true })
    await flushPromises()
    expect(completed).toBe(false)
    const xhr = instances[0]
    xhr.status = 200
    xhr.responseText = JSON.stringify({ code: 0, data: { fileName: 'AM/key.png', bucketName: 'apex', url: '/key.png', expiresIn: 0 } })
    xhr.dispatchEvent(new Event('load'))
    await completion
    expect(completed).toBe(true)
    expect(wrapper.emitted('success')).toHaveLength(1)
    expect(wrapper.emitted('success')?.[0]).toEqual([{ objectName: 'AM/key.png', bucketName: 'apex', url: '/key.png', expiresIn: 0 }])
    wrapper.unmount()
  })

  it.each(['error', 'timeout', 'abort'])('%s 会拒绝 Promise，不挂起或报告成功', async (event) => {
    const { wrapper } = mountEnhanced({ enableCompress: false })
    const upload = getProcessedUpload(wrapper)
    const pending = upload(new File(['data'], 'small.png', { type: 'image/png' }))
    const assertion = expect(pending).rejects.toThrow()
    instances[0].dispatchEvent(new Event(event))
    await assertion
    expect(wrapper.emitted('success')).toBeUndefined()
    wrapper.unmount()
  })

  it.each(['{invalid', JSON.stringify({ code: 403, msg: '拒绝上传' })])('无效 JSON 或业务错误会拒绝 Promise', async (response) => {
    const { wrapper } = mountEnhanced({ enableCompress: false })
    const upload = getProcessedUpload(wrapper)
    const pending = upload(new File(['data'], 'small.png', { type: 'image/png' }))
    const assertion = expect(pending).rejects.toThrow()
    instances[0].status = 200
    instances[0].responseText = response
    instances[0].dispatchEvent(new Event('load'))
    await assertion
    expect(wrapper.emitted('success')).toBeUndefined()
    wrapper.unmount()
  })

  it('粘贴事件冒泡到 document 时不重复上传', async () => {
    const { wrapper } = mountEnhanced({ enablePaste: true, enableCompress: false })
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: { items: [{ type: 'image/png', getAsFile: () => new File(['data'], 'paste.png', { type: 'image/png' }) }] } })
    wrapper.element.dispatchEvent(event)
    await flushPromises()
    expect(instances).toHaveLength(1)
    instances[0].status = 200
    instances[0].responseText = JSON.stringify({ code: 0, data: { fileName: 'AM/paste.png', bucketName: 'apex', url: '/paste.png', expiresIn: 0 } })
    instances[0].dispatchEvent(new Event('load'))
    await flushPromises()
    expect(wrapper.emitted('success')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('FileUploadEnhanced 粘贴监听', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getToken.mockReturnValue('test-token')
  })

  it('enablePaste 开启时注册 document paste 监听，卸载时以同一引用注销', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { wrapper } = mountEnhanced({ enablePaste: true })

    const registered = addSpy.mock.calls.filter(([type]) => type === 'paste')
    expect(registered).toHaveLength(1)
    const handler = registered[0][1]

    wrapper.unmount()
    const removed = removeSpy.mock.calls.filter(([type]) => type === 'paste')
    expect(removed).toHaveLength(1)
    expect(removed[0][1]).toBe(handler)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('enablePaste 缺省关闭时不注册监听', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const { wrapper } = mountEnhanced()
    expect(addSpy.mock.calls.filter(([type]) => type === 'paste')).toHaveLength(0)
    wrapper.unmount()
    addSpy.mockRestore()
  })
})
