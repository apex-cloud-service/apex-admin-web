/**
 * 通用 CRUD 操作 Composable
 * ------------------------------------------------------------------
 * 封装常见的列表查询、创建、更新、删除逻辑，减少重复代码。
 * 适配统一分页口径（PageQuery{page, size} + PageResponse{list, total}）。
 */
import { ref, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { PageResponse } from '@/types'

/** CRUD 接口适配器：由调用方接入具体业务的 API 函数 */
export interface CrudApi<T> {
  /** 分页查询列表 */
  list: (params: any) => Promise<PageResponse<T>>
  /** 创建记录 */
  create: (data: Partial<T>) => Promise<T>
  /** 按 ID 更新记录 */
  update: (id: string, data: Partial<T>) => Promise<T>
  /** 按 ID 删除记录 */
  delete: (id: string) => Promise<void>
}

/** useCrud 可选配置项 */
export interface UseCrudOptions {
  /** 各操作成功后的提示文案（缺省为「创建/更新/删除成功」） */
  successMessage?: {
    /** 创建成功提示 */
    create?: string
    /** 更新成功提示 */
    update?: string
    /** 删除成功提示 */
    delete?: string
  }
  /** 删除前是否弹出二次确认（默认 true） */
  confirmDelete?: boolean
  /** 删除确认框文案 */
  deleteMessage?: string
}

/**
 * 通用 CRUD 状态与操作集合
 *
 * @param api CRUD 接口适配器（接入具体业务的 list/create/update/delete）
 * @param options 可选配置（提示文案、删除确认行为）
 * @returns 响应式数据（list/loading/total/分页参数）与操作方法集合
 */
export function useCrud<T>(api: CrudApi<T>, options: UseCrudOptions = {}) {
  /** 当前页数据列表 */
  const list: Ref<T[]> = ref([])
  /** 查询请求进行中 */
  const loading = ref(false)
  /** 数据总条数 */
  const total = ref(0)
  /** 当前页码（从 1 开始） */
  const currentPage = ref(1)
  /** 每页条数 */
  const pageSize = ref(20)

  const {
    successMessage = {
      create: '创建成功',
      update: '更新成功',
      delete: '删除成功'
    },
    confirmDelete = true,
    deleteMessage = '确认删除该项？此操作不可撤销。'
  } = options

  /**
   * 分页查询列表：按当前页码/条数请求并回填数据。
   * params 可覆盖默认 page/size；额外筛选不保存，create/update/remove 后的刷新使用默认参数。
   * @param params 额外查询参数（可覆盖默认分页参数）
   * @returns 无返回值；请求失败向上抛出，成功仅更新 list/total
   */
  const query = async (params: any = {}) => {
    loading.value = true
    try {
      const res = await api.list({
        page: currentPage.value,
        size: pageSize.value,
        ...params
      })
      list.value = res.list
      total.value = res.total
    } catch (error) {
      console.error('查询失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建记录：成功后提示并刷新当前页
   * @param data 新建数据
   * @returns 创建后的记录
   */
  const create = async (data: Partial<T>) => {
    try {
      const result = await api.create(data)
      ElMessage.success(successMessage.create!)
      await query()
      return result
    } catch (error) {
      console.error('创建失败:', error)
      throw error
    }
  }

  /**
   * 更新记录：成功后提示并刷新当前页
   * @param id 记录 ID
   * @param data 更新数据
   * @returns 更新后的记录
   */
  const update = async (id: string, data: Partial<T>) => {
    try {
      const result = await api.update(id, data)
      ElMessage.success(successMessage.update!)
      await query()
      return result
    } catch (error) {
      console.error('更新失败:', error)
      throw error
    }
  }

  /**
   * 删除单条记录：按配置弹出二次确认，成功后刷新（末页删空自动回退上一页）
   * @param id 记录 ID
   */
  const remove = async (id: string) => {
    try {
      if (confirmDelete) {
        await ElMessageBox.confirm(deleteMessage, '提示', {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        })
      }

      await api.delete(id)
      ElMessage.success(successMessage.delete!)
      
      // 如果删除后当前页没有数据了，回到上一页
      if (list.value.length === 1 && currentPage.value > 1) {
        currentPage.value--
      }
      
      await query()
    } catch (error) {
      if (error === 'cancel') {
        return
      }
      console.error('删除失败:', error)
      throw error
    }
  }

  /**
   * 批量删除：始终弹出确认，确认后并发调用单条删除。
   * 部分失败不会回滚已成功项，也不进入成功提示或列表刷新；调用方需自行处理重试。
   * @param ids 待删除的记录 ID 列表（空列表时仅提示）
   */
  const batchRemove = async (ids: string[]) => {
    if (ids.length === 0) {
      ElMessage.warning('请选择要删除的项')
      return
    }

    try {
      await ElMessageBox.confirm(
        `确认删除选中的 ${ids.length} 项？此操作不可撤销。`,
        '批量删除',
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }
      )

      await Promise.all(ids.map(id => api.delete(id)))
      ElMessage.success(`成功删除 ${ids.length} 项`)
      await query()
    } catch (error) {
      if (error === 'cancel') {
        return
      }
      console.error('批量删除失败:', error)
      throw error
    }
  }

  /**
   * 刷新当前页（保持页码不变重新查询）
   * @returns 查询 Promise
   */
  const refresh = () => {
    return query()
  }

  /**
   * 重置到第一页并重新查询（筛选条件变化后调用）
   * @returns 查询 Promise
   */
  const reset = () => {
    currentPage.value = 1
    return query()
  }

  return {
    // 数据
    list,
    loading,
    total,
    currentPage,
    pageSize,

    // 方法
    query,
    create,
    update,
    remove,
    batchRemove,
    refresh,
    reset
  }
}
