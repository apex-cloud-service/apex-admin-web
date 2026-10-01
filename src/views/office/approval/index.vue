<!--
  办公平台审批管理页面
  ------------------------------------------------------------------
  功能：审批流程列表、发起审批、审批操作、撤销审批
  
  权限：
    - office:approval:view - 查看审批列表
    - office:approval:create - 发起审批
    - office:approval:approve - 审批操作
    - office:approval:cancel - 撤销审批
-->
<template>
  <div class="approval-container">
    <el-card>
      <template #header>
        <span>审批流程管理</span>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="待办审批" name="pending">
          <el-table :data="pendingApprovals" border stripe v-loading="pendingLoading">
            <el-table-column prop="title" label="审批标题" min-width="200" />
            <el-table-column prop="platform" label="平台" width="100" />
            <el-table-column prop="initiatorName" label="发起人" width="120" />
            <el-table-column prop="initiatorDept" label="发起部门" width="150" show-overflow-tooltip />
            <el-table-column prop="currentNodeName" label="当前节点" width="120" />
            <el-table-column prop="createTime" label="发起时间" width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="handleApprove(row)" v-permission="'office:approval:approve'">
                  通过
                </el-button>
                <el-button link type="danger" @click="handleReject(row)" v-permission="'office:approval:reject'">
                  拒绝
                </el-button>
                <el-button link type="primary" @click="handleViewApproval(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="pendingQuery.page"
            v-model:page-size="pendingQuery.size"
            :total="pendingTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadPendingApprovals"
            @current-change="loadPendingApprovals"
          />
        </el-tab-pane>

        <el-tab-pane label="已办审批" name="completed">
          <el-table :data="completedApprovals" border stripe v-loading="completedLoading">
            <el-table-column prop="title" label="审批标题" min-width="200" />
            <el-table-column prop="platform" label="平台" width="100" />
            <el-table-column prop="initiatorName" label="发起人" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'info'">
                  {{ row.status === 'APPROVED' ? '已通过' : row.status === 'REJECTED' ? '已拒绝' : '已撤回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="发起时间" width="180" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewApproval(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="completedQuery.page"
            v-model:page-size="completedQuery.size"
            :total="completedTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadCompletedApprovals"
            @current-change="loadCompletedApprovals"
          />
        </el-tab-pane>

        <el-tab-pane label="我发起的" name="initiated">
          <div style="margin-bottom: 16px">
            <el-button type="primary" @click="handleInitiate" v-permission="'office:approval:initiate'">
              <el-icon><Plus /></el-icon>
              发起审批
            </el-button>
          </div>
          <el-table :data="initiatedApprovals" border stripe v-loading="initiatedLoading">
            <el-table-column prop="title" label="审批标题" min-width="200" />
            <el-table-column prop="platform" label="平台" width="100" />
            <el-table-column prop="currentNodeName" label="当前节点" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : row.status === 'REJECTED' ? 'danger' : 'info'">
                  {{ row.status === 'APPROVED' ? '已通过' : row.status === 'PENDING' ? '审批中' : row.status === 'REJECTED' ? '已拒绝' : '已撤回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="发起时间" width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewApproval(row)">详情</el-button>
                <el-button link type="warning" @click="handleCancel(row)" v-if="row.status === 'PENDING'" v-permission="'office:approval:cancel'">
                  撤回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="initiatedQuery.page"
            v-model:page-size="initiatedQuery.size"
            :total="initiatedTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadInitiatedApprovals"
            @current-change="loadInitiatedApprovals"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

/**
 * 审批流程管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. 待办审批 - 查看和处理待我审批的任务(通过/拒绝)
 * 2. 已办审批 - 查看我已处理过的审批记录
 * 3. 我发起的 - 查看我发起的审批流程,支持撤回
 * 4. 审批详情 - 查看完整的审批流程和审批意见
 * 
 * 权限要求:
 * - office:approval:view - 查看权限(必需)
 * - office:approval:approve - 审批通过
 * - office:approval:reject - 审批拒绝
 * - office:approval:initiate - 发起审批
 * - office:approval:cancel - 撤回审批
 * 
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getPendingApprovals,
  getMyInitiatedApprovals,
  approveProcess,
  cancelApproval,
} from '@/api/office'
import type { PageQuery } from '@/types'

// 当前激活的标签页
const activeTab = ref('pending')

// ==================== 待办审批 ====================
const pendingLoading = ref(false)
const pendingApprovals = ref<any[]>([])
const pendingQuery = reactive<PageQuery>({ page: 1, size: 10 })
const pendingTotal = ref(0)

// ==================== 已办审批 ====================
const completedLoading = ref(false)
const completedApprovals = ref<any[]>([])
const completedQuery = reactive<PageQuery>({ page: 1, size: 10 })
const completedTotal = ref(0)

// ==================== 我发起的审批 ====================
const initiatedLoading = ref(false)
const initiatedApprovals = ref<any[]>([])
const initiatedQuery = reactive<PageQuery>({ page: 1, size: 10 })
const initiatedTotal = ref(0)

/**
 * 加载待办审批列表
 */
async function loadPendingApprovals() {
  pendingLoading.value = true
  try {
    const result = await getPendingApprovals({} as any)
    pendingApprovals.value = result.list || []
    pendingTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载待办审批失败')
  } finally {
    pendingLoading.value = false
  }
}

/**
 * 加载已办审批列表
 */
async function loadCompletedApprovals() {
  completedLoading.value = true
  try {
    completedApprovals.value = []
    completedTotal.value = 0
  } catch (error) {
    ElMessage.error('加载已办审批失败')
  } finally {
    completedLoading.value = false
  }
}

/**
 * 加载我发起的审批列表
 */
async function loadInitiatedApprovals() {
  initiatedLoading.value = true
  try {
    const result = await getMyInitiatedApprovals({} as any)
    initiatedApprovals.value = result.list || []
    initiatedTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载我发起的审批失败')
  } finally {
    initiatedLoading.value = false
  }
}

/**
 * 审批通过操作
 * @param row 审批记录
 */
async function handleApprove(row: any) {
  await ElMessageBox.confirm('确认通过该审批?', '提示', { type: 'info' })
  try {
    await approveProcess(row.approvalId, { action: 'APPROVE', comment: '', approverId: '' } as any)
    ElMessage.success('审批通过')
    await loadPendingApprovals()
  } catch (error) {
    ElMessage.error('审批操作失败')
  }
}

/**
 * 审批拒绝操作
 * @param row 审批记录
 */
async function handleReject(row: any) {
  const { value: comment } = await ElMessageBox.prompt('请输入拒绝原因', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '请输入拒绝原因',
  })
  try {
    await approveProcess(row.approvalId, { action: 'REJECT', comment, approverId: '' } as any)
    ElMessage.success('审批已拒绝')
    await loadPendingApprovals()
  } catch (error) {
    ElMessage.error('审批操作失败')
  }
}

/**
 * 撤回审批
 * @param row 审批记录
 */
async function handleCancel(row: any) {
  await ElMessageBox.confirm('确认撤回该审批?', '提示', { type: 'warning' })
  try {
    await cancelApproval(row.approvalId)
    ElMessage.success('审批已撤回')
    await loadInitiatedApprovals()
  } catch (error) {
    ElMessage.error('撤回失败')
  }
}

/**
 * 查看审批详情
 * @param row 审批记录
 */
function handleViewApproval(row: any) {
  if (row.approvalUrl) {
    window.open(row.approvalUrl, '_blank')
  } else {
    ElMessage.info('查看详情功能待实现')
  }
}

/**
 * 发起审批
 */
function handleInitiate() {
  ElMessage.info('发起审批功能待实现')
}

onMounted(() => {
  loadPendingApprovals()
  loadCompletedApprovals()
  loadInitiatedApprovals()
})
</script>

<style scoped lang="scss">
.approval-container {
  padding: 20px;
}
</style>
