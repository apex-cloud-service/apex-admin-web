/**
 * 表格配置持久化 Composable
 * ------------------------------------------------------------------
 * 保存和恢复表格的列配置、筛选条件、分页大小等。
 * 持久化统一走 utils/storage.ts（键前缀 TABLE_CONFIG_KEY_PREFIX 收敛于 settings.ts），
 * 禁止在本文件直接调用 localStorage。
 */
import { nextTick, ref, watch, type Ref } from 'vue'
import { readJSON, writeJSON, removeItem } from '@/utils/storage'
import { TABLE_CONFIG_KEY_PREFIX } from '@/settings'

/** 可持久化的表格列配置 */
export interface TableColumn {
  prop: string
  label: string
  visible: boolean
  width?: number
  sortable?: boolean
}

/** 表格持久化数据（列配置、分页大小、筛选与排序） */
export interface TableConfig {
  columns: TableColumn[]
  pageSize: number
  filters: Record<string, unknown>
  sortBy?: string
  sortOrder?: 'ascending' | 'descending'
}

/** 表格配置持久化初始化选项 */
export interface UseTableConfigOptions {
  /** 默认每页大小 */
  defaultPageSize?: number
  /** 是否自动持久化 */
  autoPersist?: boolean
}

/** 检查配置根节点与筛选字段是否为对象，数组/null 不视为合法配置。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 持久化列必须具有完整字段类型，不以类型断言替代运行时校验。 */
function isTableColumn(value: unknown): value is TableColumn {
  return isRecord(value) && typeof value.prop === 'string' && value.prop.trim().length > 0 &&
    typeof value.label === 'string' && typeof value.visible === 'boolean' &&
    (value.width === undefined || (typeof value.width === 'number' && Number.isFinite(value.width) && value.width >= 0)) &&
    (value.sortable === undefined || typeof value.sortable === 'boolean')
}

/** 校验持久化配置的列、页大小、筛选与排序字段，结构错误时不加载或导入。 */
function isTableConfig(value: unknown): value is TableConfig {
  return isRecord(value) && Array.isArray(value.columns) && value.columns.every(isTableColumn) &&
    typeof value.pageSize === 'number' && Number.isSafeInteger(value.pageSize) && value.pageSize > 0 &&
    isRecord(value.filters) && (value.sortBy === undefined || typeof value.sortBy === 'string') &&
    (value.sortOrder === undefined || value.sortOrder === 'ascending' || value.sortOrder === 'descending')
}

/** 深拷贝列配置，避免外部默认数组与内部状态互相污染 */
function cloneColumns(columns: TableColumn[]): TableColumn[] {
  return columns.map((col) => ({ ...col }))
}

/**
 * 表格配置持久化
 * @param tableKey 表格唯一标识
 * @param defaultColumns 默认列（可选）；内部持有深拷贝快照，外部修改不会影响 reset
 * @param options 配置选项（可选），defaultPageSize 默认 20，autoPersist 默认 true
 * @returns 响应式配置与加载、保存、列操作等方法；持久化结构非法时回退默认值
 */
export function useTableConfig(
  tableKey: string,
  defaultColumns: TableColumn[] = [],
  options: UseTableConfigOptions = {}
) {
  const {
    defaultPageSize = 20,
    autoPersist = true
  } = options

  // 存储键：前缀 + 表格唯一标识（键定义收敛在 settings.ts）
  const storageKey = `${TABLE_CONFIG_KEY_PREFIX}${tableKey}`

  // 默认列快照：reset 时恢复初始值，且与调用方数组解耦
  const defaultColumnsSnapshot = cloneColumns(defaultColumns)

  const createDefaultConfig = (): TableConfig => ({
    columns: cloneColumns(defaultColumnsSnapshot),
    pageSize: defaultPageSize,
    filters: {},
    sortBy: undefined,
    sortOrder: undefined
  })

  const config: Ref<TableConfig> = ref(createDefaultConfig())

  /**
   * 保存配置。
   * @returns true=写入成功；false=存储写入失败（如配额超限），调用方需自行决定是否回滚
   */
  const saveConfig = (): boolean => {
    if (writeJSON(storageKey, config.value)) {
      console.log(`[表格配置] 已保存: ${tableKey}`)
      return true
    }
    console.warn(`[表格配置] 保存失败: ${tableKey}`)
    return false
  }

  /**
   * 加载持久化配置；结构非法时返回 false 且不改变当前状态。
   * @returns 无缓存、JSON 解析失败或结构非法时 false，成功合并时 true
   */
  const loadConfig = (): boolean => {
    // 键不存在或 JSON 损坏时 readJSON 返回 null，统一回退默认配置
    const saved = readJSON<unknown>(storageKey)
    if (!isTableConfig(saved)) {
      return false
    }

    try {
      // 合并默认列配置（处理新增列）
      if (defaultColumnsSnapshot.length > 0) {
        const savedColumnMap = new Map(
          saved.columns.map(col => [col.prop, col])
        )

        config.value.columns = defaultColumnsSnapshot.map(defaultCol => {
          const savedCol = savedColumnMap.get(defaultCol.prop)
          return savedCol ? { ...savedCol } : { ...defaultCol }
        })
      } else {
        config.value.columns = saved.columns.map(col => ({ ...col }))
      }

      config.value.pageSize = saved.pageSize
      config.value.filters = { ...saved.filters }
      config.value.sortBy = saved.sortBy
      config.value.sortOrder = saved.sortOrder
    } catch (error) {
      console.error('[表格配置] 加载结构异常:', error)
      return false
    }

    console.log(`[表格配置] 已加载: ${tableKey}`)
    return true
  }

  /**
   * 使用默认列快照与默认分页重置配置，并删除现有缓存键。
   * autoPersist 开启时，后续 watch 会重新保存重置后的状态。
   */
  const resetConfig = () => {
    config.value = createDefaultConfig()
    removeItem(storageKey)
    console.log(`[表格配置] 已重置: ${tableKey}`)
  }

  /**
   * 更新列可见性
   */
  const toggleColumn = (prop: string, visible?: boolean) => {
    const column = config.value.columns.find(col => col.prop === prop)
    if (column) {
      column.visible = visible !== undefined ? visible : !column.visible
    }
  }

  /**
   * 更新列宽度
   */
  const updateColumnWidth = (prop: string, width: number) => {
    const column = config.value.columns.find(col => col.prop === prop)
    if (column) {
      column.width = width
    }
  }

  /**
   * 更新筛选条件
   */
  const updateFilters = (filters: Record<string, unknown>) => {
    config.value.filters = { ...config.value.filters, ...filters }
  }

  /**
   * 清空筛选条件
   */
  const clearFilters = () => {
    config.value.filters = {}
  }

  /**
   * 更新排序
   */
  const updateSort = (sortBy?: string, sortOrder?: 'ascending' | 'descending') => {
    config.value.sortBy = sortBy
    config.value.sortOrder = sortOrder
  }

  /**
   * 获取可见列
   */
  const visibleColumns = () => {
    return config.value.columns.filter(col => col.visible !== false)
  }

  /**
   * 导出配置（用于跨设备同步）
   */
  const exportConfig = (): string => {
    return JSON.stringify(config.value)
  }

  /**
   * 校验并保存候选配置后才替换内存状态；结构或保存失败时保留导入前状态。
   * @param configStr 配置 JSON 文本
   * @returns true=结构合法且持久化成功；false=JSON 非法、结构非法或保存失败（已回滚）
   */
  const importConfig = (configStr: string): boolean => {
    let imported: unknown
    try {
      imported = JSON.parse(configStr)
    } catch (error) {
      console.error('[表格配置] 导入失败: JSON 无法解析', error)
      return false
    }

    if (!isTableConfig(imported)) {
      console.error('[表格配置] 导入失败: 结构不符合 TableConfig')
      return false
    }

    const nextConfig: TableConfig = {
      columns: imported.columns.map((col) => ({ ...col })),
      pageSize: imported.pageSize,
      filters: { ...imported.filters },
      sortBy: imported.sortBy,
      sortOrder: imported.sortOrder
    }

    // 先保存候选配置；随后赋值会触发深度 watch，用抑制标志跳过该次重复写入
    if (!writeJSON(storageKey, nextConfig)) {
      console.warn(`[表格配置] 导入保存失败: ${tableKey}`)
      return false
    }
    // watch 默认异步 flush：标志须保持到下一次调度结束，而不是赋值同步返回即复位
    suppressPersist = true
    config.value = nextConfig
    void nextTick(() => {
      suppressPersist = false
    })
    return true
  }

  // 抑制标志依赖下方 watch 使用默认 flush:'pre'：其回调先于 nextTick 执行。
  // 若未来改为 flush:'post'/'sync'，需同步调整此处复位时机，否则可能重复写入。
  let suppressPersist = false

  // 自动持久化
  if (autoPersist) {
    watch(config, () => {
      if (!suppressPersist) saveConfig()
    }, { deep: true })
  }

  // 初始加载
  loadConfig()

  return {
    config,
    saveConfig,
    loadConfig,
    resetConfig,
    toggleColumn,
    updateColumnWidth,
    updateFilters,
    clearFilters,
    updateSort,
    visibleColumns,
    exportConfig,
    importConfig
  }
}
