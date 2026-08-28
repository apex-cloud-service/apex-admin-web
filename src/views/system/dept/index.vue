<!--
  部门管理
  ------------------------------------------------------------------
  部门树（数据权限基础）的查询、新增、编辑与删除。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="success" :icon="Plus" @click="openCreate(0)">新增根部门</el-button>
      <el-button :icon="Refresh" @click="fetchTree">刷新</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tree"
      row-key="id"
      border
      default-expand-all
      :tree-props="{ children: 'children' }"
    >
      <el-table-column prop="deptName" label="部门名称" min-width="200" />
      <el-table-column prop="leader" label="负责人" min-width="120" />
      <el-table-column prop="phone" label="联系电话" min-width="140" />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openCreate(row.id)">新增子部门</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑部门' : '新增部门'" width="480px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parentId"
            :data="treeOptions"
            :props="{ label: 'deptName', value: 'id' }"
            check-strictly
            default-expand-all
            placeholder="选择上级部门"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" placeholder="部门名称" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.leader" placeholder="负责人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="联系电话" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
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
 * 部门管理脚本
 * - 部门树 CRUD；删除前校验存在子部门时后端拒绝
 * - 部门为数据权限（C3）的隔离维度
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import { createDept, deleteDept, listDeptTree, updateDept, type DeptPayload } from '@/api/system'
import type { DeptNode } from '@/types'

/** 加载/保存状态 */
const loading = ref(false)
const saving = ref(false)
/** 部门树 */
const tree = ref<DeptNode[]>([])

/** 弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: 0 })
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive<DeptPayload>({ parentId: 0, deptName: '', leader: '', phone: '', sort: 0 })

/** 校验规则 */
const formRules: FormRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

/** 树选择器数据源 */
const treeOptions = computed<DeptNode[]>(() => [
  { id: 0, parentId: -1, deptName: '根部门', children: tree.value },
])

/**
 * 拉取部门树。
 */
async function fetchTree(): Promise<void> {
  loading.value = true
  try {
    tree.value = (await listDeptTree()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 打开新增弹窗。
 * @param parentId 上级部门 ID
 */
function openCreate(parentId: number): void {
  dialog.isEdit = false
  dialog.id = 0
  Object.assign(form, { parentId, deptName: '', leader: '', phone: '', sort: 0 })
  dialog.visible = true
}

/**
 * 打开编辑弹窗。
 * @param row 部门节点
 */
function openEdit(row: DeptNode): void {
  dialog.isEdit = true
  dialog.id = row.id
  Object.assign(form, {
    parentId: row.parentId ?? 0,
    deptName: row.deptName,
    leader: row.leader || '',
    phone: row.phone || '',
    sort: row.sort ?? 0,
  })
  dialog.visible = true
}

/** 提交新增/编辑 */
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
      await updateDept(dialog.id, form)
      ElMessage.success('更新成功')
    } else {
      await createDept(form)
      ElMessage.success('创建成功')
    }
    dialog.visible = false
    fetchTree()
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

/**
 * 删除部门（二次确认）。
 * @param row 部门节点
 */
async function remove(row: DeptNode): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除部门「${row.deptName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteDept(row.id)
    ElMessage.success('删除成功')
    fetchTree()
  } catch (error) {
    showError(error)
  }
}

onMounted(fetchTree)
</script>

<style scoped>
/* 工具栏 */
.toolbar {
  margin-bottom: 12px;
}
</style>
