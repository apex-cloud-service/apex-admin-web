/**
 * 表格配置持久化 Composable
 * ------------------------------------------------------------------
 * 保存和恢复表格的列配置、筛选条件、分页大小等。
 * 持久化统一走 utils/storage.ts（键前缀 TABLE_CONFIG_KEY_PREFIX 收敛于 settings.ts），
 * 禁止在本文件直接调用 localStorage。
 */
import { ref, watch, type Ref } from 'vue'
import { readJSON, writeJSON, removeItem } from '@/utils/storage'
import { TABLE_CONFIG_KEY_PREFIX } from '@/settings'

export interface TableColumn {
  prop: string
  label: string
  visible: boolean
  width?: number
  sortable?: boolean
}

export interface TableConfig {
  columns: TableColumn[]
  pageSize: number
  filters: Record<string, any>
  sortBy?: string
  sortOrder?: 'ascending' | 'descending'
}

export interface UseTableConfigOptions {
  /** 默认每页大小 */
  defaultPageSize?: number
  /** 是否自动持久化 */
  autoPersist?: boolean
}

/**
 * 表格配置持久化
 * @param tableKey 表格唯一标识
 * @param defaultColumns 默认列配置
 * @param options 配置选项
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

  const config: Ref<TableConfig> = ref({
    columns: defaultColumns,
    pageSize: defaultPageSize,
    filters: {},
    sortBy: undefined,
    sortOrder: undefined
  })

  /**
   * 保存配置
   */
  const saveConfig = () => {
    if (writeJSON(storageKey, config.value)) {
      console.log(`[表格配置] 已保存: ${tableKey}`)
    }
  }

  /**
   * 加载配置
   */
  const loadConfig = (): boolean => {
    // 键不存在或 JSON 损坏时 readJSON 返回 null，统一回退默认配置
    const saved = readJSON<TableConfig>(storageKey)
    if (!saved) {
      return false
    }

    // 合并默认列配置（处理新增列）
    if (defaultColumns.length > 0) {
      const savedColumnMap = new Map(
        saved.columns.map(col => [col.prop, col])
      )

      config.value.columns = defaultColumns.map(defaultCol => {
        const savedCol = savedColumnMap.get(defaultCol.prop)
        return savedCol || defaultCol
      })
    } else {
      config.value.columns = saved.columns
    }

    config.value.pageSize = saved.pageSize || defaultPageSize
    config.value.filters = saved.filters || {}
    config.value.sortBy = saved.sortBy
    config.value.sortOrder = saved.sortOrder

    console.log(`[表格配置] 已加载: ${tableKey}`)
    return true
  }

  /**
   * 重置配置
   */
  const resetConfig = () => {
    config.value = {
      columns: defaultColumns,
      pageSize: defaultPageSize,
      filters: {},
      sortBy: undefined,
      sortOrder: undefined
    }
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
  const updateFilters = (filters: Record<string, any>) => {
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
   * 导入配置
   */
  const importConfig = (configStr: string): boolean => {
    try {
      const imported = JSON.parse(configStr) as TableConfig
      config.value = imported
      saveConfig()
      return true
    } catch (error) {
      console.error('[表格配置] 导入失败:', error)
      return false
    }
  }

  // 自动持久化
  if (autoPersist) {
    watch(config, saveConfig, { deep: true })
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
