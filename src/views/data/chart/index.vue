<!--
  图表查询页面
  ------------------------------------------------------------------
  功能说明：
  - 图表列表查询（支持分页）
  - 多维度筛选（关键词、类型、分类、状态）
  - 图表数据查询与展示（基于 ECharts）
  - 图表新增/编辑/删除
  - 状态管理（草稿/正常）
  - 支持折线图、柱状图、饼图、散点图、雷达图
  
  权限要求：
  - 新增：data:chart:create
  - 编辑：data:chart:edit
  - 删除：data:chart:delete
  
  技术要点：
  - 使用 ECharts 5.x 渲染图表
  - 动态配置图表类型和数据
  - 响应式图表尺寸
  - 图表实例生命周期管理
-->
<template>
  <el-card shadow="never">
    <!-- ========== 查询区 ========== -->
    <el-form inline :model="queryForm" class="query-form">
      <el-form-item label="关键词">
        <el-input v-model="queryForm.keyword" placeholder="图表名称" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item label="图表类型">
        <el-select v-model="queryForm.chartType" placeholder="全部" clearable style="width: 150px">
          <el-option label="折线图" value="line" />
          <el-option label="柱状图" value="bar" />
          <el-option label="饼图" value="pie" />
          <el-option label="散点图" value="scatter" />
          <el-option label="雷达图" value="radar" />
        </el-select>
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="queryForm.category" placeholder="全部" clearable style="width: 150px">
          <el-option label="业务" value="business" />
          <el-option label="技术" value="tech" />
          <el-option label="运营" value="operation" />
          <el-option label="财务" value="finance" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="草稿" :value="0" />
          <el-option label="正常" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- ========== 工具栏 ========== -->
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="handleCreate" v-permission="'data:chart:create'">新增图表</el-button>
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <!-- ========== 列表区 ========== -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="200" show-overflow-tooltip />
      <el-table-column prop="chartName" label="图表名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ getChartTypeName(row.chartType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="creatorName" label="创建者" width="120" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '正常' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="查看次数" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="handleViewChart(row)">查看图表</el-button>
          <el-button link type="warning" :icon="Edit" @click="handleEdit(row)" v-permission="'data:chart:edit'">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" v-permission="'data:chart:delete'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ========== 分页区 ========== -->
    <Pagination :total="total" @change="handlePageChange" />

    <!-- ========== 新增/编辑对话框 ========== -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="图表名称" prop="chartName">
          <el-input v-model="form.chartName" placeholder="请输入图表名称" />
        </el-form-item>
        <el-form-item label="图表类型" prop="chartType">
          <el-select v-model="form.chartType" placeholder="请选择图表类型" style="width: 100%">
            <el-option label="折线图" value="line" />
            <el-option label="柱状图" value="bar" />
            <el-option label="饼图" value="pie" />
            <el-option label="散点图" value="scatter" />
            <el-option label="雷达图" value="radar" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="业务" value="business" />
            <el-option label="技术" value="tech" />
            <el-option label="运营" value="operation" />
            <el-option label="财务" value="finance" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入图表描述" />
        </el-form-item>
        <el-form-item label="数据源">
          <el-input v-model="form.dataSource" placeholder="请输入数据源地址" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="0">草稿</el-radio>
            <el-radio :value="1">正常</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========== 图表展示对话框 ========== -->
    <el-dialog v-model="chartDialogVisible" title="图表详情" width="1000px" @close="handleChartDialogClose">
      <el-descriptions v-if="currentChart" :column="2" border style="margin-bottom: 20px">
        <el-descriptions-item label="图表名称">{{ currentChart.chartName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getChartTypeName(currentChart.chartType) }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ currentChart.category }}</el-descriptions-item>
        <el-descriptions-item label="创建者">{{ currentChart.creatorName }}</el-descriptions-item>
        <el-descriptions-item label="查看次数">{{ currentChart.viewCount }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentChart.createTime }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentChart.description }}</el-descriptions-item>
      </el-descriptions>
      <div v-loading="chartLoading" ref="chartRef" class="chart-container" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 图表查询页面脚本
 * ------------------------------------------------------------------
 * 实现图表的 CRUD 操作、ECharts 图表渲染、状态管理等功能
 */
import { ref, reactive, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Plus, Edit, Delete, View } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import Pagination from '@/components/Pagination.vue'
import { listCharts, createChart, updateChart, deleteChart, getChartDetail, getChartData } from '@/api/chart'
import type { Chart, ChartData } from '@/types'
import { showError } from '@/utils/request'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

/** 列表加载状态 */
const loading = ref(false)
/** 图表列表数据 */
const list = ref<Chart[]>([])
/** 总条数 */
const total = ref(0)

/** 查询表单 */
const queryForm = reactive({
  keyword: '',
  chartType: '',
  category: '',
  status: undefined as number | undefined,
  page: 1,
  size: 20
})

/** 新增/编辑对话框显示状态 */
const dialogVisible = ref(false)
/** 对话框标题 */
const dialogTitle = ref('')
/** 提交中状态 */
const submitting = ref(false)
/** 表单引用 */
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive({
  id: '',
  chartName: '',
  chartType: '',
  category: '',
  description: '',
  dataSource: '',
  status: 1
})

/** 表单校验规则 */
const rules: FormRules = {
  chartName: [{ required: true, message: '请输入图表名称', trigger: 'blur' }],
  chartType: [{ required: true, message: '请选择图表类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

/** 图表展示对话框显示状态 */
const chartDialogVisible = ref(false)
/** 图表加载状态 */
const chartLoading = ref(false)
/** 当前查看的图表信息 */
const currentChart = ref<Chart | null>(null)
/** 当前查看图表的 ID（主题切换重绘用） */
const currentChartId = ref<string>('')
/** 图表容器 DOM 引用 */
const chartRef = ref<HTMLElement>()
/** ECharts 实例（需在组件销毁时手动释放） */
let chartInstance: echarts.ECharts | null = null

/**
 * 获取图表类型显示名称
 * @param type 图表类型编码
 * @returns 图表类型显示名称
 */
const getChartTypeName = (type: string): string => {
  const map: Record<string, string> = {
    line: '折线图',
    bar: '柱状图',
    pie: '饼图',
    scatter: '散点图',
    radar: '雷达图'
  }
  return map[type] || type
}

/**
 * 加载图表列表
 */
const fetchList = async (): Promise<void> => {
  loading.value = true
  try {
    const res = await listCharts(queryForm)
    list.value = res.list
    total.value = res.total
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 处理查询按钮点击
 */
const handleQuery = (): void => {
  queryForm.page = 1
  fetchList()
}

/**
 * 处理重置按钮点击
 */
const handleReset = (): void => {
  queryForm.keyword = ''
  queryForm.chartType = ''
  queryForm.category = ''
  queryForm.status = undefined
  queryForm.page = 1
  fetchList()
}

/**
 * 处理分页变化
 * @param page 当前页码
 * @param size 每页条数
 */
const handlePageChange = (page: number, size: number): void => {
  queryForm.page = page
  queryForm.size = size
  fetchList()
}

/**
 * 处理新增按钮点击
 */
const handleCreate = (): void => {
  dialogTitle.value = '新增图表'
  Object.assign(form, {
    id: '',
    chartName: '',
    chartType: '',
    category: '',
    description: '',
    dataSource: '',
    status: 1
  })
  dialogVisible.value = true
}

/**
 * 处理编辑按钮点击
 * @param row 图表行数据
 */
const handleEdit = async (row: Chart): Promise<void> => {
  dialogTitle.value = '编辑图表'
  try {
    const detail = await getChartDetail(row.id)
    Object.assign(form, {
      id: detail.id,
      chartName: detail.chartName,
      chartType: detail.chartType,
      category: detail.category,
      description: detail.description,
      dataSource: detail.dataSource,
      status: detail.status
    })
    dialogVisible.value = true
  } catch (error) {
    showError(error)
  }
}

/**
 * 处理查看图表按钮点击
 * @param row 图表行数据
 */
const handleViewChart = async (row: Chart): Promise<void> => {
  chartLoading.value = true
  currentChartId.value = row.id
  try {
    currentChart.value = await getChartDetail(row.id)
    chartDialogVisible.value = true
    // 对话框打开期间监听窗口尺寸变化，关闭时由 handleChartDialogClose 移除
    window.addEventListener('resize', handleChartResize)
    setTimeout(async () => {
      await renderChart(row.id)
      chartLoading.value = false
    }, 100)
  } catch (error) {
    showError(error)
    chartLoading.value = false
  }
}

/**
 * 渲染 ECharts 图表
 * @param chartId 图表ID
 */
const renderChart = async (chartId: string): Promise<void> => {
  if (!chartRef.value) return
  
  try {
    const chartData: ChartData = await getChartData(chartId)
    
    if (chartInstance) {
      chartInstance.dispose()
    }
    
    chartInstance = echarts.init(chartRef.value)
    
    const option: echarts.EChartsOption = {
      title: {
        text: chartData.title || '',
        left: 'center'
      },
      tooltip: chartData.tooltip || { trigger: 'axis' },
      legend: {
        data: chartData.legend || [],
        bottom: 10
      },
      grid: chartData.grid || { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: chartData.xAxis ? {
        type: 'category',
        data: chartData.xAxis,
        boundaryGap: chartData.chartType !== 'line'
      } : undefined,
      yAxis: {
        type: 'value'
      },
      series: (chartData.series || []) as echarts.SeriesOption[]
    }
    
    if (chartData.chartType === 'pie') {
      delete option.xAxis
      delete option.yAxis
      option.series = (chartData.series || []).map(s => ({
        ...s,
        radius: ['40%', '70%'],
        center: ['50%', '50%']
      })) as echarts.SeriesOption[]
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    showError(error)
  }
}

/**
 * 处理删除按钮点击
 * @param row 图表行数据
 */
const handleDelete = (row: Chart): void => {
  ElMessageBox.confirm(`确定删除图表「${row.chartName}」吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteChart(row.id)
      ElMessage.success('删除成功')
      fetchList()
    } catch (error) {
      showError(error)
    }
  }).catch(() => {})
}

/**
 * 处理表单提交
 */
const handleSubmit = async (): Promise<void> => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (form.id) {
        await updateChart(form.id, {
          chartName: form.chartName,
          chartType: form.chartType,
          category: form.category,
          description: form.description,
          dataSource: form.dataSource,
          status: form.status
        })
        ElMessage.success('更新成功')
      } else {
        await createChart({
          chartName: form.chartName,
          chartType: form.chartType,
          category: form.category,
          description: form.description,
          dataSource: form.dataSource,
          status: form.status
        })
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } catch (error) {
      showError(error)
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 处理新增/编辑对话框关闭
 */
const handleDialogClose = (): void => {
  formRef.value?.resetFields()
}

/**
 * 处理图表展示对话框关闭
 * 释放 ECharts 实例资源并移除 resize 监听
 */
const handleChartDialogClose = (): void => {
  window.removeEventListener('resize', handleChartResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

/** 窗口尺寸变化时自适应当前图表 */
const handleChartResize = (): void => {
  chartInstance?.resize()
}

// 主题切换后重绘当前图表（沿用渲染函数内的配色逻辑）
watch(
  () => appStore.theme,
  () => {
    if (chartDialogVisible.value && currentChartId.value) {
      renderChart(currentChartId.value)
    }
  },
)

/**
 * 组件销毁前释放 ECharts 实例资源
 */
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

fetchList()
</script>

<style scoped>
.query-form {
  margin-bottom: 16px;
}

.toolbar {
  margin-bottom: 16px;
}

.chart-container {
  width: 100%;
  height: 500px;
}
</style>
