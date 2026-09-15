<template>
  <div class="approval-container">
    <el-card class="header-card">
      <h2>审批对接</h2>
      <p class="description">管理飞书、钉钉、企业微信的审批流程</p>
    </el-card>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 待审批列表 -->
      <el-tab-pane label="待审批" name="pending">
        <el-card>
          <template #header>
            <div class="card-header">
              <div>
                <el-icon><Clock /></el-icon>
                <span>待我审批的流程</span>
                <el-badge :value="pendingCount" :max="99" style="margin-left: 12px" />
              </div>
              <el-button size="small" @click="loadPendingApprovals">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <el-table :data="pendingApprovals" v-loading="pendingLoading" stripe>
            <el-table-column prop="processInstanceId" label="流程ID" width="180" />
            <el-table-column label="平台" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getPlatformName(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="审批标题" show-overflow-tooltip />
            <el-table-column prop="initiatorName" label="发起人" width="120" />
            <el-table-column prop="initiateTime" label="发起时间" width="180" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="warning">
                  {{ getApprovalStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" text @click="viewApprovalDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button size="small" type="success" text @click="handleApprove(row, 'APPROVE')">
                  <el-icon><Select /></el-icon>
                  通过
                </el-button>
                <el-button size="small" type="danger" text @click="handleApprove(row, 'REJECT')">
                  <el-icon><CloseBold /></el-icon>
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="pendingPagination.pageNum"
            v-model:page-size="pendingPagination.pageSize"
            :total="pendingPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadPendingApprovals"
            @size-change="loadPendingApprovals"
            style="margin-top: 20px; justify-content: flex-end"
          />
        </el-card>
      </el-tab-pane>

      <!-- 我发起的审批 -->
      <el-tab-pane label="我发起的" name="initiated">
        <el-card>
          <template #header>
            <div class="card-header">
              <div>
                <el-icon><Promotion /></el-icon>
                <span>我发起的审批流程</span>
              </div>
              <div style="display: flex; gap: 12px">
                <el-select
                  v-model="initiatedFilters.status"
                  placeholder="全部状态"
                  clearable
                  size="small"
                  style="width: 120px"
                  @change="loadInitiatedApprovals"
                >
                  <el-option label="待审批" value="PENDING" />
                  <el-option label="审批中" value="IN_PROGRESS" />
                  <el-option label="已通过" value="APPROVED" />
                  <el-option label="已拒绝" value="REJECTED" />
                  <el-option label="已撤销" value="CANCELLED" />
                </el-select>
                <el-button size="small" type="primary" @click="showInitiateDialog">
                  <el-icon><Plus /></el-icon>
                  发起审批
                </el-button>
                <el-button size="small" @click="loadInitiatedApprovals">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="initiatedApprovals" v-loading="initiatedLoading" stripe>
            <el-table-column prop="processInstanceId" label="流程ID" width="180" />
            <el-table-column label="平台" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getPlatformName(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="审批标题" show-overflow-tooltip />
            <el-table-column prop="initiateTime" label="发起时间" width="180" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="getStatusTagType(row.status)"
                >
                  {{ getApprovalStatusName(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="finishTime" label="完成时间" width="180" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" text @click="viewApprovalDetail(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button
                  v-if="row.status === 'PENDING' || row.status === 'IN_PROGRESS'"
                  size="small"
                  type="danger"
                  text
                  @click="handleCancel(row)"
                >
                  <el-icon><Delete /></el-icon>
                  撤销
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="initiatedPagination.pageNum"
            v-model:page-size="initiatedPagination.pageSize"
            :total="initiatedPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadInitiatedApprovals"
            @size-change="loadInitiatedApprovals"
            style="margin-top: 20px; justify-content: flex-end"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 发起审批弹窗 -->
    <el-dialog v-model="initiateDialogVisible" title="发起审批" width="600px">
      <el-form ref="initiateFormRef" :model="initiateForm" :rules="initiateRules" label-width="100px">
        <el-form-item label="平台" prop="platform">
          <el-select v-model="initiateForm.platform" placeholder="请选择平台">
            <el-option label="飞书" value="FEISHU" />
            <el-option label="钉钉" value="DINGTALK" />
            <el-option label="企业微信" value="WECOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批代码" prop="approvalCode">
          <el-input
            v-model="initiateForm.approvalCode"
            placeholder="请输入审批定义代码"
          />
          <div class="form-tip">提示：对应平台侧的审批模板代码</div>
        </el-form-item>
        <el-form-item label="审批标题" prop="title">
          <el-input v-model="initiateForm.title" placeholder="请输入审批标题" />
        </el-form-item>
        <el-form-item label="发起人ID" prop="initiatorId">
          <el-input v-model="initiateForm.initiatorId" placeholder="请输入发起人ID" />
        </el-form-item>
        <el-form-item label="审批人ID" prop="approverIds">
          <el-input
            v-model="initiateForm.approverIds"
            placeholder="多个审批人ID用逗号分隔"
          />
        </el-form-item>
        <el-form-item label="表单数据" prop="formData">
          <el-input
            v-model="initiateForm.formData"
            type="textarea"
            :rows="6"
            placeholder="请输入表单数据（JSON格式）"
          />
          <div class="form-tip">提示：需要符合审批模板的表单字段定义</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="initiateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleInitiate" :loading="initiating">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="审批详情" width="800px">
      <el-descriptions :column="2" border v-if="currentApproval">
        <el-descriptions-item label="流程ID" :span="2">
          {{ currentApproval.processInstanceId }}
        </el-descriptions-item>
        <el-descriptions-item label="平台">
          {{ getPlatformName(currentApproval.platform) }}
        </el-descriptions-item>
        <el-descriptions-item label="审批代码">
          {{ currentApproval.approvalCode }}
        </el-descriptions-item>
        <el-descriptions-item label="审批标题" :span="2">
          {{ currentApproval.title }}
        </el-descriptions-item>
        <el-descriptions-item label="发起人">
          {{ currentApproval.initiatorName }} ({{ currentApproval.initiatorId }})
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentApproval.status)">
            {{ getApprovalStatusName(currentApproval.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发起时间">
          {{ currentApproval.initiateTime }}
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">
          {{ currentApproval.finishTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="表单数据" :span="2">
          <pre style="margin: 0; max-height: 200px; overflow: auto">{{
            formatJson(currentApproval.formData)
          }}</pre>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">审批记录</el-divider>

      <el-timeline v-if="currentApproval && currentApproval.records.length > 0">
        <el-timeline-item
          v-for="(record, index) in currentApproval.records"
          :key="index"
          :timestamp="record.approveTime"
          placement="top"
          :type="record.action === 'APPROVE' ? 'success' : 'danger'"
        >
          <el-card>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
              <strong>{{ record.approverName }}</strong>
              <el-tag size="small" :type="record.action === 'APPROVE' ? 'success' : 'danger'">
                {{ getApprovalActionName(record.action) }}
              </el-tag>
            </div>
            <div v-if="record.comment" style="color: #666">{{ record.comment }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无审批记录" />
    </el-dialog>

    <!-- 审批操作弹窗 -->
    <el-dialog v-model="approveDialogVisible" :title="approveDialogTitle" width="500px">
      <el-form :model="approveForm" label-width="100px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approveForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见（可选）"
          />
        </el-form-item>
        <el-form-item
          v-if="approveForm.action === 'TRANSFER'"
          label="转审目标"
        >
          <el-input
            v-model="approveForm.targetApproverId"
            placeholder="请输入目标审批人ID"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button
          :type="approveForm.action === 'APPROVE' ? 'success' : 'danger'"
          @click="confirmApprove"
          :loading="approving"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Clock,
  Promotion,
  View,
  Select,
  CloseBold,
  Delete,
  Plus,
  Refresh,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  initiateApproval,
  getApprovalDetail,
  approveProcess,
  cancelApproval,
  getPendingApprovals,
  getMyInitiatedApprovals,
  getPlatformName,
  getApprovalStatusName,
  getApprovalActionName,
  type ApprovalProcess,
  type ApprovalStatus,
  type OfficePlatform,
  type InitiateApprovalRequest,
  type ApproveProcessRequest,
} from '@/api/office'

const userStore = useUserStore()

// 当前标签页
const activeTab = ref('pending')

// 待审批列表
const pendingApprovals = ref<ApprovalProcess[]>([])
const pendingLoading = ref(false)
const pendingPagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})
const pendingCount = computed(() => pendingPagination.total)

// 我发起的审批
const initiatedApprovals = ref<ApprovalProcess[]>([])
const initiatedLoading = ref(false)
const initiatedPagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})
const initiatedFilters = reactive({
  status: '' as ApprovalStatus | '',
})

// 发起审批
const initiateDialogVisible = ref(false)
const initiateFormRef = ref<FormInstance>()
const initiateForm = reactive({
  platform: 'FEISHU' as OfficePlatform,
  approvalCode: '',
  title: '',
  initiatorId: '',
  approverIds: '',
  formData: '',
})
const initiateRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  approvalCode: [{ required: true, message: '请输入审批代码', trigger: 'blur' }],
  title: [{ required: true, message: '请输入审批标题', trigger: 'blur' }],
  initiatorId: [{ required: true, message: '请输入发起人ID', trigger: 'blur' }],
  formData: [{ required: true, message: '请输入表单数据', trigger: 'blur' }],
}
const initiating = ref(false)

// 审批详情
const detailDialogVisible = ref(false)
const currentApproval = ref<ApprovalProcess | null>(null)

// 审批操作
const approveDialogVisible = ref(false)
const approveDialogTitle = computed(() => {
  return approveForm.action === 'APPROVE' ? '通过审批' : '拒绝审批'
})
const approveForm = reactive({
  processInstanceId: '',
  action: 'APPROVE' as 'APPROVE' | 'REJECT' | 'TRANSFER',
  comment: '',
  targetApproverId: '',
})
const approving = ref(false)

/**
 * 标签页切换
 */
const handleTabChange = (name: string) => {
  if (name === 'pending') {
    loadPendingApprovals()
  } else if (name === 'initiated') {
    loadInitiatedApprovals()
  }
}

/**
 * 加载待审批列表
 */
const loadPendingApprovals = async () => {
  try {
    pendingLoading.value = true
    const response = await getPendingApprovals({
      approverId: userStore.userInfo?.id?.toString() || '',
      pageNum: pendingPagination.pageNum,
      pageSize: pendingPagination.pageSize,
    })
    pendingApprovals.value = response.records || []
    pendingPagination.total = response.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    pendingLoading.value = false
  }
}

/**
 * 加载我发起的审批
 */
const loadInitiatedApprovals = async () => {
  try {
    initiatedLoading.value = true
    const response = await getMyInitiatedApprovals({
      initiatorId: userStore.userInfo?.id?.toString() || '',
      status: initiatedFilters.status || undefined,
      pageNum: initiatedPagination.pageNum,
      pageSize: initiatedPagination.pageSize,
    })
    initiatedApprovals.value = response.records || []
    initiatedPagination.total = response.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    initiatedLoading.value = false
  }
}

/**
 * 显示发起审批弹窗
 */
const showInitiateDialog = () => {
  initiateForm.platform = 'FEISHU'
  initiateForm.approvalCode = ''
  initiateForm.title = ''
  initiateForm.initiatorId = userStore.userInfo?.id?.toString() || ''
  initiateForm.approverIds = ''
  initiateForm.formData = JSON.stringify({ field1: 'value1', field2: 'value2' }, null, 2)
  initiateDialogVisible.value = true
}

/**
 * 发起审批
 */
const handleInitiate = async () => {
  if (!initiateFormRef.value) return

  await initiateFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      initiating.value = true
      const request: InitiateApprovalRequest = {
        platform: initiateForm.platform,
        approvalCode: initiateForm.approvalCode,
        title: initiateForm.title,
        initiatorId: initiateForm.initiatorId,
        formData: initiateForm.formData,
        approverIds: initiateForm.approverIds || undefined,
      }
      await initiateApproval(request)
      ElMessage.success('审批发起成功')
      initiateDialogVisible.value = false
      loadInitiatedApprovals()
    } catch (error: any) {
      ElMessage.error(error.message || '发起失败')
    } finally {
      initiating.value = false
    }
  })
}

/**
 * 查看审批详情
 */
const viewApprovalDetail = async (approval: ApprovalProcess) => {
  try {
    const detail = await getApprovalDetail(approval.processInstanceId)
    currentApproval.value = detail
    detailDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '加载详情失败')
  }
}

/**
 * 审批操作（通过/拒绝）
 */
const handleApprove = (approval: ApprovalProcess, action: 'APPROVE' | 'REJECT') => {
  approveForm.processInstanceId = approval.processInstanceId
  approveForm.action = action
  approveForm.comment = ''
  approveForm.targetApproverId = ''
  approveDialogVisible.value = true
}

/**
 * 确认审批
 */
const confirmApprove = async () => {
  try {
    approving.value = true
    const request: ApproveProcessRequest = {
      approverId: userStore.userInfo?.id?.toString() || '',
      action: approveForm.action,
      comment: approveForm.comment || undefined,
      targetApproverId: approveForm.targetApproverId || undefined,
    }
    await approveProcess(approveForm.processInstanceId, request)
    ElMessage.success('审批操作成功')
    approveDialogVisible.value = false
    loadPendingApprovals()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    approving.value = false
  }
}

/**
 * 撤销审批
 */
const handleCancel = async (approval: ApprovalProcess) => {
  try {
    await ElMessageBox.confirm('确认要撤销此审批吗？', '提示', {
      type: 'warning',
    })
    await cancelApproval(approval.processInstanceId)
    ElMessage.success('撤销成功')
    loadInitiatedApprovals()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '撤销失败')
    }
  }
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status: ApprovalStatus) => {
  const typeMap: Record<ApprovalStatus, any> = {
    PENDING: 'warning',
    IN_PROGRESS: 'primary',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info',
    TRANSFERRED: 'info',
  }
  return typeMap[status] || 'info'
}

/**
 * 格式化JSON
 */
const formatJson = (json: string) => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

onMounted(() => {
  loadPendingApprovals()
})
</script>

<style scoped lang="scss">
.approval-container {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    > div {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
