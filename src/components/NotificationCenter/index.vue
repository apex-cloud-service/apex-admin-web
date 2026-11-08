<!--
  通知中心（顶栏铃铛 + 未读角标 + 通知面板）
  ------------------------------------------------------------------
  - 消费 system 域 /api/v1/notifications/** 契约（列表/未读数/已读标记）
  - 实时性：SSE 推送（utils/notification-stream）触发刷新，60 秒轮询兜底
  - 与站内信铃铛（office 域 /api/v1/messages/**）互不影响
-->
<template>
  <el-popover v-model:visible="panelVisible" trigger="click" :width="360" placement="bottom-end" @show="loadList">
    <template #reference>
      <el-tooltip content="通知中心" placement="bottom">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notification-badge">
          <el-icon class="notification-btn"><ChatDotRound /></el-icon>
        </el-badge>
      </el-tooltip>
    </template>

    <div class="notification-panel">
      <div class="panel-header">
        <span class="panel-title">通知中心</span>
        <el-button
          v-if="unreadCount > 0"
          link
          type="primary"
          size="small"
          :loading="markAllLoading"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-button>
      </div>
      <div v-loading="listLoading" class="panel-body">
        <el-empty v-if="notifications.length === 0 && !listLoading" description="暂无通知" :image-size="60" />
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: item.readAt === null }"
          @click="handleRead(item)"
        >
          <div class="item-dot" />
          <div class="item-main">
            <div class="item-content">{{ item.content }}</div>
            <div class="item-time">{{ formatTime(item.createTime) }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
/**
 * 通知中心组件脚本
 * - 未读角标：60 秒轮询 + SSE 推送触发刷新（失败静默避免打扰）
 * - 列表：面板打开时拉取最近 10 条；点击未读项标记已读
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type SystemNotification,
} from '@/api/notification'
import { subscribeNotificationPush } from '@/utils/notification-stream'

/** 面板开关（el-popover 受控） */
const panelVisible = ref(false)
/** 未读通知数（角标展示） */
const unreadCount = ref(0)
/** 最近通知列表 */
const notifications = ref<SystemNotification[]>([])
/** 列表加载中 */
const listLoading = ref(false)
/** 全部已读执行中 */
const markAllLoading = ref(false)
/** 未读数轮询定时器 */
let unreadTimer: ReturnType<typeof setInterval> | undefined
/** SSE 推送退订函数 */
let unsubscribePush: (() => void) | undefined

/**
 * 拉取一次未读通知数。
 */
async function refreshUnread(): Promise<void> {
  try {
    unreadCount.value = await getNotificationUnreadCount()
  } catch {
    unreadCount.value = 0
  }
}

/**
 * 拉取最近一页通知列表。
 */
async function loadList(): Promise<void> {
  listLoading.value = true
  try {
    const page = await listNotifications({ page: 1, size: 10 })
    notifications.value = page.list
  } catch {
    notifications.value = []
  } finally {
    listLoading.value = false
  }
}

/**
 * 标记单条通知已读（仅未读项触发请求）。
 * @param item 通知条目
 */
async function handleRead(item: SystemNotification): Promise<void> {
  if (item.readAt !== null) return
  try {
    await markNotificationRead(item.id)
    item.readAt = new Date().toISOString()
    refreshUnread()
  } catch {
    /* 失败保持未读，不打断浏览 */
  }
}

/**
 * 全部标记已读后刷新角标与列表。
 */
async function handleMarkAllRead(): Promise<void> {
  markAllLoading.value = true
  try {
    await markAllNotificationsRead()
    refreshUnread()
    loadList()
  } catch {
    /* 失败静默，下次轮询恢复 */
  } finally {
    markAllLoading.value = false
  }
}

/**
 * 时间展示：ISO 字符串转 "YYYY-MM-DD HH:mm"。
 * @param value 后端时间字符串
 */
function formatTime(value: string): string {
  return (value || '').replace('T', ' ').slice(0, 16)
}

onMounted(() => {
  refreshUnread()
  unreadTimer = setInterval(refreshUnread, 60000)
  // 订阅通知推送：收到 SSE 事件立即刷新角标与打开中的列表
  unsubscribePush = subscribeNotificationPush(() => {
    refreshUnread()
    if (panelVisible.value) loadList()
  })
})

onBeforeUnmount(() => {
  if (unreadTimer) clearInterval(unreadTimer)
  unsubscribePush?.()
})
</script>

<style scoped>
/* 角标容器与图标：与站内信铃铛同规格 */
.notification-badge {
  display: flex;
  align-items: center;
}

.notification-btn {
  font-size: 18px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.notification-btn:hover {
  color: var(--el-color-primary);
}

/* 面板结构 */
.notification-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.panel-body {
  min-height: 80px;
  max-height: 360px;
  overflow-y: auto;
}

/* 通知条目：未读高亮圆点 */
.notification-item {
  display: flex;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.item-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background-color: var(--el-border-color);
}

.notification-item.unread .item-dot {
  background-color: var(--el-color-primary);
}

.item-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.notification-item.unread .item-content {
  font-weight: 600;
}

.item-time {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
