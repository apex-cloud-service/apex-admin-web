<!--
  角色管理
  ------------------------------------------------------------------
  两个模块：
  - 后台角色：/admin-api/v1/staff-roles（后台账号可分配角色，只读列表）
  - 系统角色/权限：/api/v1/auth/roles|permissions 的管理 CRUD，
    与登录链路（我的角色/我的权限）同源数据域

  权限要求：
  - system:role:create/update/remove - 角色增改删
  - system:permission:create/update/remove - 权限增改删
-->
<template>
  <el-card shadow="never">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 后台角色 -->
      <el-tab-pane label="后台角色" name="staff">
        <el-table v-loading="loading" :data="list" border stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="角色名称" min-width="140" />
          <el-table-column prop="code" label="角色编码" min-width="140">
            <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- 系统角色 -->
      <el-tab-pane label="系统角色" name="roles">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openRoleDialog()" v-permission="'system:role:create'">
            <el-icon><Plus /></el-icon>
            新增角色
          </el-button>
        </div>
        <el-table v-loading="roleLoading" :data="roles" border stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="角色名称" min-width="140" />
          <el-table-column prop="code" label="角色编码" min-width="140">
            <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'danger' : 'success'" size="small">
                {{ row.status === 0 ? '禁用' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openRoleDialog(row)" v-permission="'system:role:update'">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteRole(row)" v-permission="'system:role:remove'">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 系统权限 -->
      <el-tab-pane label="系统权限" name="permissions">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openPermissionDialog()" v-permission="'system:permission:create'">
            <el-icon><Plus /></el-icon>
            新增权限
          </el-button>
        </div>
        <el-table v-loading="permissionLoading" :data="permissions" border stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="权限名称" min-width="140" />
          <el-table-column prop="code" label="权限编码" min-width="180">
            <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ permissionTypeName(row.type) }}</template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'danger' : 'success'" size="small">
                {{ row.status === 0 ? '禁用' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPermissionDialog(row)" v-permission="'system:permission:update'">编辑</el-button>
              <el-button link type="danger" @click="handleDeletePermission(row)" v-permission="'system:permission:remove'">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 系统角色对话框 -->
    <el-dialog
      v-model="roleDialog.visible"
      :title="roleDialog.form.id ? '编辑角色' : '新增角色'"
      width="520px"
    >
      <el-form ref="roleFormRef" :model="roleDialog.form" :rules="roleRules" label-width="90px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleDialog.form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="roleDialog.form.code"
            :disabled="!!roleDialog.form.id"
            placeholder="如 admin"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roleDialog.form.description"
            type="textarea"
            :rows="3"
            placeholder="角色说明（选填）"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roleDialog.form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRole">确定</el-button>
      </template>
    </el-dialog>

    <!-- 系统权限对话框 -->
    <el-dialog
      v-model="permissionDialog.visible"
      :title="permissionDialog.form.id ? '编辑权限' : '新增权限'"
      width="520px"
    >
      <el-form
        ref="permissionFormRef"
        :model="permissionDialog.form"
        :rules="permissionRules"
        label-width="90px"
      >
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="permissionDialog.form.name" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input
            v-model="permissionDialog.form.code"
            :disabled="!!permissionDialog.form.id"
            placeholder="格式：模块:操作，如 system:user:create"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="permissionDialog.form.type">
            <el-radio :value="1">菜单</el-radio>
            <el-radio :value="2">按钮</el-radio>
            <el-radio :value="3">接口</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="permissionDialog.form.description"
            type="textarea"
            :rows="3"
            placeholder="权限说明（选填）"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="permissionDialog.form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="permissionDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitPermission">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import { listStaffRoles } from '@/api/user'
import {
  createSystemPermission,
  createSystemRole,
  deleteSystemPermission,
  deleteSystemRole,
  listSystemPermissions,
  listSystemRoles,
  updateSystemPermission,
  updateSystemRole,
  type SystemPermission,
  type SystemPermissionPayload,
  type SystemRole,
  type SystemRolePayload,
} from '@/api/auth'
import type { StaffRole } from '@/types'

/** 权限类型 → 名称 */
const PERMISSION_TYPE_NAMES: Record<number, string> = {
  1: '菜单',
  2: '按钮',
  3: '接口',
}

/** 当前激活的标签页 */
const activeTab = ref('staff')

// ==================== 后台角色（只读） ====================
const loading = ref(false)
const list = ref<StaffRole[]>([])

// ==================== 系统角色 ====================
const roleLoading = ref(false)
const roles = ref<SystemRole[]>([])
const saving = ref(false)
const roleFormRef = ref<FormInstance>()
const roleDialog = reactive<{ visible: boolean; form: SystemRolePayload & { id?: number } }>({
  visible: false,
  form: { id: undefined, name: '', code: '', description: undefined, status: 1 },
})
const roleRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

// ==================== 系统权限 ====================
const permissionLoading = ref(false)
const permissions = ref<SystemPermission[]>([])
const permissionFormRef = ref<FormInstance>()
const permissionDialog = reactive<{
  visible: boolean
  form: SystemPermissionPayload & { id?: number }
}>({
  visible: false,
  form: { id: undefined, name: '', code: '', description: undefined, type: 2, status: 1 },
})
const permissionRules: FormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' },
    {
      pattern: /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)+$/,
      message: '格式应为 模块:操作，如 system:user:create',
      trigger: 'blur',
    },
  ],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
}

/** 权限类型展示名 */
function permissionTypeName(type: number): string {
  return PERMISSION_TYPE_NAMES[type] || String(type)
}

/** 拉取后台角色列表 */
async function fetchRoles(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listStaffRoles()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 拉取系统角色列表 */
async function fetchSystemRoles(): Promise<void> {
  roleLoading.value = true
  try {
    roles.value = (await listSystemRoles()) || []
  } catch (error) {
    showError(error, '加载系统角色失败')
  } finally {
    roleLoading.value = false
  }
}

/** 拉取系统权限列表 */
async function fetchSystemPermissions(): Promise<void> {
  permissionLoading.value = true
  try {
    permissions.value = (await listSystemPermissions()) || []
  } catch (error) {
    showError(error, '加载系统权限失败')
  } finally {
    permissionLoading.value = false
  }
}

/** Tab 切换时按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'roles' && roles.value.length === 0) fetchSystemRoles()
  if (tab === 'permissions' && permissions.value.length === 0) fetchSystemPermissions()
}

/** 打开角色对话框（无参为新增） */
function openRoleDialog(row?: SystemRole): void {
  Object.assign(roleDialog.form, {
    id: row?.id,
    name: row?.name ?? '',
    code: row?.code ?? '',
    description: row?.description,
    status: row?.status ?? 1,
  })
  roleDialog.visible = true
}

/** 提交角色新增/编辑 */
async function submitRole(): Promise<void> {
  if (!roleFormRef.value) return
  await roleFormRef.value.validate()
  saving.value = true
  try {
    if (roleDialog.form.id) {
      await updateSystemRole({ ...roleDialog.form })
      ElMessage.success('角色已更新')
    } else {
      await createSystemRole({ ...roleDialog.form })
      ElMessage.success('角色已创建')
    }
    roleDialog.visible = false
    await fetchSystemRoles()
  } catch (error) {
    showError(error, '保存角色失败')
  } finally {
    saving.value = false
  }
}

/** 删除角色（确认后提交） */
async function handleDeleteRole(row: SystemRole): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteSystemRole(row.id)
    ElMessage.success('角色已删除')
    await fetchSystemRoles()
  } catch (error) {
    showError(error, '删除角色失败')
  }
}

/** 打开权限对话框（无参为新增） */
function openPermissionDialog(row?: SystemPermission): void {
  Object.assign(permissionDialog.form, {
    id: row?.id,
    name: row?.name ?? '',
    code: row?.code ?? '',
    description: row?.description,
    type: row?.type ?? 2,
    status: row?.status ?? 1,
  })
  permissionDialog.visible = true
}

/** 提交权限新增/编辑 */
async function submitPermission(): Promise<void> {
  if (!permissionFormRef.value) return
  await permissionFormRef.value.validate()
  saving.value = true
  try {
    if (permissionDialog.form.id) {
      await updateSystemPermission({ ...permissionDialog.form })
      ElMessage.success('权限已更新')
    } else {
      await createSystemPermission({ ...permissionDialog.form })
      ElMessage.success('权限已创建')
    }
    permissionDialog.visible = false
    await fetchSystemPermissions()
  } catch (error) {
    showError(error, '保存权限失败')
  } finally {
    saving.value = false
  }
}

/** 删除权限（确认后提交） */
async function handleDeletePermission(row: SystemPermission): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除权限「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteSystemPermission(row.id)
    ElMessage.success('权限已删除')
    await fetchSystemPermissions()
  } catch (error) {
    showError(error, '删除权限失败')
  }
}

onMounted(fetchRoles)
</script>

<style scoped lang="scss">
.tab-toolbar {
  margin-bottom: 16px;
}
</style>
