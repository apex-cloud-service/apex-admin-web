<!--
  工作流定义管理
  ------------------------------------------------------------------
  流程定义台账（/api/v2/workflow-definitions）：
  - 分页查询（workflowCode 精确、status 筛 DRAFT/PUBLISHED/DISABLED）
  - 新建（流程编码 + DAG JSON）、编辑（仅草稿可改）、校验、发布、启停
  - 查看同编码的历史版本
  契约要点：写接口返回领域对象（workflowCode/workflowName/dagJson/enabled:number），
  查询接口返回 DTO（code/name/enabled:boolean），字段名不同不可混用。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>工作流定义</span>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建流程定义</el-button>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="流程编码">
        <el-input v-model="query.workflowCode" placeholder="精确匹配" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="已禁用" value="DISABLED" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="code" label="流程编码" width="180">
        <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="name" label="流程名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="version" label="版本" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="publishedAt" label="发布时间" width="170" />
      <el-table-column label="节点/连线" width="110">
        <template #default="{ row }">
          {{ row.nodes?.length ?? 0 }} / {{ row.edges?.length ?? 0 }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 'DRAFT'"
            link
            type="primary"
            @click="openEditDialog(row)"
          >编辑</el-button>
          <el-button link type="primary" @click="handleValidate(row)">校验</el-button>
          <el-button
            v-if="row.status === 'DRAFT'"
            link
            type="success"
            @click="handlePublish(row)"
          >发布</el-button>
          <el-button
            v-if="row.status === 'PUBLISHED' || row.status === 'DISABLED'"
            link
            :type="row.enabled ? 'warning' : 'success'"
            @click="handleToggle(row)"
          >{{ row.enabled ? '停用' : '启用' }}</el-button>
          <el-button link type="primary" @click="openVersions(row)">版本</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" @change="onPageChange" />

    <!-- 新建 / 编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑流程定义（仅草稿）' : '新建流程定义'"
      width="760px"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="110px">
        <el-form-item label="流程编码" prop="workflowCode">
          <el-input
            v-model="form.workflowCode"
            :disabled="!!editingId"
            placeholder="字母开头，仅字母/数字/下划线/短横线，如 leave-approval"
          />
        </el-form-item>
        <el-form-item label="流程名称" prop="workflowName">
          <el-input v-model="form.workflowName" placeholder="流程显示名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="DAG JSON" prop="dagJson">
          <el-input
            v-model="form.dagJson"
            type="textarea"
            :rows="12"
            maxlength="60000"
            show-word-limit
            placeholder='{"nodes":[{"nodeId":"start","nodeType":"START","nodeName":"开始"}],"edges":[]}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="detailVisible" title="流程定义详情" size="620px">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="流程编码">{{ detail.code }}</el-descriptions-item>
          <el-descriptions-item label="流程名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ detail.version }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusName(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ detail.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发布时间" :span="2">{{ detail.publishedAt || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">节点</el-divider>
        <el-table :data="detail.nodes || []" border size="small">
          <el-table-column prop="nodeId" label="节点ID" width="130" />
          <el-table-column prop="nodeType" label="类型" width="100" />
          <el-table-column prop="nodeName" label="名称" min-width="120" />
          <el-table-column prop="approverType" label="审批人类型" width="130" />
          <el-table-column prop="approvalStrategy" label="策略" width="100" />
        </el-table>

        <el-divider content-position="left">连线</el-divider>
        <el-table :data="detail.edges || []" border size="small">
          <el-table-column prop="edgeId" label="连线ID" width="120" />
          <el-table-column prop="sourceNodeId" label="源节点" min-width="120" />
          <el-table-column prop="targetNodeId" label="目标节点" min-width="120" />
          <el-table-column prop="condition" label="条件" min-width="140" show-overflow-tooltip />
        </el-table>
      </template>
    </el-drawer>

    <!-- 历史版本 -->
    <el-dialog v-model="versionsVisible" title="历史版本" width="720px">
      <el-table v-loading="versionsLoading" :data="versions" border stripe>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" width="170" />
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 工作流定义管理脚本
 * - 查询/新建/编辑（仅草稿）/校验/发布/启停/历史版本
 * - DAG JSON 在前端做可解析性校验，结构合法性由后端 validate 兜底
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  createWorkflowDefinition,
  getWorkflowDefinition,
  listWorkflowDefinitionVersions,
  listWorkflowDefinitions,
  publishWorkflowDefinition,
  toggleWorkflowDefinition,
  updateWorkflowDefinition,
  validateWorkflowDefinition,
} from '@/api/workflow'
import type { WorkflowDefinitionInfo } from '@/types/workflow'

/** 状态 → 中文名称 */
const STATUS_NAMES: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  DISABLED: '已禁用',
}

const loading = ref(false)
const saving = ref(false)
const list = ref<WorkflowDefinitionInfo[]>([])
const total = ref(0)
const query = reactive<{ workflowCode?: string; status?: string; pageNum: number; pageSize: number }>({
  pageNum: 1,
  pageSize: 10,
})

/** 表单状态（新建与编辑共用，编辑时不提交 workflowCode） */
const formVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  workflowCode: '',
  workflowName: '',
  description: '',
  dagJson: '',
})
const formRules: FormRules = {
  workflowCode: [
    { required: true, message: '请输入流程编码', trigger: 'blur' },
    {
      pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
      message: '需字母开头，仅含字母、数字、下划线或短横线',
      trigger: 'blur',
    },
    { max: 100, message: '最长 100 位', trigger: 'blur' },
  ],
  workflowName: [
    { required: true, message: '请输入流程名称', trigger: 'blur' },
    { max: 200, message: '最长 200 位', trigger: 'blur' },
  ],
  dagJson: [
    { required: true, message: '请输入 DAG JSON', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        try {
          const parsed = JSON.parse(value)
          if (!parsed || typeof parsed !== 'object') {
            callback(new Error('DAG 必须是 JSON 对象'))
            return
          }
        } catch {
          callback(new Error('DAG 不是合法 JSON'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const detailVisible = ref(false)
const detail = ref<WorkflowDefinitionInfo | null>(null)

const versionsVisible = ref(false)
const versionsLoading = ref(false)
const versions = ref<WorkflowDefinitionInfo[]>([])

/** 状态展示名 */
function statusName(status: string): string {
  return STATUS_NAMES[status] || status
}

/** 状态标签样式 */
function statusTagType(status: string): 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'PUBLISHED') return 'success'
  if (status === 'DISABLED') return 'info'
  if (status === 'DRAFT') return 'warning'
  return 'info'
}

/** 拉取流程定义列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listWorkflowDefinitions(query)
    list.value = result.list || []
    total.value = result.total
  } catch (error) {
    showError(error, '加载流程定义失败')
  } finally {
    loading.value = false
  }
}

/** 查询：重置第一页 */
function search(): void {
  query.pageNum = 1
  fetchList()
}

/** 重置查询条件 */
function reset(): void {
  query.workflowCode = undefined
  query.status = undefined
  search()
}

/** 分页变化 */
function onPageChange(page: number, size: number): void {
  query.pageNum = page
  query.pageSize = size
  fetchList()
}

/** 打开新建对话框 */
function openCreateDialog(): void {
  editingId.value = null
  Object.assign(form, {
    workflowCode: '',
    workflowName: '',
    description: '',
    dagJson: '{\n  "nodes": [],\n  "edges": []\n}',
  })
  formVisible.value = true
}

/** 打开编辑对话框（回填字段；写接口字段名为 workflowName/dagJson） */
async function openEditDialog(row: WorkflowDefinitionInfo): Promise<void> {
  try {
    const full = await getWorkflowDefinition(row.id)
    editingId.value = row.id
    Object.assign(form, {
      workflowCode: full.code,
      workflowName: full.name,
      description: full.description || '',
      dagJson:
        row.id != null
          ? JSON.stringify({ nodes: full.nodes ?? [], edges: full.edges ?? [] }, null, 2)
          : '{\n  "nodes": [],\n  "edges": []\n}',
    })
    formVisible.value = true
  } catch (error) {
    showError(error, '加载流程定义详情失败')
  }
}

/** 提交新建/编辑（编辑不提交 workflowCode） */
async function submitForm(): Promise<void> {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await updateWorkflowDefinition(editingId.value, {
        workflowName: form.workflowName,
        description: form.description || undefined,
        dagJson: form.dagJson,
      })
      ElMessage.success('流程定义已更新')
    } else {
      await createWorkflowDefinition({
        workflowCode: form.workflowCode.trim(),
        workflowName: form.workflowName,
        description: form.description || undefined,
        dagJson: form.dagJson,
      })
      ElMessage.success('流程定义已创建')
    }
    formVisible.value = false
    fetchList()
  } catch (error) {
    showError(error, '保存流程定义失败')
  } finally {
    saving.value = false
  }
}

/** 打开详情抽屉 */
async function openDetail(row: WorkflowDefinitionInfo): Promise<void> {
  try {
    detail.value = await getWorkflowDefinition(row.id)
    detailVisible.value = true
  } catch (error) {
    showError(error, '加载详情失败')
  }
}

/** 校验 DAG 结构 */
async function handleValidate(row: WorkflowDefinitionInfo): Promise<void> {
  try {
    await validateWorkflowDefinition(row.id)
    ElMessage.success('DAG 校验通过')
  } catch (error) {
    showError(error, 'DAG 校验未通过')
  }
}

/** 发布流程定义 */
async function handlePublish(row: WorkflowDefinitionInfo): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认发布「${row.name}」？发布后不可再编辑。`, '提示', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await publishWorkflowDefinition(row.id)
    ElMessage.success('已发布')
    fetchList()
  } catch (error) {
    showError(error, '发布失败')
  }
}

/** 启用/停用流程定义 */
async function handleToggle(row: WorkflowDefinitionInfo): Promise<void> {
  try {
    await toggleWorkflowDefinition(row.id, !row.enabled)
    ElMessage.success('状态已更新')
    fetchList()
  } catch (error) {
    showError(error, '更新状态失败')
  }
}

/** 打开历史版本对话框 */
async function openVersions(row: WorkflowDefinitionInfo): Promise<void> {
  versionsVisible.value = true
  versionsLoading.value = true
  try {
    versions.value = await listWorkflowDefinitionVersions(row.id)
  } catch (error) {
    showError(error, '加载历史版本失败')
  } finally {
    versionsLoading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-form {
  margin-bottom: 8px;
}
</style>
