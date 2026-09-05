<!--
  定时任务
  ------------------------------------------------------------------
  定时任务（sys_job）的全量列表、新增、编辑、删除、启停、
  手动触发与执行日志查看。后端 GET /admin-api/v1/jobs 返回全量数组。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="success" :icon="Plus" @click="openCreate">新增</el-button>
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="jobName" label="任务名称" min-width="140" />
      <el-table-column prop="jobGroup" label="任务分组" min-width="100" />
      <el-table-column prop="invokeTarget" label="调用目标" min-width="200" show-overflow-tooltip />
      <el-table-column prop="cronExpression" label="Cron 表达式" min-width="150">
        <template #default="{ row }"><code>{{ row.cronExpression }}</code></template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="runOnce(row)">执行</el-button>
          <el-button link type="primary" @click="showLogs(row)">日志</el-button>
          <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑任务' : '新增任务'" width="520px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="任务名称" prop="jobName">
          <el-input v-model="form.jobName" placeholder="任务名称" />
        </el-form-item>
        <el-form-item label="任务分组">
          <el-input v-model="form.jobGroup" placeholder="如 DEFAULT" />
        </el-form-item>
        <el-form-item label="调用目标" prop="invokeTarget">
          <el-input v-model="form.invokeTarget" placeholder="如 com.apex.job.DemoJob.run" />
        </el-form-item>
        <el-form-item label="Cron 表达式" prop="cronExpression">
          <el-input v-model="form.cronExpression" placeholder="如 0 */5 * * * ?" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 执行日志弹窗 -->
    <el-dialog v-model="logDialog.visible" :title="`执行日志 · ${logDialog.jobName}`" width="640px">
      <el-table :data="logs" border stripe size="small">
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : row.status === 1 ? 'danger' : 'info'" size="small">
              {{ row.status === 0 ? '成功' : row.status === 1 ? '失败' : '运行中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="jobMessage" label="执行信息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="duration" label="耗时(ms)" width="100" />
        <el-table-column prop="startTime" label="开始时间" width="160" />
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 定时任务脚本
 * - 任务 CRUD + 启停 + 手动触发 + 执行日志
 * - 后端为自研 Cron 解析器 + Reactor 动态调度
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  createJob,
  deleteJob,
  listJobLogs,
  listJobs,
  runJobOnce,
  updateJob,
  updateJobStatus,
  type JobPayload,
} from '@/api/system'
import type { JobLog, SysJob } from '@/types'

/** 状态 */
const loading = ref(false)
const saving = ref(false)
/** 列表 */
const list = ref<SysJob[]>([])

/** 弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: 0 })
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive<JobPayload>({ jobName: '', jobGroup: 'DEFAULT', invokeTarget: '', cronExpression: '', remark: '' })

/** 校验规则 */
const formRules: FormRules = {
  jobName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  invokeTarget: [{ required: true, message: '请输入调用目标', trigger: 'blur' }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: 'blur' }],
}

/** 日志弹窗 */
const logDialog = reactive({ visible: false, jobName: '' })
const logs = ref<JobLog[]>([])

/**
 * 拉取任务列表（全量）。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listJobs()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 打开新增弹窗 */
function openCreate(): void {
  dialog.isEdit = false
  dialog.id = 0
  Object.assign(form, { jobName: '', jobGroup: 'DEFAULT', invokeTarget: '', cronExpression: '', remark: '' })
  dialog.visible = true
}

/** 打开编辑弹窗 */
function openEdit(row: SysJob): void {
  dialog.isEdit = true
  dialog.id = row.id
  Object.assign(form, {
    jobName: row.jobName,
    jobGroup: row.jobGroup || 'DEFAULT',
    invokeTarget: row.invokeTarget,
    cronExpression: row.cronExpression,
    remark: row.remark || '',
  })
  dialog.visible = true
}

/** 提交 */
async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (dialog.isEdit) {
      await updateJob(dialog.id, form)
      ElMessage.success('更新成功')
    } else {
      await createJob(form)
      ElMessage.success('创建成功')
    }
    dialog.visible = false
    fetchList()
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

/**
 * 手动触发一次。
 * @param row 任务
 */
async function runOnce(row: SysJob): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认立即执行任务「${row.jobName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await runJobOnce(row.id)
    ElMessage.success('已触发执行')
  } catch (error) {
    showError(error)
  }
}

/**
 * 查看执行日志。
 * @param row 任务
 */
async function showLogs(row: SysJob): Promise<void> {
  logDialog.jobName = row.jobName
  logDialog.visible = true
  try {
    logs.value = (await listJobLogs(row.id, 20)) || []
  } catch (error) {
    showError(error)
  }
}

/** 启停（后端 status: 0=停用 1=正常） */
async function toggleStatus(row: SysJob): Promise<void> {
  const enable = row.status !== 1
  try {
    await updateJobStatus(row.id, enable)
    ElMessage.success('状态已更新')
    fetchList()
  } catch (error) {
    showError(error)
  }
}

/** 删除 */
async function remove(row: SysJob): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除任务「${row.jobName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteJob(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (error) {
    showError(error)
  }
}

onMounted(fetchList)
</script>

<style scoped>
/* 工具栏 */
.toolbar {
  margin-bottom: 12px;
}
</style>
