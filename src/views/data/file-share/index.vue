<!--
  文件分享管理
  ------------------------------------------------------------------
  - 创建分享：输入文件 ID 与有效期，创建后立即显示 token 与 shareId；token 只返回一次
  - 我的分享：按文件 ID 查询该文件的分享列表（仅创建者/所有者可见），支持状态筛选与分页，可从列表直接撤销
  - 访问分享：粘贴 token 兑换文件信息并下载（接口匿名）
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>文件分享</span>
        <el-tag type="info" size="small">分享令牌仅创建时显示一次</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="创建分享" name="create">
        <el-alert
          title="系统不提供分享列表。创建后请保存 shareId 用于撤销，并立即复制 token；token 明文不会再次显示。"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="120px" class="form-width">
          <el-form-item label="文件 ID" prop="fileId">
            <el-input-number v-model="createForm.fileId" :min="1" :controls="false" style="width: 100%" />
          </el-form-item>
          <el-form-item label="有效期（秒）" prop="expireSeconds">
            <el-input-number
              v-model="createForm.expireSeconds"
              :min="60"
              :max="2592000"
              :controls="false"
              placeholder="留空使用服务端默认值"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="creating" @click="handleCreate">创建分享</el-button>
          </el-form-item>
        </el-form>

        <el-result v-if="createdShare" icon="success" title="分享已创建">
          <template #sub-title>
            <el-descriptions :column="1" border class="result-details">
              <el-descriptions-item label="分享 ID">
                <code>{{ createdShare.shareId }}</code>
                <el-button link type="primary" @click="copy(String(createdShare.shareId))">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="文件 ID">{{ createdShare.fileId }}</el-descriptions-item>
              <el-descriptions-item label="过期时间">{{ createdShare.expireAt || '未返回' }}</el-descriptions-item>
              <el-descriptions-item label="分享令牌">
                <code class="token-value">{{ createdShare.token }}</code>
                <el-button link type="primary" @click="copy(createdShare.token)">复制令牌</el-button>
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-result>
      </el-tab-pane>

      <el-tab-pane label="我的分享" name="revoke">
        <el-alert
          title="输入文件 ID 查询该文件的分享列表（仅创建者可见），可从列表直接撤销。"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="文件 ID">
            <el-input-number v-model="listQuery.fileId" :min="1" :controls="false" placeholder="fileId" style="width: 200px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="listQuery.status" placeholder="全部" clearable style="width: 130px">
              <el-option label="有效" value="ACTIVE" />
              <el-option label="已撤销" value="REVOKED" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="listLoading" @click="loadShares">查询</el-button>
          </el-form-item>
        </el-form>
        <el-table v-loading="listLoading" :data="shares" border stripe>
          <el-table-column prop="shareId" label="分享 ID" width="140" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ row.status === 'ACTIVE' ? '有效' : '已撤销' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="expireAt" label="过期时间" width="180" />
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'ACTIVE'"
                link
                type="danger"
                @click="handleRevoke(row.shareId)"
              >撤销</el-button>
            </template>
          </el-table-column>
        </el-table>
        <Pagination v-if="listTotal > 0" :total="listTotal" @change="onListPageChange" />
      </el-tab-pane>

      <el-tab-pane label="访问分享" name="access">
        <el-alert
          title="粘贴分享令牌以查看文件信息并下载。令牌仅作为访问凭证，请勿分享给非授权人员。"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="分享令牌">
            <el-input v-model="accessToken" clearable placeholder="粘贴 token" style="width: 360px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="exchanging" @click="handleExchange">查看分享</el-button>
          </el-form-item>
        </el-form>
        <el-descriptions v-if="exchangeResult" :column="2" border class="exchange-result">
          <el-descriptions-item label="文件名">{{ exchangeResult.originalName }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatBytes(exchangeResult.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="内容类型">{{ exchangeResult.contentType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ exchangeResult.expireAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="下载" :span="2">
            <el-button type="primary" :loading="downloading" @click="handleDownload">下载文件</el-button>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  createFileShare,
  downloadFileShare,
  exchangeFileShare,
  listFileShares,
  revokeFileShare,
  type FileShareCreated,
  type FileShareExchangeResult,
  type FileShareItem,
} from '@/api/file-share'

const activeTab = ref('create')

const createFormRef = ref<FormInstance>()
const createForm = reactive<{ fileId?: number; expireSeconds?: number }>({
  fileId: undefined,
  expireSeconds: undefined,
})
const createRules: FormRules = {
  fileId: [{ required: true, message: '请输入文件 ID', trigger: 'blur' }],
}
const creating = ref(false)
const createdShare = ref<FileShareCreated | null>(null)

const revoking = ref(false)
const listLoading = ref(false)
const shares = ref<FileShareItem[]>([])
const listTotal = ref(0)
const listQuery = reactive<{ fileId?: number; status?: 'ACTIVE' | 'REVOKED'; page: number; size: number }>({
  fileId: undefined,
  status: undefined,
  page: 1,
  size: 10,
})

const accessToken = ref('')
const exchanging = ref(false)
const downloading = ref(false)
const exchangeResult = ref<FileShareExchangeResult | null>(null)

/** 创建文件分享 */
async function handleCreate(): Promise<void> {
  if (!createFormRef.value) return
  await createFormRef.value.validate()
  if (!createForm.fileId) return
  creating.value = true
  createdShare.value = null
  try {
    createdShare.value = await createFileShare(createForm.fileId, createForm.expireSeconds)
    ElMessage.success('分享已创建，请立即保存令牌与分享 ID')
  } catch (error) {
    showError(error, '创建分享失败')
  } finally {
    creating.value = false
  }
}

/** 撤销分享（按 shareId；重复撤销视为成功） */
async function handleRevoke(shareId: number): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认撤销分享 ${shareId}？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  revoking.value = true
  try {
    await revokeFileShare(shareId)
    ElMessage.success('分享已撤销')
    await loadShares()
  } catch (error) {
    showError(error, '撤销分享失败')
  } finally {
    revoking.value = false
  }
}

/** 加载指定文件的分享列表 */
async function loadShares(): Promise<void> {
  if (!listQuery.fileId) {
    ElMessage.warning('请输入文件 ID')
    return
  }
  listLoading.value = true
  try {
    const result = await listFileShares(listQuery.fileId, {
      status: listQuery.status,
      page: listQuery.page,
      size: listQuery.size,
    })
    shares.value = result.list || []
    listTotal.value = result.total
  } catch (error) {
    showError(error, '加载分享列表失败')
  } finally {
    listLoading.value = false
  }
}

/** 列表分页变化 */
function onListPageChange(page: number, size: number): void {
  listQuery.page = page
  listQuery.size = size
  loadShares()
}

/** 兑换分享令牌获取文件元信息 */
async function handleExchange(): Promise<void> {
  if (!accessToken.value.trim()) {
    ElMessage.warning('请输入分享令牌')
    return
  }
  exchanging.value = true
  exchangeResult.value = null
  try {
    exchangeResult.value = await exchangeFileShare(accessToken.value.trim())
  } catch (error) {
    showError(error, '分享令牌无效或已过期')
  } finally {
    exchanging.value = false
  }
}

/** 下载分享文件 */
async function handleDownload(): Promise<void> {
  if (!accessToken.value.trim()) return
  downloading.value = true
  try {
    const blob = await downloadFileShare(accessToken.value.trim())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exchangeResult.value?.originalName || 'shared-file'
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    showError(error, '下载失败')
  } finally {
    downloading.value = false
  }
}

/** 复制文本 */
async function copy(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

/** 格式化字节数 */
function formatBytes(bytes?: number): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-width {
  max-width: 620px;
}

.result-details,
.exchange-result {
  width: 100%;
  text-align: left;
}

.token-value {
  display: inline-block;
  max-width: 380px;
  overflow-wrap: anywhere;
  font-family: 'Courier New', monospace;
}
</style>
