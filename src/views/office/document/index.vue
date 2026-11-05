<!--
  办公平台文档管理页面
  ------------------------------------------------------------------
  功能：办公平台在线文档管理（我的文档列表 + 前端筛选分页、创建、复制、删除、详情）

  权限(与后端 @RequirePermission 一致)：
    - office:document:create - 创建文档
    - office:document:query - 查看文档详情
    - office:document:copy - 复制文档
    - office:document:delete - 删除文档
-->
<template>
  <div class="office-document-container">
    <el-card class="header-card">
      <div class="header-content">
        <h2>文档管理</h2>
        <div class="header-actions">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索文档"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="queryParams.platform"
            placeholder="选择平台"
            clearable
            style="width: 150px"
          >
            <el-option label="飞书" value="feishu" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="企业微信" value="wecom" />
          </el-select>
          <el-select
            v-model="queryParams.documentType"
            placeholder="文档类型"
            clearable
            style="width: 150px"
          >
            <el-option label="文档" value="DOC" />
            <el-option label="表格" value="SHEET" />
            <el-option label="演示文稿" value="SLIDE" />
            <el-option label="思维导图" value="MINDMAP" />
            <el-option label="文件夹" value="FOLDER" />
            <el-option label="文件" value="FILE" />
          </el-select>
          <el-button
            v-permission="'office:document:create'"
            type="primary"
            :icon="Plus"
            @click="handleCreate"
          >
            创建文档
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 文档列表 -->
    <el-card class="list-card">
      <el-table v-loading="loading" :data="paginatedDocuments" stripe>
        <el-table-column label="标题" prop="title" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.url" :href="row.url" target="_blank" type="primary">
              <el-icon style="margin-right: 4px">
                <Document />
              </el-icon>
              {{ row.title }}
            </el-link>
            <span v-else>{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平台" width="100">
          <template #default="{ row }">
            <el-tag :type="getPlatformTagType(row.platform)">
              {{ PLATFORM_NAMES[row.platform?.toUpperCase() as keyof typeof PLATFORM_NAMES] || row.platform }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getDocTypeTagType(row.documentType)">
              {{ getDocTypeText(row.documentType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所有者" prop="ownerName" width="120" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column label="最后修改" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.lastModifiedTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'office:document:query'" link type="primary" @click="handleView(row)">
              查看
            </el-button>
            <el-button v-permission="'office:document:copy'" link type="primary" @click="handleCopy(row)">
              复制
            </el-button>
            <el-button v-permission="'office:document:delete'" link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </el-card>

    <!-- 创建文档对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建文档"
      width="600px"
      @close="handleCreateDialogClose"
    >
      <el-form ref="createFormRef" :model="createFormData" :rules="createFormRules" label-width="100px">
        <el-form-item label="平台" prop="platform">
          <el-select v-model="createFormData.platform" placeholder="请选择平台">
            <el-option label="飞书" value="feishu" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="企业微信" value="wecom" />
          </el-select>
        </el-form-item>
        <el-form-item label="文档类型" prop="documentType">
          <el-select v-model="createFormData.documentType" placeholder="请选择文档类型">
            <el-option label="文档" value="DOC" />
            <el-option label="表格" value="SHEET" />
            <el-option label="演示文稿" value="SLIDE" />
            <el-option label="思维导图" value="MINDMAP" />
            <el-option label="文件夹" value="FOLDER" />
            <el-option label="文件" value="FILE" />
          </el-select>
        </el-form-item>
        <el-form-item label="文档标题" prop="title">
          <el-input v-model="createFormData.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="文件夹ID" prop="folderId">
          <el-input v-model="createFormData.folderId" placeholder="可选，留空则创建在根目录" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreateSubmit">创建</el-button>
      </template>
    </el-dialog>

    <!-- 复制文档对话框 -->
    <el-dialog v-model="copyDialogVisible" title="复制文档" width="500px">
      <el-form ref="copyFormRef" :model="copyFormData" :rules="copyFormRules" label-width="120px">
        <el-form-item label="目标文件夹ID" prop="targetFolderId">
          <el-input v-model="copyFormData.targetFolderId" placeholder="可选，留空则复制到原位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCopySubmit">复制</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailVisible" title="文档详情" width="700px">
      <el-descriptions v-if="currentDocument" :column="2" border>
        <el-descriptions-item label="平台">
          <el-tag :type="getPlatformTagType(currentDocument.platform)">
            {{ PLATFORM_NAMES[currentDocument.platform?.toUpperCase() as keyof typeof PLATFORM_NAMES] || currentDocument.platform }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="文档类型">
          <el-tag :type="getDocTypeTagType(currentDocument.documentType)">
            {{ getDocTypeText(currentDocument.documentType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">
          {{ currentDocument.title }}
        </el-descriptions-item>
        <el-descriptions-item label="文档URL" :span="2">
          <el-link v-if="currentDocument.url" :href="currentDocument.url" target="_blank" type="primary">
            {{ currentDocument.url }}
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="平台文档ID" :span="2">
          {{ currentDocument.platformDocumentId }}
        </el-descriptions-item>
        <el-descriptions-item label="所有者">
          {{ currentDocument.ownerName || currentDocument.ownerId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="文档大小">
          {{ formatFileSize(currentDocument.fileSize) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后修改">
          {{ formatDateTime(currentDocument.lastModifiedTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(currentDocument.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDateTime(currentDocument.updateTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台文档操作页逻辑
 * - 数据源为「我的文档」接口（裸数组），平台/类型/关键词筛选与分页在前端完成
 * - 文档创建 + 复制 + 删除 + 详情（后端无文档更新与分享端点）
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Document } from '@element-plus/icons-vue'
import {
  getMyDocuments,
  createDocument,
  deleteDocument,
  copyDocument,
  getDocument,
  type DocumentInfo,
  type DocumentType,
  type CreateDocumentRequest,
} from '@/api/office-document'
import { PLATFORM_NAMES } from '@/api/office-platform'
import { useUserStore } from '@/stores/user'

/** ========== 弹窗与加载状态 ========== */

// 响应式数据
/** 列表查询进行中 */
const loading = ref(false)
/** 表单提交进行中（创建/复制共用） */
const submitting = ref(false)
/** 创建文档弹窗 */
const createDialogVisible = ref(false)
/** 复制文档弹窗 */
const copyDialogVisible = ref(false)
/** 文档详情弹窗 */
const detailVisible = ref(false)
/** 全量文档列表（当前用户的我的文档） */
const allDocuments = ref<DocumentInfo[]>([])
/** 当前操作/查看的文档（复制/详情共用） */
const currentDocument = ref<DocumentInfo>()
/** 创建表单实例 */
const createFormRef = ref<FormInstance>()
/** 复制表单实例 */
const copyFormRef = ref<FormInstance>()

/** ========== 查询参数与表单定义 ========== */

// 查询参数（本地筛选 + 本地分页）
/** 文档查询条件（平台/类型/关键词/分页） */
const queryParams = reactive<{
  platform?: string
  documentType?: DocumentType
  keyword: string
  pageNum: number
  pageSize: number
}>({
  platform: undefined,
  documentType: undefined,
  keyword: '',
  pageNum: 1,
  pageSize: 20,
})

/** 按平台/类型/关键词过滤后的文档 */
const filteredDocuments = computed(() => {
  const keyword = queryParams.keyword.trim().toLowerCase()
  return allDocuments.value.filter((doc) => {
    if (queryParams.platform && doc.platform !== queryParams.platform) return false
    if (queryParams.documentType && doc.documentType !== queryParams.documentType) return false
    if (keyword && !doc.title.toLowerCase().includes(keyword)) return false
    return true
  })
})

/** 当前页文档 */
const paginatedDocuments = computed(() => {
  const start = (queryParams.pageNum - 1) * queryParams.pageSize
  return filteredDocuments.value.slice(start, start + queryParams.pageSize)
})

/** 过滤后总条数 */
const total = computed(() => filteredDocuments.value.length)

/** 创建表单默认值工厂（每次打开弹窗重置） */
const defaultCreateFormData = (): CreateDocumentRequest => ({
  platform: 'feishu',
  documentType: 'DOC',
  title: '',
  folderId: '',
  ownerId: '',
  ownerName: '',
})

/** 创建文档表单 */
const createFormData = reactive<CreateDocumentRequest>(defaultCreateFormData())

/** 创建表单校验规则 */
const createFormRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  documentType: [{ required: true, message: '请选择文档类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
}

// 复制表单
/** 复制文档表单（目标目录） */
const copyFormData = reactive<{ targetFolderId: string }>({
  targetFolderId: '',
})

/** 复制表单校验规则（当前无必填约束） */
const copyFormRules: FormRules = {}

/** ========== 列表查询 ========== */

/**
 * 加载我的文档全量列表（筛选与分页由前端 computed 完成）
 */
const loadDocuments = async () => {
  const userStore = useUserStore()
  const userId = userStore.userInfo?.id
  if (!userId) {
    ElMessage.error('未获取到当前用户信息')
    return
  }
  loading.value = true
  try {
    allDocuments.value = (await getMyDocuments(userId)) || []
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败')
  } finally {
    loading.value = false
  }
}

/** ========== 文档操作 ========== */

/**
 * 打开创建文档弹窗（表单恢复默认值，所有者取当前登录用户）
 */
const handleCreate = () => {
  const userStore = useUserStore()
  const identity = userStore.userInfo
  Object.assign(createFormData, defaultCreateFormData(), {
    ownerId: identity?.id != null ? String(identity.id) : '',
    ownerName: identity?.nickName || identity?.nickname || identity?.username || '',
  })
  createDialogVisible.value = true
}

/**
 * 提交创建文档：校验通过后调用创建接口并刷新列表
 */
const handleCreateSubmit = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await createDocument({
        ...createFormData,
        title: createFormData.title.trim(),
        folderId: createFormData.folderId?.trim() || undefined,
      })
      ElMessage.success('创建成功')
      createDialogVisible.value = false
      await loadDocuments()
    } catch (error: any) {
      ElMessage.error(error.message || '创建失败')
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 打开复制文档弹窗
 * @param row 目标文档行
 */
const handleCopy = (row: DocumentInfo) => {
  currentDocument.value = row
  copyFormData.targetFolderId = ''
  copyDialogVisible.value = true
}

/**
 * 提交复制文档：调用复制接口并刷新列表
 */
const handleCopySubmit = async () => {
  if (!currentDocument.value) return

  submitting.value = true
  try {
    await copyDocument(currentDocument.value.id, copyFormData.targetFolderId.trim() || undefined)
    ElMessage.success('复制成功')
    copyDialogVisible.value = false
    await loadDocuments()
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败')
  } finally {
    submitting.value = false
  }
}

/**
 * 查看文档详情
 * @param row 目标文档行
 */
const handleView = async (row: DocumentInfo) => {
  try {
    currentDocument.value = await getDocument(row.id)
    detailVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

/**
 * 删除文档（二次确认后删除并刷新列表）
 * @param row 目标文档行
 */
const handleDelete = async (row: DocumentInfo) => {
  try {
    await ElMessageBox.confirm(`确定要删除文档"${row.title}"吗？`, '提示', {
      type: 'warning',
    })
    await deleteDocument(row.id)
    ElMessage.success('删除成功')
    await loadDocuments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

/**
 * 创建弹窗关闭时重置表单校验状态
 */
const handleCreateDialogClose = () => {
  createFormRef.value?.resetFields()
}

/** ========== 展示辅助 ========== */

/**
 * 平台对应的标签颜色
 * @param platform 平台类型（小写）
 * @returns el-tag 类型
 */
const getPlatformTagType = (platform?: string) => {
  const typeMap: Record<string, any> = {
    feishu: 'primary',
    dingtalk: 'success',
    wecom: 'warning',
  }
  return typeMap[platform || ''] || ''
}

/**
 * 文档类型对应的标签颜色
 * @param type 文档类型
 * @returns el-tag 类型
 */
const getDocTypeTagType = (type: DocumentType) => {
  const typeMap: Record<DocumentType, any> = {
    DOC: 'primary',
    SHEET: 'success',
    SLIDE: 'warning',
    MINDMAP: 'danger',
    FOLDER: 'info',
    FILE: 'info',
  }
  return typeMap[type] || ''
}

/**
 * 文档类型的中文文案
 * @param type 文档类型
 * @returns 中文文案（未知类型原样返回）
 */
const getDocTypeText = (type: DocumentType) => {
  const textMap: Record<DocumentType, string> = {
    DOC: '文档',
    SHEET: '表格',
    SLIDE: '演示文稿',
    MINDMAP: '思维导图',
    FOLDER: '文件夹',
    FILE: '文件',
  }
  return textMap[type] || type
}

/** 字节数 → 可读大小（B/KB/MB/GB，保留 2 位小数），空值返回 "-" */
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/** ISO 时间 → "YYYY-MM-DD HH:mm:ss" 展示，空值返回 "-" */
const formatDateTime = (dateTime?: string) => {
  if (!dateTime) return '-'
  return dateTime.replace('T', ' ').substring(0, 19)
}

// 生命周期
onMounted(() => {
  loadDocuments()
})
</script>

<style scoped lang="scss">
.office-document-container {
  padding: 16px;

  .header-card {
    margin-bottom: 16px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .header-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
    }
  }

  .list-card {
    :deep(.el-table) {
      margin-bottom: 16px;
    }
  }
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>
