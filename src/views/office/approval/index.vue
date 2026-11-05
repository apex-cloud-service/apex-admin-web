<!--
  办公平台审批管理页面
  ------------------------------------------------------------------
  对接 /api/office/approvals（dev/prod 网关均已声明 /api/office/** 路由）：
  - 待办审批：按当前登录用户 approverId 查询，支持通过/拒绝/详情
  - 已办审批：由「我发起的」中已终结的记录聚合展示
  - 我发起的：查看、详情、撤回，并支持发起新审批
  契约要点：列表元素字段为 processName/currentNode/createdAt，审批操作路径参数为
  processInstanceId；审批人 ID 必填（后端 ApproveRequest @NotBlank，空串会被 400 拒绝）。

  权限要求：
    - office:approval:initiate - 发起审批
    - office:approval:approve - 通过/拒绝待办
    - office:approval:query - 查看审批详情
    - office:approval:cancel - 撤回我发起的审批
-->
<template>
  <div class="approval-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>审批流程管理</span>
          <el-button type="primary" @click="openInitiateDialog" v-permission="'office:approval:initiate'">
            <el-icon><Plus /></el-icon>
            发起审批
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="待办审批" name="pending">
          <el-table v-loading="pendingLoading" :data="pendingApprovals" border stripe>
            <el-table-column prop="processName" label="审批标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="平台" width="100">
              <template #default="{ row }">{{ platformName(row.platform) }}</template>
            </el-table-column>
            <el-table-column prop="initiatorName" label="发起人" width="120" />
            <el-table-column prop="currentNode" label="当前节点" width="140" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ statusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起时间" width="180">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="handleApprove(row)" v-permission="'office:approval:approve'">通过</el-button>
                <el-button link type="danger" @click="handleReject(row)" v-permission="'office:approval:approve'">拒绝</el-button>
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination :total="pendingTotal" @change="onPendingPageChange" />
        </el-tab-pane>

        <el-tab-pane label="已办审批" name="completed">
          <el-table v-loading="completedLoading" :data="completedApprovals" border stripe>
            <el-table-column prop="processName" label="审批标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="平台" width="100">
              <template #default="{ row }">{{ platformName(row.platform) }}</template>
            </el-table-column>
            <el-table-column prop="initiatorName" label="发起人" width="120" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ statusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起时间" width="180">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="完成时间" width="180">
              <template #default="{ row }">{{ formatTime(row.completedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination :total="completedTotal" @change="onCompletedPageChange" />
        </el-tab-pane>

        <el-tab-pane label="我发起的" name="initiated">
          <el-table v-loading="initiatedLoading" :data="initiatedApprovals" border stripe>
            <el-table-column prop="processName" label="审批标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="平台" width="100">
              <template #default="{ row }">{{ platformName(row.platform) }}</template>
            </el-table-column>
            <el-table-column prop="currentNode" label="当前节点" width="140" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ statusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起时间" width="180">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)" v-permission="'office:approval:query'">详情</el-button>
                <el-button
                  v-if="isPending(row.status)"
                  link
                  type="warning"
                  v-permission="'office:approval:cancel'"
                  @click="handleCancel(row)"
                >撤回</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination :total="initiatedTotal" @change="onInitiatedPageChange" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 审批详情抽屉 -->
    <el-drawer v-model="detailVisible" title="审批详情" size="560px">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="审批标题" :span="2">{{ detail.processName }}</el-descriptions-item>
          <el-descriptions-item label="平台">{{ platformName(detail.platform) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detail.status)" size="small">{{ statusName(detail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起人">{{ detail.initiatorName || detail.initiatorId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前节点">{{ detail.currentNode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="流程实例">{{ detail.processInstanceId }}</el-descriptions-item>
          <el-descriptions-item label="发起时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.completedAt" label="完成时间" :span="2">
            {{ formatTime(detail.completedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">表单数据</el-divider>
        <pre class="form-data">{{ prettyFormData }}</pre>

        <el-divider content-position="left">审批记录</el-divider>
        <el-timeline v-if="detail.records?.length">
          <el-timeline-item
            v-for="(record, index) in detail.records"
            :key="index"
            :timestamp="formatTime(record.approveTime)"
            :type="record.action === 'APPROVE' ? 'success' : 'danger'"
          >
            <div>{{ record.approverName || record.approverId }}：{{ actionName(record.action) }}</div>
            <div v-if="record.comment" class="record-comment">{{ record.comment }}</div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无审批记录" :image-size="70" />
      </template>
    </el-drawer>

    <!-- 发起审批对话框 -->
    <el-dialog v-model="initiateVisible" title="发起审批" width="620px">
      <el-form ref="initiateFormRef" :model="initiateForm" :rules="initiateRules" label-width="110px">
        <el-form-item label="平台" prop="platform">
          <el-select v-model="initiateForm.platform" style="width: 100%">
            <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用ID" prop="appId">
          <el-input-number v-model="initiateForm.appId" :min="1" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="流程定义ID" prop="processDefinitionId">
          <el-input v-model="initiateForm.processDefinitionId" placeholder="平台侧流程定义标识" />
        </el-form-item>
        <el-form-item label="发起人ID" prop="initiatorId">
          <el-input v-model="initiateForm.initiatorId" placeholder="默认取当前登录用户" />
        </el-form-item>
        <el-form-item label="表单数据" prop="formData">
          <el-input
            v-model="initiateForm.formData"
            type="textarea"
            :rows="8"
            placeholder='JSON 字符串，如 {"reason": "事假", "days": 1}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="initiateVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInitiate">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 审批流程管理脚本
 * - 待办按当前登录用户 approverId 查询；审批人 ID 取自用户 store（后端 @NotBlank 拒绝空串）
 * - 已办无独立端点，由「我发起的」中已终结记录聚合
 * - 发起审批的发起人默认取当前登录用户
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import {
  approveProcess,
  cancelApproval,
  getApprovalDetail,
  getMyInitiatedApprovals,
  getPendingApprovals,
  initiateApproval,
  type ApprovalProcess,
  type InitiateApprovalRequest,
} from '@/api/office-approval'
import { PLATFORM_NAMES, type OfficePlatform } from '@/api/office-platform'

/** 状态 → 中文名称 */
const STATUS_NAMES: Record<string, string> = {
  PENDING: '待审批',
  IN_PROGRESS: '审批中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已撤回',
}

/** 已终结状态（用于「已办」聚合判断） */
const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED']

const userStore = useUserStore()

/** 当前登录用户 ID（后端以字符串接收 approverId/initiatorId） */
const currentUserId = computed(() => String(userStore.identity?.id ?? ''))

const activeTab = ref('pending')

// ==================== 待办审批 ====================
const pendingLoading = ref(false)
const pendingApprovals = ref<ApprovalProcess[]>([])
const pendingTotal = ref(0)
const pendingPage = reactive({ pageNum: 1, pageSize: 10 })

// ==================== 已办审批（前端聚合） ====================
const completedLoading = ref(false)
const completedApprovals = ref<ApprovalProcess[]>([])
const completedTotal = ref(0)
const completedPage = reactive({ pageNum: 1, pageSize: 10 })

// ==================== 我发起的 ====================
const initiatedLoading = ref(false)
const initiatedApprovals = ref<ApprovalProcess[]>([])
const initiatedTotal = ref(0)
const initiatedPage = reactive({ pageNum: 1, pageSize: 10 })

// ==================== 详情 ====================
const detailVisible = ref(false)
const detail = ref<ApprovalProcess | null>(null)

/** 表单数据格式化展示（非法 JSON 原样输出） */
const prettyFormData = computed(() => {
  const raw = detail.value?.formData
  if (!raw) return '-'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
})

// ==================== 发起审批 ====================
const initiateVisible = ref(false)
const submitting = ref(false)
const initiateFormRef = ref<FormInstance>()
const initiateForm = reactive<InitiateApprovalRequest>({
  platform: 'FEISHU',
  appId: 0,
  processDefinitionId: '',
  initiatorId: '',
  formData: '{\n  \n}',
})
const initiateRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  appId: [{ required: true, message: '请输入应用ID', trigger: 'blur' }],
  processDefinitionId: [{ required: true, message: '请输入流程定义ID', trigger: 'blur' }],
  initiatorId: [{ required: true, message: '请输入发起人ID', trigger: 'blur' }],
  formData: [
    { required: true, message: '请输入表单数据', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        try {
          JSON.parse(value)
        } catch {
          callback(new Error('表单数据必须是合法 JSON'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

/** 平台展示名 */
function platformName(platform?: string): string {
  if (!platform) return '-'
  return PLATFORM_NAMES[platform as OfficePlatform] || platform
}

/** 状态展示名 */
function statusName(status?: string): string {
  if (!status) return '-'
  return STATUS_NAMES[status] || status
}

/** 状态标签样式 */
function statusTagType(status?: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'PENDING' || status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

/** 审批动作展示名 */
function actionName(action?: string): string {
  return action === 'APPROVE' ? '通过' : action === 'REJECT' ? '拒绝' : action || '-'
}

/** 是否处于待处理状态 */
function isPending(status?: string): boolean {
  return status === 'PENDING' || status === 'IN_PROGRESS'
}

/** 时间戳 → 本地化展示 */
function formatTime(time?: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

/** 加载待办审批 */
async function loadPendingApprovals(): Promise<void> {
  if (!currentUserId.value) return
  pendingLoading.value = true
  try {
    const result = await getPendingApprovals({
      approverId: currentUserId.value,
      pageNum: pendingPage.pageNum,
      pageSize: pendingPage.pageSize,
    })
    pendingApprovals.value = result.list || []
    pendingTotal.value = result.total
  } catch (error) {
    showError(error, '加载待办审批失败')
  } finally {
    pendingLoading.value = false
  }
}

/** 加载我发起的审批，并从中聚合已办列表 */
async function loadInitiatedApprovals(): Promise<void> {
  initiatedLoading.value = true
  completedLoading.value = true
  try {
    const result = await getMyInitiatedApprovals({
      pageNum: initiatedPage.pageNum,
      pageSize: initiatedPage.pageSize,
    })
    initiatedApprovals.value = result.list || []
    initiatedTotal.value = result.total
    rebuildCompletedApprovals()
  } catch (error) {
    showError(error, '加载我发起的审批失败')
  } finally {
    initiatedLoading.value = false
    completedLoading.value = false
  }
}

/** 由「我发起的」数据聚合已办列表（后端未提供独立已办端点） */
function rebuildCompletedApprovals(): void {
  const terminal = initiatedApprovals.value.filter((item) =>
    TERMINAL_STATUSES.includes(item.status),
  )
  const start = (completedPage.pageNum - 1) * completedPage.pageSize
  completedApprovals.value = terminal.slice(start, start + completedPage.pageSize)
  completedTotal.value = terminal.length
}

/** 待办分页变化 */
function onPendingPageChange(page: number, size: number): void {
  pendingPage.pageNum = page
  pendingPage.pageSize = size
  loadPendingApprovals()
}

/** 已办分页变化（本地分页） */
function onCompletedPageChange(page: number, size: number): void {
  completedPage.pageNum = page
  completedPage.pageSize = size
  rebuildCompletedApprovals()
}

/** 我发起的分页变化 */
function onInitiatedPageChange(page: number, size: number): void {
  initiatedPage.pageNum = page
  initiatedPage.pageSize = size
  loadInitiatedApprovals()
}

/** 审批通过（携带当前用户 approverId） */
async function handleApprove(row: ApprovalProcess): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认通过「${row.processName}」？`, '提示', { type: 'info' })
  } catch {
    return
  }
  try {
    await approveProcess(row.processInstanceId, {
      approverId: currentUserId.value,
      action: 'APPROVE',
      comment: '',
    })
    ElMessage.success('审批已通过')
    await Promise.all([loadPendingApprovals(), loadInitiatedApprovals()])
  } catch (error) {
    showError(error, '审批操作失败')
  }
}

/** 审批拒绝（携带原因与当前用户 approverId） */
async function handleReject(row: ApprovalProcess): Promise<void> {
  let comment = ''
  try {
    const result = await ElMessageBox.prompt('请输入拒绝原因', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '请输入拒绝原因',
    })
    comment = result.value
  } catch {
    return
  }
  try {
    await approveProcess(row.processInstanceId, {
      approverId: currentUserId.value,
      action: 'REJECT',
      comment,
    })
    ElMessage.success('审批已拒绝')
    await Promise.all([loadPendingApprovals(), loadInitiatedApprovals()])
  } catch (error) {
    showError(error, '审批操作失败')
  }
}

/** 撤回审批 */
async function handleCancel(row: ApprovalProcess): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认撤回「${row.processName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await cancelApproval(row.processInstanceId)
    ElMessage.success('审批已撤回')
    await loadInitiatedApprovals()
  } catch (error) {
    showError(error, '撤回失败')
  }
}

/** 打开详情抽屉（拉取最新详情） */
async function openDetail(row: ApprovalProcess): Promise<void> {
  try {
    detail.value = await getApprovalDetail(row.processInstanceId)
    detailVisible.value = true
  } catch (error) {
    showError(error, '加载审批详情失败')
  }
}

/** 打开发起审批对话框（发起人默认当前用户） */
function openInitiateDialog(): void {
  Object.assign(initiateForm, {
    platform: 'FEISHU',
    appId: 0,
    processDefinitionId: '',
    initiatorId: currentUserId.value,
    formData: '{\n  \n}',
  })
  initiateVisible.value = true
}

/** 提交发起审批 */
async function submitInitiate(): Promise<void> {
  if (!initiateFormRef.value) return
  await initiateFormRef.value.validate()
  submitting.value = true
  try {
    await initiateApproval({ ...initiateForm })
    ElMessage.success('审批已发起')
    initiateVisible.value = false
    activeTab.value = 'initiated'
    initiatedPage.pageNum = 1
    await loadInitiatedApprovals()
  } catch (error) {
    showError(error, '发起审批失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPendingApprovals()
  loadInitiatedApprovals()
})
</script>

<style scoped lang="scss">
.approval-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-data {
  padding: 12px;
  max-height: 260px;
  overflow: auto;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.record-comment {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}
</style>
