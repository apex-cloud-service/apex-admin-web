/**
 * 上传组件地址解析测试
 * ------------------------------------------------------------------
 * el-upload 的 action 不经过 Axios 拦截器，跨域部署必须自行带上
 * VITE_API_BASE_URL；此处校验组件对外暴露的上传地址与请求层同源。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import FileUpload from '@/components/FileUpload.vue'

vi.mock('element-plus/es/components/message/index.mjs', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}))

const ElUploadStub = defineComponent({
  name: 'ElUpload',
  props: { action: { type: String, default: '' }, data: Object, onSuccess: Function },
  setup: () => () => null,
})

async function uploadProps(sex?: 0 | 1) {
  const wrapper = mount(FileUpload, {
    props: { sex },
    global: {
      stubs: { ElUpload: ElUploadStub, ElButton: true, ElIcon: true },
    },
  })
  await flushPromises()
  const props = wrapper.findComponent(ElUploadStub).props()
  wrapper.unmount()
  return props
}

describe('FileUpload 上传地址', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('同域部署使用相对路径', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect((await uploadProps()).action).toBe('/api/v1/files/generic')
  })

  it('跨域部署按基地址拼接（去尾部斜杠）', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    expect((await uploadProps()).action).toBe('https://api.example.com/api/v1/files/generic')
  })

  it.each([[undefined, '1'], [1, '2']] as const)('直传映射 sex=%s 为 %s', async (sex, expected) => {
    expect((await uploadProps(sex)).data).toEqual({ sex: expected })
  })

  it('直传成功事件使用存储对象键', () => {
    const wrapper = mount(FileUpload, {
      global: { stubs: { ElUpload: ElUploadStub, ElButton: true, ElIcon: true } },
    })
    const metadata = { bucketName: 'apex', url: '/files/AM/stored.png', expiresIn: 0 }
    wrapper.findComponent(ElUploadStub).props('onSuccess')?.({ code: 0, data: { ...metadata, fileName: 'AM/stored.png' } })
    expect(wrapper.emitted('success')).toEqual([[{ ...metadata, objectName: 'AM/stored.png' }]])
    wrapper.unmount()
  })
})
