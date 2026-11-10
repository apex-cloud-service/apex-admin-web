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

/** el-upload 桩：只保留 action 供断言 */
const ElUploadStub = defineComponent({
  name: 'ElUpload',
  props: { action: { type: String, default: '' } },
  setup: () => () => null,
})

/** 挂载组件并取 el-upload 的 action */
async function mountAction(): Promise<string | undefined> {
  const wrapper = mount(FileUpload, {
    global: {
      stubs: { ElUpload: ElUploadStub, ElButton: true, ElIcon: true },
    },
  })
  await flushPromises()
  return wrapper.findComponent(ElUploadStub).props('action')
}

describe('FileUpload 上传地址', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('同域部署使用相对路径', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(await mountAction()).toBe('/api/v1/files/generic')
  })

  it('跨域部署按基地址拼接（去尾部斜杠）', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    expect(await mountAction()).toBe('https://api.example.com/api/v1/files/generic')
  })
})
