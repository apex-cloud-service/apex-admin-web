<template>
  <div v-loading="loading" class="workflow-instance-detail">
    <el-page-header @back="handleBack">
      <template #content>
        <span style="font-size: 18px; font-weight: bold">流程实例详情</span>
      </template>
    </el-page-header>

    <div v-if="detail" style="margin-top: 20px">
      <el-card style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>基本信息</span>
            <div class="action-buttons">
              <el-button
                v-if="detail.instance.status === 'RUNNING' && !detail.instance.suspended"
                type="warning"
                @click="handleSuspend"
              >
                挂起流程
              </el-button>
              
              <el-button
                v-if="detail.instance.suspended"
                type="success"
                @click="handleResume"
              >
                恢复流程
              </el-button>
            </div>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="流程ID">{{ detail.instance.id }}</el-descriptions-item>
          <el-descriptions-item label="流程标题">{{ detail.instance.title }}</el-descriptions-item>
          <el-descriptions-item label="流程编码">{{ detail.instance.processCode }}</el-descriptions-item>
          <el-descriptions-item label="业务键">{{ detail.instance.businessKey }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detail.instance.status)">
              {{ getStatusLabel(detail.instance.status) }}
              <span v-if="detail.instance.suspended">(已挂起)</span>
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起人">{{ detail.instance.initiatorName }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ detail.instance.startTime }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ detail.instance.endTime || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card>
        <template #header>
          <span>任务列表</span>
        </template>
        <el-table :data="detail.tasks" border>
          <el-table-column prop="id" label="任务ID" width="80" />
          <el-table-column prop="taskName" label="任务名称" min-width="150" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusType(row.status)">
                {{ getTaskStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assigneeName" label="办理人" width="120" />
          <el-table-column label="超时信息" width="180">
            <template #default="{ row }">
              <div v-if="row.timeoutAt">
                <div>{{ row.timeoutAt }}</div>
                <el-tag v-if="isTimeout(row.timeoutAt)" type="danger" size="small">
                  已超时
                </el-tag>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="转办信息" width="150">
            <template #default="{ row }">
              <span v-if="row.transferredFromName">
                <el-tag type="info" size="small">转办</el-tag>
                来自 {{ row.transferredFromName }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="comment" label="审批意见" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.comment || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="开始时间" width="180" />
          <el-table-column prop="completedTime" label="完成时间" width="180">
            <template #default="{ row }">
              {{ row.completedTime || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    
    <!-- 挂起对话框 -->
    <el-dialog v-model="suspendDialogVisible" title="挂起流程" width="500px">
      <el-form :model="suspendForm" label-width="100px">
        <el-form-item label="挂起原因" required>
          <el-input
            v-model="suspendForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入挂起原因"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="suspendDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSuspend" :loading="operationLoading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 恢复对话框 -->
    <el-dialog v-model="resumeDialogVisible" title="恢复流程" width="500px">
      <el-form :model="resumeForm" label-width="100px">
        <el-form-item label="恢复原因" required>
          <el-input
            v-model="resumeForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入恢复原因"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resumeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResume" :loading="operationLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getWorkflowInstanceDetail, suspendInstance, resumeInstance } from '@/api/workflow'
import type { WorkflowInstanceDetail } from '@/types/workflow'

const route = useRoute()
const router = useRouter()

const detail = ref<WorkflowInstanceDetail | null>(null)
const loading = ref(false)
const operationLoading = ref(false)

const suspendDialogVisible = ref(false)
const resumeDialogVisible = ref(false)

const suspendForm = ref({
  reason: ''
})

const resumeForm = ref({
  reason: ''
})

const loadDetail = async () => {
  const id = Number(route.params.id)
  if (!id) return
  
  loading.value = true
  try {
    detail.value = await getWorkflowInstanceDetail(id)
  } catch (error) {
    console.error('加载流程实例详情失败:', error)
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.back()
}

// 挂起流程
const handleSuspend = () => {
  suspendForm.value.reason = ''
  suspendDialogVisible.value = true
}

const confirmSuspend = async () => {
  if (!suspendForm.value.reason) {
    ElMessage.warning('请输入挂起原因')
    return
  }
  
  operationLoading.value = true
  try {
    await suspendInstance(detail.value!.instance.id, suspendForm.value)
    ElMessage.success('流程已挂起')
    suspendDialogVisible.value = false
    await loadDetail()
  } catch (error: any) {
    ElMessage.error(error.message || '挂起失败')
  } finally {
    operationLoading.value = false
  }
}

// 恢复流程
const handleResume = () => {
  resumeForm.value.reason = ''
  resumeDialogVisible.value = true
}

const confirmResume = async () => {
  if (!resumeForm.value.reason) {
    ElMessage.warning('请输入恢复原因')
    return
  }
  
  operationLoading.value = true
  try {
    await resumeInstance(detail.value!.instance.id, resumeForm.value)
    ElMessage.success('流程已恢复')
    resumeDialogVisible.value = false
    await loadDetail()
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败')
  } finally {
    operationLoading.value = false
  }
}

// 判断是否超时
const isTimeout = (timeoutAt: string) => {
  return new Date(timeoutAt) < new Date()
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    DRAFT: 'info',
    RUNNING: '',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info',
    TERMINATED: 'warning',
    SUSPENDED: 'warning'
  }
  return map[status] || ''
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    RUNNING: '运行中',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    TERMINATED: '已终止',
    SUSPENDED: '已挂起'
  }
  return map[status] || status
}

const getTaskStatusType = (status: string) => {
  const map: Record<string, any> = {
    PENDING: '',
    APPROVED: 'success',
    REJECTED: 'danger',
    ROLLED_BACK: 'warning',
    DELEGATED: 'info',
    CANCELLED: 'info'
  }
  return map[status] || ''
}

const getTaskStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: '待办',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    ROLLED_BACK: '已回退',
    DELEGATED: '已委派',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.workflow-instance-detail {
  padding: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}
</style>
