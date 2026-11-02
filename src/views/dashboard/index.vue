<!--
  工作台（仪表盘）
  ------------------------------------------------------------------
  欢迎信息 + 系统概览指标卡片（来自 /admin-api/v1/monitor/overview 真实数据）
  + 接口调用趋势（基于网关/接口计数器）。
-->
<template>
  <div class="dashboard">
    <!-- 欢迎横幅 -->
    <el-card shadow="never" class="welcome-card">
      <h2>👋 欢迎回来，{{ userStore.identity?.nickName || userStore.identity?.username || '用户' }}</h2>
      <p class="welcome-sub">Apex Scaffold 管理后台 · 今日也要高效工作</p>
    </el-card>

    <!-- 指标卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col v-for="item in statCards" :key="item.label" :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :class="{ warn: item.warn }">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 资源占用 -->
    <el-row :gutter="16" class="stat-row">
      <el-col v-for="item in resourceCards" :key="item.label" :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <el-progress
            v-if="!item.isTime"
            type="dashboard"
            :percentage="percentOf(item.value)"
            :color="progressColor(percentOf(item.value))"
          />
          <div v-else class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 访问趋势图 -->
    <el-card shadow="never" class="chart-card">
      <template #header>接口调用趋势（进程启动以来，示例窗口）</template>
      <div ref="chartRef" class="chart" />
    </el-card>

    <!-- 数据总览：跨域只读聚合（D5，GET /api/v2/overview） -->
    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="overview-header">
          <span>数据总览（跨域只读聚合）</span>
          <el-tag v-if="crossOverview" :type="crossOverview.degraded ? 'warning' : 'success'" size="small">
            {{ crossOverview.degraded ? '部分数据源降级' : '全部可用' }}
          </el-tag>
        </div>
      </template>
      <el-row v-loading="crossLoading" :gutter="16">
        <el-col v-for="source in overviewSources" :key="source.name" :xs="24" :sm="8">
          <el-card shadow="hover" class="source-card">
            <div class="source-title">
              <span>{{ source.label }}</span>
              <el-tag :type="source.result?.status === 'UP' ? 'success' : 'warning'" size="small">
                {{ source.result?.status === 'UP' ? '可用' : '降级' }}
              </el-tag>
            </div>
            <div v-if="source.result?.status === 'UP'" class="source-body">
              <div v-for="metric in flattenSource(source.result.data)" :key="metric.key" class="source-metric">
                <span class="metric-key">{{ metric.key }}</span>
                <span class="metric-value">{{ metric.value }}</span>
              </div>
              <div v-if="flattenSource(source.result.data).length === 0" class="metric-empty">无统计字段</div>
            </div>
            <div v-else class="source-error">{{ source.result?.error || '数据源不可达' }}</div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="!crossLoading && !crossOverview" description="暂无聚合数据" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 工作台脚本
 * - 指标卡片：来自监控概览接口（真实数据，失败时回退占位符）
 * - 趋势图：ECharts 折线图（真实接口计数器聚合，演示窗口）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { getMonitorOverview } from '@/api/monitor'
import { getCrossDomainOverview } from '@/api/overview'
import { showError } from '@/utils/request'
import type { CrossDomainOverview, MonitorOverview, OverviewSourceResult } from '@/types'

const userStore = useUserStore()
const appStore = useAppStore()

/** 图表容器引用 */
const chartRef = ref<HTMLElement>()
/** ECharts 实例（卸载时销毁） */
let chart: echarts.ECharts | null = null

/** 跨域聚合概览（D5） */
const crossOverview = ref<CrossDomainOverview | null>(null)
/** 跨域聚合加载中 */
const crossLoading = ref(false)

/** 数据源展示名（后端 sources 键为 file/workflow/integration） */
const SOURCE_LABELS: Record<string, string> = {
  file: '文件存储',
  workflow: '工作流',
  integration: '集成与设备',
}

/** 聚合数据源列表（固定顺序，缺失源按降级展示） */
const overviewSources = computed(() => {
  const sources = crossOverview.value?.sources ?? {}
  const names = ['file', 'workflow', 'integration']
  return names.map((name) => ({
    name,
    label: SOURCE_LABELS[name] || name,
    result: sources[name] as OverviewSourceResult | undefined,
  }))
})

/**
 * 扁平化数据源的统计字段（仅展示一层标量，嵌套对象折叠为 JSON 文本）。
 * @param data 数据源返回的业务数据
 */
function flattenSource(data?: Record<string, unknown> | null): Array<{ key: string; value: string }> {
  if (!data || typeof data !== 'object') return []
  return Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
}

/** 加载跨域聚合概览（失败不阻塞工作台其他区块） */
async function loadCrossOverview(): Promise<void> {
  crossLoading.value = true
  try {
    crossOverview.value = await getCrossDomainOverview()
  } catch {
    // 聚合端点不可用时保持空态，不弹错（工作台其余数据仍可用）
    crossOverview.value = null
  } finally {
    crossLoading.value = false
  }
}

/** 监控概览数据（加载失败时为空对象） */
const overview = ref<Partial<MonitorOverview>>({})

/** 概览指标卡片 */
const statCards = computed(() => [
  { label: '角色数', value: userStore.identity?.roles?.length || '-' },
  { label: '权限码', value: userStore.permissions.length },
  { label: '累计请求', value: overview.value.totalRequests ?? '-' },
  { label: '5xx 错误', value: overview.value.error5xx ?? '-', warn: (overview.value.error5xx ?? 0) > 0 },
])

/** 资源占用卡片（0~1 归一化；响应时间为秒） */
const resourceCards = computed(() => [
  { label: '堆内存使用率', value: clamp01(overview.value.heapUsedPercent) },
  { label: 'CPU 使用率', value: clamp01(overview.value.cpuUsage) },
  { label: '系统 CPU', value: clamp01(overview.value.systemCpuUsage) },
  {
    label: '平均响应时间',
    value: formatSeconds(overview.value.avgResponseTime ?? 0),
    isTime: true,
  },
])

/** 秒 → 可读时长 */
function formatSeconds(seconds: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return '-'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  return `${seconds.toFixed(2)} s`
}

/** 进度条颜色：随占用率变化 */
function progressColor(percent: number): string {
  if (percent < 60) return '#67c23a'
  if (percent < 85) return '#e6a23c'
  return '#f56c6c'
}

/** 将值收敛到 0~1（NaN/负值归 0，>1 归 1） */
function clamp01(value?: number): number {
  if (value === undefined || Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** 数值转百分比（非数值返回 0，避免进度条 NaN） */
function percentOf(value: number | string): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100)
}

/**
 * 渲染接口调用趋势折线图（实例复用，仅首次 init）。
 */
function renderChart(): void {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  const isDark = document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#a3a6ad' : '#606266'
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['累计请求', '4xx 错误', '5xx 错误', '网关请求', '限流拒绝', '熔断打开'],
      axisLine: { lineStyle: { color: axisColor } },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: axisColor } },
    },
    series: [
      {
        name: '计数',
        type: 'bar',
        barWidth: '45%',
        data: [
          overview.value.totalRequests ?? 0,
          overview.value.error4xx ?? 0,
          overview.value.error5xx ?? 0,
          overview.value.gatewayRequests ?? 0,
          overview.value.rateLimitRejected ?? 0,
          overview.value.circuitBreakerOpened ?? 0,
        ],
        itemStyle: {
          color: (params: { dataIndex: number }) =>
            ['#409eff', '#e6a23c', '#f56c6c', '#67c23a', '#909399', '#f56c6c'][params.dataIndex],
        },
      },
    ],
  })
}

/** 窗口尺寸变化时自适应图表 */
function handleResize(): void {
  chart?.resize()
}

onMounted(async () => {
  renderChart()
  window.addEventListener('resize', handleResize)
  // 聚合概览与监控概览并行加载，互不阻塞
  loadCrossOverview()
  try {
    overview.value = await getMonitorOverview()
  } catch (error) {
    // 监控接口不可用时保留占位数据（不阻塞工作台展示）
    showError(error)
  }
  renderChart()
})

// 主题切换后按新配色重绘
watch(
  () => appStore.theme,
  () => renderChart(),
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
/* 欢迎卡片 */
.welcome-card {
  margin-bottom: 16px;
}

.welcome-card h2 {
  margin: 0 0 4px;
}

.welcome-sub {
  margin: 0;
  color: var(--el-text-color-secondary);
}

/* 指标卡片行 */
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.stat-value.warn {
  color: var(--el-color-danger);
}

.stat-label {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

/* 图表容器 */
.chart {
  height: 320px;
}

/* 数据总览 */
.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.source-card {
  margin-bottom: 12px;
}

.source-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}

.source-metric {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.metric-key {
  color: var(--el-text-color-secondary);
}

.metric-value {
  font-weight: 600;
}

.metric-empty,
.source-error {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.source-error {
  color: var(--el-color-warning);
}
</style>
