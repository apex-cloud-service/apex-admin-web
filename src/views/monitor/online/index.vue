<!--
  在线用户
  ------------------------------------------------------------------
  当前在线会话列表（基于 Redis 会话索引）与强退操作。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="userId" label="用户 ID" width="90" />
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="ip" label="登录 IP" min-width="130" />
      <el-table-column prop="loginTime" label="登录时间" min-width="170" />
      <el-table-column prop="lastActiveTime" label="最后活跃" min-width="170" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="revoke(row)">强退</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 在线用户脚本
 * - 拉取在线会话列表
 * - 强退：调用后端会话撤销接口（用户下次请求被拒绝）
 */
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import { listOnlineUsers } from '@/api/monitor'
import { revokeUserSessions } from '@/api/user'
import type { OnlineUser } from '@/types'

/** 状态 */
const loading = ref(false)
/** 在线用户列表 */
const list = ref<OnlineUser[]>([])

/**
 * 拉取在线用户列表。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listOnlineUsers()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 强退用户会话（二次确认）。
 * @param row 在线用户
 */
async function revoke(row: OnlineUser): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认强退用户「${row.username}」？其所有会话将失效`, '提示', { type: 'warning' })
  } catch {
    return
  }
  const userId = row.userId ?? row.id
  if (!userId) return
  try {
    await revokeUserSessions(userId)
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
</style>
