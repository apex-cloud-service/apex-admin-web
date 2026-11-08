/**
 * 通用 CRUD Composable 单元测试
 * ------------------------------------------------------------------
 * 覆盖 useCrud 的分页查询、增删改、批量删除与确认取消语义：
 * - 查询透传 page/size 并回填 list/total，异常时结束 loading 并抛出
 * - 创建/更新成功后提示并刷新列表
 * - 删除确认取消不调用接口、不提示失败
 * - 末页删空自动回退上一页
 * - 批量删除空列表只提示；并发删除单条失败整体抛出
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PageResponse } from '@/types'
import { useCrud } from '@/composables/useCrud'

// useCrud 经深路径按需导入函数式组件，主入口与深路径须 mock 为同一实例才能命中断言
const { messageMock, messageBoxMock } = vi.hoisted(() => ({
  messageMock: { success: vi.fn(), warning: vi.fn() },
  messageBoxMock: { confirm: vi.fn() },
}))
vi.mock('element-plus', () => ({
  ElMessage: messageMock,
  ElMessageBox: messageBoxMock,
}))
vi.mock('element-plus/es/components/message/index.mjs', () => ({
  ElMessage: messageMock,
}))
vi.mock('element-plus/es/components/message-box/index.mjs', () => ({
  ElMessageBox: messageBoxMock,
}))

/** ElMessageBox.confirm 的重载返回类型不适用于断言「确定」分支，统一以 mock 函数调用 */
const confirmMock = messageBoxMock.confirm as unknown as ReturnType<typeof vi.fn>

interface Row {
  id: string
  name: string
}

/** 构造带可断言的 CRUD 适配器 */
function createApi(rows: Row[] = []) {
  return {
    list: vi.fn(async (): Promise<PageResponse<Row>> => ({ list: rows, total: rows.length, pageNum: 1, pageSize: 20, pages: 1 })),
    create: vi.fn(async (data: Partial<Row>) => ({ id: 'new', name: data.name ?? '' })),
    update: vi.fn(async (id: string, data: Partial<Row>) => ({ id, name: data.name ?? '' })),
    delete: vi.fn(async () => undefined),
  }
}

describe('useCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('查询按默认分页参数调用并回填数据', async () => {
    const api = createApi([{ id: '1', name: 'A' }])
    const crud = useCrud<Row>(api)

    await crud.query()

    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(crud.list.value).toEqual([{ id: '1', name: 'A' }])
    expect(crud.total.value).toBe(1)
    expect(crud.loading.value).toBe(false)
  })

  it('额外查询参数覆盖默认分页参数', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api)

    await crud.query({ page: 3, size: 50, keyword: 'abc' })

    expect(api.list).toHaveBeenCalledWith({ page: 3, size: 50, keyword: 'abc' })
  })

  it('查询失败时结束 loading 并向外抛出', async () => {
    const api = createApi()
    api.list.mockRejectedValueOnce(new Error('boom'))
    const crud = useCrud<Row>(api)

    await expect(crud.query()).rejects.toThrow('boom')
    expect(crud.loading.value).toBe(false)
  })

  it('创建成功后提示并刷新列表', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api)

    const result = await crud.create({ name: 'B' })

    expect(result).toEqual({ id: 'new', name: 'B' })
    expect(ElMessage.success).toHaveBeenCalledWith('创建成功')
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('更新成功后提示并刷新列表', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api)

    await crud.update('1', { name: 'C' })

    expect(api.update).toHaveBeenCalledWith('1', { name: 'C' })
    expect(ElMessage.success).toHaveBeenCalledWith('更新成功')
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('删除确认后调用接口并刷新', async () => {
    const api = createApi([{ id: '1', name: 'A' }, { id: '2', name: 'B' }])
    confirmMock.mockResolvedValueOnce(undefined)
    const crud = useCrud<Row>(api)
    crud.list.value = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]

    await crud.remove('1')

    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('1')
    expect(ElMessage.success).toHaveBeenCalledWith('删除成功')
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('删除确认取消时静默返回，不调用接口', async () => {
    const api = createApi()
    confirmMock.mockRejectedValueOnce('cancel')
    const crud = useCrud<Row>(api)

    await crud.remove('1')

    expect(api.delete).not.toHaveBeenCalled()
    expect(ElMessage.success).not.toHaveBeenCalled()
  })

  it('末页仅剩一条时删除后回退上一页', async () => {
    const api = createApi()
    confirmMock.mockResolvedValueOnce(undefined)
    const crud = useCrud<Row>(api)
    crud.currentPage.value = 2
    crud.list.value = [{ id: '1', name: 'A' }]

    await crud.remove('1')

    expect(crud.currentPage.value).toBe(1)
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 20 })
  })

  it('关闭删除确认时直接调用接口', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api, { confirmDelete: false })

    await crud.remove('1')

    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(api.delete).toHaveBeenCalledWith('1')
  })

  it('批量删除空列表只提示不调用接口', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api)

    await crud.batchRemove([])

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择要删除的项')
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('批量删除并发展开为单条请求后刷新', async () => {
    const api = createApi()
    confirmMock.mockResolvedValueOnce(undefined)
    const crud = useCrud<Row>(api)

    await crud.batchRemove(['1', '2'])

    expect(api.delete).toHaveBeenCalledTimes(2)
    expect(ElMessage.success).toHaveBeenCalledWith('成功删除 2 项')
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('reset 回到第一页后查询', async () => {
    const api = createApi()
    const crud = useCrud<Row>(api)
    crud.currentPage.value = 4

    await crud.reset()

    expect(crud.currentPage.value).toBe(1)
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 20 })
  })
})
