/**
 * ECharts 主题适配工具
 * 统一管理 ECharts 图表主题，支持暗色/亮色模式切换
 */
import type { EChartsOption } from 'echarts'

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  primary: string
  success: string
  warning: string
  danger: string
  info: string
  text: string
  textSecondary: string
  border: string
  background: string
  chartColors: string[]
}

/**
 * 亮色主题
 */
export const lightTheme: ThemeColors = {
  primary: '#409EFF',
  success: '#67C23A',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
  text: '#303133',
  textSecondary: '#606266',
  border: '#DCDFE6',
  background: '#FFFFFF',
  chartColors: [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ]
}

/**
 * 暗色主题
 */
export const darkTheme: ThemeColors = {
  primary: '#409EFF',
  success: '#67C23A',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
  text: '#E5EAF3',
  textSecondary: '#C0C4CC',
  border: '#4C4D4F',
  background: '#141414',
  chartColors: [
    '#4992ff', '#7cffb2', '#fddd60', '#ff6e76', '#58d9f9',
    '#05c091', '#ff8a45', '#8d48e3', '#dd79ff'
  ]
}

/**
 * 当前主题
 */
let currentTheme: ThemeColors = lightTheme

/**
 * 设置当前主题
 */
export function setTheme(theme: 'light' | 'dark' | ThemeColors): void {
  if (typeof theme === 'string') {
    currentTheme = theme === 'dark' ? darkTheme : lightTheme
  } else {
    currentTheme = theme
  }
}

/**
 * 获取当前主题
 */
export function getTheme(): ThemeColors {
  return currentTheme
}

/**
 * 获取通用 ECharts 配置
 */
export function getBaseChartOption(): EChartsOption {
  const theme = getTheme()
  
  return {
    color: theme.chartColors,
    backgroundColor: 'transparent',
    textStyle: {
      color: theme.text,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    title: {
      textStyle: {
        color: theme.text,
        fontSize: 16,
        fontWeight: 600
      },
      subtextStyle: {
        color: theme.textSecondary,
        fontSize: 12
      }
    },
    legend: {
      textStyle: {
        color: theme.text,
        fontSize: 12
      },
      pageTextStyle: {
        color: theme.text
      }
    },
    tooltip: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: {
        color: theme.text,
        fontSize: 12
      },
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.1)'
    },
    grid: {
      borderColor: theme.border,
      containLabel: true,
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%'
    },
    xAxis: {
      axisLine: {
        lineStyle: {
          color: theme.border
        }
      },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: theme.border,
          type: 'dashed'
        }
      }
    },
    yAxis: {
      axisLine: {
        lineStyle: {
          color: theme.border
        }
      },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: theme.border,
          type: 'dashed'
        }
      }
    }
  }
}

/**
 * 合并主题基础配置与自定义图表配置（浅合并）。
 * 仅 textStyle/title/legend/tooltip/grid 五个键逐键合并；其余键（series/xAxis/yAxis/color 等）
 * 由 customOption 整体覆盖基础值，需保留基础项时须在 customOption 中显式带上
 */
export function mergeChartOption(
  customOption: EChartsOption
): EChartsOption {
  const baseOption = getBaseChartOption()
  
  return {
    ...baseOption,
    ...customOption,
    textStyle: {
      ...baseOption.textStyle,
      ...(customOption.textStyle || {})
    },
    title: {
      ...baseOption.title,
      ...(customOption.title || {})
    },
    legend: {
      ...baseOption.legend,
      ...(customOption.legend || {})
    },
    tooltip: {
      ...baseOption.tooltip,
      ...(customOption.tooltip || {})
    },
    grid: {
      ...baseOption.grid,
      ...(customOption.grid || {})
    }
  }
}

/**
 * 预设图表配置
 */
export const presetCharts = {
  /**
   * 折线图配置
   */
  line: (data: { xData: string[], series: Array<{ name: string, data: number[] }> }): EChartsOption => {
    return mergeChartOption({
      xAxis: {
        type: 'category',
        data: data.xData,
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      series: data.series.map(item => ({
        name: item.name,
        type: 'line',
        data: item.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 2
          }
        }
      }))
    })
  },

  /**
   * 柱状图配置
   */
  bar: (data: { xData: string[], series: Array<{ name: string, data: number[] }> }): EChartsOption => {
    return mergeChartOption({
      xAxis: {
        type: 'category',
        data: data.xData
      },
      yAxis: {
        type: 'value'
      },
      series: data.series.map(item => ({
        name: item.name,
        type: 'bar',
        data: item.data,
        barMaxWidth: 40,
        emphasis: {
          focus: 'series'
        }
      }))
    })
  },

  /**
   * 饼图配置
   */
  pie: (data: Array<{ name: string, value: number }>): EChartsOption => {
    return mergeChartOption({
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: getTheme().background,
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            fontSize: 12
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          data
        }
      ]
    })
  },

  /**
   * 仪表盘配置
   * @param value 指标值（0-100 的百分比数值；min/max 固定 0~100，展示格式为 {value}%）
   * @param title 标题（可选）
   */
  gauge: (value: number, title: string = ''): EChartsOption => {
    const theme = getTheme()
    return mergeChartOption({
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 8,
          axisLine: {
            lineStyle: {
              width: 6,
              color: [
                [0.3, theme.success],
                [0.7, theme.warning],
                [1, theme.danger]
              ]
            }
          },
          pointer: {
            length: '75%',
            width: 4
          },
          axisTick: {
            length: 8,
            lineStyle: {
              color: 'auto'
            }
          },
          splitLine: {
            length: 12,
            lineStyle: {
              color: 'auto'
            }
          },
          axisLabel: {
            color: theme.textSecondary,
            fontSize: 10,
            distance: -50
          },
          title: {
            show: true,
            offsetCenter: [0, '70%'],
            fontSize: 14,
            color: theme.text
          },
          detail: {
            fontSize: 24,
            offsetCenter: [0, '40%'],
            valueAnimation: true,
            formatter: '{value}%',
            color: theme.text
          },
          data: [{ value, name: title }]
        }
      ]
    })
  }
}

/**
 * 导出
 */
export default {
  lightTheme,
  darkTheme,
  setTheme,
  getTheme,
  getBaseChartOption,
  mergeChartOption,
  presetCharts
}
