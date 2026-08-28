<!--
  操作审计日志
  ------------------------------------------------------------------
  操作审计（sys_operation_log）分页查询：操作人/模块/状态/耗时回溯。
-->
<template>
  <el-card shadow="never">
    <el-form inline class="search-form">
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="操作人/模块/URL" clearable style="width: 220px" @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="operatorName" label="操作人" min-width="110" />
      <el-table-column prop="module" label="模块" min-width="110" />
      <el-table-column prop="operationType" label="类型" min-width="90" />
      <el-table-column prop="description" label="操作描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="requestUrl" label="请求地址" min-width="180" show-overflow-tooltip />
      <el-table-column label="结果" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
            {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="90">
        <template #default="{ row }">{{ row.duration != null ? `${row.duration}ms` : '-' }}</template>
      </el-table-column>
      <el-table-column prop="createTime" label="操作时间" width="170" />
    </el-table>

    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 操作审计日志脚本
 * - 分页 + 关键字筛选（操作人/模块/URL）
 */
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { listAuditLogs } from '@/api/monitor'
import type { AuditLog } from '@/types'

/** 状态 */
const loading = ref(false)
/** 列表与总数 */
const list = ref<AuditLog[]>([])
const total = ref(0)
/** 查询参数 */
const query = reactive({ page: 1, size: 20, keyword: '' })

/**
 * 分页拉取审计日志。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listAuditLogs({ page: query.page, size: query.size, keyword: query.keyword })
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
  query.keyword = ''
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
