<!--
  知识文档管理页面
  ------------------------------------------------------------------
  功能：文档查询（空间/解析状态/标题过滤）、multipart 上传、在线录入、
        分块预览、手动重建索引、接受删除并软隐藏、后台清理记录与重试。
  权限要求：kb:doc:read（文档/清理记录读取）、kb:doc:upload（上传/录入）、
           kb:doc:reindex（重建索引）、kb:doc:delete（删除/清理重试）；
           空间选择器依赖管理端 listSpaces，额外要求 kb:space:read。
  菜单组件路径：knowledge/document/index
-->
<template>
  <div class="document-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识文档管理</span>
          <div>
            <el-button
              type="primary"
              :icon="Upload"
              v-permission="'kb:doc:upload'"
              @click="uploadVisible = true"
            >
              上传文档
            </el-button>
            <el-button :icon="EditPen" v-permission="'kb:doc:upload'" @click="manualVisible = true">
              在线录入
            </el-button>
            <el-button :icon="View" v-permission="'kb:doc:read'" @click="openCleanups">
              清理记录
            </el-button>
          </div>
        </div>
      </template>

      <el-form inline :model="queryForm" class="query-form" @submit.prevent>
        <el-form-item label="空间">
          <el-select v-model="queryForm.spaceId" placeholder="全部空间" clearable style="width: 180px">
            <el-option v-for="space in spaces" :key="space.id" :label="space.name" :value="space.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="解析状态">
          <el-select v-model="queryForm.parseStatus" placeholder="全部" clearable style="width: 140px">
            <el-option label="待解析" value="PENDING" />
            <el-option label="解析中" value="PARSING" />
            <el-option label="已解析" value="PARSED" />
            <el-option label="解析失败" value="FAILED" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            v-model="queryForm.keyword"
            placeholder="按标题模糊查询"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="id" label="ID" width="180" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="来源" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.sourceType === 'UPLOAD' ? 'primary' : 'info'">
              {{ row.sourceType === 'UPLOAD' ? '上传' : '录入' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="解析状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="parseStatusType(row.parseStatus)">{{ parseStatusText(row.parseStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="索引状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="indexStatusType(row.indexStatus)">{{ indexStatusText(row.indexStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="chunkCount" label="分块数" width="80" align="center" />
        <el-table-column prop="fileSize" label="大小" width="100" align="center">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" v-permission="'kb:doc:read'" @click="openChunkPreview(row)">
              分块
            </el-button>
            <el-button link type="warning" :icon="RefreshRight" v-permission="'kb:doc:reindex'" @click="handleReindex(row)">
              重建
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              :loading="deletingIds.has(row.id)"
              v-permission="'kb:doc:delete'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination :total="total" @change="handlePageChange" />
    </el-card>

    <el-drawer v-model="cleanupVisible" title="文档清理记录" size="85%" class="cleanup-drawer">
      <div class="cleanup-toolbar">
        <span class="tip-text">删除接受后文档已隐藏；后台清理可能失败，可刷新状态或重试待清理、失败的记录。「已完成」仅表示最近清理已确认，后台复核不保证永久物理擦除。</span>
        <el-button :icon="Refresh" :loading="cleanupLoading" v-permission="'kb:doc:read'" @click="fetchCleanups">
          刷新
        </el-button>
      </div>
      <el-alert
        v-if="cleanupError"
        class="cleanup-error"
        title="加载清理记录失败，请刷新重试"
        type="error"
        :closable="false"
        show-icon
      />
      <el-table v-loading="cleanupLoading" :data="cleanupList" class="cleanup-table" border stripe>
        <el-table-column prop="documentId" label="文档 ID" width="180" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="清理状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="cleanupStatusType(row.status)">{{ cleanupStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误摘要" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.errorMessage || '-' }}</template>
        </el-table-column>
        <el-table-column prop="attempts" label="尝试次数" width="90" align="center" />
        <el-table-column prop="updatedAt" label="更新时间" width="190" />
        <el-table-column label="下次重试时间" width="190">
          <template #default="{ row }">{{ row.nextRetryAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'FAILED' || row.status === 'PENDING'"
              link
              type="warning"
              :loading="retryingIds.has(row.documentId)"
              v-permission="'kb:doc:delete'"
              @click="handleCleanupRetry(row)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination v-show="!cleanupError" :total="cleanupTotal" @change="handleCleanupPageChange" />
    </el-drawer>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadVisible" title="上传知识文档" width="520px">
      <el-form label-width="90px">
        <el-form-item label="目标空间" required>
          <el-select v-model="uploadSpaceId" placeholder="选择空间" style="width: 100%">
            <el-option v-for="space in writableSpaces" :key="space.id" :label="space.name" :value="space.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" required>
          <input ref="fileInputRef" type="file" :accept="acceptTypes" @change="handleFileSelected" />
        </el-form-item>
        <el-form-item>
          <span class="tip-text">支持 {{ acceptTypes }}，单文件 ≤ 50MB；上传后异步解析入库。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!selectedFile || !uploadSpaceId" @click="handleUpload">
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 在线录入对话框 -->
    <el-dialog v-model="manualVisible" title="在线录入文档" width="640px" @close="resetManualForm">
      <el-form ref="manualFormRef" :model="manualForm" :rules="manualRules" label-width="90px">
        <el-form-item label="目标空间" prop="spaceId">
          <el-select v-model="manualForm.spaceId" placeholder="选择空间" style="width: 100%">
            <el-option v-for="space in writableSpaces" :key="space.id" :label="space.name" :value="space.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="manualForm.title" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input v-model="manualForm.content" type="textarea" :rows="10" placeholder="纯文本正文" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualVisible = false">取消</el-button>
        <el-button type="primary" :loading="manualSubmitting" @click="handleManualSubmit">录入</el-button>
      </template>
    </el-dialog>

    <!-- 分块预览对话框 -->
    <el-dialog v-model="chunkVisible" :title="`分块预览 - ${chunkDocumentTitle}`" width="780px">
      <el-table v-loading="chunkLoading" :data="chunks" border stripe max-height="480">
        <el-table-column prop="seq" label="#" width="60" align="center" />
        <el-table-column prop="content" label="分块正文" min-width="420" show-overflow-tooltip />
        <el-table-column prop="tokenEstimate" label="预估 token" width="110" align="center" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Delete, EditPen, Refresh, RefreshRight, Search, Upload, View } from '@element-plus/icons-vue'
import {
  createManualDocument,
  deleteDocument,
  getDocument,
  listDocumentCleanups,
  listDocuments,
  listSpaces,
  reindexDocument,
  retryDocumentCleanup,
  uploadDocument,
} from '@/api/knowledge'
import type { KnowledgeChunk, KnowledgeDocument, KnowledgeDocumentCleanupDTO, KnowledgeSpace } from '@/types'
import { showError } from '@/utils/request'
import Pagination from '@/components/Pagination.vue'

const acceptTypes = '.txt,.md,.pdf,.docx,.doc,.xlsx,.pptx,.html,.htm,.csv'

const loading = ref(false)
const list = ref<KnowledgeDocument[]>([])
const total = ref(0)
const spaces = ref<KnowledgeSpace[]>([])

const queryForm = reactive({ page: 1, size: 20, spaceId: undefined as number | undefined, parseStatus: '', keyword: '' })

const cleanupVisible = ref(false)
const cleanupLoading = ref(false)
const cleanupError = ref(false)
const cleanupList = ref<KnowledgeDocumentCleanupDTO[]>([])
const cleanupTotal = ref(0)
const cleanupQuery = reactive({ page: 1, size: 20 })
let cleanupRequestId = 0
const retryingIds = reactive(new Set<number>())
const deletingIds = reactive(new Set<number>())

const uploadVisible = ref(false)
const uploading = ref(false)
const uploadSpaceId = ref<number | undefined>(undefined)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement>()

const manualVisible = ref(false)
const manualSubmitting = ref(false)
const manualFormRef = ref<FormInstance>()
const manualForm = reactive({ spaceId: undefined as number | undefined, title: '', content: '' })
const manualRules: FormRules = {
  spaceId: [{ required: true, message: '请选择空间', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文', trigger: 'blur' }],
}

const chunkVisible = ref(false)
const chunkLoading = ref(false)
const chunkDocumentTitle = ref('')
const chunks = ref<KnowledgeChunk[]>([])

/** 仅正常状态空间可接收新文档 */
const writableSpaces = computed(() => spaces.value.filter((space) => space.status === 1))

/** 加载空间选择器数据 */
async function fetchSpaces(): Promise<void> {
  try {
    spaces.value = (await listSpaces({ page: 1, size: 100 })).list
  } catch (error) {
    showError(error, '加载空间列表失败')
  }
}

/** 加载文档分页列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listDocuments({ ...queryForm })
    list.value = result.list
    total.value = result.total
  } catch (error) {
    showError(error, '加载知识文档失败')
  } finally {
    loading.value = false
  }
}

/** 按需打开清理抽屉并读取当前页，不在页面挂载时查询，也不重复触发在途读取。 */
function openCleanups(): void {
  cleanupVisible.value = true
  if (!cleanupLoading.value) void fetchCleanups()
}

/** 独立加载清理分页；请求序号避免旧响应覆盖新页，失败清空记录并隐藏分页但保留页码，文档列表不受影响。 */
async function fetchCleanups(): Promise<void> {
  const requestId = ++cleanupRequestId
  cleanupLoading.value = true
  cleanupError.value = false
  try {
    const result = await listDocumentCleanups({ ...cleanupQuery })
    if (requestId !== cleanupRequestId) return
    cleanupList.value = result.list
    cleanupTotal.value = result.total
  } catch (error) {
    if (requestId !== cleanupRequestId) return
    cleanupList.value = []
    cleanupError.value = true
    showError(error, '加载清理记录失败')
  } finally {
    if (requestId === cleanupRequestId) cleanupLoading.value = false
  }
}

/** 清理区块分页独立使用 page/size，不改变文档查询条件。 */
function handleCleanupPageChange(page: number, size: number): void {
  cleanupQuery.page = page
  cleanupQuery.size = size
  void fetchCleanups()
}

/** 仅待清理/失败可确认重试；按文档锁定确认与提交，取消静默退出，false 不报成功，接受后刷新但不视为清理完成。 */
async function handleCleanupRetry(row: KnowledgeDocumentCleanupDTO): Promise<void> {
  if ((row.status !== 'FAILED' && row.status !== 'PENDING') || retryingIds.has(row.documentId)) return
  retryingIds.add(row.documentId)
  try {
    try {
      await ElMessageBox.confirm(`确定提交「${row.title}」的后台清理重试吗？接受后仍需刷新查看状态。`, '重试确认', {
        type: 'warning',
      })
    } catch {
      return
    }
    const accepted = await retryDocumentCleanup(row.documentId)
    if (!accepted) {
      ElMessage.warning('清理重试未被接受，请刷新记录后再试')
      return
    }
    ElMessage.success('清理重试已接受，请稍后刷新查看状态')
    await fetchCleanups()
  } catch (error) {
    showError(error, '清理重试提交失败')
  } finally {
    retryingIds.delete(row.documentId)
  }
}

/** 查询（回到第一页） */
function handleSearch(): void {
  queryForm.page = 1
  void fetchList()
}

/** 重置查询条件 */
function handleReset(): void {
  queryForm.spaceId = undefined
  queryForm.parseStatus = ''
  queryForm.keyword = ''
  queryForm.page = 1
  void fetchList()
}

/** 分页变化 */
function handlePageChange(page: number, size: number): void {
  queryForm.page = page
  queryForm.size = size
  void fetchList()
}

/** 文件选择 */
function handleFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files && input.files.length > 0 ? input.files[0] : null
}

/** 提交上传 */
async function handleUpload(): Promise<void> {
  if (!selectedFile.value || !uploadSpaceId.value) return
  uploading.value = true
  try {
    await uploadDocument(uploadSpaceId.value, selectedFile.value)
    ElMessage.success('文档上传成功，已提交解析')
    uploadVisible.value = false
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    await fetchList()
  } catch (error) {
    showError(error, '文档上传失败')
  } finally {
    uploading.value = false
  }
}

/** 提交在线录入 */
async function handleManualSubmit(): Promise<void> {
  if (!manualFormRef.value) return
  const valid = await manualFormRef.value.validate().catch(() => false)
  if (!valid) return
  manualSubmitting.value = true
  try {
    await createManualDocument({
      spaceId: manualForm.spaceId as number,
      title: manualForm.title,
      content: manualForm.content,
    })
    ElMessage.success('文档录入成功，已提交解析')
    manualVisible.value = false
    await fetchList()
  } catch (error) {
    showError(error, '文档录入失败')
  } finally {
    manualSubmitting.value = false
  }
}

/** 打开分块预览 */
async function openChunkPreview(row: KnowledgeDocument): Promise<void> {
  chunkDocumentTitle.value = row.title
  chunkVisible.value = true
  chunkLoading.value = true
  try {
    const detail = await getDocument(row.id)
    chunks.value = detail.chunks
  } catch (error) {
    showError(error, '加载分块失败')
  } finally {
    chunkLoading.value = false
  }
}

/** 手动重建索引 */
async function handleReindex(row: KnowledgeDocument): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定对「${row.title}」重新解析并重建索引吗？`, '重建确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await reindexDocument(row.id)
    ElMessage.success('已提交重建，请稍后刷新查看状态')
    await fetchList()
  } catch (error) {
    showError(error, '重建提交失败')
  }
}

/** 确认后台删除并按文档防重入；true 仅接受/软隐藏，false 不报成功，接受后刷新文档和已打开的清理记录。 */
async function handleDelete(row: KnowledgeDocument): Promise<void> {
  if (deletingIds.has(row.id)) return
  deletingIds.add(row.id)
  try {
    try {
      await ElMessageBox.confirm(`确定删除文档「${row.title}」吗？接受后文档将隐藏，分块、索引与存储资源由后台清理，可在清理记录中查看状态与重试。`, '删除确认', {
        type: 'warning',
      })
    } catch {
      return
    }
    const accepted = await deleteDocument(row.id)
    if (!accepted) {
      ElMessage.warning('删除请求未被接受，请刷新文档后再试')
      return
    }
    ElMessage.success('删除请求已接受，文档已隐藏，后台清理状态可在清理记录中查看')
    await Promise.all([fetchList(), ...(cleanupVisible.value ? [fetchCleanups()] : [])])
  } catch (error) {
    showError(error, '文档删除请求失败')
  } finally {
    deletingIds.delete(row.id)
  }
}

/** 重置在线录入表单 */
function resetManualForm(): void {
  manualForm.spaceId = undefined
  manualForm.title = ''
  manualForm.content = ''
  manualFormRef.value?.clearValidate()
}

/** 解析状态标签 */
function parseStatusText(status: string): string {
  const map: Record<string, string> = { PENDING: '待解析', PARSING: '解析中', PARSED: '已解析', FAILED: '失败' }
  return map[status] ?? status
}

function parseStatusType(status: string): 'info' | 'primary' | 'success' | 'danger' {
  const map: Record<string, 'info' | 'primary' | 'success' | 'danger'> = {
    PENDING: 'info',
    PARSING: 'primary',
    PARSED: 'success',
    FAILED: 'danger',
  }
  return map[status] ?? 'info'
}

/** 索引状态标签 */
function indexStatusText(status: string): string {
  const map: Record<string, string> = {
    NONE: '未索引',
    PENDING: '待索引',
    INDEXED: '已索引',
    INDEXED_LEXICAL: '仅词法',
    FAILED: '失败',
  }
  return map[status] ?? status
}

function indexStatusType(status: string): 'info' | 'primary' | 'success' | 'warning' | 'danger' {
  const map: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'danger'> = {
    NONE: 'info',
    PENDING: 'warning',
    INDEXED: 'success',
    INDEXED_LEXICAL: 'primary',
    FAILED: 'danger',
  }
  return map[status] ?? 'info'
}

function cleanupStatusText(status: KnowledgeDocumentCleanupDTO['status']): string {
  const map: Record<KnowledgeDocumentCleanupDTO['status'], string> = {
    PENDING: '待清理',
    PROCESSING: '清理中',
    COMPLETED: '已完成',
    FAILED: '清理失败',
  }
  return map[status]
}

function cleanupStatusType(status: KnowledgeDocumentCleanupDTO['status']): 'info' | 'primary' | 'success' | 'danger' {
  const map: Record<KnowledgeDocumentCleanupDTO['status'], 'info' | 'primary' | 'success' | 'danger'> = {
    PENDING: 'info',
    PROCESSING: 'primary',
    COMPLETED: 'success',
    FAILED: 'danger',
  }
  return map[status]
}

/** 字节数格式化 */
function formatSize(size?: number): string {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(() => {
  void fetchSpaces()
  void fetchList()
})
</script>

<style scoped>
.document-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-form {
  margin-bottom: 8px;
}

.cleanup-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.cleanup-error {
  margin-bottom: 16px;
}

.tip-text {
  color: #909399;
  font-size: 12px;
}
</style>
