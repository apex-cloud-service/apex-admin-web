/**
 * 响应式断点工具 Composable
 * 提供响应式的屏幕尺寸断点判断
 */
import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

/** 各断点的最小宽度阈值（单位 px） */
export interface Breakpoints {
  xs: number  // 超小屏（手机）
  sm: number  // 小屏（手机横屏）
  md: number  // 中屏（平板）
  lg: number  // 大屏（桌面）
  xl: number  // 超大屏（大桌面）
  xxl: number // 超超大屏（4K）
}

const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1920
}

/**
 * 响应式断点判断
 * @param customBreakpoints 自定义断点（可选）
 */
export function useBreakpoint(customBreakpoints?: Partial<Breakpoints>) {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints }
  const { width, height } = useWindowSize()

  // 当前断点名称
  const current = computed(() => {
    const w = width.value
    if (w >= breakpoints.xxl) return 'xxl'
    if (w >= breakpoints.xl) return 'xl'
    if (w >= breakpoints.lg) return 'lg'
    if (w >= breakpoints.md) return 'md'
    if (w >= breakpoints.sm) return 'sm'
    return 'xs'
  })

  // 是否为移动端
  const isMobile = computed(() => width.value < breakpoints.md)

  // 是否为平板
  const isTablet = computed(() => 
    width.value >= breakpoints.md && width.value < breakpoints.lg
  )

  // 是否为桌面
  const isDesktop = computed(() => width.value >= breakpoints.lg)

  // 是否为宽屏
  const isWidescreen = computed(() => width.value >= breakpoints.xl)

  // 是否为超宽屏
  const isUltrawide = computed(() => width.value >= breakpoints.xxl)

  // 是否为小屏（手机）
  const isXs = computed(() => width.value < breakpoints.sm)
  const isSm = computed(() => 
    width.value >= breakpoints.sm && width.value < breakpoints.md
  )
  const isMd = computed(() => 
    width.value >= breakpoints.md && width.value < breakpoints.lg
  )
  const isLg = computed(() => 
    width.value >= breakpoints.lg && width.value < breakpoints.xl
  )
  const isXl = computed(() => 
    width.value >= breakpoints.xl && width.value < breakpoints.xxl
  )
  const isXxl = computed(() => width.value >= breakpoints.xxl)

  // 大于等于某个断点
  const greaterOrEqual = (breakpoint: keyof Breakpoints) => {
    return computed(() => width.value >= breakpoints[breakpoint])
  }

  // 小于某个断点
  const smaller = (breakpoint: keyof Breakpoints) => {
    return computed(() => width.value < breakpoints[breakpoint])
  }

  // 在两个断点之间
  const between = (min: keyof Breakpoints, max: keyof Breakpoints) => {
    return computed(() => 
      width.value >= breakpoints[min] && width.value < breakpoints[max]
    )
  }

  return {
    // 屏幕尺寸
    width,
    height,

    // 当前断点
    current,

    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    isWidescreen,
    isUltrawide,

    // 具体断点
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,

    // 工具方法
    greaterOrEqual,
    smaller,
    between,

    // 断点配置
    breakpoints
  }
}
