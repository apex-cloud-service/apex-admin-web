<!--
  用户管理
  ------------------------------------------------------------------
  后台用户列表：关键字/状态筛选、分页、新增/编辑、启停、角色分配。
-->
<template>
  <el-card shadow="never">
    <!-- 查询区 -->
    <el-form inline class="search-form">
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="昵称/手机号" clearable style="width: 200px" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="正常" :value="0" />
          <el-option label="禁用" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <!-- 新增用户：按钮级权限示例 -->
        <el-button v-permission="'system:user:create'" type="success" :icon="Plus" @click="openCreate">新增</el-button>
      </el-form-item>
    </el-form>

    <!-- 列表区 -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="nickName" label="昵称" min-width="120" />
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'danger'">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openAssignRole(row)">角色</el-button>
          <el-button link :type="row.status === 0 ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 0 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区 -->
    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑用户' : '新增用户'" width="480px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" :disabled="dialog.isEdit" placeholder="登录账号" />
        </el-form-item>
        <el-form-item v-if="!dialog.isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="初始密码" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickName">
          <el-input v-model="form.nickName" placeholder="显示昵称" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="0" :inactive-value="1" active-text="正常" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 角色分配弹窗 -->
    <el-dialog v-model="roleDialog.visible" title="分配角色" width="420px">
      <el-checkbox-group v-model="roleDialog.roleIds">
        <el-checkbox v-for="role in roleOptions" :key="role.id" :value="role.id" style="display: block">
          {{ role.name }}（{{ role.code }}）
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="roleDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRoles">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 用户管理脚本
 * - 查询：关键字 + 状态，分页拉取
 * - 新增/编辑：表单校验后提交
 * - 角色分配：拉取后台角色并勾选保存
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  assignUserRoles,
  createUser,
  getUserDetail,
  listStaffRoles,
  listUsers,
  updateUser,
  updateUserStatus,
  type AdminUserPayload,
} from '@/api/user'
import type { AdminUser, StaffRole } from '@/types'

/** 加载状态 */
const loading = ref(false)
/** 保存状态 */
const saving = ref(false)
/** 用户列表 */
const list = ref<AdminUser[]>([])
/** 总数 */
const total = ref(0)

/** 查询参数 */
const query = reactive({ page: 1, size: 20, keyword: '', status: undefined as number | undefined })

/** 新增/编辑弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: 0 })
/** 表单实例与数据 */
const formRef = ref<FormInstance>()
const form = reactive<AdminUserPayload & { status: number }>({
  username: '',
  password: '',
  nickName: '',
  phone: '',
  status: 0,
})

/** 表单校验规则 */
const formRules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

/** 角色分配弹窗状态 */
const roleDialog = reactive({ visible: false, userId: 0, roleIds: [] as number[] })
/** 后台角色选项 */
const roleOptions = ref<StaffRole[]>([])

/**
 * 拉取用户列表（按当前查询条件）。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listUsers({
      page: query.page,
      size: query.size,
      keyword: query.keyword,
      status: query.status,
    })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

/** 查询：重置到第一页后拉取 */
function search(): void {
  query.page = 1
  fetchList()
}

/** 重置查询条件 */
function reset(): void {
  query.keyword = ''
  query.status = undefined
  search()
}

/** 分页变化回调 */
function onPageChange(page: number, size: number): void {
  query.page = page
  query.size = size
  fetchList()
}

/** 打开新增弹窗 */
function openCreate(): void {
  dialog.isEdit = false
  dialog.id = 0
  Object.assign(form, { username: '', password: '', nickName: '', phone: '', status: 0 })
  dialog.visible = true
}

/**
 * 打开编辑弹窗（回填详情）。
 * @param row 行数据
 */
async function openEdit(row: AdminUser): Promise<void> {
  dialog.isEdit = true
  dialog.id = row.id
  try {
    const detail = await getUserDetail(row.id)
    Object.assign(form, {
      username: detail.username,
      password: '',
      nickName: detail.nickName,
      phone: detail.phone,
      status: detail.status ?? 0,
    })
    dialog.visible = true
  } catch (error) {
    showError(error)
  }
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
    const payload: AdminUserPayload = {
      username: form.username,
      nickName: form.nickName,
      phone: form.phone,
      status: form.status,
    }
    if (!dialog.isEdit) payload.password = form.password
    if (dialog.isEdit) {
      await updateUser(dialog.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createUser(payload)
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
 * 启停用户。
 * @param row 行数据
 */
async function toggleStatus(row: AdminUser): Promise<void> {
  const enable = row.status === 1
  try {
    await ElMessageBox.confirm(`确认${enable ? '启用' : '禁用'}用户「${row.nickName || row.username}」？`, '提示', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await updateUserStatus(row.id, enable)
    ElMessage.success('状态已更新')
    fetchList()
  } catch (error) {
    showError(error)
  }
}

/**
 * 打开角色分配弹窗。
 * @param row 行数据
 */
async function openAssignRole(row: AdminUser): Promise<void> {
  roleDialog.userId = row.id
  try {
    // 并行拉取详情（含已分配角色）与全部后台角色
    const [detail, roles] = await Promise.all([getUserDetail(row.id), listStaffRoles()])
    roleOptions.value = roles || []
    roleDialog.roleIds = (detail.roleIds || []).slice()
    roleDialog.visible = true
  } catch (error) {
    showError(error)
  }
}

/** 提交角色分配 */
async function submitRoles(): Promise<void> {
  saving.value = true
  try {
    await assignUserRoles(roleDialog.userId, roleDialog.roleIds)
    ElMessage.success('角色已更新')
    roleDialog.visible = false
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

// 页面挂载时初始化
onMounted(fetchList)
</script>

<style scoped>
/* 查询区与列表间距 */
.search-form {
  margin-bottom: 8px;
}

/* 分页区右对齐 */
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
