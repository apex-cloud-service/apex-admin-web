<!--
  工作流实例列表组件
  
  展示和管理所有工作流实例，提供以下功能：
  - 按状态筛选流程实例
  - 展示实例的基本信息（ID、标题、编码、状态、发起人、时间等）
  - 分页展示
  - 查看实例详情
  
  @module views/workflow/monitor/InstanceList
-->
<template>
  <div class="workflow-instance-list">
    <el-form :inline="true" :model="queryParams" style="margin-bottom: 20px">
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 150px">
          <el-option label="运行中" value="RUNNING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已拒绝" value="REJECTED" />
          <el-option label="已取消" value="CANCELLED" />
        </el-select>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="handleQuery">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="流程标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="processCode" label="流程编码" width="150" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="initiatorName" label="发起人" width="120" />
      <el-table-column prop="startTime" label="开始时间" width="180" />
      <el-table-column prop="endTime" label="结束时间" width="180">
        <template #default="{ row }">
          {{ row.endTime || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleViewDetail(row.id)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="queryParams.pageNum"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; justify-content: flex-end"
      @size-change="loadList"
      @current-change="loadList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { listWorkflowInstances } from '@/api/workflow'
import type { WorkflowInstance, InstanceQueryParams } from '@/types/workflow'

const router = useRouter()

/** 查询参数 */
const queryParams = ref<InstanceQueryParams>({
  pageNum: 1,
  pageSize: 10,
  status: undefined
})

/** 流程实例列表 */
const list = ref<WorkflowInstance[]>([])
/** 总数 */
const total = ref(0)
/** 加载状态 */
const loading = ref(false)

/**
 * 加载流程实例列表
 */
const loadList = async () => {
  loading.value = true
  try {
    const res = await listWorkflowInstances(queryParams.value)
    list.value = res.records
    total.value = res.total
  } catch (error) {
    console.error('加载流程实例列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 处理查询操作
 * 重置到第一页并重新加载列表
 */
const handleQuery = () => {
  queryParams.value.pageNum = 1
  loadList()
}

/**
 * 处理重置操作
 * 清空查询条件并重新加载列表
 */
const handleReset = () => {
  queryParams.value = {
    pageNum: 1,
    pageSize: 10,
    status: undefined
  }
  loadList()
}

/**
 * 处理查看详情操作
 * @param id - 流程实例ID
 */
const handleViewDetail = (id: number) => {
  router.push(`/workflow/instances/${id}`)
}

/**
 * 获取状态标签类型
 * @param status - 流程状态
 * @returns Element Plus标签类型
 */
const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    DRAFT: 'info',
    RUNNING: '',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info',
    TERMINATED: 'warning'
  }
  return map[status] || ''
}

/**
 * 获取状态显示文本
 * @param status - 流程状态
 * @returns 状态的中文显示文本
 */
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    RUNNING: '运行中',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    TERMINATED: '已终止'
  }
  return map[status] || status
}

onMounted(() => {
  loadList()
})
</script>
