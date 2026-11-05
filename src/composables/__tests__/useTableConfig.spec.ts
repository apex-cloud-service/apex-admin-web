/**
 * 表格配置持久化 Composable 单元测试
 * ------------------------------------------------------------------
 * 覆盖列配置、分页、筛选与排序的持久化：
 * - 首次加载无缓存时返回 false 并使用默认值
 * - 保存后可重新加载，且新增默认列会合并进已存配置
 * - 列可见性/宽度、筛选与排序更新
 * - 重置与导入导出
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useTableConfig } from '@/composables/useTableConfig'
import { TABLE_CONFIG_KEY_PREFIX } from '@/settings'

/** 每次构造独立的默认列，避免用例间共享可变对象 */
function createColumns() {
  return [
    { prop: 'name', label: '名称', visible: true },
    { prop: 'status', label: '状态', visible: false },
  ]
}

describe('useTableConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无缓存时使用默认配置并返回 false', () => {
    const table = useTableConfig('user', createColumns())
    expect(table.loadConfig()).toBe(false)
    expect(table.config.value.pageSize).toBe(20)
    expect(table.config.value.columns).toEqual(createColumns())
  })

  it('保存后可加载缓存配置', () => {
    const saved = useTableConfig('user', createColumns())
    saved.config.value.pageSize = 50
    saved.config.value.filters = { keyword: 'abc' }
    saved.saveConfig()

    const loaded = useTableConfig('user', createColumns())
    expect(loaded.loadConfig()).toBe(true)
    expect(loaded.config.value.pageSize).toBe(50)
    expect(loaded.config.value.filters).toEqual({ keyword: 'abc' })
  })

  it('加载时合并新增默认列并保留已存列设置', () => {
    const saved = useTableConfig('user', createColumns())
    saved.toggleColumn('status', true)
    saved.saveConfig()

    const withNewColumn = [
      ...createColumns(),
      { prop: 'createdAt', label: '创建时间', visible: true },
    ]
    const loaded = useTableConfig('user', withNewColumn)
    loaded.loadConfig()

    expect(loaded.config.value.columns.map((c) => c.prop)).toEqual(['name', 'status', 'createdAt'])
    expect(loaded.config.value.columns[1]?.visible).toBe(true)
  })

  it('切换列可见性与宽度', () => {
    const table = useTableConfig('user', createColumns())

    table.toggleColumn('status')
    expect(table.config.value.columns[1]?.visible).toBe(true)
    table.toggleColumn('name', false)
    expect(table.config.value.columns[0]?.visible).toBe(false)
    table.updateColumnWidth('name', 180)
    expect(table.config.value.columns[0]?.width).toBe(180)
  })

  it('筛选、清空筛选与排序', () => {
    const table = useTableConfig('user', createColumns())

    table.updateFilters({ keyword: 'a' })
    table.updateFilters({ status: 1 })
    expect(table.config.value.filters).toEqual({ keyword: 'a', status: 1 })

    table.clearFilters()
    expect(table.config.value.filters).toEqual({})

    table.updateSort('name', 'descending')
    expect(table.config.value.sortBy).toBe('name')
    expect(table.config.value.sortOrder).toBe('descending')
  })

  it('visibleColumns 过滤隐藏列', () => {
    const table = useTableConfig('user', createColumns())
    expect(table.visibleColumns().map((c) => c.prop)).toEqual(['name'])
  })

  it('重置配置会清空缓存并恢复默认值', () => {
    const table = useTableConfig('user', createColumns())
    table.config.value.pageSize = 100
    table.saveConfig()

    table.resetConfig()

    expect(table.config.value.pageSize).toBe(20)
    expect(localStorage.getItem(`${TABLE_CONFIG_KEY_PREFIX}user`)).toBeNull()
  })

  it('导入非法配置返回 false，合法配置返回 true 并持久化', () => {
    const table = useTableConfig('user', createColumns())

    expect(table.importConfig('{bad')).toBe(false)
    expect(table.importConfig(JSON.stringify({ columns: createColumns(), pageSize: 30, filters: {} }))).toBe(true)
    expect(table.config.value.pageSize).toBe(30)
    expect(localStorage.getItem(`${TABLE_CONFIG_KEY_PREFIX}user`)).not.toBeNull()
  })

  it('导出配置可被重新解析', () => {
    const table = useTableConfig('user', createColumns())
    table.config.value.pageSize = 40

    expect(JSON.parse(table.exportConfig()).pageSize).toBe(40)
  })
})
