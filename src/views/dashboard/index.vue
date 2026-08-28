<!--
  工作台（仪表盘）
  ------------------------------------------------------------------
  展示欢迎信息与系统概览指标卡片 + 访问趋势折线图（ECharts）。
  指标数据来源：身份信息与静态示例，真实接口接入点见注释。
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
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 访问趋势图 -->
    <el-card shadow="never" class="chart-card">
      <template #header>近 7 日接口调用趋势（示例数据）</template>
      <div ref="chartRef" class="chart" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 工作台脚本
 * - 指标卡片：由后端身份与菜单数据派生（接入真实指标时替换 statCards）
 * - 趋势图：ECharts 折线图示例（对接 apex_api_* 指标接口后替换数据源）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

/** 图表容器引用 */
const chartRef = ref<HTMLElement>()
/** ECharts 实例（卸载时销毁） */
let chart: echarts.ECharts | null = null

/**
 * 概览指标卡片。
 * 注：当前为身份派生数据；接入真实统计接口后替换为接口返回值。
 */
const statCards = computed(() => [
  { label: '角色数', value: userStore.identity?.roles?.length || '-' },
  { label: '权限码', value: userStore.permissions.length },
  { label: '系统状态', value: '正常' },
  { label: '当前版本', value: 'v1.1.4' },
])

/**
 * 渲染近 7 日访问趋势折线图（示例数据，颜色随主题适配）。
 */
function renderChart(): void {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  const isDark = document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#a3a6ad' : '#606266'
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: axisColor } },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: axisColor } },
    },
    series: [
      {
        name: '调用量',
        type: 'line',
        smooth: true,
        data: [320, 480, 390, 620, 540, 410, 360],
        areaStyle: { opacity: 0.15 },
      },
    ],
  })
}

/** 窗口尺寸变化时自适应图表 */
function handleResize(): void {
  chart?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

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

.stat-label {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

/* 图表容器 */
.chart {
  height: 320px;
}
</style>
