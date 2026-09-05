<template>
  <div class="workflow-statistics">
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #ecf5ff; color: #409eff">
              <el-icon :size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">今日发起</div>
              <div class="stat-value">{{ statistics.todayStarted }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #f0f9ff; color: #67c23a">
              <el-icon :size="32"><Loading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">运行中</div>
              <div class="stat-value">{{ statistics.runningTotal }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #fef0f0; color: #f56c6c">
              <el-icon :size="32"><Bell /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">待办任务</div>
              <div class="stat-value">{{ statistics.pendingTaskTotal }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c">
              <el-icon :size="32"><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">平均完成时长</div>
              <div class="stat-value">{{ formatDuration(statistics.avgCompletionSeconds) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>流程状态分布</span>
          </template>
          <div ref="pieChartRef" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>流程趋势</span>
              <el-radio-group v-model="trendDays" size="small" @change="loadTrend">
                <el-radio-button :value="7">近7天</el-radio-button>
                <el-radio-button :value="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="lineChartRef" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TrendCharts, Loading, Bell, Timer } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getWorkflowStatistics, getWorkflowTrend } from '@/api/workflow'
import type { WorkflowStatistics, WorkflowTrend } from '@/types/workflow'

const statistics = ref<WorkflowStatistics>({
  todayStarted: 0,
  runningTotal: 0,
  pendingTaskTotal: 0,
  avgCompletionSeconds: 0,
  statusDistribution: {}
})

const trend = ref<WorkflowTrend>({
  dates: [],
  startedCounts: [],
  completedCounts: []
})

const trendDays = ref(7)
const pieChartRef = ref<HTMLDivElement>()
const lineChartRef = ref<HTMLDivElement>()
let pieChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null

const loadStatistics = async () => {
  try {
    statistics.value = await getWorkflowStatistics()
    renderPieChart()
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadTrend = async () => {
  try {
    trend.value = await getWorkflowTrend(trendDays.value)
    renderLineChart()
  } catch (error) {
    console.error('加载趋势数据失败:', error)
  }
}

const renderPieChart = () => {
  if (!pieChartRef.value) return
  
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }
  
  const statusMap: Record<string, string> = {
    RUNNING: '运行中',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消'
  }
  
  const data = Object.entries(statistics.value.statusDistribution).map(([key, value]) => ({
    name: statusMap[key] || key,
    value
  }))
  
  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      bottom: '0%',
      left: 'center'
    },
    series: [
      {
        name: '流程状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data
      }
    ]
  })
}

const renderLineChart = () => {
  if (!lineChartRef.value) return
  
  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value)
  }
  
  lineChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['发起数量', '完成数量']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.value.dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '发起数量',
        type: 'line',
        smooth: true,
        data: trend.value.startedCounts,
        itemStyle: { color: '#409eff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      },
      {
        name: '完成数量',
        type: 'line',
        smooth: true,
        data: trend.value.completedCounts,
        itemStyle: { color: '#67c23a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
          ])
        }
      }
    ]
  })
}

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0h 0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

onMounted(() => {
  loadStatistics()
  loadTrend()
  
  window.addEventListener('resize', () => {
    pieChart?.resize()
    lineChart?.resize()
  })
})

onUnmounted(() => {
  pieChart?.dispose()
  lineChart?.dispose()
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}
</style>
