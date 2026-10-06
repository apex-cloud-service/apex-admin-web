<!--
  办公平台文档管理页面
  ------------------------------------------------------------------
  功能：办公平台在线文档管理、文档协作、文档权限控制
  
  权限：
    - office:document:view - 查看文档列表
    - office:document:create - 创建文档
    - office:document:edit - 编辑文档
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
              {{ PLATFORM_NAMES[row.platform as unknown as keyof typeof PLATFORM_NAMES] }}
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
/**
 * 办公平台文档操作页逻辑
 * - 文档列表查询（平台/类型/关键词筛选，统一分页口径）
 * - 文档 CRUD + 复制 + 分享（分享对象来自用户列表）
 */
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
import { listUsers } from '@/api/user'

/** ========== 弹窗与加载状态 ========== */

// 响应式数据
/** 列表查询进行中 */
const loading = ref(false)
/** 表单提交进行中（创建/编辑/复制/分享共用） */
const submitting = ref(false)
/** 创建文档弹窗 */
const createDialogVisible = ref(false)
/** 编辑文档弹窗 */
const editDialogVisible = ref(false)
/** 复制文档弹窗 */
const copyDialogVisible = ref(false)
/** 分享文档弹窗 */
const shareDialogVisible = ref(false)
/** 文档详情弹窗 */
const detailVisible = ref(false)
/** 文档列表（当前页） */
const documentList = ref<DocumentInfo[]>([])
/** 数据总条数 */
const total = ref(0)
/** 当前操作/查看的文档（编辑/复制/分享/详情共用） */
const currentDocument = ref<DocumentInfo>()
/** 创建表单实例 */
const createFormRef = ref<FormInstance>()
/** 编辑表单实例 */
const editFormRef = ref<FormInstance>()
/** 复制表单实例 */
const copyFormRef = ref<FormInstance>()
/** 分享表单实例 */
const shareFormRef = ref<FormInstance>()
/** 可选用户列表（分享对象选择，onMounted 时加载） */
const userList = ref<Array<{ id: string; name: string }>>([])

/** ========== 查询参数与表单定义 ========== */

// 查询参数
/** 文档查询条件（平台/类型/关键词/分页） */
const queryParams = reactive<DocumentsQuery>({
  platform: undefined,
  documentType: undefined,
  keyword: '',
  pageNum: 1,
  pageSize: 20,
})

// 创建表单
/** 创建表单默认值工厂（每次打开弹窗重置） */
const defaultCreateFormData = (): CreateDocumentRequest => ({
  platform: 'FEISHU',
  documentType: 'DOC',
  title: '',
  parentFolderId: '',
  content: '',
})

/** 创建文档表单 */
const createFormData = reactive<CreateDocumentRequest>(defaultCreateFormData())

/** 创建表单校验规则 */
const createFormRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  documentType: [{ required: true, message: '请选择文档类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
}

// 编辑表单
/** 编辑文档表单（仅标题与内容） */
const editFormData = reactive<UpdateDocumentRequest>({
  title: '',
  content: '',
})

/** 编辑表单校验规则 */
const editFormRules: FormRules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
}

// 复制表单
/** 复制文档表单（目标目录 + 新标题） */
const copyFormData = reactive<CopyDocumentRequest>({
  targetFolderId: '',
  newTitle: '',
})

/** 复制表单校验规则（当前无必填约束） */
const copyFormRules: FormRules = {}

// 分享表单
/** 分享文档表单（目标用户 + 权限 + 过期时间） */
const shareFormData = reactive<ShareDocumentRequest>({
  userIds: [],
  permission: 'VIEW',
  expiresAt: '',
})

/** 分享表单校验规则 */
const shareFormRules: FormRules = {
  userIds: [{ required: true, message: '请选择用户', trigger: 'change' }],
  permission: [{ required: true, message: '请选择权限', trigger: 'change' }],
}

/** ========== 列表查询 ========== */

// 方法
/**
 * 查询文档列表：按当前查询条件拉取并回填列表与总数
 */
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

/** ========== 文档操作 ========== */

/**
 * 打开创建文档弹窗（表单恢复默认值）
 */
const handleCreate = () => {
  Object.assign(createFormData, defaultCreateFormData())
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

/**
 * 打开编辑文档弹窗（先拉取文档详情回填标题）
 * @param row 目标文档行
 */
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

/**
 * 提交编辑文档：校验通过后调用更新接口并刷新列表
 */
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

/**
 * 查看文档详情（先拉取详情再展示弹窗）
 * @param row 目标文档行
 */
const handleView = async (row: DocumentInfo) => {
  try {
    const doc = await getDocument(row.id)
    currentDocument.value = doc
    detailVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '加载文档详情失败')
  }
}

/**
 * 打开复制文档弹窗（重置目标目录与新标题）
 * @param row 目标文档行
 */
const handleCopy = (row: DocumentInfo) => {
  currentDocument.value = row
  copyFormData.targetFolderId = ''
  copyFormData.newTitle = ''
  copyDialogVisible.value = true
}

/**
 * 提交复制文档：复制到指定目录并刷新列表
 */
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

/**
 * 打开分享文档弹窗（重置分享对象/权限/过期时间）
 * @param row 目标文档行
 */
const handleShare = (row: DocumentInfo) => {
  currentDocument.value = row
  shareFormData.userIds = []
  shareFormData.permission = 'VIEW'
  shareFormData.expiresAt = ''
  shareDialogVisible.value = true
}

/**
 * 提交分享文档：校验通过后调用分享接口
 */
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
    handleQuery()
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

/**
 * 编辑弹窗关闭时重置表单校验状态
 */
const handleEditDialogClose = () => {
  editFormRef.value?.resetFields()
}

/** ========== 展示辅助 ========== */

/**
 * 平台对应的标签颜色
 * @param platform 平台类型
 * @returns el-tag 类型
 */
const getPlatformTagType = (platform: OfficePlatform) => {
  const typeMap: Record<OfficePlatform, any> = {
    FEISHU: 'primary',
    DINGTALK: 'success',
    WECOM: 'warning',
  }
  return typeMap[platform] || ''
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
    MINDNOTE: 'danger',
    BITABLE: 'info',
    WIKI: '',
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
    MINDNOTE: '思维导图',
    BITABLE: '多维表格',
    WIKI: '知识库',
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
  handleQuery()
  // 加载用户列表，供「分享给」下拉框选择（失败不阻断页面，下拉框留空）
  loadUserList()
})

/**
 * 加载用户列表（分享对象选择器数据源）
 * 取前 100 个用户，映射为 {id, name} 供下拉框渲染
 */
const loadUserList = async () => {
  try {
    const res = await listUsers({ page: 1, size: 100 })
    userList.value = (res.list || []).map((u) => ({ id: u.id, name: u.nickname }))
  } catch {
    // 用户列表拉取失败时分享对象下拉框为空，不阻断文档管理主流程
  }
}
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
