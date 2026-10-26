<!--
  工作流监控页面

  提供工作流的监控和管理功能，包含三个主要模块：
  - 统计看板：展示工作流的统计数据和趋势分析
  - 流程实例：展示和管理所有流程实例
  - 待办任务：当前用户的待办任务查询与办理
  顶部提供「发起流程」入口（后端无定义列表接口，流程编码手动输入）。

  @module views/workflow/monitor
-->
<template>
  <div class="workflow-monitor">
    <div class="monitor-toolbar">
      <el-button type="primary" :icon="Plus" @click="openStartDialog">发起流程</el-button>
    </div>
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="统计看板" name="statistics">
        <Statistics />
      </el-tab-pane>

      <el-tab-pane label="流程实例" name="instances">
        <InstanceList :key="instancesKey" />
      </el-tab-pane>

      <el-tab-pane label="待办任务" name="todo">
        <PendingTasks />
      </el-tab-pane>
    </el-tabs>

    <!-- 发起流程对话框 -->
    <el-dialog v-model="startVisible" title="发起流程" width="560px" destroy-on-close>
      <el-form ref="startFormRef" :model="startForm" :rules="startRules" label-width="100px">
        <el-form-item label="流程编码" prop="workflowCode">
          <el-input
            v-model="startForm.workflowCode"
            placeholder="流程定义编码，如 leave-approval"
          />
        </el-form-item>
        <el-form-item label="业务主键" prop="businessKey">
          <el-input
            v-model="startForm.businessKey"
            maxlength="200"
            placeholder="关联业务数据的唯一键，如订单号/申请单号"
          />
        </el-form-item>
        <el-form-item label="流程上下文" prop="contextJson">
          <el-input
            v-model="startForm.contextJson"
            type="textarea"
            :rows="6"
            maxlength="10000"
            show-word-limit
            placeholder='可选，JSON 字符串，如 {"days": 3}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startVisible = false">取消</el-button>
        <el-button type="primary" :loading="starting" @click="submitStart">发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import Statistics from './Statistics.vue'
import InstanceList from './InstanceList.vue'
import PendingTasks from './PendingTasks.vue'
import { startWorkflowInstance } from '@/api/workflow'

/** 当前激活的标签页 */
const activeTab = ref('statistics')
/** 流程实例列表刷新键（发起成功后重挂载以重新拉取） */
const instancesKey = ref(0)

// ==================== 发起流程 ====================
const startVisible = ref(false)
const starting = ref(false)
const startFormRef = ref<FormInstance>()
const startForm = reactive({ workflowCode: '', businessKey: '', contextJson: '' })
const startRules: FormRules = {
  workflowCode: [{ required: true, message: '请输入流程编码', trigger: 'blur' }],
  businessKey: [
    { required: true, message: '请输入业务主键', trigger: 'blur' },
    { max: 200, message: '业务主键最长 200 字符', trigger: 'blur' },
  ],
  contextJson: [
    {
      validator: (_rule, value, callback) => {
        if (value && value.trim()) {
          try {
            JSON.parse(value)
          } catch {
            callback(new Error('上下文必须是合法的 JSON'))
            return
          }
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

/** 打开发起流程对话框 */
function openStartDialog(): void {
  startForm.workflowCode = ''
  startForm.businessKey = ''
  startForm.contextJson = ''
  startVisible.value = true
}

/** 提交发起流程 */
async function submitStart(): Promise<void> {
  if (!startFormRef.value) return
  await startFormRef.value.validate()
  starting.value = true
  try {
    const instance = await startWorkflowInstance(startForm.workflowCode.trim(), {
      businessKey: startForm.businessKey.trim(),
      contextJson: startForm.contextJson.trim() || undefined,
    })
    ElMessage.success(`流程已发起（实例 ID ${instance.id}）`)
    startVisible.value = false
    instancesKey.value += 1
    activeTab.value = 'instances'
  } catch (error) {
    showError(error, '发起流程失败')
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.workflow-monitor {
  padding: 20px;
}

.monitor-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
