<!--
  文档查询页面
  ------------------------------------------------------------------
  功能说明：
  - 文档列表查询（支持分页）
  - 多维度筛选（关键词、类型、分类、状态）
  - 文档详情查看
  - 文档下载
  - 文档新增/编辑/删除
  - 状态管理（草稿/正常/归档）
  
  权限要求：
  - 新增：data:document:create
  - 编辑：data:document:edit
  - 删除：data:document:delete
-->
<template>
  <el-card shadow="never">
    <!-- ========== 查询区 ========== -->
    <el-form inline :model="queryForm" class="query-form">
      <el-form-item label="关键词">
        <el-input v-model="queryForm.keyword" placeholder="标题/内容" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item label="文档类型">
        <el-select v-model="queryForm.docType" placeholder="全部" clearable style="width: 150px">
          <el-option label="合同" value="contract" />
          <el-option label="报告" value="report" />
          <el-option label="方案" value="proposal" />
          <el-option label="手册" value="manual" />
          <el-option label="其他" value="other" />
        </el-select>
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="queryForm.category" placeholder="全部" clearable style="width: 150px">
          <el-option label="技术" value="tech" />
          <el-option label="业务" value="business" />
          <el-option label="财务" value="finance" />
          <el-option label="人力" value="hr" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="草稿" :value="0" />
          <el-option label="正常" :value="1" />
          <el-option label="归档" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- ========== 工具栏 ========== -->
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="handleCreate" v-permission="'data:document:create'">新增文档</el-button>
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <!-- ========== 列表区 ========== -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="200" show-overflow-tooltip />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ getDocTypeName(row.docType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="authorName" label="作者" width="120" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'info' : 'warning'">
            {{ row.status === 1 ? '正常' : row.status === 0 ? '草稿' : '归档' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="查看次数" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="handleView(row)">查看</el-button>
          <el-button link type="primary" :icon="Download" @click="handleDownload(row)" v-if="row.fileUrl">下载</el-button>
          <el-button
            link
            :type="row.status === 1 ? 'warning' : 'success'"
            @click="handleToggleStatus(row)"
          >{{ row.status === 1 ? '归档' : '启用' }}</el-button>
          <el-button link type="warning" :icon="Edit" @click="handleEdit(row)" v-permission="'data:document:edit'">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" v-permission="'data:document:delete'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination :total="total" @change="handlePageChange" />

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="文档类型" prop="docType">
          <el-select v-model="form.docType" placeholder="请选择文档类型" style="width: 100%">
            <el-option label="合同" value="contract" />
            <el-option label="报告" value="report" />
            <el-option label="方案" value="proposal" />
            <el-option label="手册" value="manual" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="技术" value="tech" />
            <el-option label="业务" value="business" />
            <el-option label="财务" value="finance" />
            <el-option label="人力" value="hr" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入文档内容" />
        </el-form-item>
        <el-form-item label="文件URL">
          <el-input v-model="form.fileUrl" placeholder="如有附件，请输入文件URL" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple filterable allow-create placeholder="请输入标签" style="width: 100%">
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="0">草稿</el-radio>
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="2">归档</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewDialogVisible" title="文档详情" width="900px">
      <el-descriptions v-if="currentDoc" :column="2" border>
        <el-descriptions-item label="标题">{{ currentDoc.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getDocTypeName(currentDoc.docType) }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ currentDoc.category }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ currentDoc.authorName }}</el-descriptions-item>
        <el-descriptions-item label="查看次数">{{ currentDoc.viewCount }}</el-descriptions-item>
        <el-descriptions-item label="下载次数">{{ currentDoc.downloadCount }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentDoc.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ currentDoc.updateTime }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="tag in currentDoc.tags" :key="tag" style="margin-right: 8px">{{ tag }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <div style="white-space: pre-wrap">{{ currentDoc.content }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 文档查询页面脚本
 * ------------------------------------------------------------------
 * 实现文档的 CRUD 操作、状态管理、查看下载等功能
 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Plus, Edit, Delete, View, Download } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { listDocuments, createDocument, updateDocument, deleteDocument, getDocumentDetail, downloadDocument, updateDocumentStatus } from '@/api/document'
import type { Document } from '@/types'
import { showError } from '@/utils/request'

/** 列表加载状态 */
const loading = ref(false)
/** 文档列表数据 */
const list = ref<Document[]>([])
/** 总条数 */
const total = ref(0)

/** 查询表单 */
const queryForm = reactive({
  keyword: '',
  docType: '',
  category: '',
  status: undefined as number | undefined,
  page: 1,
  size: 20
})

/** 新增/编辑对话框显示状态 */
const dialogVisible = ref(false)
/** 对话框标题 */
const dialogTitle = ref('')
/** 提交中状态 */
const submitting = ref(false)
/** 表单引用 */
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive({
  id: '',
  title: '',
  docType: '',
  category: '',
  content: '',
  fileUrl: '',
  tags: [] as string[],
  status: 1
})

/** 表单校验规则 */
const rules: FormRules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
  docType: [{ required: true, message: '请选择文档类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

/** 查看对话框显示状态 */
const viewDialogVisible = ref(false)
/** 当前查看的文档 */
const currentDoc = ref<Document | null>(null)

/**
 * 获取文档类型显示名称
 * @param type 文档类型编码
 * @returns 文档类型显示名称
 */
const getDocTypeName = (type: string): string => {
  const map: Record<string, string> = {
    contract: '合同',
    report: '报告',
    proposal: '方案',
    manual: '手册',
    other: '其他'
  }
  return map[type] || type
}

/**
 * 加载文档列表
 */
const fetchList = async (): Promise<void> => {
  loading.value = true
  try {
    const res = await listDocuments(queryForm)
    list.value = res.list
    total.value = res.total
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 处理查询按钮点击
 */
const handleQuery = (): void => {
  queryForm.page = 1
  fetchList()
}

/**
 * 处理重置按钮点击
 */
const handleReset = (): void => {
  queryForm.keyword = ''
  queryForm.docType = ''
  queryForm.category = ''
  queryForm.status = undefined
  queryForm.page = 1
  fetchList()
}

/**
 * 处理分页变化
 * @param page 当前页码
 * @param size 每页条数
 */
const handlePageChange = (page: number, size: number): void => {
  queryForm.page = page
  queryForm.size = size
  fetchList()
}

/**
 * 处理新增按钮点击
 */
const handleCreate = (): void => {
  dialogTitle.value = '新增文档'
  Object.assign(form, {
    id: '',
    title: '',
    docType: '',
    category: '',
    content: '',
    fileUrl: '',
    tags: [],
    status: 1
  })
  dialogVisible.value = true
}

/**
 * 处理编辑按钮点击
 * @param row 文档行数据
 */
const handleEdit = async (row: Document): Promise<void> => {
  dialogTitle.value = '编辑文档'
  try {
    const detail = await getDocumentDetail(row.id)
    Object.assign(form, {
      id: detail.id,
      title: detail.title,
      docType: detail.docType,
      category: detail.category,
      content: detail.content,
      fileUrl: detail.fileUrl,
      tags: detail.tags || [],
      status: detail.status
    })
    dialogVisible.value = true
  } catch (error) {
    showError(error)
  }
}

/**
 * 处理查看按钮点击
 * @param row 文档行数据
 */
const handleView = async (row: Document): Promise<void> => {
  try {
    currentDoc.value = await getDocumentDetail(row.id)
    viewDialogVisible.value = true
  } catch (error) {
    showError(error)
  }
}

/**
 * 处理下载按钮点击
 * @param row 文档行数据
 */
const handleDownload = async (row: Document): Promise<void> => {
  try {
    await downloadDocument(row.id)
    ElMessage.success('下载成功')
  } catch (error) {
    showError(error)
  }
}

/**
 * 处理删除按钮点击
 * @param row 文档行数据
 */
const handleDelete = (row: Document): void => {
  ElMessageBox.confirm(`确定删除文档「${row.title}」吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteDocument(row.id)
      ElMessage.success('删除成功')
      fetchList()
    } catch (error) {
      showError(error)
    }
  }).catch(() => {})
}

/**
 * 切换文档状态：正常(1) ↔ 归档(2)，草稿(0) 一律启用为正常
 */
const handleToggleStatus = (row: Document): void => {
  const next = row.status === 1 ? 2 : 1
  const action = next === 1 ? '启用' : '归档'
  ElMessageBox.confirm(`确定${action}文档「${row.title}」吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await updateDocumentStatus(row.id, next)
      ElMessage.success(`${action}成功`)
      fetchList()
    } catch (error) {
      showError(error)
    }
  }).catch(() => {})
}

/**
 * 处理表单提交
 */
const handleSubmit = async (): Promise<void> => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (form.id) {
        await updateDocument(form.id, {
          title: form.title,
          docType: form.docType,
          category: form.category,
          content: form.content,
          fileUrl: form.fileUrl,
          tags: form.tags,
          status: form.status
        })
        ElMessage.success('更新成功')
      } else {
        await createDocument({
          title: form.title,
          docType: form.docType,
          category: form.category,
          content: form.content,
          fileUrl: form.fileUrl,
          tags: form.tags,
          status: form.status
        })
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } catch (error) {
      showError(error)
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 处理对话框关闭
 */
const handleDialogClose = (): void => {
  formRef.value?.resetFields()
}

fetchList()
</script>

<style scoped>
.query-form {
  margin-bottom: 16px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
