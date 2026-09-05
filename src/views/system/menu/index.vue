<!--
  菜单管理
  ------------------------------------------------------------------
  菜单树（目录/菜单/按钮三级）的查询、新增、编辑、删除与启停。
  菜单数据同时驱动前端动态路由与按钮权限码。
-->
<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="success" :icon="Plus" @click="openCreate(0)">新增根节点</el-button>
      <el-button :icon="Refresh" @click="fetchTree">刷新</el-button>
    </div>

    <!-- 菜单树表格 -->
    <el-table
      v-loading="loading"
      :data="tree"
      row-key="id"
      border
      default-expand-all
      :tree-props="{ children: 'children' }"
    >
      <el-table-column prop="menuName" label="菜单名称" min-width="200" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.menuType)">{{ typeLabel(row.menuType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="path" label="路由路径" min-width="140" show-overflow-tooltip />
      <el-table-column prop="perms" label="权限标识" min-width="160" show-overflow-tooltip />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.menuType !== 2" link type="primary" @click="openCreate(row.id)">新增子项</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
          <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑菜单' : '新增菜单'" width="560px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="上级节点">
          <el-tree-select
            v-model="form.parentId"
            :data="treeOptions"
            :props="{ label: 'menuName', value: 'id' }"
            check-strictly
            default-expand-all
            placeholder="选择上级节点（0 为根）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="菜单类型">
          <el-radio-group v-model="form.menuType">
            <el-radio :value="0">目录</el-radio>
            <el-radio :value="1">菜单</el-radio>
            <el-radio :value="2">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" placeholder="菜单显示名称" />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 2" label="路由路径">
          <el-input v-model="form.path" placeholder="如 /system/user" />
        </el-form-item>
        <el-form-item v-if="form.menuType === 1" label="组件路径">
          <el-input v-model="form.component" placeholder="如 system/user/index" />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 0" label="权限标识">
          <el-input v-model="form.perms" placeholder="如 system:user:list" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名" />
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
 * 菜单管理脚本
 * - 树形表格展示后端菜单树
 * - 新增/编辑支持 目录/菜单/按钮 三种类型
 * - 删除/启停操作带二次确认
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  createMenu,
  deleteMenu,
  listMenuTree,
  updateMenu,
  updateMenuStatus,
  type MenuPayload,
} from '@/api/system'
import type { MenuNode } from '@/types'

/** 加载/保存状态 */
const loading = ref(false)
const saving = ref(false)
/** 菜单树 */
const tree = ref<MenuNode[]>([])

/** 弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: 0 })
const formRef = ref<FormInstance>()
/** 表单数据 */
const form = reactive<MenuPayload>({
  parentId: 0,
  menuName: '',
  menuType: 1,
  path: '',
  component: '',
  perms: '',
  icon: '',
  sort: 0,
})

/** 表单校验规则 */
const formRules: FormRules = {
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
}

/** 树选择器数据源（根节点占位） */
const treeOptions = computed<MenuNode[]>(() => [
  { id: 0, parentId: -1, menuName: '根节点', menuType: 0, status: 0, children: tree.value },
])

/** 菜单类型文案 */
function typeLabel(type: number): string {
  return { 0: '目录', 1: '菜单', 2: '按钮' }[type] ?? '未知'
}

/** 菜单类型标签样式 */
function typeTag(type: number): 'primary' | 'success' | 'info' {
  return { 0: 'primary', 1: 'success', 2: 'info' }[type] as 'primary' | 'success' | 'info'
}

/**
 * 拉取菜单树。
 */
async function fetchTree(): Promise<void> {
  loading.value = true
  try {
    tree.value = (await listMenuTree()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/**
 * 打开新增弹窗。
 * @param parentId 上级节点 ID（0=根）
 */
function openCreate(parentId: number): void {
  dialog.isEdit = false
  dialog.id = 0
  Object.assign(form, { parentId, menuName: '', menuType: 1, path: '', component: '', perms: '', icon: '', sort: 0 })
  dialog.visible = true
}

/**
 * 打开编辑弹窗（回填）。
 * @param row 菜单节点
 */
function openEdit(row: MenuNode): void {
  dialog.isEdit = true
  dialog.id = row.id
  Object.assign(form, {
    parentId: row.parentId ?? 0,
    menuName: row.menuName,
    menuType: row.menuType,
    path: row.path || '',
    component: row.component || '',
    perms: row.perms || '',
    icon: row.icon || '',
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
      await updateMenu(dialog.id, form)
      ElMessage.success('更新成功')
    } else {
      await createMenu(form)
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
 * 删除菜单（二次确认）。
 * @param row 菜单节点
 */
async function remove(row: MenuNode): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除菜单「${row.menuName}」？其子节点将一并删除`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteMenu(row.id)
    ElMessage.success('删除成功')
    fetchTree()
  } catch (error) {
    showError(error)
  }
}

/**
 * 启停菜单（后端 status: 0=停用 1=正常）。
 * @param row 菜单节点
 */
async function toggleStatus(row: MenuNode): Promise<void> {
  const enable = row.status !== 1
  try {
    await updateMenuStatus(row.id, enable)
    ElMessage.success('状态已更新')
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
