<!--
  监控大盘
  ------------------------------------------------------------------
  全量性能监控看板，数据来自 /admin-api/v1/monitor/* 聚合接口：
  - 概览：应用状态/运行时长/堆内存/CPU/线程/活跃会话
  - 系统：JVM 内存、CPU、磁盘、网络、线程、GC、阻塞 IO 池
  - 中间件：MySQL、Redis、消息中间件、Zipkin
  - 治理：Sentinel 熔断/限流规则与计数、网关流量
  - 业务：核心业务指标
  默认每 10 秒自动刷新。
-->
<template>
  <div class="monitor-dashboard">
    <!-- 顶部概览指标卡 -->
    <el-row :gutter="16" class="stat-row">
      <el-col v-for="item in overviewCards" :key="item.label" :xs="12" :sm="6" :lg="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :class="{ warn: item.warn }">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 自动刷新开关 -->
    <div class="refresh-bar">
      <el-switch v-model="autoRefresh" active-text="自动刷新（10s）" />
      <el-button size="small" :icon="Refresh" :loading="loading" @click="loadAll">立即刷新</el-button>
      <span class="update-time">最近更新：{{ lastUpdate }}</span>
    </div>

    <el-row :gutter="16">
      <!-- JVM 内存 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>JVM 内存</template>
          <div ref="memChartRef" class="chart" />
          <div class="panel-meta">
            <span>堆使用 {{ formatBytes(system?.jvm?.heapUsed) }} / {{ formatBytes(system?.jvm?.heapMax) }}</span>
            <span>GC 次数 {{ system?.jvm?.gcPauseCount ?? 0 }} · 累计 {{ formatMs(system?.jvm?.gcPauseTotal) }}</span>
          </div>
        </el-card>
      </el-col>

      <!-- CPU -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>CPU 使用率（近 5 分钟）</template>
          <div ref="cpuChartRef" class="chart" />
          <div class="panel-meta">
            <span>核数 {{ system?.cpu?.cores ?? '-' }}</span>
            <span>负载均值 {{ system?.cpu?.loadAverage ?? '-' }}</span>
          </div>
        </el-card>
      </el-col>

      <!-- 线程 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>JVM 线程</template>
          <div ref="threadChartRef" class="chart" />
          <div class="panel-meta">
            <span>当前 {{ system?.threads?.live ?? 0 }} · 峰值 {{ system?.threads?.peak ?? 0 }}</span>
            <span>守护线程 {{ system?.threads?.daemon ?? 0 }}</span>
          </div>
        </el-card>
      </el-col>

      <!-- 磁盘 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>磁盘使用</template>
          <div ref="diskChartRef" class="chart" />
        </el-card>
      </el-col>

      <!-- 网络 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>网络收发（近 5 分钟）</template>
          <div ref="netChartRef" class="chart" />
        </el-card>
      </el-col>

      <!-- 网络质量 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>网络质量监控</template>
          <div ref="netQualityChartRef" class="chart" />
          <div class="panel-meta network-quality-meta">
            <div v-for="net in activeNetworks" :key="net.name" class="network-item">
              <div class="network-name">{{ net.name }}</div>
              <div class="network-stats">
                <span>错误率: <b :class="getErrorRateClass(net.errorRate)">{{ (net.errorRate * 100).toFixed(3) }}%</b></span>
                <span>丢包: <b>{{ net.rxDropped + net.txDropped }}</b></span>
                <span>带宽: <b>{{ (net.bandwidthUtilization * 100).toFixed(1) }}%</b></span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 阻塞 IO 线程池 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel">
          <template #header>阻塞 IO 线程池饱和度</template>
          <div ref="poolChartRef" class="chart" />
        </el-card>
      </el-col>

      <!-- MySQL -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="never" class="panel">
          <template #header>MySQL</template>
          <div class="middleware-body">
            <el-progress
              type="dashboard"
              :percentage="mysqlPercent"
              :color="progressColor(mysqlPercent)"
              :width="120"
            />
            <div class="kv-list">
              <div><span>驱动</span><b>{{ middleware?.mysql?.driver || '-' }}</b></div>
              <div><span>活动连接</span><b>{{ middleware?.mysql?.activeConnections ?? '-' }} / {{ middleware?.mysql?.maxConnections ?? '-' }}</b></div>
              <div><span>空闲连接</span><b>{{ middleware?.mysql?.idleConnections ?? '-' }}</b></div>
              <div><span>累计请求</span><b>{{ middleware?.mysql?.totalRequests ?? '-' }}</b></div>
              <div><span>累计错误</span><b>{{ middleware?.mysql?.totalErrors ?? '-' }}</b></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Redis -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="never" class="panel">
          <template #header>Redis</template>
          <div class="middleware-body">
            <el-tag :type="redisHealthy ? 'success' : 'danger'" size="large">
              {{ redisHealthy ? '健康' : '不可用' }}
            </el-tag>
            <div class="kv-list">
              <div><span>节点数</span><b>{{ middleware?.redis?.nodes ?? '-' }}</b></div>
              <div><span>活跃会话</span><b>{{ middleware?.redis?.activeSessions ?? '-' }}</b></div>
              <div><span>IP 黑名单</span><b>{{ middleware?.redis?.ipBlacklistSize ?? '-' }}</b></div>
              <div><span>Token 黑名单</span><b>{{ middleware?.redis?.tokenBlacklistSize ?? '-' }}</b></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 消息中间件 -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="never" class="panel">
          <template #header>消息中间件</template>
          <div class="middleware-body">
            <el-tag :type="mqAvailable ? 'success' : 'info'" size="large">
              {{ mqAvailable ? (middleware?.mq?.type || 'RocketMQ') : '未接入' }}
            </el-tag>
            <div class="kv-list">
              <div><span>NameServer</span><b>{{ middleware?.mq?.nameServer || '-' }}</b></div>
              <div><span>生产组</span><b>{{ middleware?.mq?.producerGroup || '-' }}</b></div>
              <div><span>生产者状态</span><b>{{ middleware?.mq?.producerStatus || '-' }}</b></div>
              <div><span>Topic 数</span><b>{{ middleware?.mq?.topics ?? '-' }}</b></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Zipkin -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="middleware-header">
              <span>Zipkin</span>
              <el-tag v-if="!tracingAvailable" type="info" size="small">未接入</el-tag>
              <el-tag v-else type="success" size="small">运行中</el-tag>
            </div>
          </template>
          <div class="middleware-body">
            <div v-if="tracingAvailable" class="tracing-stats">
              <div class="stat-item">
                <span class="stat-label">采样率</span>
                <span class="stat-value">{{ ((middleware?.tracing?.samplingRate ?? 0) * 100).toFixed(1) }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">上报成功</span>
                <span class="stat-value success">{{ formatNumber(middleware?.tracing?.reportedSpans ?? 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">上报失败</span>
                <span class="stat-value" :class="{ danger: (middleware?.tracing?.failedSpans ?? 0) > 0 }">
                  {{ formatNumber(middleware?.tracing?.failedSpans ?? 0) }}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均延迟</span>
                <span class="stat-value">{{ (middleware?.tracing?.avgReportLatency ?? 0).toFixed(2) }} ms</span>
              </div>
              <div v-if="middleware?.tracing?.lastReportTime" class="stat-item">
                <span class="stat-label">最近上报</span>
                <span class="stat-value">{{ formatTime(middleware.tracing.lastReportTime) }}</span>
              </div>
            </div>
            <div v-else class="middleware-placeholder">
              <el-empty description="链路追踪未接入" :image-size="80" />
            </div>
            
            <div v-if="tracingAvailable" class="trace-query-section">
              <el-divider />
              <el-button type="primary" size="small" @click="openTraceQuery" :icon="Search">
                TraceId 查询
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Sentinel 治理 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="panel">
          <template #header>Sentinel 流量治理（熔断 / 限流）</template>
          <div ref="sentinelChartRef" class="chart chart-sm" />
          <div class="gov-counts">
            <el-tag type="warning" size="small">限流拒绝 {{ governance?.security?.rateLimitRejected ?? 0 }}</el-tag>
            <el-tag type="danger" size="small">熔断打开 {{ governance?.security?.circuitBreakerOpened ?? 0 }}</el-tag>
            <el-tag type="info" size="small">IP 封禁 {{ governance?.security?.ipBlocked ?? 0 }}</el-tag>
            <el-tag type="danger" size="small">登录失败 {{ governance?.security?.loginFailed ?? 0 }}</el-tag>
            <el-tag type="info" size="small">XSS {{ governance?.security?.xssIntercepted ?? 0 }}</el-tag>
            <el-tag type="info" size="small">防重放 {{ governance?.security?.antiReplayRejected ?? 0 }}</el-tag>
          </div>
          <el-table :data="sentinelRules" size="small" border max-height="220" class="rule-table">
            <el-table-column prop="resource" label="资源" min-width="180" show-overflow-tooltip />
            <el-table-column prop="grade" label="类型" width="90" />
            <el-table-column prop="count" label="阈值" width="80" />
            <el-table-column label="策略" width="120">
              <template #default="{ row }">{{ row.strategy || row.controlBehavior || '-' }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 网关流量 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-header">
              <span>网关 / API 流量</span>
              <el-tag :type="gatewayHealthType" size="small">
                {{ gatewayHealthText }}
              </el-tag>
            </div>
          </template>
          
          <div class="gateway-metrics">
            <div class="metric-card">
              <div class="metric-label">当前 QPS</div>
              <div class="metric-value">{{ (governance?.gateway?.currentQps ?? 0).toFixed(2) }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">当前 TPS</div>
              <div class="metric-value">{{ (governance?.gateway?.currentTps ?? 0).toFixed(2) }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">峰值 QPS</div>
              <div class="metric-value highlight">{{ (governance?.gateway?.peakQps ?? 0).toFixed(2) }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">成功率</div>
              <div class="metric-value" :class="successRateClass">
                {{ ((governance?.gateway?.successRate ?? 1) * 100).toFixed(2) }}%
              </div>
            </div>
          </div>

          <div class="response-time-section">
            <div class="section-title">响应时间分位数</div>
            <div class="response-metrics">
              <div class="response-item">
                <span class="response-label">P50</span>
                <span class="response-value">{{ formatMs(governance?.gateway?.p50ResponseTime ?? 0) }}</span>
              </div>
              <div class="response-item">
                <span class="response-label">P95</span>
                <span class="response-value warn">{{ formatMs(governance?.gateway?.p95ResponseTime ?? 0) }}</span>
              </div>
              <div class="response-item">
                <span class="response-label">P99</span>
                <span class="response-value danger">{{ formatMs(governance?.gateway?.p99ResponseTime ?? 0) }}</span>
              </div>
              <div class="response-item">
                <span class="response-label">累计请求</span>
                <span class="response-value">{{ governance?.gateway?.totalRequests ?? 0 }}</span>
              </div>
            </div>
          </div>

          <el-table :data="topPaths" size="small" border max-height="240" class="top-paths-table">
            <el-table-column prop="path" label="路径" min-width="180" show-overflow-tooltip />
            <el-table-column prop="method" label="方法" width="80" />
            <el-table-column prop="count" label="请求数" width="90" align="right" />
            <el-table-column prop="errorRate" label="错误率" width="90" align="right">
              <template #default="{ row }">
                <span :class="{ 'error-rate-high': row.errorRate > 0.05 }">
                  {{ (row.errorRate * 100).toFixed(2) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="平均耗时" width="100" align="right">
              <template #default="{ row }">{{ formatMs(row.avgTime) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 核心业务 -->
      <el-col :span="24">
        <el-card shadow="never" class="panel">
          <template #header>核心业务监控</template>
          <el-row :gutter="16">
            <el-col v-for="m in businessMetrics" :key="m.key" :xs="12" :sm="6" :md="4">
              <div class="biz-item">
                <div class="biz-value">{{ m.value }}</div>
                <div class="biz-name">{{ m.name }}</div>
              </div>
            </el-col>
          </el-row>
          <div ref="bizChartRef" class="chart chart-sm" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/**
 * 监控大盘脚本
 * - 轮询 /admin-api/v1/monitor/{overview,system,middleware,governance,business}
 * - 用 ECharts 渲染各板块图表；CPU/网络保留最近 30 个采样点绘制趋势
 * - 所有指标接口失败时置灰展示，不阻塞页面
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Refresh, Search } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  getMonitorBusiness,
  getMonitorGovernance,
  getMonitorMiddleware,
  getMonitorOverview,
  getMonitorSystem,
} from '@/api/monitor'
import type {
  BusinessMetricPoint,
  MonitorBusiness,
  MonitorGovernance,
  MonitorMiddleware,
  MonitorOverview,
  MonitorSystem,
} from '@/types'

/* ==================== 状态 ==================== */

const loading = ref(false)
const autoRefresh = ref(true)
const lastUpdate = ref('-')
const overview = ref<Partial<MonitorOverview>>({})
const system = ref<MonitorSystem | null>(null)
const middleware = ref<MonitorMiddleware | null>(null)
const governance = ref<MonitorGovernance | null>(null)
const business = ref<MonitorBusiness | null>(null)

/** 趋势历史（近 30 点） */
const cpuHistory = reactive<{ time: string; process: number; system: number }[]>([])
const netHistory = reactive<{ time: string; rx: number; tx: number }[]>([])

/** 定时器句柄 */
let timer: ReturnType<typeof setInterval> | null = null

/* ==================== 派生数据 ==================== */

const overviewCards = computed(() => [
  {
    label: '应用状态',
    value: overview.value.status === 'UP' ? '正常' : overview.value.status || '-',
    warn: overview.value.status !== 'UP' && !!overview.value.status,
  },
  { label: '运行时长', value: formatDuration(overview.value.uptimeSeconds) },
  { label: '堆内存', value: `${Math.round((overview.value.heapUsedPercent ?? 0) * 100)}%` },
  { label: 'CPU', value: `${Math.round((overview.value.cpuUsage ?? 0) * 100)}%` },
  { label: '线程数', value: overview.value.threadCount ?? '-' },
  { label: '活跃会话', value: Number.isNaN(overview.value.activeSessions as number) ? '-' : overview.value.activeSessions ?? '-' },
])

const mysqlPercent = computed(() => {
  const ratio = middleware.value?.mysql?.activeConnectionRatio ?? 0
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100)
})

const redisHealthy = computed(() => middleware.value?.redis?.available ?? false)

const mqAvailable = computed(() => middleware.value?.mq?.available ?? false)

const tracingAvailable = computed(() => middleware.value?.tracing?.available ?? false)

const sentinelRules = computed(() => [
  ...(governance.value?.sentinel?.flowRules || []),
  ...(governance.value?.sentinel?.degradeRules || []),
])

const topPaths = computed(() => governance.value?.gateway?.topPaths || [])

const businessMetrics = computed<BusinessMetricPoint[]>(() => business.value?.metrics || [])

const gatewayHealthType = computed(() => {
  const successRate = governance.value?.gateway?.successRate ?? 1
  if (successRate >= 0.99) return 'success'
  if (successRate >= 0.95) return 'warning'
  return 'danger'
})

const gatewayHealthText = computed(() => {
  const successRate = governance.value?.gateway?.successRate ?? 1
  if (successRate >= 0.99) return '健康'
  if (successRate >= 0.95) return '警告'
  return '异常'
})

const successRateClass = computed(() => {
  const rate = governance.value?.gateway?.successRate ?? 1
  if (rate >= 0.99) return 'success'
  if (rate >= 0.95) return 'warn'
  return 'danger'
})

const activeNetworks = computed(() => {
  return system.value?.network?.filter(n => n.available && n.up) || []
})

/* ==================== 图表 ==================== */

const router = useRouter()

const memChartRef = ref<HTMLElement>()
const cpuChartRef = ref<HTMLElement>()
const threadChartRef = ref<HTMLElement>()
const diskChartRef = ref<HTMLElement>()
const netChartRef = ref<HTMLElement>()
const netQualityChartRef = ref<HTMLElement>()
const poolChartRef = ref<HTMLElement>()
const sentinelChartRef = ref<HTMLElement>()
const bizChartRef = ref<HTMLElement>()
const charts: echarts.ECharts[] = []

/** 初始化并记录实例（便于统一 resize/dispose） */
function initChart(el: HTMLElement): echarts.ECharts {
  const chart = echarts.init(el)
  charts.push(chart)
  return chart
}

/** 折线图通用配色 */
function axisColor(): string {
  return document.documentElement.classList.contains('dark') ? '#a3a6ad' : '#606266'
}

/** 渲染 JVM 内存图 */
function renderMemChart(): void {
  if (!memChartRef.value) return
  const s = system.value?.jvm
  const chart = initChart(memChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '95%',
        progress: { show: true, width: 14 },
        axisLine: { lineStyle: { width: 14 } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { length: 8 },
        axisLabel: { show: false },
        detail: { formatter: '{value}%', fontSize: 20, color: axisColor() },
        data: [{ value: Math.round((s?.heapUsedPercent ?? 0) * 100), name: '堆内存' }],
        title: { show: true, color: axisColor(), fontSize: 12 },
      },
    ],
  })
}

/** 渲染 CPU 趋势图 */
function renderCpuChart(): void {
  if (!cpuChartRef.value) return
  const chart = initChart(cpuChartRef.value)
  const color = axisColor()
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['进程 CPU', '系统 CPU'], textStyle: { color } },
    grid: { left: 40, right: 16, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: cpuHistory.map((p) => p.time), axisLine: { lineStyle: { color } } },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
      axisLine: { lineStyle: { color } },
    },
    series: [
      { name: '进程 CPU', type: 'line', smooth: true, showSymbol: false, data: cpuHistory.map((p) => Math.round(p.process * 100)), areaStyle: { opacity: 0.12 } },
      { name: '系统 CPU', type: 'line', smooth: true, showSymbol: false, data: cpuHistory.map((p) => Math.round(p.system * 100)) },
    ],
  })
}

/** 渲染线程图 */
function renderThreadChart(): void {
  if (!threadChartRef.value) return
  const t = system.value?.threads
  const color = axisColor()
  const chart = initChart(threadChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { textStyle: { color } },
    xAxis: { type: 'category', data: ['存活', '峰值', '守护'], axisLine: { lineStyle: { color } } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color } } },
    series: [
      {
        type: 'bar',
        barWidth: '42%',
        itemStyle: { color: '#409eff' },
        data: [
          { value: t?.live ?? 0, name: '存活' },
          { value: t?.peak ?? 0, name: '峰值' },
          { value: t?.daemon ?? 0, name: '守护' },
        ],
      },
    ],
  })
}

/** 渲染磁盘图 */
function renderDiskChart(): void {
  if (!diskChartRef.value) return
  const disks = system.value?.disk || []
  const color = axisColor()
  const chart = initChart(diskChartRef.value)
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const arr = params as { name: string; value: number; seriesName: string }[]
        return arr.map((p) => `${p.name} · ${p.seriesName}：${formatBytes(p.value)}`).join('<br/>')
      },
    },
    legend: { textStyle: { color } },
    grid: { left: 50, right: 16, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: disks.map((d) => d.mount),
      axisLabel: { rotate: 30, color },
      axisLine: { lineStyle: { color } },
    },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatBytes(v) }, axisLine: { lineStyle: { color } } },
    series: [
      { name: '已用', type: 'bar', stack: 'disk', itemStyle: { color: '#e6a23c' }, data: disks.map((d) => d.total - d.free) },
      { name: '可用', type: 'bar', stack: 'disk', itemStyle: { color: '#67c23a' }, data: disks.map((d) => d.usable) },
    ],
  })
}

/** 渲染网络趋势图 */
function renderNetChart(): void {
  if (!netChartRef.value) return
  const chart = initChart(netChartRef.value)
  const color = axisColor()
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: unknown) => formatBytes(v as number) + '/s',
    },
    legend: { data: ['接收', '发送'], textStyle: { color } },
    grid: { left: 50, right: 16, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: netHistory.map((p) => p.time), axisLine: { lineStyle: { color } } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatBytes(v) }, axisLine: { lineStyle: { color } } },
    series: [
      { name: '接收', type: 'line', smooth: true, showSymbol: false, data: netHistory.map((p) => p.rx), areaStyle: { opacity: 0.12 } },
      { name: '发送', type: 'line', smooth: true, showSymbol: false, data: netHistory.map((p) => p.tx) },
    ],
  })
}

/** 渲染阻塞 IO 线程池图 */
function renderPoolChart(): void {
  if (!poolChartRef.value) return
  const pools = system.value?.blockingIo || {}
  const names = Object.keys(pools)
  const color = axisColor()
  const chart = initChart(poolChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 24 },
    xAxis: { type: 'category', data: names, axisLine: { lineStyle: { color } } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, axisLine: { lineStyle: { color } } },
    series: [
      {
        type: 'bar',
        barWidth: '40%',
        data: names.map((n) => Math.round((pools[n]?.saturation ?? 0) * 100)),
        itemStyle: { color: '#409eff' },
      },
    ],
  })
}

/** 渲染 Sentinel 治理图 */
function renderSentinelChart(): void {
  if (!sentinelChartRef.value) return
  const sec = governance.value?.security
  const color = axisColor()
  const chart = initChart(sentinelChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 24 },
    xAxis: {
      type: 'category',
      data: ['限流拒绝', '熔断打开', 'IP封禁', '登录失败', 'XSS', '防重放', '幂等拒绝'],
      axisLabel: { rotate: 20, color },
      axisLine: { lineStyle: { color } },
    },
    yAxis: { type: 'value', axisLine: { lineStyle: { color } } },
    series: [
      {
        type: 'bar',
        barWidth: '40%',
        data: [
          sec?.rateLimitRejected ?? 0,
          sec?.circuitBreakerOpened ?? 0,
          sec?.ipBlocked ?? 0,
          sec?.loginFailed ?? 0,
          sec?.xssIntercepted ?? 0,
          sec?.antiReplayRejected ?? 0,
          sec?.repeatSubmitRejected ?? 0,
        ],
        itemStyle: { color: '#f56c6c' },
      },
    ],
  })
}

/** 渲染核心业务趋势图 */
function renderBizChart(): void {
  if (!bizChartRef.value) return
  const trends = (business.value?.trends || []).filter((t) => t.points.length > 0)
  const color = axisColor()
  const chart = initChart(bizChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: trends.map((t) => t.name), textStyle: { color } },
    grid: { left: 40, right: 16, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: trends[0]?.points.map((p) => p.time) || [], axisLine: { lineStyle: { color } } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color } } },
    series: trends.map((t) => ({
      name: t.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: t.points.map((p) => p.value),
    })),
  })
}

/** 渲染网络质量图表 */
function renderNetQualityChart(): void {
  if (!netQualityChartRef.value || !activeNetworks.value.length) return
  const chart = initChart(netQualityChartRef.value)
  
  const names = activeNetworks.value.map(n => n.name)
  const errorRates = activeNetworks.value.map(n => (n.errorRate * 100).toFixed(3))
  const bandwidthUtils = activeNetworks.value.map(n => (n.bandwidthUtilization * 100).toFixed(2))
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['错误率 (%)', '带宽利用率 (%)'],
      textStyle: { color: axisColor() }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: axisColor() }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
        color: axisColor()
      }
    },
    series: [
      {
        name: '错误率 (%)',
        type: 'bar',
        data: errorRates,
        itemStyle: { color: '#f56c6c' }
      },
      {
        name: '带宽利用率 (%)',
        type: 'bar',
        data: bandwidthUtils,
        itemStyle: { color: '#409eff' }
      }
    ]
  })
}

/* ==================== 数据加载 ==================== */

/**
 * 汇总拉取全部监控数据并刷新图表。
 */
async function loadAll(): Promise<void> {
  loading.value = true
  try {
    const [ov, sys, mid, gov, biz] = await Promise.all([
      getMonitorOverview().catch(() => null),
      getMonitorSystem().catch(() => null),
      getMonitorMiddleware().catch(() => null),
      getMonitorGovernance().catch(() => null),
      getMonitorBusiness().catch(() => null),
    ])
    if (ov) overview.value = ov
    if (sys) system.value = sys
    if (mid) middleware.value = mid
    if (gov) governance.value = gov
    if (biz) business.value = biz

    // 追加趋势采样（CPU / 网络）
    if (sys?.cpu) {
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      cpuHistory.push({ time, process: sys.cpu.processUsage ?? 0, system: sys.cpu.systemUsage ?? 0 })
      if (cpuHistory.length > 30) cpuHistory.shift()
      const net = (sys.network || []).find((n) => n.available && n.up)
      if (net) {
        netHistory.push({ time, rx: net.rxBytesPerSec, tx: net.txBytesPerSec })
        if (netHistory.length > 30) netHistory.shift()
      }
    }

    renderAll()
    lastUpdate.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 渲染全部图表 */
function renderAll(): void {
  charts.forEach((c) => c.dispose())
  charts.length = 0
  renderMemChart()
  renderCpuChart()
  renderThreadChart()
  renderDiskChart()
  renderNetChart()
  renderNetQualityChart()
  renderPoolChart()
  renderSentinelChart()
  renderBizChart()
}

/* ==================== 工具函数 ==================== */

/** 字节格式化 */
function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 毫秒格式化 */
function formatMs(ms?: number): string {
  if (ms === undefined || Number.isNaN(ms)) return '-'
  if (ms < 1000) return `${ms.toFixed(1)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** 秒 → 可读时长 */
function formatDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return '-'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d}天${h}时` : h > 0 ? `${h}时${m}分` : `${m}分${Math.floor(seconds % 60)}秒`
}

/** 进度条颜色 */
function progressColor(percent: number): string {
  if (percent < 60) return '#67c23a'
  if (percent < 85) return '#e6a23c'
  return '#f56c6c'
}

function getErrorRateClass(errorRate: number): string {
  if (errorRate > 0.01) return 'danger'
  if (errorRate > 0.001) return 'warn'
  return 'success'
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

function openTraceQuery() {
  router.push('/monitor/trace')
}

/* ==================== 生命周期 ==================== */

onMounted(() => {
  loadAll()
  timer = setInterval(() => {
    if (autoRefresh.value) loadAll()
  }, 10000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  charts.forEach((c) => c.dispose())
  charts.length = 0
})
</script>

<style scoped>
/* 概览指标卡 */
.stat-row {
  margin-bottom: 12px;
}

.stat-card {
  text-align: center;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.stat-value.warn {
  color: var(--el-color-danger);
}

.stat-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* 刷新栏 */
.refresh-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.update-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 面板 */
.panel {
  margin-bottom: 16px;
}

.chart {
  height: 240px;
}

.chart-sm {
  height: 200px;
}

.panel-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 中间件面板 */
.middleware-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.kv-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kv-list > div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.kv-list span {
  color: var(--el-text-color-secondary);
}

.kv-list b {
  font-weight: 500;
  max-width: 60%;
}

.kv-list .ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 治理计数 */
.gov-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.rule-table {
  margin-top: 4px;
}

/* 网关汇总 */
.gateway-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.g-item {
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

.g-item span {
  color: var(--el-text-color-secondary);
}

.g-item b {
  font-size: 18px;
  font-weight: 600;
}

.c-warn {
  color: var(--el-color-warning);
}

.c-danger {
  color: var(--el-color-danger);
}

/* 核心业务 */
.biz-item {
  text-align: center;
  padding: 8px 0;
}

.biz-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.biz-name {
  margin-top: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gateway-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 20px;

  .metric-card {
    padding: 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    text-align: center;
    transition: all 0.3s;

    &:hover {
      background: var(--el-fill-color);
      transform: translateY(-2px);
    }

    .metric-label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);

      &.highlight {
        color: var(--el-color-primary);
      }

      &.success {
        color: var(--el-color-success);
      }

      &.warn {
        color: var(--el-color-warning);
      }

      &.danger {
        color: var(--el-color-danger);
      }
    }
  }
}

.response-time-section {
  margin-bottom: 20px;

  .section-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--el-text-color-regular);
  }

  .response-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 6px;

    .response-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .response-label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }

      .response-value {
        font-size: 16px;
        font-weight: 600;

        &.warn {
          color: var(--el-color-warning);
        }

        &.danger {
          color: var(--el-color-danger);
        }
      }
    }
  }
}

.top-paths-table {
  margin-top: 16px;

  .error-rate-high {
    color: var(--el-color-danger);
    font-weight: 600;
  }
}

.network-quality-meta {
  margin-top: 12px;

  .network-item {
    padding: 8px;
    margin-bottom: 8px;
    background: var(--el-fill-color-light);
    border-radius: 4px;

    .network-name {
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .network-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--el-text-color-secondary);

      b {
        font-weight: 600;
        margin-left: 4px;

        &.success {
          color: var(--el-color-success);
        }

        &.warn {
          color: var(--el-color-warning);
        }

        &.danger {
          color: var(--el-color-danger);
        }
      }
    }
  }
}

.middleware-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tracing-stats {
  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }

    .stat-value {
      font-weight: 600;
      font-size: 14px;

      &.success {
        color: var(--el-color-success);
      }

      &.danger {
        color: var(--el-color-danger);
      }
    }
  }
}

.trace-query-section {
  margin-top: 12px;
  text-align: center;
}

.middleware-placeholder {
  padding: 20px 0;
}
</style>
