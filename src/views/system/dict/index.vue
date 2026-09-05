<!--
  字典管理
  ------------------------------------------------------------------
  两级结构：字典类型列表 + 字典数据（抽屉展示）。
  类型支持新增/编辑/启停/删除；数据支持新增/编辑/删除/默认标记。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="success" :icon="Plus" @click="openTypeDialog()">新增类型</el-button>
      <el-button :icon="Refresh" @click="fetchTypes">刷新</el-button>
    </div>

    <!-- 字典类型列表 -->
    <el-table v-loading="loading" :data="types" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="dictName" label="类型名称" min-width="140" />
      <el-table-column prop="dictType" label="类型编码" min-width="160">
        <template #default="{ row }"><el-tag>{{ row.dictType }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDataDrawer(row)">数据</el-button>
          <el-button link type="primary" @click="openTypeDialog(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleType(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="removeType(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 类型新增/编辑弹窗 -->
    <el-dialog v-model="typeDialog.visible" :title="typeDialog.isEdit ? '编辑字典类型' : '新增字典类型'" width="460px">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <el-form-item label="类型名称" prop="dictName">
          <el-input v-model="typeForm.dictName" placeholder="如 性别" />
        </el-form-item>
        <el-form-item label="类型编码" prop="dictType">
          <el-input v-model="typeForm.dictType" :disabled="typeDialog.isEdit" placeholder="如 sys_gender" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="typeForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitType">保存</el-button>
      </template>
    </el-dialog>

    <!-- 字典数据抽屉 -->
    <el-drawer v-model="dataDrawer.visible" :title="`字典数据 · ${dataDrawer.dictType}`" size="560px">
      <div class="data-toolbar">
        <el-button type="success" size="small" :icon="Plus" @click="openDataDialog()">新增数据</el-button>
      </div>
      <el-table v-loading="dataLoading" :data="dataList" border stripe size="small">
        <el-table-column prop="dictLabel" label="标签" min-width="100" />
        <el-table-column prop="dictValue" label="键值" min-width="100" />
        <el-table-column prop="dictSort" label="排序" width="70" />
        <el-table-column label="默认" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault === 1" type="success" size="small">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDataDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="removeData(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 数据新增/编辑弹窗 -->
      <el-dialog v-model="dataDialog.visible" title="字典数据" width="440px" append-to-body>
        <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="80px">
          <el-form-item label="标签" prop="dictLabel">
            <el-input v-model="dataForm.dictLabel" placeholder="如 男" />
          </el-form-item>
          <el-form-item label="键值" prop="dictValue">
            <el-input v-model="dataForm.dictValue" placeholder="如 0" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="dataForm.dictSort" :min="0" />
          </el-form-item>
          <el-form-item label="默认">
            <el-switch v-model="dataForm.isDefault" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dataDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitData">保存</el-button>
        </template>
      </el-dialog>
    </el-drawer>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 字典管理脚本
 * - 类型 CRUD + 启停；数据 CRUD + 默认标记
 * - 数据列表按当前类型编码加载（dictType 维度隔离）
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  createDictData,
  createDictType,
  deleteDictData,
  deleteDictType,
  listDictData,
  listDictTypes,
  updateDictData,
  updateDictType,
  updateDictTypeStatus,
  type DictDataPayload,
  type DictTypePayload,
} from '@/api/system'
import type { DictData, DictType } from '@/types'

/** 加载/保存状态 */
const loading = ref(false)
const dataLoading = ref(false)
const saving = ref(false)
/** 类型与数据列表 */
const types = ref<DictType[]>([])
const dataList = ref<DictData[]>([])

/** 类型弹窗 */
const typeDialog = reactive({ visible: false, isEdit: false, id: 0 })
const typeFormRef = ref<FormInstance>()
const typeForm = reactive<DictTypePayload>({ dictName: '', dictType: '', remark: '' })
const typeRules: FormRules = {
  dictName: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
  dictType: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
}

/** 数据抽屉 */
const dataDrawer = reactive({ visible: false, dictType: '' })
/** 数据弹窗 */
const dataDialog = reactive({ visible: false, isEdit: false, id: 0 })
const dataFormRef = ref<FormInstance>()
const dataForm = reactive<DictDataPayload>({ dictType: '', dictLabel: '', dictValue: '', dictSort: 0, isDefault: 0 })
const dataRules: FormRules = {
  dictLabel: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入键值', trigger: 'blur' }],
}

/**
 * 拉取字典类型列表。
 */
async function fetchTypes(): Promise<void> {
  loading.value = true
  try {
    types.value = (await listDictTypes()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 打开类型新增/编辑弹窗。
 * @param row 可选，编辑时传入
 */
function openTypeDialog(row?: DictType): void {
  typeDialog.isEdit = !!row
  typeDialog.id = row?.id ?? 0
  Object.assign(typeForm, { dictName: row?.dictName ?? '', dictType: row?.dictType ?? '', remark: row?.remark ?? '' })
  typeDialog.visible = true
}

/** 提交类型 */
async function submitType(): Promise<void> {
  if (!typeFormRef.value) return
  try {
    await typeFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (typeDialog.isEdit) {
      await updateDictType(typeDialog.id, typeForm)
      ElMessage.success('更新成功')
    } else {
      await createDictType(typeForm)
      ElMessage.success('创建成功')
    }
    typeDialog.visible = false
    fetchTypes()
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

/** 启停类型（后端 status: 0=停用 1=正常） */
async function toggleType(row: DictType): Promise<void> {
  const enable = row.status !== 1
  try {
    await updateDictTypeStatus(row.id, enable)
    ElMessage.success('状态已更新')
    fetchTypes()
  } catch (error) {
    showError(error)
  }
}

/** 删除类型 */
async function removeType(row: DictType): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除字典类型「${row.dictName}」？其下数据将一并删除`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteDictType(row.id)
    ElMessage.success('删除成功')
    fetchTypes()
  } catch (error) {
    showError(error)
  }
}

/**
 * 打开数据抽屉并加载数据。
 * @param row 字典类型
 */
async function openDataDrawer(row: DictType): Promise<void> {
  dataDrawer.dictType = row.dictType
  dataDrawer.visible = true
  dataLoading.value = true
  try {
    dataList.value = (await listDictData(row.dictType)) || []
  } catch (error) {
    showError(error)
  } finally {
    dataLoading.value = false
  }
}

/**
 * 打开数据新增/编辑弹窗。
 * @param row 可选，编辑时传入
 */
function openDataDialog(row?: DictData): void {
  dataDialog.isEdit = !!row
  dataDialog.id = row?.id ?? 0
  Object.assign(dataForm, {
    dictType: dataDrawer.dictType,
    dictLabel: row?.dictLabel ?? '',
    dictValue: row?.dictValue ?? '',
    dictSort: row?.dictSort ?? 0,
    isDefault: row?.isDefault ?? 0,
  })
  dataDialog.visible = true
}

/** 提交数据 */
async function submitData(): Promise<void> {
  if (!dataFormRef.value) return
  try {
    await dataFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (dataDialog.isEdit) {
      await updateDictData(dataDialog.id, dataForm)
    } else {
      await createDictData(dataForm)
    }
    ElMessage.success('保存成功')
    dataDialog.visible = false
    // 刷新数据列表
    dataList.value = (await listDictData(dataDrawer.dictType)) || []
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

/** 删除数据 */
async function removeData(row: DictData): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除字典数据「${row.dictLabel}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteDictData(row.id)
    ElMessage.success('删除成功')
    dataList.value = (await listDictData(dataDrawer.dictType)) || []
  } catch (error) {
    showError(error)
  }
}

onMounted(fetchTypes)
</script>

<style scoped>
/* 工具栏 */
.toolbar,
.data-toolbar {
  margin-bottom: 12px;
}
</style>
