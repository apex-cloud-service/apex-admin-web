/**
 * 响应式断点工具单元测试
 * ------------------------------------------------------------------
 * 覆盖默认断点判定、设备类型布尔值、自定义断点与区间工具方法。
 */
import { describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

/** 持有真实 Vue ref（普通对象无响应式依赖，computed 不会重算） */
const holder = vi.hoisted(() => ({
  width: undefined as unknown as Ref<number>,
  height: undefined as unknown as Ref<number>,
}))

vi.mock('@vueuse/core', () => ({
  useWindowSize: () => ({ width: holder.width, height: holder.height }),
}))

holder.width = ref(1280)
holder.height = ref(800)

/** 设置视口宽度（模拟窗口变化） */
function setWidth(width: number): void {
  holder.width.value = width
}

describe('useBreakpoint', () => {
  it('默认断点下返回视口尺寸', () => {
    setWidth(1280)
    const bp = useBreakpoint()
    expect(bp.width.value).toBe(1280)
    expect(bp.height.value).toBe(800)
    expect(bp.breakpoints.xl).toBe(1280)
  })

  it('current 依宽度落入对应断点', () => {
    const bp = useBreakpoint()

    setWidth(500)
    expect(bp.current.value).toBe('xs')
    setWidth(600)
    expect(bp.current.value).toBe('sm')
    setWidth(800)
    expect(bp.current.value).toBe('md')
    setWidth(1100)
    expect(bp.current.value).toBe('lg')
    setWidth(1280)
    expect(bp.current.value).toBe('xl')
    setWidth(1920)
    expect(bp.current.value).toBe('xxl')
  })

  it('设备类型布尔值随断点联动', () => {
    const bp = useBreakpoint()

    setWidth(500)
    expect(bp.isMobile.value).toBe(true)
    expect(bp.isTablet.value).toBe(false)
    expect(bp.isDesktop.value).toBe(false)

    setWidth(800)
    expect(bp.isMobile.value).toBe(false)
    expect(bp.isTablet.value).toBe(true)
    expect(bp.isDesktop.value).toBe(false)

    setWidth(1100)
    expect(bp.isDesktop.value).toBe(true)
    expect(bp.isWidescreen.value).toBe(false)

    setWidth(1300)
    expect(bp.isWidescreen.value).toBe(true)
    expect(bp.isUltrawide.value).toBe(false)

    setWidth(1920)
    expect(bp.isUltrawide.value).toBe(true)
  })

  it('具体断点布尔值与区间语义一致（含边界不重叠）', () => {
    const bp = useBreakpoint()

    setWidth(1280)
    expect(bp.isXs.value).toBe(false)
    expect(bp.isLg.value).toBe(false)
    expect(bp.isXl.value).toBe(true)
    expect(bp.isXxl.value).toBe(false)

    setWidth(576)
    expect(bp.isSm.value).toBe(true)
    expect(bp.isXs.value).toBe(false)
  })

  it('自定义断点覆盖默认阈值', () => {
    setWidth(950)
    const bp = useBreakpoint({ lg: 900 })
    expect(bp.current.value).toBe('lg')
    expect(bp.isDesktop.value).toBe(true)
  })

  it('greaterOrEqual/smaller/between 工具方法返回响应式计算值', () => {
    const bp = useBreakpoint()

    setWidth(1100)
    expect(bp.greaterOrEqual('lg').value).toBe(true)
    expect(bp.smaller('xl').value).toBe(true)
    expect(bp.between('md', 'xl').value).toBe(true)

    setWidth(1300)
    expect(bp.smaller('xl').value).toBe(false)
    expect(bp.between('md', 'xl').value).toBe(false)
  })
})
