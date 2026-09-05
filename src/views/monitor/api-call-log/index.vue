<!--
  API 调用日志
  ------------------------------------------------------------------
  对外 HTTP 调用日志（sys_api_call_log）分页查询：服务/方法/路径/响应码/
  状态/耗时/错误/TraceId 回溯，支撑第三方接口联调与排障。
-->
<template>
  <el-card shadow="never">
    <el-form inline class="search-form">
      <el-form-item label="目标服务">
        <el-input
          v-model="query.serviceName"
          placeholder="如 wechat"
          clearable
          style="width: 160px"
          @keyup.enter="search"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="query.status"
          placeholder="全部状态"
          clearable
          style="width: 150px"
        >
          <el-option
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="TraceId">
        <el-input
          v-model="query.traceId"
          placeholder="链路ID（模糊）"
          clearable
          style="width: 200px"
          @keyup.enter="search"
        />
      </el-form-item>
      <el-form-item label="请求路径">
        <el-input
          v-model="query.path"
          placeholder="路径（模糊）"
          clearable
          style="width: 180px"
          @keyup.enter="search"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="serviceName" label="服务" min-width="120" show-overflow-tooltip />
      <el-table-column prop="method" label="方法" width="80" />
      <el-table-column prop="path" label="路径" min-width="200" show-overflow-tooltip />
      <el-table-column prop="responseStatus" label="响应码" width="90" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="100">
        <template #default="{ row }">
          {{ row.executionTime != null ? `${row.executionTime}ms` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="错误" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.errorMsg ? row.errorMsg.slice(0, 40) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="traceId" label="TraceId" min-width="180" show-overflow-tooltip />
      <el-table-column label="调用时间" width="170">
        <template #default="{ row }">
          {{ row.callTime || row.createTime || '-' }}
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
/**
 * API 调用日志脚本
 * - 分页 + 筛选（serviceName/status/traceId/path）
 * - 状态 0=成功 1=客户端错误 2=服务端错误 3=网络异常
 */
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { listApiCallLogs } from '@/api/monitor'
import type { ApiCallLog } from '@/types'

/** 调用状态选项（value 对应后端 status 字段） */
const STATUS_OPTIONS = [
  { value: 0, label: '成功' },
  { value: 1, label: '客户端错误' },
  { value: 2, label: '服务端错误' },
  { value: 3, label: '网络异常' },
] as const

/** 状态 → el-tag 类型映射 */
const STATUS_TAG_MAP: Record<number, 'success' | 'warning' | 'danger' | 'info'> = {
  0: 'success',
  1: 'warning',
  2: 'danger',
  3: 'info',
}

/** 状态 → 中文标签 */
function statusLabel(status: number): string {
  return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? String(status)
}

/** 状态 → el-tag type */
function statusTagType(status: number): 'success' | 'warning' | 'danger' | 'info' {
  return STATUS_TAG_MAP[status] ?? 'info'
}

/** 加载态 */
const loading = ref(false)
/** 列表与总数 */
const list = ref<ApiCallLog[]>([])
const total = ref(0)
/** 查询参数（后端 serviceName/status 精确，traceId/path 模糊） */
const query = reactive({
  page: 1,
  size: 20,
  serviceName: '',
  status: undefined as number | undefined,
  traceId: '',
  path: '',
})

/**
 * 分页拉取 API 调用日志。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listApiCallLogs({
      page: query.page,
      size: query.size,
      serviceName: query.serviceName || undefined,
      status: query.status,
      traceId: query.traceId || undefined,
      path: query.path || undefined,
    })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 查询 */
function search(): void {
  query.page = 1
  fetchList()
}

/** 重置 */
function reset(): void {
  query.serviceName = ''
  query.status = undefined
  query.traceId = ''
  query.path = ''
  search()
}

/** 分页变化 */
function onPageChange(page: number, size: number): void {
  query.page = page
  query.size = size
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
/* 查询区与分页区 */
.search-form {
  margin-bottom: 8px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
