<!--
  知识空间管理页面
  ------------------------------------------------------------------
  功能：知识空间的查询、新建、编辑、删除（租户内唯一名称约束）。
  权限要求：kb:space:read（页面）、kb:space:create（新建）、
           kb:space:update（编辑）、kb:space:delete（删除）。
  菜单组件路径：knowledge/space/index
-->
<template>
  <div class="space-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识空间管理</span>
          <el-button
            type="primary"
            :icon="Plus"
            v-permission="'kb:space:create'"
            @click="openCreateDialog"
          >
            新建空间
          </el-button>
        </div>
      </template>

      <el-form inline :model="queryForm" class="query-form" @submit.prevent>
        <el-form-item label="名称">
          <el-input
            v-model="queryForm.keyword"
            placeholder="按名称模糊查询"
            clearable
            style="width: 220px"
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
        <el-table-column prop="name" label="空间名称" min-width="160" />
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="Edit"
              v-permission="'kb:space:update'"
              @click="openEditDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              v-permission="'kb:space:delete'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination :total="total" @change="handlePageChange" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="空间名称" prop="name">
          <el-input v-model="form.name" placeholder="租户内唯一，最长 64 字符" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="可选，最长 512 字符"
            maxlength="512"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { createSpace, deleteSpace, listSpaces, updateSpace } from '@/api/knowledge'
import type { KnowledgeSpace } from '@/types'
import { showError } from '@/utils/request'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const submitting = ref(false)
const list = ref<KnowledgeSpace[]>([])
const total = ref(0)

const queryForm = reactive({ page: 1, size: 20, keyword: '' })

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({ name: '', description: '', status: 1 })

const rules: FormRules = {
  name: [{ required: true, message: '请输入空间名称', trigger: 'blur' }],
}

const dialogTitle = ref('新建空间')

/** 加载空间分页列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listSpaces({ ...queryForm })
    list.value = result.list
    total.value = result.total
  } catch (error) {
    showError(error, '加载知识空间失败')
  } finally {
    loading.value = false
  }
}

/** 查询（回到第一页） */
function handleSearch(): void {
  queryForm.page = 1
  void fetchList()
}

/** 重置查询条件 */
function handleReset(): void {
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

/** 打开新建对话框 */
function openCreateDialog(): void {
  editingId.value = null
  dialogTitle.value = '新建空间'
  dialogVisible.value = true
}

/** 打开编辑对话框 */
function openEditDialog(row: KnowledgeSpace): void {
  editingId.value = row.id
  dialogTitle.value = '编辑空间'
  form.name = row.name
  form.description = row.description ?? ''
  form.status = row.status
  dialogVisible.value = true
}

/** 提交新建/编辑 */
async function handleSubmit(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload = { name: form.name, description: form.description, status: form.status }
    if (editingId.value === null) {
      await createSpace(payload)
      ElMessage.success('空间创建成功')
    } else {
      await updateSpace(editingId.value, payload)
      ElMessage.success('空间更新成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (error) {
    showError(error, editingId.value === null ? '空间创建失败' : '空间更新失败')
  } finally {
    submitting.value = false
  }
}

/** 删除空间 */
async function handleDelete(row: KnowledgeSpace): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除空间「${row.name}」吗？空间下仍有文档时将拒绝删除。`, '删除确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteSpace(row.id)
    ElMessage.success('空间删除成功')
    await fetchList()
  } catch (error) {
    showError(error, '空间删除失败')
  }
}

/** 对话框关闭时重置表单 */
function handleDialogClose(): void {
  form.name = ''
  form.description = ''
  form.status = 1
  editingId.value = null
  formRef.value?.clearValidate()
}

onMounted(() => {
  void fetchList()
})
</script>

<style scoped>
.space-page {
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
</style>
