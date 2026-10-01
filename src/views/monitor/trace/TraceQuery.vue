<!--
  链路追踪查询页（静态路由 /monitor/trace，hidden）
  ------------------------------------------------------------------
  按 Trace ID 查询分布式调用链路：
    - 链路概览（总耗时/服务数/Span 数）
    - Span 时间线（ECharts custom 系列绘制甘特图）
    - Span 详情表（展开查看 Tags 与 Logs）

  后端接口：
    - GET /admin-api/v1/monitor/traces/{traceId} - 按 ID 查询链路（见 api/monitor.ts）

  Props / Emits：无（路由页面）
-->
<template>
  <div class="trace-query">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <span>链路追踪查询</span>
          <el-button type="primary" size="small" @click="goToDashboard" :icon="Back">
            返回监控大盘
          </el-button>
        </div>
      </template>

      <el-form :model="queryForm" :inline="true" class="query-form">
        <el-form-item label="Trace ID">
          <el-input
            v-model="queryForm.traceId"
            placeholder="请输入 Trace ID"
            clearable
            style="width: 400px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" :loading="loading" :icon="Search">
            查询
          </el-button>
          <el-button @click="handleReset" :icon="RefreshLeft">重置</el-button>
        </el-form-item>
      </el-form>

      <div v-if="traceResult" class="trace-result">
        <div class="trace-overview">
          <el-descriptions title="链路概览" :column="4" border>
            <el-descriptions-item label="Trace ID">
              <el-tag>{{ traceResult.traceId }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="总耗时">
              {{ formatDuration(traceResult.duration) }}
            </el-descriptions-item>
            <el-descriptions-item label="服务数">
              {{ traceResult.serviceCount }}
            </el-descriptions-item>
            <el-descriptions-item label="Span 数">
              {{ traceResult.spanCount }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="trace-timeline">
          <div class="timeline-header">
            <h3>Span 时间线</h3>
          </div>
          <div ref="timelineChartRef" class="timeline-chart"></div>
        </div>

        <div class="trace-spans">
          <h3>Span 详情</h3>
          <el-table :data="traceResult.spans" border stripe>
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="span-detail">
                  <el-descriptions title="Span 详情" :column="2" border>
                    <el-descriptions-item label="Span ID">{{ row.spanId }}</el-descriptions-item>
                    <el-descriptions-item label="Parent Span ID">
                      {{ row.parentSpanId || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="开始时间" :span="2">
                      {{ formatTimestamp(row.startTime) }}
                    </el-descriptions-item>
                  </el-descriptions>
                  
                  <el-divider content-position="left">Tags</el-divider>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item
                      v-for="(value, key) in row.tags"
                      :key="key"
                      :label="key"
                    >
                      {{ value }}
                    </el-descriptions-item>
                  </el-descriptions>

                  <el-divider v-if="row.logs.length" content-position="left">Logs</el-divider>
                  <el-timeline v-if="row.logs.length">
                    <el-timeline-item
                      v-for="(log, index) in row.logs"
                      :key="index"
                      :timestamp="formatTimestamp(log.timestamp)"
                    >
                      <el-descriptions :column="1" border size="small">
                        <el-descriptions-item
                          v-for="(value, key) in log.fields"
                          :key="key"
                          :label="key"
                        >
                          {{ value }}
                        </el-descriptions-item>
                      </el-descriptions>
                    </el-timeline-item>
                  </el-timeline>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="serviceName" label="服务名" width="150" />
            <el-table-column prop="operationName" label="操作名" min-width="200" show-overflow-tooltip />
            <el-table-column label="耗时" width="120" align="right">
              <template #default="{ row }">
                {{ formatDuration(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column label="开始时间" width="180">
              <template #default="{ row }">
                {{ formatTimestamp(row.startTime) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-empty v-else description="请输入 Trace ID 进行查询" :image-size="200" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 链路追踪查询页逻辑
 * - 查询指定 Trace ID 的调用链并以「概览 + 时间线 + Span 表」三段展示
 * - 时间线使用 ECharts custom 系列按 Span 起止时间绘制甘特图
 */
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RefreshLeft, Back } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getTraceById } from '@/api/monitor'
import type { TraceQueryResult } from '@/types'
import * as echarts from 'echarts'

/** ========== 查询状态 ========== */

const router = useRouter()
/** 查询请求进行中 */
const loading = ref(false)
/** 查询表单（Trace ID） */
const queryForm = ref({ traceId: '' })
/** 链路查询结果（null 表示未查询） */
const traceResult = ref<TraceQueryResult | null>(null)
/** 时间线图表挂载容器 */
const timelineChartRef = ref<HTMLElement>()

/** ========== 查询与导航 ========== */

/**
 * 执行链路查询：按 Trace ID 拉取链路数据，成功后渲染时间线
 */
async function handleQuery() {
  if (!queryForm.value.traceId.trim()) {
    ElMessage.error('请输入 Trace ID')
    return
  }

  loading.value = true
  try {
    const result = await getTraceById(queryForm.value.traceId)
    traceResult.value = result
    ElMessage.success('查询成功')

    // 等 DOM 渲染出图表容器后再初始化 ECharts
    nextTick(() => {
      renderTimelineChart()
    })
  } catch (error) {
    ElMessage.error('查询失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

/**
 * 重置查询：清空 Trace ID 与查询结果
 */
function handleReset() {
  queryForm.value.traceId = ''
  traceResult.value = null
}

/**
 * 返回监控大盘
 */
function goToDashboard() {
  router.push('/monitor/dashboard')
}

/** ========== Span 时间线渲染 ========== */

/**
 * 渲染 Span 甘特时间线
 *
 * 以最早 Span 的开始时间为原点，将每个 Span 映射为
 * [开始偏移, 结束偏移] 的 custom 矩形，按服务名着色。
 */
function renderTimelineChart() {
  if (!timelineChartRef.value || !traceResult.value) return

  const chart = echarts.init(timelineChartRef.value)
  const spans = traceResult.value.spans

  // 按开始时间排序，以最早 Span 为时间原点
  const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime)
  const minTime = sortedSpans[0].startTime

  const data = sortedSpans.map((span, index) => ({
    name: `${span.serviceName}: ${span.operationName}`,
    value: [
      index,
      span.startTime - minTime,
      span.startTime - minTime + span.duration,
      span.duration
    ],
    itemStyle: {
      color: getSpanColor(span.serviceName)
    }
  }))
  
  chart.setOption({
    tooltip: {
      formatter: (paramsData: any) => {
        const span = sortedSpans[paramsData.value[0]]
        const duration = paramsData.value[3]
        return `
          <div style="padding: 8px;">
            <div><b>${span.serviceName}</b></div>
            <div>${span.operationName}</div>
            <div>耗时: ${formatDuration(duration)}</div>
          </div>
        `
      }
    },
    grid: {
      left: '15%',
      right: '5%',
      top: '5%',
      bottom: '5%'
    },
    xAxis: {
      type: 'value',
      name: '时间 (ms)',
      axisLabel: {
        formatter: '{value} ms'
      }
    },
    yAxis: {
      type: 'category',
      data: sortedSpans.map((_, i) => i),
      axisLabel: {
        formatter: (value: number) => {
          const span = sortedSpans[value]
          return `${span.serviceName}\n${span.operationName}`.substring(0, 30)
        }
      }
    },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const categoryIndex = api.value(0)
        const start = api.coord([api.value(1), categoryIndex])
        const end = api.coord([api.value(2), categoryIndex])
        const height = api.size([0, 1])[1] * 0.6
        
        return {
          type: 'rect',
          shape: {
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height
          },
          style: api.style()
        }
      },
      encode: {
        x: [1, 2],
        y: 0
      },
      data: data
    }]
  })
}

/**
 * 按服务名生成稳定的散列配色（同一服务颜色一致）
 * @param serviceName 服务名
 * @returns 十六进制颜色值
 */
function getSpanColor(serviceName: string): string {
  const colors = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
  ]
  // 简单字符串散列，映射到调色板下标
  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = serviceName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * 格式化耗时（自动选择 μs/ms/s 单位）
 * @param ms 耗时（毫秒）
 * @returns 可读的耗时文案
 */
function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/**
 * 格式化时间戳（后端为微秒，转换为毫秒后本地化输出）
 * @param timestamp 微秒级时间戳
 * @returns 本地化时间文案
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp / 1000).toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.trace-query {
  padding: 20px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .query-form {
    margin-bottom: 20px;
  }

  .trace-result {
    margin-top: 20px;

    .trace-overview {
      margin-bottom: 24px;
    }

    .trace-timeline {
      margin-bottom: 24px;

      .timeline-header {
        margin-bottom: 12px;
      }

      .timeline-chart {
        height: 400px;
      }
    }

    .trace-spans {
      h3 {
        margin-bottom: 12px;
      }
    }

    .span-detail {
      padding: 16px;
      background: var(--el-fill-color-light);
    }
  }
}
</style>
