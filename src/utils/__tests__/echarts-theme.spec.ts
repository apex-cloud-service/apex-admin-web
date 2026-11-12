/**
 * ECharts 主题适配工具单元测试
 * ------------------------------------------------------------------
 * 覆盖主题切换、基础配置随主题联动、配置合并语义与四类预设图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  darkTheme,
  getBaseChartOption,
  getTheme,
  lightTheme,
  mergeChartOption,
  presetCharts,
  setTheme,
} from '@/utils/echarts-theme'

describe('echarts-theme', () => {
  afterEach(() => setTheme('light'))

  it('默认为亮色主题，setTheme 可切换暗色与自定义主题', () => {
    expect(getTheme()).toBe(lightTheme)

    setTheme('dark')
    expect(getTheme()).toBe(darkTheme)

    const custom = { ...lightTheme, primary: '#123456' }
    setTheme(custom)
    expect(getTheme()).toBe(custom)

    setTheme('light')
    expect(getTheme()).toBe(lightTheme)
  })

  it('基础配置取当前主题的颜色体系', () => {
    const lightOption = getBaseChartOption()
    expect(lightOption.color).toEqual(lightTheme.chartColors)
    expect(lightOption.backgroundColor).toBe('transparent')
    expect(lightOption.textStyle?.color).toBe(lightTheme.text)

    setTheme('dark')
    const darkOption = getBaseChartOption()
    expect(darkOption.textStyle?.color).toBe(darkTheme.text)
    expect((darkOption.tooltip as { backgroundColor?: string }).backgroundColor).toBe(darkTheme.background)
  })

  it('mergeChartOption：顶层自定义覆盖基础，嵌套对象按字段合并', () => {
    const merged = mergeChartOption({
      backgroundColor: '#101010',
      textStyle: { color: '#abcabc' },
    })

    expect(merged.backgroundColor).toBe('#101010')
    expect(merged.textStyle?.color).toBe('#abcabc')
    // 基础 textStyle 中未覆盖的字段保留
    expect((merged.textStyle as { fontFamily?: string }).fontFamily).toBe(
      getBaseChartOption().textStyle?.fontFamily,
    )
  })

  it('预设折线/柱状/饼图透传数据且类型正确', () => {
    const data = {
      xData: ['周一', '周二'],
      series: [{ name: '调用量', data: [1, 2] }],
    }

    const line = presetCharts.line(data)
    expect(line.xAxis).toMatchObject({ type: 'category', data: data.xData })
    const lineSeries = line.series as Array<Record<string, unknown>>
    expect(lineSeries[0]).toMatchObject({ name: '调用量', type: 'line', data: [1, 2], smooth: true })

    const bar = presetCharts.bar(data)
    const barSeries = bar.series as Array<Record<string, unknown>>
    expect(barSeries[0]).toMatchObject({ type: 'bar', data: [1, 2] })

    const pieData = [
      { name: 'GET', value: 10 },
      { name: 'POST', value: 4 },
    ]
    const pie = presetCharts.pie(pieData)
    const pieSeries = pie.series as Array<{ type: string; data: typeof pieData }>
    expect(pieSeries[0]).toMatchObject({ type: 'pie' })
    expect(pieSeries[0].data).toEqual(pieData)
  })

  it('预设仪表盘使用当前主题的分段颜色', () => {
    setTheme('dark')
    const gauge = presetCharts.gauge(66, '健康度')
    const series = (gauge.series as Array<Record<string, unknown>>)[0] as {
      type: string
      data: Array<{ value: number; name: string }>
      axisLine: { lineStyle: { color: Array<[number, string]> } }
    }

    expect(series.type).toBe('gauge')
    expect(series.data[0]).toEqual({ value: 66, name: '健康度' })
    expect(series.axisLine.lineStyle.color[2][1]).toBe(darkTheme.danger)
  })
})
