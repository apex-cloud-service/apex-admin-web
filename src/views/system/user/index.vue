<!--
  用户管理
  ------------------------------------------------------------------
  后台用户列表：关键字/状态筛选、分页、新增/编辑、启停、角色分配。
  字段与后端 AdminUserSummaryResponse / AdminUserCreateRequest 对齐：
  列表字段 nickname（非 nickName）、无 username；创建必填 phone/nickname/gender/birthday。
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
          <el-option label="正常" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <!-- 新增用户：按钮级权限示例 -->
        <el-button v-permission="'staff:manage'" type="success" :icon="Plus" @click="openCreate">新增</el-button>
        <el-button :icon="Download" :loading="exporting" @click="handleExport">导出Excel</el-button>
      </el-form-item>
    </el-form>

    <!-- 列表区 -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column label="性别" width="70">
        <template #default="{ row }">{{ genderLabel(row.gender) }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="角色" min-width="150">
        <template #default="{ row }">
          <el-tag v-for="role in row.roles || []" :key="role.id" size="small" style="margin-right: 4px">
            {{ role.name }}
          </el-tag>
          <span v-if="!row.roles?.length">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" min-width="160" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openAssignRole(row)">角色</el-button>
          <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区 -->
    <div class="pagination-wrap">
      <Pagination :total="total" @change="onPageChange" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑用户' : '新增用户'" width="520px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="显示昵称" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生日" prop="birthday">
          <el-date-picker
            v-model="form.birthday"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择生日"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="国家">
          <el-input v-model="form.country" placeholder="可选" />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="form.province" placeholder="可选" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="form.city" placeholder="可选" />
        </el-form-item>
        <el-form-item label="职业">
          <el-input v-model="form.job" placeholder="可选" />
        </el-form-item>
        <el-form-item label="个性签名">
          <el-input v-model="form.bio" type="textarea" :rows="2" placeholder="可选" />
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
 * - 新增/编辑：手机号/昵称/性别/生日 等字段校验后提交
 * - 角色分配：拉取后台角色并整体替换保存
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Download, Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  assignUserRoles,
  createUser,
  exportUsers,
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
/** 导出进行中 */
const exporting = ref(false)
/** 保存状态 */
const saving = ref(false)
/** 用户列表 */
const list = ref<AdminUser[]>([])
/** 总数 */
const total = ref(0)

/** 查询参数 */
const query = reactive({ page: 1, size: 20, keyword: '', status: undefined as number | undefined })

/** 新增/编辑弹窗状态 */
const dialog = reactive({ visible: false, isEdit: false, id: '' })
/** 表单实例与数据 */
const formRef = ref<FormInstance>()
const form = reactive<AdminUserPayload>({
  phone: '',
  nickname: '',
  gender: 1,
  birthday: '',
  country: '',
  province: '',
  city: '',
  job: '',
  bio: '',
})

/** 表单校验规则 */
const formRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  birthday: [{ required: true, message: '请选择生日', trigger: 'change' }],
}

/** 角色分配弹窗状态 */
const roleDialog = reactive({ visible: false, userId: '', roleIds: [] as string[] })
/** 后台角色选项 */
const roleOptions = ref<StaffRole[]>([])

/** 性别文案 */
function genderLabel(gender?: number): string {
  return gender === 1 ? '男' : gender === 2 ? '女' : '-'
}

/**
 * 拉取用户列表（按当前查询条件）。
 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const data = await listUsers({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
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

/** 导出用户列表 Excel（后端固定返回最近创建的前 100 条） */
async function handleExport(): Promise<void> {
  exporting.value = true
  try {
    const { blob, filename } = await exportUsers()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    showError(error, '导出失败')
  } finally {
    exporting.value = false
  }
}

/** 打开新增弹窗 */
function openCreate(): void {
  dialog.isEdit = false
  dialog.id = ''
  Object.assign(form, {
    phone: '',
    nickname: '',
    gender: 1,
    birthday: '',
    country: '',
    province: '',
    city: '',
    job: '',
    bio: '',
  })
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
      phone: detail.phone,
      nickname: detail.nickname,
      gender: detail.gender ?? 1,
      birthday: detail.birthday || '',
      country: detail.country || '',
      province: detail.province || '',
      city: detail.city || '',
      job: detail.profileDetails?.job || '',
      bio: detail.profileDetails?.bio || '',
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
      phone: form.phone,
      nickname: form.nickname,
      gender: form.gender,
      birthday: form.birthday,
      country: form.country || undefined,
      province: form.province || undefined,
      city: form.city || undefined,
      job: form.job || undefined,
      bio: form.bio || undefined,
    }
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
  const enable = row.status !== 1
  try {
    await ElMessageBox.confirm(`确认${enable ? '启用' : '禁用'}用户「${row.nickname}」？`, '提示', {
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
    roleDialog.roleIds = (detail.roles || []).map((r) => r.id)
    roleDialog.visible = true
  } catch (error) {
    showError(error)
  }
}

/** 提交角色分配（整体替换） */
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
