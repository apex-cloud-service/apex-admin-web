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
            @keyup.enter="handleQuery"
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
            @change="handleQuery"
          >
            <el-option label="飞书" value="FEISHU" />
            <el-option label="钉钉" value="DINGTALK" />
            <el-option label="企业微信" value="WECOM" />
          </el-select>
          <el-select
            v-model="queryParams.documentType"
            placeholder="文档类型"
            clearable
            style="width: 150px"
            @change="handleQuery"
          >
            <el-option label="文档" value="DOC" />
            <el-option label="表格" value="SHEET" />
            <el-option label="演示文稿" value="SLIDE" />
            <el-option label="思维导图" value="MINDNOTE" />
            <el-option label="多维表格" value="BITABLE" />
            <el-option label="知识库" value="WIKI" />
          </el-select>
          <el-button type="primary" :icon="Plus" @click="handleCreate">创建文档</el-button>
        </div>
      </div>
    </el-card>

    <!-- 文档列表 -->
    <el-card class="list-card">
      <el-table v-loading="loading" :data="documentList" stripe>
        <el-table-column label="标题" prop="title" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link :href="row.url" target="_blank" type="primary">
              <el-icon style="margin-right: 4px">
                <Document />
              </el-icon>
              {{ row.title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="平台" width="100">
          <template #default="{ row }">
            <el-tag :type="getPlatformTagType(row.platform)">
              {{ PLATFORM_NAMES[row.platform] }}
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
        <el-table-column label="创建人" prop="creatorName" width="120" />
        <el-table-column label="所有者" prop="ownerName" width="120" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="最后修改" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.lastModifiedTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="handleCopy(row)">复制</el-button>
            <el-button link type="primary" @click="handleShare(row)">分享</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
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
            <el-option label="飞书" value="FEISHU" />
            <el-option label="钉钉" value="DINGTALK" />
            <el-option label="企业微信" value="WECOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="文档类型" prop="documentType">
          <el-select v-model="createFormData.documentType" placeholder="请选择文档类型">
            <el-option label="文档" value="DOC" />
            <el-option label="表格" value="SHEET" />
            <el-option label="演示文稿" value="SLIDE" />
            <el-option label="思维导图" value="MINDNOTE" />
            <el-option label="多维表格" value="BITABLE" />
            <el-option label="知识库" value="WIKI" />
          </el-select>
        </el-form-item>
        <el-form-item label="文档标题" prop="title">
          <el-input v-model="createFormData.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="父文件夹ID" prop="parentFolderId">
          <el-input v-model="createFormData.parentFolderId" placeholder="可选，留空则创建在根目录" />
        </el-form-item>
        <el-form-item label="初始内容" prop="content">
          <el-input
            v-model="createFormData.content"
            type="textarea"
            :rows="4"
            placeholder="可选，输入文档初始内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreateSubmit">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑文档对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑文档"
      width="600px"
      @close="handleEditDialogClose"
    >
      <el-form ref="editFormRef" :model="editFormData" :rules="editFormRules" label-width="100px">
        <el-form-item label="文档标题" prop="title">
          <el-input v-model="editFormData.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="文档内容" prop="content">
          <el-input
            v-model="editFormData.content"
            type="textarea"
            :rows="6"
            placeholder="请输入文档内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 复制文档对话框 -->
    <el-dialog v-model="copyDialogVisible" title="复制文档" width="500px">
      <el-form ref="copyFormRef" :model="copyFormData" :rules="copyFormRules" label-width="120px">
        <el-form-item label="目标文件夹ID" prop="targetFolderId">
          <el-input v-model="copyFormData.targetFolderId" placeholder="可选，留空则复制到原位置" />
        </el-form-item>
        <el-form-item label="新文档标题" prop="newTitle">
          <el-input v-model="copyFormData.newTitle" placeholder="可选，留空则自动生成" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCopySubmit">复制</el-button>
      </template>
    </el-dialog>

    <!-- 分享文档对话框 -->
    <el-dialog v-model="shareDialogVisible" title="分享文档" width="600px">
      <el-form ref="shareFormRef" :model="shareFormData" :rules="shareFormRules" label-width="100px">
        <el-form-item label="分享给" prop="userIds">
          <el-select
            v-model="shareFormData.userIds"
            multiple
            filterable
            placeholder="请选择用户"
            style="width: 100%"
          >
            <!-- 这里需要从用户列表API获取数据 -->
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权限" prop="permission">
          <el-radio-group v-model="shareFormData.permission">
            <el-radio label="VIEW">查看</el-radio>
            <el-radio label="EDIT">编辑</el-radio>
            <el-radio label="FULL">完全控制</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="过期时间" prop="expiresAt">
          <el-date-picker
            v-model="shareFormData.expiresAt"
            type="datetime"
            placeholder="可选，留空则永久有效"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shareDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleShareSubmit">分享</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailVisible" title="文档详情" width="700px">
      <el-descriptions v-if="currentDocument" :column="2" border>
        <el-descriptions-item label="平台">
          <el-tag :type="getPlatformTagType(currentDocument.platform)">
            {{ PLATFORM_NAMES[currentDocument.platform] }}
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
          <el-link :href="currentDocument.url" target="_blank" type="primary">
            {{ currentDocument.url }}
          </el-link>
        </el-descriptions-item>
        <el-descriptions-item label="平台文档ID" :span="2">
          {{ currentDocument.platformDocumentId }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ currentDocument.creatorName || currentDocument.creatorId }}
        </el-descriptions-item>
        <el-descriptions-item label="所有者">
          {{ currentDocument.ownerName || currentDocument.ownerId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="文档大小">
          {{ formatFileSize(currentDocument.size) }}
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Document } from '@element-plus/icons-vue'
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  copyDocument,
  shareDocument,
  getDocument,
  PLATFORM_NAMES,
  type OfficePlatform,
  type DocumentInfo,
  type DocumentType,
  type CreateDocumentRequest,
  type UpdateDocumentRequest,
  type CopyDocumentRequest,
  type ShareDocumentRequest,
  type DocumentsQuery,
} from '@/api/office'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const copyDialogVisible = ref(false)
const shareDialogVisible = ref(false)
const detailVisible = ref(false)
const documentList = ref<DocumentInfo[]>([])
const total = ref(0)
const currentDocument = ref<DocumentInfo>()
const createFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const copyFormRef = ref<FormInstance>()
const shareFormRef = ref<FormInstance>()
const userList = ref<Array<{ id: string; name: string }>>([])

// 查询参数
const queryParams = reactive<DocumentsQuery>({
  platform: undefined,
  documentType: undefined,
  keyword: '',
  pageNum: 1,
  pageSize: 20,
})

// 创建表单
const defaultCreateFormData = (): CreateDocumentRequest => ({
  platform: 'FEISHU',
  documentType: 'DOC',
  title: '',
  parentFolderId: '',
  content: '',
})

const createFormData = reactive<CreateDocumentRequest>(defaultCreateFormData())

const createFormRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  documentType: [{ required: true, message: '请选择文档类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
}

// 编辑表单
const editFormData = reactive<UpdateDocumentRequest>({
  title: '',
  content: '',
})

const editFormRules: FormRules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
}

// 复制表单
const copyFormData = reactive<CopyDocumentRequest>({
  targetFolderId: '',
  newTitle: '',
})

const copyFormRules: FormRules = {}

// 分享表单
const shareFormData = reactive<ShareDocumentRequest>({
  userIds: [],
  permission: 'VIEW',
  expiresAt: '',
})

const shareFormRules: FormRules = {
  userIds: [{ required: true, message: '请选择用户', trigger: 'change' }],
  permission: [{ required: true, message: '请选择权限', trigger: 'change' }],
}

// 方法
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await getDocuments(queryParams)
    documentList.value = res.list
    total.value = res.total
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  Object.assign(createFormData, defaultCreateFormData())
  createDialogVisible.value = true
}

const handleCreateSubmit = async () => {
  if (!createFormRef.value) return
  
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await createDocument(createFormData)
      ElMessage.success('创建成功')
      createDialogVisible.value = false
      handleQuery()
    } catch (error: any) {
      ElMessage.error(error.message || '创建失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleEdit = async (row: DocumentInfo) => {
  try {
    const doc = await getDocument(row.id)
    editFormData.title = doc.title
    editFormData.content = ''
    currentDocument.value = doc
    editDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '加载文档详情失败')
  }
}

const handleEditSubmit = async () => {
  if (!editFormRef.value || !currentDocument.value) return
  
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await updateDocument(currentDocument.value!.id, editFormData)
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      handleQuery()
    } catch (error: any) {
      ElMessage.error(error.message || '更新失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleView = async (row: DocumentInfo) => {
  try {
    const doc = await getDocument(row.id)
    currentDocument.value = doc
    detailVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '加载文档详情失败')
  }
}

const handleCopy = (row: DocumentInfo) => {
  currentDocument.value = row
  copyFormData.targetFolderId = ''
  copyFormData.newTitle = ''
  copyDialogVisible.value = true
}

const handleCopySubmit = async () => {
  if (!currentDocument.value) return
  
  submitting.value = true
  try {
    await copyDocument(currentDocument.value.id, copyFormData)
    ElMessage.success('复制成功')
    copyDialogVisible.value = false
    handleQuery()
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败')
  } finally {
    submitting.value = false
  }
}

const handleShare = (row: DocumentInfo) => {
  currentDocument.value = row
  shareFormData.userIds = []
  shareFormData.permission = 'VIEW'
  shareFormData.expiresAt = ''
  shareDialogVisible.value = true
}

const handleShareSubmit = async () => {
  if (!shareFormRef.value || !currentDocument.value) return
  
  await shareFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await shareDocument(currentDocument.value!.id, shareFormData)
      ElMessage.success('分享成功')
      shareDialogVisible.value = false
    } catch (error: any) {
      ElMessage.error(error.message || '分享失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: DocumentInfo) => {
  try {
    await ElMessageBox.confirm(`确定要删除文档"${row.title}"吗？`, '提示', {
      type: 'warning',
    })
    await deleteDocument(row.id)
    ElMessage.success('删除成功')
    handleQuery()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleCreateDialogClose = () => {
  createFormRef.value?.resetFields()
}

const handleEditDialogClose = () => {
  editFormRef.value?.resetFields()
}

const getPlatformTagType = (platform: OfficePlatform) => {
  const typeMap: Record<OfficePlatform, any> = {
    FEISHU: 'primary',
    DINGTALK: 'success',
    WECOM: 'warning',
  }
  return typeMap[platform] || ''
}

const getDocTypeTagType = (type: DocumentType) => {
  const typeMap: Record<DocumentType, any> = {
    DOC: 'primary',
    SHEET: 'success',
    SLIDE: 'warning',
    MINDNOTE: 'danger',
    BITABLE: 'info',
    WIKI: '',
  }
  return typeMap[type] || ''
}

const getDocTypeText = (type: DocumentType) => {
  const textMap: Record<DocumentType, string> = {
    DOC: '文档',
    SHEET: '表格',
    SLIDE: '演示文稿',
    MINDNOTE: '思维导图',
    BITABLE: '多维表格',
    WIKI: '知识库',
  }
  return textMap[type] || type
}

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

const formatDateTime = (dateTime?: string) => {
  if (!dateTime) return '-'
  return dateTime.replace('T', ' ').substring(0, 19)
}

// 生命周期
onMounted(() => {
  handleQuery()
  // TODO: 加载用户列表
  // loadUserList()
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
      }
    }
  }
  
  .list-card {
    :deep(.el-table) {
      margin-bottom: 16px;
    }
  }
}
</style>
