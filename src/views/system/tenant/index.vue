<!--
  租户管理
  ------------------------------------------------------------------
  平台运维域的租户台账（/api/v2/platform/tenants）：
  - 分页查询（编码/名称模糊、状态精确）
  - 创建租户（编码全局唯一且创建后不可变更）
  - 生命周期动作：停用/启用/冻结/解冻/注销/归档（支持乐观锁 version）
  - 配额调整：最大用户数与最大存储容量（留空表示不限制）

  权限要求（按钮 v-permission）：tenant:create / tenant:lifecycle / tenant:quota。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>租户管理</span>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog" v-permission="'tenant:create'">新建租户</el-button>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="租户编码">
        <el-input v-model="query.tenantCode" placeholder="模糊匹配" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item label="租户名称">
        <el-input v-model="query.tenantName" placeholder="模糊匹配" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="(name, key) in TENANT_STATUS_NAMES" :key="key" :label="name" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="tenantCode" label="租户编码" width="150">
        <template #default="{ row }"><el-tag>{{ row.tenantCode }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="tenantName" label="租户名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="TENANT_STATUS_TAG_TYPES[row.status] || 'info'" size="small">
            {{ TENANT_STATUS_NAMES[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最大用户数" width="110">
        <template #default="{ row }">{{ row.maxUsers ?? '不限' }}</template>
      </el-table-column>
      <el-table-column label="最大存储(MB)" width="130">
        <template #default="{ row }">{{ row.maxStorageMb ?? '不限' }}</template>
      </el-table-column>
      <el-table-column label="套餐" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.packageCode" size="small">{{ row.packageCode }}</el-tag>
          <el-tag v-else size="small" type="warning">未绑定（无授权）</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期至" width="170">
        <template #default="{ row }">{{ row.expireTime || '-' }}</template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="(action: string) => handleAction(row, action)">
            <el-button link type="primary" v-permission="'tenant:lifecycle'">
              生命周期<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="action in availableActions(row.status)"
                  :key="action"
                  :command="action"
                  :divided="action === 'enable' || action === 'unfreeze'"
                >
                  {{ TENANT_ACTION_NAMES[action] }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button link type="primary" @click="openQuotaDialog(row)" v-permission="'tenant:quota'">配额</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" @change="onPageChange" />

    <!-- 新建租户 -->
    <el-dialog v-model="createVisible" title="新建租户" width="560px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="租户编码" prop="tenantCode">
          <el-input v-model="createForm.tenantCode" placeholder="1-64 位字母、数字、下划线或短横线，创建后不可变更" />
        </el-form-item>
        <el-form-item label="租户名称" prop="tenantName">
          <el-input v-model="createForm.tenantName" placeholder="租户显示名称" />
        </el-form-item>
        <el-form-item label="套餐标识" prop="packageCode">
          <el-select
            v-model="createForm.packageCode"
            placeholder="选择套餐（必选：决定该租户的菜单、权限与能力范围）"
            clearable
            filterable
            default-first-option
            style="width: 100%"
          >
            <el-option
              v-for="pkg in packageOptions"
              :key="pkg.packageCode"
              :label="`${pkg.packageName}（${pkg.packageCode}）`"
              :value="pkg.packageCode"
            />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">租户管理员</el-divider>
        <el-form-item label="管理员用户ID" prop="adminUserId">
          <el-input v-model="createForm.adminUserId" placeholder="选填：已有用户 ID" />
        </el-form-item>
        <el-form-item label="管理员账号" prop="adminUsername">
          <el-input v-model="createForm.adminUsername" placeholder="选填：同时填写账号与密码将创建租户管理员" />
        </el-form-item>
        <el-form-item label="初始密码" prop="adminPassword">
          <el-input
            v-model="createForm.adminPassword"
            type="password"
            show-password
            placeholder="选填：8-64 位，创建后需由管理员首登修改"
          />
        </el-form-item>

        <el-divider content-position="left">配额与备注</el-divider>
        <el-form-item label="最大用户数" prop="maxUsers">
          <el-input-number v-model="createForm.maxUsers" :min="1" :controls="false" placeholder="留空表示不限制" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大存储(MB)" prop="maxStorageMb">
          <el-input-number v-model="createForm.maxStorageMb" :min="1" :controls="false" placeholder="留空表示不限制" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 配额调整 -->
    <el-dialog v-model="quotaVisible" title="调整配额" width="480px">
      <el-form label-width="120px">
        <el-form-item label="租户">
          <span>{{ quotaTarget?.tenantName }}（{{ quotaTarget?.tenantCode }}）</span>
        </el-form-item>
        <el-form-item label="最大用户数">
          <el-input-number v-model="quotaForm.maxUsers" :min="1" :controls="false" placeholder="留空表示不限制" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大存储(MB)">
          <el-input-number v-model="quotaForm.maxStorageMb" :min="1" :controls="false" placeholder="留空表示不限制" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitQuota">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 租户管理脚本
 * - 分页查询 + 创建 + 生命周期动作 + 配额调整
 * - 生命周期动作携带当前记录 version 作为乐观锁，冲突由后端拒绝
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { ArrowDown, Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  changeTenantStatus,
  createTenant,
  listTenants,
  TENANT_ACTION_NAMES,
  TENANT_DANGER_ACTIONS,
  TENANT_STATUS_NAMES,
  TENANT_STATUS_TAG_TYPES,
  updateTenantQuota,
  type TenantQuery,
} from '@/api/tenant'
import type { TenantAction, TenantCreatePayload, TenantInfo, TenantPackage, TenantQuotaPayload } from '@/types'
import { listTenantPackages } from '@/api/tenant-package'

const loading = ref(false)
const saving = ref(false)
const list = ref<TenantInfo[]>([])
const total = ref(0)
/** 套餐候选（开通向导下拉） */
const packageOptions = ref<TenantPackage[]>([])

/** 查询条件（pageNum/pageSize 为后端必填） */
const query = reactive<TenantQuery>({ pageNum: 1, pageSize: 10 })

// ==================== 新建租户 ====================
const createVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive<TenantCreatePayload>({
  tenantCode: '',
  tenantName: '',
  adminUserId: undefined,
  adminUsername: undefined,
  adminPassword: undefined,
  packageCode: undefined,
  maxUsers: undefined,
  maxStorageMb: undefined,
  remark: undefined,
})
/** 校验规则与后端 TenantCreateRequest 注解保持一致 */
const createRules: FormRules = {
  tenantCode: [
    { required: true, message: '请输入租户编码', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '仅允许字母、数字、下划线或短横线', trigger: 'blur' },
  ],
  tenantName: [
    { required: true, message: '请输入租户名称', trigger: 'blur' },
    { max: 128, message: '最长 128 位', trigger: 'blur' },
  ],
  packageCode: [{ required: true, message: '请选择租户套餐（未绑定套餐将拒绝全部授权）', trigger: 'change' }],
  // 管理员账号与密码需成对提供，长度按后端用户体系约束
  adminUsername: [
    {
      validator: (_rule, value: string, callback) => {
        if (value && !createForm.adminPassword) {
          callback(new Error('填写管理员账号时须同时填写初始密码'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  adminPassword: [
    {
      validator: (_rule, value: string, callback) => {
        if (value && !createForm.adminUsername) {
          callback(new Error('填写初始密码时须同时填写管理员账号'))
          return
        }
        if (value && (value.length < 8 || value.length > 64)) {
          callback(new Error('初始密码长度 8-64 位'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

// ==================== 配额调整 ====================
const quotaVisible = ref(false)
const quotaTarget = ref<TenantInfo | null>(null)
const quotaForm = reactive<TenantQuotaPayload>({ maxUsers: undefined, maxStorageMb: undefined })

/**
 * 按当前状态给出可执行的生命周期动作。
 * @param status 租户状态
 */
function availableActions(status: string): TenantAction[] {
  const map: Record<string, TenantAction[]> = {
    ACTIVE: ['disable', 'freeze', 'deactivate', 'archive'],
    DISABLED: ['enable', 'archive'],
    FROZEN: ['unfreeze', 'deactivate'],
    DEACTIVATED: ['archive'],
    ARCHIVED: [],
  }
  return map[status] ?? []
}

/** 拉取租户列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listTenants(query)
    list.value = result.list || []
    total.value = result.total
  } catch (error) {
    showError(error, '加载租户列表失败')
  } finally {
    loading.value = false
  }
}

/** 查询：重置到第一页 */
function search(): void {
  query.pageNum = 1
  fetchList()
}

/** 重置查询条件 */
function reset(): void {
  query.tenantCode = undefined
  query.tenantName = undefined
  query.status = undefined
  search()
}

/** 分页变化 */
function onPageChange(page: number, size: number): void {
  query.pageNum = page
  query.pageSize = size
  fetchList()
}

/** 打开新建租户对话框；套餐候选为空时加载，已有候选时复用缓存，不每次刷新。 */
function openCreateDialog(): void {
  Object.assign(createForm, {
    tenantCode: '',
    tenantName: '',
    adminUserId: undefined,
    adminUsername: undefined,
    adminPassword: undefined,
    packageCode: undefined,
    maxUsers: undefined,
    maxStorageMb: undefined,
    remark: undefined,
  })
  createVisible.value = true
  if (packageOptions.value.length === 0) {
    listTenantPackages()
      .then((packages) => {
        packageOptions.value = packages || []
      })
      .catch(() => {
        // 套餐列表失败不阻塞打开向导（提交时套餐为必选，可重开向导重试加载）
      })
  }
}

/** 提交创建 */
async function submitCreate(): Promise<void> {
  if (!createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await createTenant({ ...createForm })
    ElMessage.success('租户已创建')
    createVisible.value = false
    search()
  } catch (error) {
    showError(error, '创建租户失败')
  } finally {
    saving.value = false
  }
}

/** 执行生命周期动作（危险动作二次确认，携带乐观锁 version） */
async function handleAction(row: TenantInfo, action: string): Promise<void> {
  const actionName = TENANT_ACTION_NAMES[action] || action
  const danger = TENANT_DANGER_ACTIONS.includes(action)
  try {
    await ElMessageBox.confirm(
      `确认对租户「${row.tenantName}」执行「${actionName}」操作？`,
      danger ? '危险操作确认' : '提示',
      { type: danger ? 'warning' : 'info' },
    )
  } catch {
    return
  }
  try {
    await changeTenantStatus(row.id, { action: action as TenantAction, expectedVersion: row.version })
    ElMessage.success(`已${actionName}`)
    fetchList()
  } catch (error) {
    showError(error, `${actionName}失败`)
  }
}

/** 打开配额调整对话框 */
function openQuotaDialog(row: TenantInfo): void {
  quotaTarget.value = row
  quotaForm.maxUsers = row.maxUsers ?? undefined
  quotaForm.maxStorageMb = row.maxStorageMb ?? undefined
  quotaVisible.value = true
}

/** 提交配额调整 */
async function submitQuota(): Promise<void> {
  if (!quotaTarget.value) return
  saving.value = true
  try {
    await updateTenantQuota(quotaTarget.value.id, {
      maxUsers: quotaForm.maxUsers ?? null,
      maxStorageMb: quotaForm.maxStorageMb ?? null,
      expectedVersion: quotaTarget.value.version,
    })
    ElMessage.success('配额已更新')
    quotaVisible.value = false
    fetchList()
  } catch (error) {
    showError(error, '更新配额失败')
  } finally {
    saving.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-form {
  margin-bottom: 8px;
}
</style>
