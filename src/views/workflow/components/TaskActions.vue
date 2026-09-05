<!--
  任务操作组件
  
  提供工作流任务的各种操作按钮和对话框，包括：
  - 基本操作：通过、驳回
  - 高级操作：回退、转办、委派
  - 每种操作都有对应的对话框和表单验证
  
  @module views/workflow/components/TaskActions
-->
<template>
  <div class="task-actions">
    <el-button type="primary" @click="$emit('approve')">通过</el-button>
    <el-button type="danger" @click="$emit('reject')">驳回</el-button>
    
    <el-dropdown @command="handleMoreAction" trigger="click">
      <el-button>
        更多操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="rollback">回退</el-dropdown-item>
          <el-dropdown-item command="transfer">转办</el-dropdown-item>
          <el-dropdown-item command="delegate">委派</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <!-- 回退对话框 -->
    <el-dialog v-model="rollbackVisible" title="流程回退" width="500px">
      <el-form :model="rollbackForm" label-width="100px">
        <el-form-item label="回退节点" required>
          <el-select v-model="rollbackForm.targetNodeCode" placeholder="请选择回退节点">
            <el-option
              v-for="node in previousNodes"
              :key="node.nodeCode"
              :label="node.nodeName"
              :value="node.nodeCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="回退原因" required>
          <el-input
            v-model="rollbackForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入回退原因"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRollback" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 转办对话框 -->
    <el-dialog v-model="transferVisible" title="任务转办" width="500px">
      <el-form :model="transferForm" label-width="100px">
        <el-form-item label="转办给" required>
          <el-select
            v-model="transferForm.newAssigneeId"
            filterable
            remote
            :remote-method="searchUsers"
            placeholder="请选择用户"
            :loading="userSearchLoading"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转办原因" required>
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入转办原因"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTransfer" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 委派对话框 -->
    <el-dialog v-model="delegateVisible" title="任务委派" width="500px">
      <el-form :model="delegateForm" label-width="100px">
        <el-form-item label="委派给" required>
          <el-select
            v-model="delegateForm.delegateToId"
            filterable
            remote
            :remote-method="searchUsers"
            placeholder="请选择用户"
            :loading="userSearchLoading"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="委派说明" required>
          <el-input
            v-model="delegateForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入委派说明"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="delegateVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDelegate" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { rollbackTask, transferTask, delegateTask } from '@/api/workflow'
import { listUsers } from '@/api/user'

/**
 * 组件属性
 */
interface Props {
  /** 任务ID */
  taskId: number
  /** 可回退的前置节点列表 */
  previousNodes?: Array<{ nodeCode: string; nodeName: string }>
}

const props = defineProps<Props>()
const emit = defineEmits(['approve', 'reject', 'success'])

/** 操作加载状态 */
const loading = ref(false)
/** 用户搜索加载状态 */
const userSearchLoading = ref(false)
/** 回退对话框可见性 */
const rollbackVisible = ref(false)
/** 转办对话框可见性 */
const transferVisible = ref(false)
/** 委派对话框可见性 */
const delegateVisible = ref(false)

/** 回退表单数据 */
const rollbackForm = ref({
  targetNodeCode: '',
  reason: ''
})

/** 转办表单数据 */
const transferForm = ref({
  newAssigneeId: undefined as number | undefined,
  reason: ''
})

/** 委派表单数据 */
const delegateForm = ref({
  delegateToId: undefined as number | undefined,
  reason: ''
})

/** 用户列表（用于转办和委派） */
const userList = ref<Array<{ id: number; name: string }>>([])
/** 前置节点列表 */
const previousNodes = ref(props.previousNodes || [])

/**
 * 处理更多操作下拉菜单的命令
 * @param command - 操作命令：rollback/transfer/delegate
 */
const handleMoreAction = (command: string) => {
  switch (command) {
    case 'rollback':
      handleRollback()
      break
    case 'transfer':
      handleTransfer()
      break
    case 'delegate':
      handleDelegate()
      break
  }
}

/**
 * 处理回退操作
 * 打开回退对话框
 */
const handleRollback = () => {
  rollbackForm.value = { targetNodeCode: '', reason: '' }
  rollbackVisible.value = true
}

/**
 * 确认回退
 * 验证表单并执行回退操作
 */
const confirmRollback = async () => {
  if (!rollbackForm.value.targetNodeCode) {
    ElMessage.warning('请选择回退节点')
    return
  }
  if (!rollbackForm.value.reason) {
    ElMessage.warning('请输入回退原因')
    return
  }
  
  loading.value = true
  try {
    await rollbackTask(props.taskId, rollbackForm.value)
    ElMessage.success('回退成功')
    rollbackVisible.value = false
    emit('success')
  } catch (error: any) {
    ElMessage.error(error.message || '回退失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理转办操作
 * 打开转办对话框
 */
const handleTransfer = () => {
  transferForm.value = { newAssigneeId: undefined, reason: '' }
  userList.value = []
  transferVisible.value = true
}

/**
 * 确认转办
 * 验证表单并执行转办操作
 */
const confirmTransfer = async () => {
  if (!transferForm.value.newAssigneeId) {
    ElMessage.warning('请选择转办人')
    return
  }
  if (!transferForm.value.reason) {
    ElMessage.warning('请输入转办原因')
    return
  }
  
  loading.value = true
  try {
    await transferTask(props.taskId, {
      newAssigneeId: transferForm.value.newAssigneeId,
      reason: transferForm.value.reason
    })
    ElMessage.success('转办成功')
    transferVisible.value = false
    emit('success')
  } catch (error: any) {
    ElMessage.error(error.message || '转办失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理委派操作
 * 打开委派对话框
 */
const handleDelegate = () => {
  delegateForm.value = { delegateToId: undefined, reason: '' }
  userList.value = []
  delegateVisible.value = true
}

/**
 * 确认委派
 * 验证表单并执行委派操作
 */
const confirmDelegate = async () => {
  if (!delegateForm.value.delegateToId) {
    ElMessage.warning('请选择委派人')
    return
  }
  if (!delegateForm.value.reason) {
    ElMessage.warning('请输入委派说明')
    return
  }
  
  loading.value = true
  try {
    await delegateTask(props.taskId, {
      delegateToId: delegateForm.value.delegateToId,
      reason: delegateForm.value.reason
    })
    ElMessage.success('委派成功')
    delegateVisible.value = false
    emit('success')
  } catch (error: any) {
    ElMessage.error(error.message || '委派失败')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索用户
 * 根据用户名模糊搜索用户列表（用于转办和委派）
 * @param query - 搜索关键词
 */
const searchUsers = async (query: string) => {
  if (!query) {
    userList.value = []
    return
  }
  
  userSearchLoading.value = true
  try {
    const response = await listUsers({ keyword: query, page: 1, size: 20 })
    userList.value = response.list.map((user: any) => ({
      id: user.id,
      name: user.nickname || user.phone
    }))
  } catch (error) {
    console.error('搜索用户失败', error)
  } finally {
    userSearchLoading.value = false
  }
}
</script>

<style scoped>
.task-actions {
  display: flex;
  gap: 10px;
}
</style>
