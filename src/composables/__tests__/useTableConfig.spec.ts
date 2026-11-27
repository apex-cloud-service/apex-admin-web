/**
 * 表格配置持久化 Composable 单元测试
 * ------------------------------------------------------------------
 * 覆盖列配置、分页、筛选与排序的持久化：
 * - 首次加载无缓存时返回 false 并使用默认值
 * - 保存后可重新加载，且新增默认列会合并进已存配置
 * - 列可见性/宽度、筛选与排序更新
 * - 重置与导入导出
 * - 持久化结构非法时回退默认值，导入失败不替换状态
 * - 默认列快照与深拷贝隔离
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTableConfig } from '@/composables/useTableConfig'
import { TABLE_CONFIG_KEY_PREFIX } from '@/settings'

/** 可切换的写入失败开关 + 写入次数计数，用于验证导入持久化语义。 */
const storageState = vi.hoisted(() => ({ failWrite: false, writes: 0 }))
vi.mock('@/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/utils/storage')>('@/utils/storage')
  return {
    ...actual,
    writeJSON: (key: string, value: unknown) => {
      if (storageState.failWrite) return false
      storageState.writes += 1
      return actual.writeJSON(key, value)
    },
  }
})

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

  it('结构非法的缓存不会被加载，且不污染当前配置', () => {
    localStorage.setItem(
      `${TABLE_CONFIG_KEY_PREFIX}user`,
      JSON.stringify({ columns: 'oops', pageSize: 30, filters: {} }),
    )
    const table = useTableConfig('user', createColumns())
    expect(table.loadConfig()).toBe(false)
    expect(table.config.value.columns).toEqual(createColumns())
    expect(table.config.value.pageSize).toBe(20)
  })

  it('导入结构合法但字段类型错误的配置返回 false 且不替换状态', () => {
    const table = useTableConfig('user', createColumns())
    const before = JSON.stringify(table.config.value)

    expect(table.importConfig(JSON.stringify({ columns: [], pageSize: -1, filters: {} }))).toBe(false)
    expect(JSON.stringify(table.config.value)).toBe(before)
  })

  it('reset 使用默认列快照，外部修改默认数组不会影响重置结果', () => {
    const external = createColumns()
    const table = useTableConfig('user', external)

    external[0].label = '被外部改名'
    external.push({ prop: 'extra', label: '新增', visible: true })

    table.resetConfig()
    expect(table.config.value.columns).toEqual(createColumns())
  })

  it('深拷贝隔离：修改内部列不会污染调用方默认列', () => {
    const external = createColumns()
    const table = useTableConfig('user', external)

    table.toggleColumn('name', false)
    expect(external[0].visible).toBe(true)
  })

  it('导入成功后只持久化一次，不因 watch 重复写入', async () => {
    const table = useTableConfig('user', createColumns())
    storageState.writes = 0
    const payload = JSON.stringify({ columns: createColumns(), pageSize: 50, filters: { a: 1 } })
    expect(table.importConfig(payload)).toBe(true)
    // 等待深度 watch 的异步 flush 完成
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(storageState.writes).toBe(1)
    expect(JSON.parse(localStorage.getItem(`${TABLE_CONFIG_KEY_PREFIX}user`)!).pageSize).toBe(50)
  })

  it('width=0 的历史缓存仍被视为合法配置', () => {
    localStorage.setItem(
      `${TABLE_CONFIG_KEY_PREFIX}user`,
      JSON.stringify({
        columns: [{ prop: 'name', label: '名称', visible: true, width: 0 }],
        pageSize: 20,
        filters: {},
      }),
    )
    const table = useTableConfig('user', createColumns())
    expect(table.loadConfig()).toBe(true)
    expect(table.config.value.columns[0]?.width).toBe(0)
  })

  it('存储写入失败时导入返回 false 且保留原配置，不写入内存变更', () => {
    const table = useTableConfig('user', createColumns())
    const before = JSON.stringify(table.config.value)
    storageState.failWrite = true
    try {
      const result = table.importConfig(JSON.stringify({ columns: createColumns(), pageSize: 50, filters: {} }))
      expect(result).toBe(false)
      expect(JSON.stringify(table.config.value)).toBe(before)
    } finally {
      storageState.failWrite = false
    }
  })

  it('列字段类型错误（visible 非布尔）不被当作合法配置', () => {
    localStorage.setItem(
      `${TABLE_CONFIG_KEY_PREFIX}user`,
      JSON.stringify({ columns: [{ prop: 'name', label: '名称', visible: 'yes' }], pageSize: 20, filters: {} }),
    )
    const table = useTableConfig('user', createColumns())
    expect(table.loadConfig()).toBe(false)
    expect(table.config.value.columns).toEqual(createColumns())
  })

  it('sortOrder 非法枚举不被当作合法配置', () => {
    localStorage.setItem(
      `${TABLE_CONFIG_KEY_PREFIX}user`,
      JSON.stringify({ columns: createColumns(), pageSize: 20, filters: {}, sortOrder: 'up' }),
    )
    const table = useTableConfig('user', createColumns())
    expect(table.loadConfig()).toBe(false)
  })
})
