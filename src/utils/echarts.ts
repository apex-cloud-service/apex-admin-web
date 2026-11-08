/**
 * ECharts 按需注册
 * ------------------------------------------------------------------
 * 从 echarts/core 注册全站实际使用的图表类型与组件（柱/折/饼/散点/雷达/仪表），
 * 页面统一从本模块导入，避免全量打包；新增图表类型或组件时须在此登记。
 */
import * as echarts from 'echarts/core'
import { BarChart, GaugeChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

export * from 'echarts/core'
// 组合类型（完整 option/series 形状）仅存在于全量类型入口，按类型导出不进产物
export type { EChartsOption, SeriesOption } from 'echarts'
