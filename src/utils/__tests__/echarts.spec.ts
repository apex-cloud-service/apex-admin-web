/**
 * ECharts 按需注册模块单元测试
 * ------------------------------------------------------------------
 * 冒烟覆盖：转发 echarts/core 的核心 API（init/use/registerTheme）可用，
 * 保证按需注册入口未破坏全站图表调用面。
 */
import { describe, expect, it } from 'vitest'
import * as echarts from '@/utils/echarts'

describe('echarts 按需注册入口', () => {
  it('转发 echarts/core 的核心 API', () => {
    expect(typeof echarts.init).toBe('function')
    expect(typeof echarts.use).toBe('function')
    expect(typeof echarts.registerTheme).toBe('function')
    expect(typeof echarts.dispose).toBe('function')
  })

  it('核心图表与组件已注册（重复 use 同一组图表不抛错）', async () => {
    const { BarChart, LineChart, PieChart } = await import('echarts/charts')
    expect(() =>
      echarts.use([BarChart, LineChart, PieChart]),
    ).not.toThrow()
  })
})
