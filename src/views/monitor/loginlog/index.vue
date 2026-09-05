<!--
  登录日志
  ------------------------------------------------------------------
  登录事件回溯（sys_login_log）：关键字/状态筛选 + 分页。
-->
<template>
  <el-card shadow="never">
    <el-form inline class="search-form">
      <el-form-item label="账号">
        <el-input v-model="query.username" placeholder="登录账号（模糊）" clearable style="width: 200px" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="结果">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="成功" :value="0" />
          <el-option label="失败" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="ip" label="IP 地址" min-width="130" />
      <el-table-column label="结果" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'danger'">{{ row.status === 0 ? '成功' : '失败' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="信息" min-width="180" show-overflow-tooltip />
      <el-table-column prop="loginTime" label="登录时间" width="170" />
    </el-table>

    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 登录日志脚本
 * - 分页 + 关键字 + 结果筛选
 */
import { onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { listLoginLogs } from '@/api/monitor'
import type { LoginLog } from '@/types'

/** 状态 */
const loading = ref(false)
/** 列表与总数 */
const list = ref<LoginLog[]>([])
const total = ref(0)
/** 查询参数（后端 username 模糊 + status 精确） */
const query = reactive({ page: 1, size: 20, username: '', status: undefined as number | undefined })

/**
 * 分页拉取登录日志。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listLoginLogs({ page: query.page, size: query.size, username: query.username || undefined, status: query.status })
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
  query.username = ''
  query.status = undefined
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
