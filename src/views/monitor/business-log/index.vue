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
/**
 * 业务日志查询页逻辑
 * - 整合登录/操作/API 三类日志的统一查询（统一分页口径 PageResponse）
 * - 默认查询最近 7 天，支持类型/用户名/模块/时间范围筛选
 */
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { queryBusinessLogs, type BusinessLog } from '@/api/log'
import { showError } from '@/utils/request'

/** ========== 查询状态 ========== */

/** 查询请求进行中 */
const loading = ref(false)
/** 日志列表（当前页） */
const logList = ref<BusinessLog[]>([])
/** 数据总条数 */
const total = ref(0)
/** 时间范围（yyyy-MM-dd HH:mm:ss 字符串） */
const timeRange = ref<string[]>([])
/** 查询条件（类型/用户名/模块/分页） */
const query = reactive({
  logType: '',
  username: '',
  module: '',
  page: 1,
  size: 20,
})

// 挂载时默认查询最近 7 天日志
onMounted(() => {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  timeRange.value = [formatDateTime(sevenDaysAgo), formatDateTime(now)]
  search()
})

/** ========== 查询操作 ========== */

/**
 * 拉取日志列表：合并查询条件与时间范围，回填列表与总数
 */
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

/**
 * 执行查询：重置回第一页后拉取
 */
function search(): void {
  query.page = 1
  fetchList()
}

/**
 * 重置查询条件并回到默认的最近 7 天范围
 */
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

/**
 * 分页变更（Pagination 组件回调）
 * @param page 新页码
 * @param size 新每页条数
 */
function onPageChange(page: number, size: number): void {
  query.page = page
  query.size = size
  fetchList()
}

/** ========== 展示辅助 ========== */

/**
 * 日志类型显示名称
 * @param type 日志类型标识（login/operation/api）
 * @returns 中文名称（未知类型原样返回）
 */
function getTypeName(type: string): string {
  const names: Record<string, string> = {
    login: '登录',
    operation: '操作',
    api: 'API',
  }
  return names[type] || type
}

/**
 * 日志类型对应的标签颜色
 * @param type 日志类型标识
 * @returns el-tag 类型
 */
function getTypeTag(type: string): 'success' | 'warning' | 'info' | '' {
  const tags: Record<string, 'success' | 'warning' | 'info' | ''> = {
    login: 'success',
    operation: 'warning',
    api: 'info',
  }
  return tags[type] || ''
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm:ss（时间范围控件的 value-format）
 * @param date 日期对象
 * @returns 格式化后的字符串
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 格式化后端 LocalDateTime 字符串（去 T、截断到秒）
 * @param timestamp ISO 时间字符串
 * @returns 可读时间文案（空值返回 '-'）
 */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '-'
  // LocalDateTime 带 T 与毫秒：替换 T 并截断到秒展示
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
