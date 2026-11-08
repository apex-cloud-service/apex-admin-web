<!--
  参数配置
  ------------------------------------------------------------------
  系统参数（sys_config）的全量列表、新增、编辑、删除与启停。
  后端 GET /admin-api/v1/configs 返回全量数组（非分页）。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="success" :icon="Plus" @click="openCreate">新增</el-button>
      <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="configName" label="参数名称" min-width="140" />
      <el-table-column prop="configKey" label="参数键名" min-width="180">
        <template #default="{ row }"><el-tag>{{ row.configKey }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="configValue" label="参数键值" min-width="160" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑参数' : '新增参数'" width="480px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="参数名称" prop="configName">
          <el-input v-model="form.configName" placeholder="参数名称" />
        </el-form-item>
        <el-form-item label="参数键名" prop="configKey">
          <el-input v-model="form.configKey" :disabled="dialog.isEdit" placeholder="如 apex.system.name" />
        </el-form-item>
        <el-form-item label="参数键值" prop="configValue">
          <el-input v-model="form.configValue" placeholder="参数键值" />
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
  </el-card>
</template>

<script setup lang="ts">
/**
 * 参数配置脚本
 * - 全量列表查询（后端非分页）
 * - 新增/编辑/启停/删除
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  createConfig,
  deleteConfig,
  listConfigs,
  updateConfig,
  updateConfigStatus,
  type ConfigPayload,
} from '@/api/system'
import type { SysConfig } from '@/types'

/** 状态 */
const loading = ref(false)
const saving = ref(false)
/** 列表 */
const list = ref<SysConfig[]>([])

/** 弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: 0 })
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive<ConfigPayload>({ configName: '', configKey: '', configValue: '', remark: '' })

/** 校验规则 */
const formRules: FormRules = {
  configName: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  configKey: [{ required: true, message: '请输入参数键名', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入参数键值', trigger: 'blur' }],
}

/**
 * 拉取参数列表（全量）。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listConfigs()) || []
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
  Object.assign(form, { configName: '', configKey: '', configValue: '', remark: '' })
  dialog.visible = true
}

/** 打开编辑弹窗 */
function openEdit(row: SysConfig): void {
  dialog.isEdit = true
  dialog.id = row.id
  Object.assign(form, {
    configName: row.configName,
    configKey: row.configKey,
    configValue: row.configValue,
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
      await updateConfig(dialog.id, form)
      ElMessage.success('更新成功')
    } else {
      await createConfig(form)
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

/** 启停（后端 status: 0=停用 1=正常） */
async function toggleStatus(row: SysConfig): Promise<void> {
  const enable = row.status !== 1
  try {
    await updateConfigStatus(row.id, enable)
    ElMessage.success('状态已更新')
    fetchList()
  } catch (error) {
    showError(error)
  }
}

/** 删除 */
async function remove(row: SysConfig): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除参数「${row.configName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteConfig(row.id)
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
