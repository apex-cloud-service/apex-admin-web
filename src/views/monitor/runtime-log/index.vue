<!--
  运行时日志查询
  ------------------------------------------------------------------
  基于 Loki 的应用运行时日志查询：级别/Logger/消息/线程/异常堆栈/TraceId
-->
<template>
  <el-card shadow="never">
    <el-form inline class="search-form">
      <el-form-item label="日志级别">
        <el-select v-model="query.level" placeholder="请选择" clearable style="width: 120px">
          <el-option label="ERROR" value="ERROR" />
          <el-option label="WARN" value="WARN" />
          <el-option label="INFO" value="INFO" />
          <el-option label="DEBUG" value="DEBUG" />
        </el-select>
      </el-form-item>

      <el-form-item label="Logger">
        <el-input
          v-model="query.logger"
          placeholder="请输入logger名称"
          clearable
          style="width: 200px"
          @keyup.enter="search"
        />
      </el-form-item>

      <el-form-item label="消息关键词">
        <el-input
          v-model="query.message"
          placeholder="请输入消息关键词"
          clearable
          style="width: 200px"
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
      <el-table-column label="时间" prop="timestamp" width="180" />
      <el-table-column label="级别" prop="level" width="80">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Logger" prop="logger" min-width="250" show-overflow-tooltip />
      <el-table-column label="消息" prop="message" min-width="300" show-overflow-tooltip />
      <el-table-column label="线程" prop="thread" width="150" show-overflow-tooltip />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <!-- 详情对话框 -->
  <el-dialog v-model="dialogVisible" title="日志详情" width="800px">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="时间">{{ currentLog.timestamp }}</el-descriptions-item>
      <el-descriptions-item label="级别">{{ currentLog.level }}</el-descriptions-item>
      <el-descriptions-item label="Logger">{{ currentLog.logger }}</el-descriptions-item>
      <el-descriptions-item label="线程">{{ currentLog.thread }}</el-descriptions-item>
      <el-descriptions-item label="消息">{{ currentLog.message }}</el-descriptions-item>
      <el-descriptions-item v-if="currentLog.exception" label="异常堆栈">
        <pre style="max-height: 300px; overflow-y: auto; margin: 0">{{ currentLog.exception }}</pre>
      </el-descriptions-item>
      <el-descriptions-item v-if="currentLog.traceId" label="TraceID">
        {{ currentLog.traceId }}
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 运行时日志查询页逻辑
 * - 按级别/Logger/关键词/时间范围查询 Loki 日志（无分页，默认最近 1 小时）
 */
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { queryRuntimeLogs, type RuntimeLog } from '@/api/log'
import { showError } from '@/utils/request'

/** ========== 查询状态 ========== */

/** 查询请求进行中 */
const loading = ref(false)
/** 日志列表（无分页，一次返回） */
const logList = ref<RuntimeLog[]>([])
/** 时间范围（yyyy-MM-dd HH:mm:ss 字符串） */
const timeRange = ref<string[]>([])
/** 查询条件（级别/Logger/关键词/条数上限） */
const query = reactive({
  level: '',
  logger: '',
  message: '',
  limit: 100,
})

/** ========== 详情弹窗 ========== */

/** 详情弹窗是否可见 */
const dialogVisible = ref(false)
/** 当前查看的日志（含异常堆栈/TraceId） */
const currentLog = ref<RuntimeLog>({} as RuntimeLog)

// 挂载时默认查询最近 1 小时的日志
onMounted(() => {
  // 默认查询最近1小时
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  timeRange.value = [formatDateTime(oneHourAgo), formatDateTime(now)]
  search()
})

/** ========== 查询操作 ========== */

/**
 * 拉取日志列表：合并查询条件与时间范围，失败统一提示
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await queryRuntimeLogs({
      ...query,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    })
    logList.value = data || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 执行查询（保持当前条件）
 */
function search(): void {
  fetchList()
}

/**
 * 重置查询条件并回到默认的最近 1 小时范围
 */
function reset(): void {
  query.level = ''
  query.logger = ''
  query.message = ''
  query.limit = 100
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  timeRange.value = [formatDateTime(oneHourAgo), formatDateTime(now)]
  search()
}

/**
 * 打开日志详情弹窗
 * @param row 目标日志行
 */
function handleDetail(row: RuntimeLog): void {
  currentLog.value = row
  dialogVisible.value = true
}

/**
 * 日志级别对应的标签颜色
 * @param level 日志级别
 * @returns el-tag 类型
 */
function getLevelType(level: string): 'success' | 'info' | 'warning' | 'danger' | '' {
  const types: Record<string, 'success' | 'info' | 'warning' | 'danger' | ''> = {
    ERROR: 'danger',
    WARN: 'warning',
    INFO: 'info',
    DEBUG: '',
  }
  return types[level] || ''
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
</script>

<style scoped>
.search-form {
  margin-bottom: 8px;
}
</style>
