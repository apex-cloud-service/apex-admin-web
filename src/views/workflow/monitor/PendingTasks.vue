<!--
  待办任务面板
  ------------------------------------------------------------------
  工作流监控页「待办任务」Tab 的内容组件：
  - 分页查询当前用户待办（GET /api/v1/workflows/tasks/pending）
  - 办理：提交审批意见调用 complete（后端固定为通过语义）
  - 转办 / 委派：选择目标用户后调用 /api/workflow 高级操作
  - 回退：按需拉取实例详情取流程节点列表，选择回退目标节点
-->
<template>
  <div class="pending-tasks">
    <el-table v-loading="loading" :data="tasks" border stripe>
      <el-table-column prop="id" label="任务ID" width="90" />
      <el-table-column prop="taskName" label="任务名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="instanceId" label="实例ID" width="100" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="assigneeName" label="办理人" width="120" />
      <el-table-column label="开始时间" width="180">
        <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openComplete(row)">办理</el-button>
          <el-button size="small" @click="openTransfer(row)">转办</el-button>
          <el-button size="small" @click="openDelegate(row)">委派</el-button>
          <el-button size="small" @click="openRollback(row)">回退</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination class="pager" :total="total" @change="onPageChange" />

    <!-- 办理对话框 -->
    <el-dialog v-model="completeVisible" title="办理任务" width="520px">
      <el-form label-width="90px">
        <el-form-item label="任务名称">
          <span>{{ currentTask?.taskName }}</span>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input
            v-model="comment"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="请输入审批意见（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmComplete">通过并提交</el-button>
      </template>
    </el-dialog>

    <!-- 转办 / 委派对话框（共用结构与用户搜索） -->
    <el-dialog
      v-model="reassignVisible"
      :title="reassignMode === 'transfer' ? '任务转办' : '任务委派'"
      width="520px"
    >
      <el-form label-width="90px">
        <el-form-item :label="reassignMode === 'transfer' ? '转办给' : '委派给'" required>
          <el-select
            v-model="reassignUserId"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="userSearching"
            placeholder="输入昵称搜索用户"
            style="width: 100%"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="reassignMode === 'transfer' ? '转办原因' : '委派原因'" required>
          <el-input
            v-model="reassignReason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reassignVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmReassign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 回退对话框 -->
    <el-dialog v-model="rollbackVisible" title="流程回退" width="520px">
      <el-form label-width="90px">
        <el-form-item label="回退节点" required>
          <el-select
            v-model="rollbackNodeCode"
            :loading="nodesLoading"
            placeholder="请选择回退目标节点"
            style="width: 100%"
          >
            <el-option
              v-for="node in rollbackNodes"
              :key="node.nodeCode"
              :label="node.nodeName"
              :value="node.nodeCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="回退原因" required>
          <el-input
            v-model="rollbackReason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入回退原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="confirmRollback">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { listUsers } from '@/api/user'
import {
  completeTask,
  delegateTask,
  getMyPendingTasks,
  getWorkflowInstanceDetail,
  rollbackTask,
  transferTask,
} from '@/api/workflow'
import type { WorkflowPendingTask } from '@/types/workflow'

/** 待办任务状态 → 标签样式与名称 */
const STATUS_NAMES: Record<string, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '处理中',
  COMPLETED: '已完成',
  REJECTED: '已拒绝',
}

const STATUS_TAG_TYPES: Record<string, 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

/** 用户下拉选项 */
interface UserOption {
  id: number
  name: string
}

/** 回退节点下拉选项 */
interface NodeOption {
  nodeCode: string
  nodeName: string
}

// ==================== 列表状态 ====================
const tasks = ref<WorkflowPendingTask[]>([])
const loading = ref(false)
const page = ref(1)
const size = ref(10)
const total = ref(0)

// ==================== 操作状态 ====================
const currentTask = ref<WorkflowPendingTask | null>(null)
const acting = ref(false)
const completeVisible = ref(false)
const comment = ref('')
const reassignVisible = ref(false)
const reassignMode = ref<'transfer' | 'delegate'>('transfer')
const reassignUserId = ref<number>()
const reassignReason = ref('')
const userSearching = ref(false)
const userOptions = ref<UserOption[]>([])
const rollbackVisible = ref(false)
const rollbackNodeCode = ref<string>()
const rollbackReason = ref('')
const nodesLoading = ref(false)
const rollbackNodes = ref<NodeOption[]>([])

/** 状态展示名 */
function statusName(status: string): string {
  return STATUS_NAMES[status] || status
}

/** 状态标签样式 */
function statusTagType(status: string): 'info' | 'warning' | 'primary' | 'success' | 'danger' {
  return STATUS_TAG_TYPES[status] || 'info'
}

/** 时间戳 → 本地化展示 */
function formatTime(time?: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

/** 加载待办任务当前页 */
async function loadTasks(): Promise<void> {
  loading.value = true
  try {
    const result = await getMyPendingTasks({ pageNum: page.value, pageSize: size.value })
    tasks.value = result.list || []
    total.value = result.total
  } catch (error) {
    showError(error, '加载待办任务失败')
  } finally {
    loading.value = false
  }
}

/** 分页变化 */
function onPageChange(nextPage: number, nextSize: number): void {
  page.value = nextPage
  size.value = nextSize
  loadTasks()
}

/** 打开办理对话框 */
function openComplete(row: WorkflowPendingTask): void {
  currentTask.value = row
  comment.value = ''
  completeVisible.value = true
}

/** 提交办理（后端 complete 固定为通过语义） */
async function confirmComplete(): Promise<void> {
  if (!currentTask.value) return
  acting.value = true
  try {
    await completeTask(currentTask.value.id, comment.value || undefined)
    ElMessage.success('任务已办理')
    completeVisible.value = false
    await loadTasks()
  } catch (error) {
    showError(error, '办理任务失败')
  } finally {
    acting.value = false
  }
}

/** 打开转办 / 委派对话框 */
function openReassign(row: WorkflowPendingTask, mode: 'transfer' | 'delegate'): void {
  currentTask.value = row
  reassignMode.value = mode
  reassignUserId.value = undefined
  reassignReason.value = ''
  userOptions.value = []
  reassignVisible.value = true
}

/** 打开转办对话框 */
function openTransfer(row: WorkflowPendingTask): void {
  openReassign(row, 'transfer')
}

/** 打开委派对话框 */
function openDelegate(row: WorkflowPendingTask): void {
  openReassign(row, 'delegate')
}

/** 远程搜索用户（转办/委派目标） */
async function searchUsers(query: string): Promise<void> {
  if (!query) {
    userOptions.value = []
    return
  }
  userSearching.value = true
  try {
    const result = await listUsers({ keyword: query, page: 1, size: 20 })
    userOptions.value = (result.list || []).map((user) => ({
      id: Number(user.id),
      name: user.nickname || user.phone || `用户 ${user.id}`,
    }))
  } catch (error) {
    showError(error, '搜索用户失败')
  } finally {
    userSearching.value = false
  }
}

/** 提交转办 / 委派 */
async function confirmReassign(): Promise<void> {
  if (!currentTask.value) return
  if (!reassignUserId.value) {
    ElMessage.warning('请选择目标用户')
    return
  }
  if (!reassignReason.value.trim()) {
    ElMessage.warning('请输入原因')
    return
  }
  acting.value = true
  try {
    if (reassignMode.value === 'transfer') {
      await transferTask(currentTask.value.id, {
        newAssigneeId: reassignUserId.value,
        reason: reassignReason.value,
      })
      ElMessage.success('转办成功')
    } else {
      await delegateTask(currentTask.value.id, {
        delegateToId: reassignUserId.value,
        reason: reassignReason.value,
      })
      ElMessage.success('委派成功')
    }
    reassignVisible.value = false
    await loadTasks()
  } catch (error) {
    showError(error, '操作失败')
  } finally {
    acting.value = false
  }
}

/** 打开回退对话框（按需拉取实例详情取节点列表） */
async function openRollback(row: WorkflowPendingTask): Promise<void> {
  currentTask.value = row
  rollbackNodeCode.value = undefined
  rollbackReason.value = ''
  rollbackNodes.value = []
  rollbackVisible.value = true
  nodesLoading.value = true
  try {
    const detail = await getWorkflowInstanceDetail(row.instanceId)
    rollbackNodes.value = (detail.definition?.nodes || []).map((node) => ({
      nodeCode: node.nodeId,
      nodeName: node.nodeName,
    }))
  } catch (error) {
    showError(error, '加载流程节点失败')
  } finally {
    nodesLoading.value = false
  }
}

/** 提交回退 */
async function confirmRollback(): Promise<void> {
  if (!currentTask.value) return
  if (!rollbackNodeCode.value) {
    ElMessage.warning('请选择回退节点')
    return
  }
  if (!rollbackReason.value.trim()) {
    ElMessage.warning('请输入回退原因')
    return
  }
  acting.value = true
  try {
    await rollbackTask(currentTask.value.id, {
      targetNodeCode: rollbackNodeCode.value,
      reason: rollbackReason.value,
    })
    ElMessage.success('回退成功')
    rollbackVisible.value = false
    await loadTasks()
  } catch (error) {
    showError(error, '回退失败')
  } finally {
    acting.value = false
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped lang="scss">
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
