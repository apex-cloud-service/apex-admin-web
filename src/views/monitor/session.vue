<!--
  在线会话管理（方案批次 A4）
  ------------------------------------------------------------------
  契约（认证中心 SessionRouter，前缀 /auth/v1/sessions）：
  - GET    /online            - 在线会话列表（裸数组，后端不分页）
  - GET    /statistics        - 在线用户统计（totalOnlineUsers）
  - DELETE /{sessionId}       - 终止单个会话（sessionId 为会话唯一标识，非数字主键）
  - GET    /user/{userId}     - 查询指定用户会话
  - DELETE /user/{userId}     - 批量终止该用户全部会话
  权限：全部端点要求管理员角色（后端 @RequireAdminRole）。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>在线会话</span>
        <div class="header-meta">
          <el-tag type="success" size="small">在线会话数：{{ statistics?.totalOnlineUsers ?? '-' }}</el-tag>
          <el-button :icon="Refresh" size="small" @click="loadAll">刷新</el-button>
        </div>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="关键字">
        <el-input
          v-model="keyword"
          placeholder="用户ID / 设备 / IP"
          clearable
          style="width: 220px"
          :prefix-icon="Search"
        />
      </el-form-item>
      <el-form-item label="用户ID">
        <el-input v-model="userQueryId" placeholder="查询指定用户会话" clearable style="width: 180px" />
        <el-button class="ml-8" @click="handleQueryUserSessions">查询用户会话</el-button>
        <el-button type="danger" plain @click="handleTerminateUserSessions">批量下线</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="filteredSessions" border stripe>
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column prop="sessionId" label="会话标识" min-width="200" show-overflow-tooltip />
      <el-table-column prop="deviceType" label="设备类型" width="120" />
      <el-table-column prop="deviceId" label="设备标识" min-width="160" show-overflow-tooltip />
      <el-table-column prop="ipAddress" label="IP 地址" width="140" />
      <el-table-column prop="location" label="位置" width="140" show-overflow-tooltip />
      <el-table-column label="最近活跃" width="170">
        <template #default="{ row }">{{ row.lastActiveAt || '-' }}</template>
      </el-table-column>
      <el-table-column label="过期时间" width="170">
        <template #default="{ row }">{{ row.expiresAt || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleTerminate(row)">强制下线</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredSessions.length === 0" description="暂无在线会话" />

    <!-- 指定用户会话 -->
    <el-dialog v-model="userSessionsVisible" :title="`用户 ${userQueryId} 的会话`" width="760px">
      <el-table v-loading="userSessionsLoading" :data="userSessions" border stripe size="small">
        <el-table-column prop="sessionId" label="会话标识" min-width="180" show-overflow-tooltip />
        <el-table-column prop="deviceType" label="设备类型" width="110" />
        <el-table-column prop="clientIp" label="IP" width="130" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="最近活跃" width="170">
          <template #default="{ row }">{{ row.lastActiveAt || '-' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!userSessionsLoading && userSessions.length === 0" description="该用户没有活跃会话" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 在线会话管理脚本
 * - 在线列表后端不分页，前端按关键字过滤
 * - 强制下线按会话唯一标识；批量下线按用户 ID
 */
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { Refresh, Search } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  getOnlineStatistics,
  listOnlineSessions,
  listUserSessions,
  terminateSession,
  terminateUserSessions,
} from '@/api/session'
import type { AuthSession, OnlineSession, OnlineStatistics } from '@/types'

/** 列表加载中 */
const loading = ref(false)
/** 在线会话列表 */
const sessions = ref<OnlineSession[]>([])
/** 在线统计 */
const statistics = ref<OnlineStatistics | null>(null)
/** 关键字过滤（用户ID / 设备 / IP） */
const keyword = ref('')
/** 指定用户 ID 输入 */
const userQueryId = ref('')

/** 指定用户会话弹窗 */
const userSessionsVisible = ref(false)
const userSessionsLoading = ref(false)
const userSessions = ref<AuthSession[]>([])

/** 关键字过滤后的在线会话 */
const filteredSessions = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return sessions.value
  return sessions.value.filter((item) =>
    [item.userId, item.sessionId, item.deviceId, item.deviceName, item.ipAddress]
      .filter((value) => value !== undefined && value !== null)
      .some((value) => String(value).toLowerCase().includes(kw)),
  )
})

/** 加载在线会话列表与统计 */
async function loadAll(): Promise<void> {
  loading.value = true
  try {
    const [list, stats] = await Promise.all([
      listOnlineSessions(),
      getOnlineStatistics().catch(() => null),
    ])
    sessions.value = list || []
    statistics.value = stats
  } catch (error) {
    showError(error, '加载在线会话失败')
  } finally {
    loading.value = false
  }
}

/** 强制下线单个会话 */
async function handleTerminate(row: OnlineSession): Promise<void> {
  if (!row.sessionId) {
    ElMessage.warning('该会话缺少会话标识，无法单独终止')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认强制下线用户 ${row.userId ?? '-'} 的会话「${row.sessionId}」？该会话令牌将立即失效。`,
      '危险操作确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await terminateSession(row.sessionId)
    ElMessage.success('会话已终止')
    loadAll()
  } catch (error) {
    showError(error, '终止会话失败')
  }
}

/** 查询指定用户的会话 */
async function handleQueryUserSessions(): Promise<void> {
  const userId = Number(userQueryId.value)
  if (!Number.isInteger(userId) || userId <= 0) {
    ElMessage.warning('请输入有效的用户 ID')
    return
  }
  userSessionsVisible.value = true
  userSessionsLoading.value = true
  try {
    userSessions.value = (await listUserSessions(userId)) || []
  } catch (error) {
    showError(error, '查询用户会话失败')
  } finally {
    userSessionsLoading.value = false
  }
}

/** 批量下线指定用户的全部会话 */
async function handleTerminateUserSessions(): Promise<void> {
  const userId = Number(userQueryId.value)
  if (!Number.isInteger(userId) || userId <= 0) {
    ElMessage.warning('请输入有效的用户 ID')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认批量下线用户 ${userId} 的全部会话？该用户所有设备都需重新登录。`,
      '危险操作确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await terminateUserSessions(userId)
    ElMessage.success('已批量下线该用户全部会话')
    loadAll()
  } catch (error) {
    showError(error, '批量下线失败')
  }
}

onMounted(loadAll)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.query-form {
  margin-bottom: 8px;
}

.ml-8 {
  margin-left: 8px;
}
</style>
