<!--
  在线用户
  ------------------------------------------------------------------
  当前在线会话列表（基于 Redis 会话索引）与强退操作。
  后端返回 PageResponse<OnlineUserDTO>，字段：
  id/username/nickName/phone/lastLoginIp/lastHeartbeatTime。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="用户 ID" width="100" />
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="nickName" label="昵称" min-width="120" />
      <el-table-column prop="phone" label="手机号" min-width="130" />
      <el-table-column prop="lastLoginIp" label="最后登录 IP" min-width="140" />
      <el-table-column prop="lastHeartbeatTime" label="最后心跳" min-width="170" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="revoke(row)">强退</el-button>
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
 * 在线用户脚本
 * - 分页拉取在线会话列表
 * - 强退：调用后端会话撤销接口（用户下次请求被拒绝）
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { listOnlineUsers } from '@/api/monitor'
import { revokeUserSessions } from '@/api/user'
import type { OnlineUser } from '@/types'

/** 状态 */
const loading = ref(false)
/** 在线用户列表 */
const list = ref<OnlineUser[]>([])
/** 总数 */
const total = ref(0)
/** 分页参数 */
const query = reactive({ page: 1, size: 20 })

/**
 * 分页拉取在线用户列表。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listOnlineUsers({ page: query.page, size: query.size })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 分页变化回调 */
function onPageChange(page: number, size: number): void {
  query.page = page
  query.size = size
  fetchList()
}

/**
 * 强退用户会话（二次确认）。
 * @param row 在线用户
 */
async function revoke(row: OnlineUser): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认强退用户「${row.nickName || row.username}」？其所有会话将失效`, '提示', { type: 'warning' })
  } catch {
    return
  }
  if (!row.id) return
  try {
    await revokeUserSessions(row.id)
    ElMessage.success('已强退')
    fetchList()
  } catch (error) {
    showError(error)
  }
}

onMounted(fetchList)
</script>

<style scoped>
/* 工具栏 */
.toolbar {
  margin-bottom: 12px;
}

/* 分页区右对齐 */
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
