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
import { listUsers } from '@/api/system'

interface Props {
  taskId: number
  previousNodes?: Array<{ nodeCode: string; nodeName: string }>
}

const props = defineProps<Props>()
const emit = defineEmits(['approve', 'reject', 'success'])

const loading = ref(false)
const userSearchLoading = ref(false)
const rollbackVisible = ref(false)
const transferVisible = ref(false)
const delegateVisible = ref(false)

const rollbackForm = ref({
  targetNodeCode: '',
  reason: ''
})

const transferForm = ref({
  newAssigneeId: undefined as number | undefined,
  reason: ''
})

const delegateForm = ref({
  delegateToId: undefined as number | undefined,
  reason: ''
})

const userList = ref<Array<{ id: number; name: string }>>([])
const previousNodes = ref(props.previousNodes || [])

// 处理更多操作
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

// 回退
const handleRollback = () => {
  rollbackForm.value = { targetNodeCode: '', reason: '' }
  rollbackVisible.value = true
}

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

// 转办
const handleTransfer = () => {
  transferForm.value = { newAssigneeId: undefined, reason: '' }
  userList.value = []
  transferVisible.value = true
}

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

// 委派
const handleDelegate = () => {
  delegateForm.value = { delegateToId: undefined, reason: '' }
  userList.value = []
  delegateVisible.value = true
}

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

// 搜索用户
const searchUsers = async (query: string) => {
  if (!query) {
    userList.value = []
    return
  }
  
  userSearchLoading.value = true
  try {
    const { data } = await listUsers({ username: query, pageNum: 1, pageSize: 20 })
    userList.value = data.records.map((user: any) => ({
      id: user.id,
      name: user.username
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
