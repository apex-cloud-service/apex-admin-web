<!--
  业务日志统一查询
  ------------------------------------------------------------------
  整合登录日志、操作日志、API调用日志的统一查询视图
-->
<template>
  <el-card shadow="never">
    <el-form inline class="search-form">
      <el-form-item label="日志类型">
        <el-select v-model="query.logType" placeholder="请选择" clearable style="width: 150px">
          <el-option label="登录日志" value="login" />
          <el-option label="操作日志" value="operation" />
          <el-option label="API调用" value="api" />
        </el-select>
      </el-form-item>

      <el-form-item label="用户名">
        <el-input
          v-model="query.username"
          placeholder="请输入用户名"
          clearable
          style="width: 160px"
          @keyup.enter="search"
        />
      </el-form-item>

      <el-form-item label="模块名">
        <el-input
          v-model="query.module"
          placeholder="请输入模块名"
          clearable
          style="width: 160px"
          @keyup.enter="search"
        />
      </el-form-item>

      <el-form-item label="时间范围">
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 380px"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="logList" border stripe>
      <el-table-column label="日志类型" prop="logType" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTag(row.logType)" size="small">
            {{ getTypeName(row.logType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" prop="timestamp" width="180">
        <template #default="{ row }">
          {{ formatTimestamp(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="用户名" prop="username" width="120" />
      <el-table-column label="模块" prop="module" width="120" show-overflow-tooltip />
      <el-table-column label="操作" prop="operation" min-width="180" show-overflow-tooltip />
      <el-table-column label="IP地址" prop="ipAddress" width="140" />
      <el-table-column label="状态" prop="status" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { queryBusinessLogs, type BusinessLog } from '@/api/log'
import { showError } from '@/utils/request'

const loading = ref(false)
const logList = ref<BusinessLog[]>([])
const total = ref(0)
const timeRange = ref<string[]>([])
const query = reactive({
  logType: '',
  username: '',
  module: '',
  page: 1,
  size: 20,
})

onMounted(() => {
  // 默认查询最近7天
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  timeRange.value = [formatDateTime(sevenDaysAgo), formatDateTime(now)]
  search()
})

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await queryBusinessLogs({
      ...query,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    })
    logList.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

function search(): void {
  query.page = 1
  fetchList()
}

function reset(): void {
  query.logType = ''
  query.username = ''
  query.module = ''
  query.page = 1
  query.size = 20
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  timeRange.value = [formatDateTime(sevenDaysAgo), formatDateTime(now)]
  search()
}

function onPageChange(page: number, size: number): void {
  query.page = page
  query.size = size
  fetchList()
}

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    login: '登录',
    operation: '操作',
    api: 'API',
  }
  return names[type] || type
}

function getTypeTag(type: string): 'success' | 'warning' | 'info' | '' {
  const tags: Record<string, 'success' | 'warning' | 'info' | ''> = {
    login: 'success',
    operation: 'warning',
    api: 'info',
  }
  return tags[type] || ''
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '-'
  // 后端返回的是 LocalDateTime 字符串，可能需要格式化
  return timestamp.replace('T', ' ').substring(0, 19)
}
</script>

<style scoped>
.search-form {
  margin-bottom: 8px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
