<!--
  文件分享匿名兑换页（/share?token=xxx）
  ------------------------------------------------------------------
  用途：接收者无需登录，凭创建方下发的分享令牌兑换元信息并下载文件。
  令牌即凭证：仅存创建方一次性下发，后端只存 SHA-256 摘要，遗失不可找回。
  过期/撤销/租户停用/文件删除时后端统一拒绝（NOT_FOUND/FORBIDDEN）。
-->
<template>
  <div class="share-page">
    <el-card class="share-card">
      <template #header>
        <span>文件分享兑换</span>
      </template>
      <el-form label-width="90px" @submit.prevent>
        <el-form-item label="分享令牌">
          <el-input v-model="token" placeholder="请输入分享令牌" clearable @keyup.enter="handleExchange" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleExchange">兑换</el-button>
          <el-button type="success" :disabled="!meta" :loading="downloading" @click="handleDownload">
            下载文件
          </el-button>
        </el-form-item>
      </el-form>

      <el-descriptions v-if="meta" :column="2" border>
        <el-descriptions-item label="文件名">{{ meta.originalName }}</el-descriptions-item>
        <el-descriptions-item label="大小">{{ formatSize(meta.fileSize) }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ meta.contentType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ meta.expireAt || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="输入分享令牌并点击兑换" :image-size="80" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 文件分享匿名兑换页脚本
 * - 从路由 query 读取 token 自动兑换；也可手动粘贴令牌
 * - exchange/download 均为匿名端点，无需登录态
 */
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { showError } from '@/utils/request'
import { downloadFileShare, exchangeFileShare, type FileShareExchangeResult } from '@/api/file-share'

const route = useRoute()

/** 分享令牌 */
const token = ref(String(route.query.token || ''))
/** 兑换结果元信息 */
const meta = ref<FileShareExchangeResult | null>(null)
/** 兑换加载中 */
const loading = ref(false)
/** 下载加载中 */
const downloading = ref(false)

/** 兑换分享元信息 */
async function handleExchange(): Promise<void> {
  if (!token.value.trim()) {
    ElMessage.warning('请输入分享令牌')
    return
  }
  loading.value = true
  try {
    meta.value = await exchangeFileShare(token.value.trim())
  } catch (error) {
    meta.value = null
    showError(error, '兑换失败：令牌无效、已过期或已撤销')
  } finally {
    loading.value = false
  }
}

/** 凭令牌下载文件（服务端代理流，不暴露存储地址） */
async function handleDownload(): Promise<void> {
  if (!token.value.trim()) return
  downloading.value = true
  try {
    const blob = await downloadFileShare(token.value.trim())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = meta.value?.originalName || `share-${Date.now()}`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    showError(error, '下载失败')
  } finally {
    downloading.value = false
  }
}

/** 文件大小格式化 */
function formatSize(size?: number): string {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

// 携带 token 进入页面时自动兑换
onMounted(() => {
  if (token.value) void handleExchange()
})
</script>

<style scoped lang="scss">
.share-page {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 48px 16px;
  background: var(--el-bg-color-page);
}

.share-card {
  width: 560px;
  max-width: 100%;
}
</style>
