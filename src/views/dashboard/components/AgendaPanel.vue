<!--
  我的事项聚合面板
  ------------------------------------------------------------------
  工作流待办 / 办公审批 / 站内信 / 近期日程 / 系统通知五域展示与跳转；
  仅展示与标记已读，不提供办理操作（办理均在原域页面完成）。
-->
<template>
  <div class="agenda-panel">
    <div class="agenda-toolbar">
      <span class="agenda-title">我的事项</span>
      <el-button size="small" :loading="refreshing" @click="handleRefresh">刷新</el-button>
    </div>
    <el-row :gutter="16">
      <el-col v-for="section in sections" :key="section.domain" :xs="24" :md="12">
        <el-card shadow="never" class="agenda-card">
          <template #header>
            <div class="section-header">
              <span>{{ section.label }}</span>
              <span class="total-hint">{{ section.totalHint }}</span>
            </div>
          </template>
          <el-skeleton v-if="section.loading" :rows="4" animated />
          <div v-else-if="section.error" class="section-error">
            <span>{{ section.error }}</span>
            <el-button size="small" type="primary" plain @click="handleRetry(section.domain)">重试</el-button>
          </div>
          <template v-else>
            <EmptyState v-if="section.items.length === 0" description="暂无事项" :image-size="60" />
            <template v-else>
              <div
                v-for="item in section.items"
                :key="`${item.kind}-${item.id ?? item.title}`"
                class="agenda-item"
                :class="{ clickable: !!item.href }"
                @click="goItem(item)"
              >
                <span v-if="item.unread" class="unread-dot" />
                <div class="item-main">
                  <div class="item-title">{{ item.title }}</div>
                  <div v-if="item.subtitle || item.time" class="item-sub">
                    {{ [item.subtitle, item.time].filter(Boolean).join(' · ') }}
                  </div>
                  <div v-if="item.actionError" class="item-error">{{ item.actionError }}</div>
                </div>
                <el-button
                  v-if="item.domain === 'notification' && item.unread"
                  size="small"
                  link
                  @click.stop="markRead(item)"
                >
                  标记已读
                </el-button>
                <el-button v-else-if="item.href" size="small" link type="primary" @click.stop="goItem(item)">
                  {{ item.hrefLabel }}
                </el-button>
              </div>
              <!-- 文案不带条数：条数由 useAgenda.PAGE_SIZE 决定，写死数字会漂移 -->
              <div v-if="section.truncated" class="truncated-hint">仅展示部分事项，请到对应页面查看全部</div>
            </template>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/**
 * 我的事项面板逻辑
 * - 数据来自 useAgenda（五域并行、失败隔离、区块级降级）
 * - 条目行点击与右侧链接同一跳转；系统通知无独立页面不跳转
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { useAgenda } from '@/composables/useAgenda'
import type { AgendaDomain, AgendaItem } from '@/types'

const router = useRouter()
const { sections, loadAll, reload, markRead } = useAgenda()

/** 手动刷新进行中 */
const refreshing = ref(false)

// 挂载时加载一次，不做自动轮询
onMounted(() => {
  loadAll()
})

/** 条目跳转（与行点击同一目标） */
function goItem(item: AgendaItem): void {
  if (item.href) router.push(item.href)
}

/** 手动刷新全部区块（失败隔离行为与首次加载一致） */
async function handleRefresh(): Promise<void> {
  refreshing.value = true
  try {
    await loadAll()
  } finally {
    refreshing.value = false
  }
}

/** 单域失败重试 */
function handleRetry(domain: AgendaDomain): void {
  reload(domain)
}
</script>

<style scoped>
.agenda-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.agenda-title {
  font-size: 16px;
  font-weight: 600;
}

.agenda-card {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.section-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-color-warning);
}

.agenda-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.agenda-item:last-of-type {
  border-bottom: none;
}

.agenda-item.clickable {
  cursor: pointer;
}

.agenda-item.clickable:hover .item-title {
  color: var(--el-color-primary);
}

.unread-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-danger);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-error {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.truncated-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
