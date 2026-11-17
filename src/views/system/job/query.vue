<!--
  定时任务分页查询
  ------------------------------------------------------------------
  定时任务分页查询页面，支持按任务名称、分组和状态筛选。
  后端接口：GET /admin-api/v1/jobs/page（api/system.ts pageJobs）
-->
<template>
  <el-card shadow="never">
    <!-- 查询表单 -->
    <el-form :model="queryForm" :inline="true" class="query-form">
      <el-form-item label="任务名称">
        <el-input
          v-model="queryForm.jobName"
          placeholder="请输入任务名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="任务分组">
        <el-input
          v-model="queryForm.jobGroup"
          placeholder="请输入任务分组"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="任务状态">
        <el-select
          v-model="queryForm.status"
          placeholder="请选择状态"
          clearable
          style="width: 150px"
        >
          <el-option label="禁用" :value="0" />
          <el-option label="启用" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      style="margin-top: 16px"
    >
      <el-table-column prop="id" label="任务ID" width="80" align="center" />
      <el-table-column prop="jobName" label="任务名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="jobGroup" label="任务分组" min-width="100" />
      <el-table-column prop="invokeTarget" label="调用目标" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <code style="font-size: 12px">{{ row.invokeTarget }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="cronExpression" label="Cron表达式" min-width="140">
        <template #default="{ row }">
          <code style="font-size: 12px">{{ row.cronExpression }}</code>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <el-pagination
      v-model:current-page="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      :background="true"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 16px; justify-content: flex-end"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="任务详情"
      width="600px"
    >
      <el-descriptions :column="1" border v-if="detailDialog.data">
        <el-descriptions-item label="任务ID">
          {{ detailDialog.data.id }}
        </el-descriptions-item>
        <el-descriptions-item label="任务名称">
          {{ detailDialog.data.jobName }}
        </el-descriptions-item>
        <el-descriptions-item label="任务分组">
          {{ detailDialog.data.jobGroup || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="调用目标">
          <code>{{ detailDialog.data.invokeTarget }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="Cron表达式">
          <code>{{ detailDialog.data.cronExpression }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="执行策略">
          {{ detailDialog.data.misfirePolicy === 1 ? '立即执行' : detailDialog.data.misfirePolicy === 2 ? '放弃执行' : '默认' }}
        </el-descriptions-item>
        <el-descriptions-item label="并发执行">
          {{ detailDialog.data.concurrent === 1 ? '禁止' : '允许' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailDialog.data.status === 1 ? 'success' : 'info'">
            {{ detailDialog.data.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注">
          {{ detailDialog.data.remark || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ detailDialog.data.createTime || '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import { pageJobs } from '@/api/system'
import type { SysJob } from '@/types'

const queryForm = reactive({
  jobName: '',
  jobGroup: '',
  status: undefined as number | undefined
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
})

const tableData = ref<SysJob[]>([])

const loading = ref(false)

const detailDialog = reactive({
  visible: false,
  data: null as SysJob | null
})

/**
 * 获取定时任务列表
 */
async function fetchList() {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      jobName: queryForm.jobName || undefined,
      jobGroup: queryForm.jobGroup || undefined,
      status: queryForm.status
    }
    
    const res = await pageJobs(params)
    
    // 后端返回的是 PageResponse<SysJob>，字段为 list/total/pageNum/pageSize
    tableData.value = res.list || []
    pagination.total = res.total || 0
    pagination.pageNum = res.pageNum || 1
    pagination.pageSize = res.pageSize || 20
  } catch (err) {
    showError(err, '查询定时任务失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理查询按钮点击
 */
function handleQuery() {
  pagination.pageNum = 1
  fetchList()
}

/**
 * 处理重置按钮点击
 */
function handleReset() {
  queryForm.jobName = ''
  queryForm.jobGroup = ''
  queryForm.status = undefined
  pagination.pageNum = 1
  fetchList()
}

/**
 * 处理每页条数变化
 */
function handleSizeChange(newSize: number) {
  pagination.pageSize = newSize
  pagination.pageNum = 1
  fetchList()
}

/**
 * 处理当前页变化
 */
function handleCurrentChange(newPage: number) {
  pagination.pageNum = newPage
  fetchList()
}

/**
 * 查看任务详情
 */
function viewDetail(row: SysJob) {
  detailDialog.data = { ...row }
  detailDialog.visible = true
}

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.query-form {
  margin-bottom: 0;
}

:deep(.el-pagination) {
  display: flex;
  justify-content: flex-end;
}
</style>
