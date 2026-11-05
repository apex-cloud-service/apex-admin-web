<!--
  组织架构同步页面
  ------------------------------------------------------------------
  管理办公平台（飞书/钉钉/企业微信）同步到本系统的组织数据：
  - 组织数据：同步部门与员工列表（员工可按部门过滤）
  - 同步历史：每次同步的执行记录（来源/状态/耗时/数量）
  - 同步操作：按平台触发部门或成员同步，跟踪同步任务与平台映射

  权限要求：
  - office:organization:dept - 部门新增/编辑/删除
  - office:organization:user - 查看员工详情
  - office:organization:sync - 触发组织同步
  - office:sync:read - 同步向导预检与预览
  - office:sync:execute - 执行同步与重试失败任务
-->
<template>
  <div class="organization-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>组织架构同步</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 组织数据 -->
        <el-tab-pane label="组织数据" name="org">
          <el-divider content-position="left">部门</el-divider>
          <div class="filter-toolbar">
            <el-select
              v-model="deptStatusFilter"
              placeholder="状态过滤"
              clearable
              style="width: 160px"
              @change="onDeptFilterChange"
            >
              <el-option label="正常" value="ACTIVE" />
              <el-option label="停用" value="INACTIVE" />
            </el-select>
            <el-button type="primary" @click="openDeptDialog()" v-permission="'office:organization:dept'">新增部门</el-button>
          </div>
          <el-table
            v-loading="deptLoading"
            :data="departments"
            border
            stripe
            highlight-current-row
            @row-click="handleDeptRowClick"
          >
            <el-table-column prop="deptCode" label="部门编码" width="160" />
            <el-table-column prop="deptName" label="部门名称" min-width="180" />
            <el-table-column prop="deptLevel" label="层级" width="80" />
            <el-table-column prop="leaderName" label="负责人" width="120" />
            <el-table-column prop="syncSource" label="同步来源" width="110">
              <template #default="{ row }">{{ platformName(row.syncSource) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="externalId" label="平台侧ID" min-width="140" show-overflow-tooltip />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="openDeptDialog(row)" v-permission="'office:organization:dept'">编辑</el-button>
                <el-button link type="danger" @click.stop="handleDeleteDept(row)" v-permission="'office:organization:dept'">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination class="pager" :total="deptTotal" @change="onDeptPageChange" />

          <el-divider content-position="left">员工{{ employeeDeptName ? `（${employeeDeptName}）` : '' }}</el-divider>
          <div class="filter-toolbar">
            <el-select
              v-model="employeeDeptId"
              placeholder="按部门过滤"
              clearable
              filterable
              style="width: 220px"
              @change="onEmployeeFilterChange"
            >
              <el-option
                v-for="dept in deptOptions"
                :key="dept.id"
                :label="dept.deptName"
                :value="dept.id"
              />
            </el-select>
          </div>
          <el-table v-loading="employeeLoading" :data="employees" border stripe>
            <el-table-column prop="employeeCode" label="工号" width="140" />
            <el-table-column prop="employeeName" label="姓名" width="120" />
            <el-table-column prop="deptName" label="部门" min-width="140" />
            <el-table-column prop="position" label="职位" width="120" />
            <el-table-column prop="mobile" label="手机号" width="140" />
            <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            <el-table-column label="绑定用户ID" width="110">
              <template #default="{ row }">{{ row.userId ?? '-' }}</template>
            </el-table-column>
            <el-table-column prop="syncSource" label="同步来源" width="110">
              <template #default="{ row }">{{ platformName(row.syncSource) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="showEmployeeDetail(row)" v-permission="'office:organization:user'">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination class="pager" :total="employeeTotal" @change="onEmployeePageChange" />
        </el-tab-pane>

        <!-- 同步历史 -->
        <el-tab-pane label="同步历史" name="history">
          <div class="filter-toolbar">
            <el-select
              v-model="historySourceFilter"
              placeholder="同步来源"
              clearable
              style="width: 160px"
              @change="onHistoryFilterChange"
            >
              <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
            <el-select
              v-model="historyStatusFilter"
              placeholder="同步状态"
              clearable
              style="width: 160px"
              @change="onHistoryFilterChange"
            >
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="进行中" value="RUNNING" />
            </el-select>
          </div>
          <el-table v-loading="historyLoading" :data="syncHistories" border stripe>
            <el-table-column prop="syncType" label="同步对象" width="120" />
            <el-table-column label="来源" width="110">
              <template #default="{ row }">{{ platformName(row.syncSource) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="syncStatusTagType(row.syncStatus)" size="small">
                  {{ row.syncStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="开始时间" width="180">
              <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
            </el-table-column>
            <el-table-column label="耗时" width="100">
              <template #default="{ row }">{{ row.duration != null ? `${row.duration}s` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="deptCount" label="部门数" width="90" />
            <el-table-column prop="employeeCount" label="员工数" width="90" />
            <el-table-column prop="errorMessage" label="错误信息" min-width="200" show-overflow-tooltip />
          </el-table>
          <Pagination class="pager" :total="historyTotal" @change="onHistoryPageChange" />
        </el-tab-pane>

        <!-- 同步操作 -->
        <el-tab-pane label="同步操作" name="sync">
          <el-divider content-position="left">触发同步</el-divider>
          <el-form :inline="true" class="sync-form">
            <el-form-item label="平台">
              <el-select v-model="syncForm.platform" style="width: 160px">
                <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="同步对象">
              <el-radio-group v-model="syncForm.syncType">
                <el-radio-button value="DEPARTMENT">部门</el-radio-button>
                <el-radio-button value="MEMBER">成员</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="全量同步">
              <el-switch v-model="syncForm.fullSync" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="syncing" v-permission="'office:organization:sync'" @click="handleTriggerSync">
                触发同步
              </el-button>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">同步向导（推荐）</el-divider>
          <el-form :inline="true" class="sync-form">
            <el-form-item label="平台">
              <el-select v-model="wizardForm.platform" style="width: 160px">
                <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="同步对象">
              <el-radio-group v-model="wizardForm.syncType">
                <el-radio-button value="DEPARTMENT">部门</el-radio-button>
                <el-radio-button value="MEMBER">成员</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button :loading="wizardLoading" v-permission="'office:sync:read'" @click="handleWizardPreflight">预检</el-button>
              <el-button type="primary" :loading="wizardLoading" v-permission="'office:sync:read'" @click="handleWizardPreview">预览</el-button>
              <el-button type="success" :loading="wizardLoading" :disabled="!wizardReady" v-permission="'office:sync:execute'" @click="handleWizardExecute">执行同步</el-button>
            </el-form-item>
          </el-form>
          <el-alert v-if="wizardMessage" :title="wizardMessage" :type="wizardReady ? 'success' : 'warning'" :closable="false" style="margin-bottom: 12px" />
          <el-descriptions v-if="wizardPreview" :column="4" border style="margin-bottom: 12px">
            <el-descriptions-item label="样本数">{{ wizardPreview.sampleCount }}</el-descriptions-item>
            <el-descriptions-item label="已映射">{{ wizardPreview.mappedCount }}</el-descriptions-item>
            <el-descriptions-item label="新增">{{ wizardPreview.newCount }}</el-descriptions-item>
            <el-descriptions-item label="还有更多">{{ wizardPreview.hasMore ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">同步任务</el-divider>
          <div class="filter-toolbar">
            <el-select
              v-model="taskPlatformFilter"
              placeholder="平台过滤"
              clearable
              style="width: 160px"
              @change="onTaskFilterChange"
            >
              <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
          </div>
          <el-table v-loading="taskLoading" :data="syncTasks" border stripe>
            <el-table-column prop="id" label="任务ID" width="100" />
            <el-table-column label="平台" width="120">
              <template #default="{ row }">{{ platformName(row.platform) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="syncStatusTagType(row.state)" size="small">{{ row.state }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="cursor" label="游标" min-width="140" show-overflow-tooltip />
            <el-table-column prop="failureMessage" label="失败信息" min-width="200" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="80" />
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.state === 'FAILED'" link type="primary" v-permission="'office:sync:execute'" @click="handleWizardRetry(row)">重试</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination class="pager" :total="taskTotal" @change="onTaskPageChange" />

          <el-divider content-position="left">平台映射</el-divider>
          <div class="filter-toolbar">
            <el-select
              v-model="mappingPlatformFilter"
              placeholder="平台过滤"
              clearable
              style="width: 160px"
              @change="loadMappings"
            >
              <el-option v-for="(name, key) in PLATFORM_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
          </div>
          <el-table v-loading="mappingLoading" :data="mappings" border stripe>
            <el-table-column prop="id" label="ID" width="90" />
            <el-table-column label="平台" width="120">
              <template #default="{ row }">{{ platformName(row.platform) }}</template>
            </el-table-column>
            <el-table-column prop="externalOrgId" label="平台部门ID" min-width="150" show-overflow-tooltip />
            <el-table-column prop="apexDeptId" label="本地部门ID" width="120" />
            <el-table-column prop="externalUserId" label="平台成员ID" min-width="150" show-overflow-tooltip />
            <el-table-column prop="apexUserId" label="本地用户ID" width="120" />
            <el-table-column label="更新时间" width="180">
              <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- 部门编辑对话框 -->
      <el-dialog
        v-model="deptDialog.visible"
        :title="deptDialog.id ? '编辑部门' : '新增部门'"
        width="560px"
      >
        <el-form ref="deptFormRef" :model="deptDialog.form" :rules="deptRules" label-width="100px">
          <el-form-item label="部门编码" prop="deptCode">
            <el-input
              v-model="deptDialog.form.deptCode"
              :disabled="!!deptDialog.id"
              placeholder="租户内唯一，如 D-0001"
            />
          </el-form-item>
          <el-form-item label="部门名称" prop="deptName">
            <el-input v-model="deptDialog.form.deptName" placeholder="请输入部门名称" />
          </el-form-item>
          <el-form-item label="上级部门" prop="parentId">
            <el-select v-model="deptDialog.form.parentId" style="width: 100%">
              <el-option label="根部门" :value="0" />
              <el-option
                v-for="dept in parentOptions"
                :key="dept.id"
                :label="dept.deptName"
                :value="dept.id"
                :disabled="dept.id === deptDialog.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="排序号" prop="sortOrder">
            <el-input-number v-model="deptDialog.form.sortOrder" :min="0" :controls="false" />
          </el-form-item>
          <el-form-item label="负责人" prop="leaderName">
            <el-input v-model="deptDialog.form.leaderName" placeholder="负责人姓名（选填）" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="deptDialog.form.phone" placeholder="联系电话（选填）" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="deptDialog.form.email" placeholder="邮箱（选填）" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="deptDialog.form.status">
              <el-radio value="ACTIVE">正常</el-radio>
              <el-radio value="INACTIVE">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="deptDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="deptSaving" @click="submitDept">确定</el-button>
        </template>
      </el-dialog>

      <!-- 员工详情抽屉 -->
      <el-drawer v-model="employeeDetailVisible" title="员工详情" size="440px">
        <el-descriptions v-if="employeeDetail" :column="1" border>
          <el-descriptions-item label="工号">{{ employeeDetail.employeeCode }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ employeeDetail.employeeName }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ employeeDetail.deptName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ employeeDetail.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职务">{{ employeeDetail.jobTitle || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ employeeDetail.mobile || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ employeeDetail.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ employeeDetail.gender || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生日">{{ employeeDetail.birthday || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入职日期">{{ employeeDetail.hireDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="绑定用户ID">{{ employeeDetail.userId ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="同步来源">
            {{ platformName(employeeDetail.syncSource) }}
          </el-descriptions-item>
          <el-descriptions-item label="平台侧ID">{{ employeeDetail.externalId || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-drawer>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  PLATFORM_NAMES,
  createOrgDepartment,
  deleteOrgDepartment,
  getOrgEmployee,
  listOrgDepartments,
  listOrgEmployees,
  listOrgMappings,
  listOrgSyncHistory,
  listOrgSyncTasks,
  triggerOrgSync,
  updateOrgDepartment,
  type OrgDepartmentPayload,
} from '@/api/office-platform'
import {
  executeOrgSync,
  preflightOrgSync,
  previewOrgSync,
  retryWizardSyncTask,
  type SyncPreviewResult,
} from '@/api/office-sync-wizard'
import type { OrgSyncRequest } from '@/types'
import type { OrganizationMapping, OrgDepartment, OrgEmployee, OrgSyncHistory, OrgSyncTask } from '@/types'

// 当前激活的标签页
const activeTab = ref('org')

// ==================== 部门 ====================
const deptLoading = ref(false)
const departments = ref<OrgDepartment[]>([])
const deptPage = ref(1)
const deptSize = ref(10)
const deptTotal = ref(0)
const deptStatusFilter = ref<string>()
const deptOptions = ref<OrgDepartment[]>([])

// ==================== 员工 ====================
const employeeLoading = ref(false)
const employees = ref<OrgEmployee[]>([])
const employeePage = ref(1)
const employeeSize = ref(10)
const employeeTotal = ref(0)
const employeeDeptId = ref<number>()
const employeeDeptName = ref('')

// ==================== 同步历史 ====================
const historyLoading = ref(false)
const syncHistories = ref<OrgSyncHistory[]>([])
const historyPage = ref(1)
const historySize = ref(10)
const historyTotal = ref(0)
const historySourceFilter = ref<string>()
const historyStatusFilter = ref<string>()

// ==================== 同步操作 ====================
const syncing = ref(false)
const syncForm = reactive<OrgSyncRequest>({
  platform: 'FEISHU',
  syncType: 'DEPARTMENT',
  fullSync: false,
})

// ==================== 同步向导（预检/预览/执行） ====================
const wizardLoading = ref(false)
const wizardForm = reactive<{ platform: string; syncType: 'DEPARTMENT' | 'MEMBER' }>({
  platform: 'FEISHU',
  syncType: 'DEPARTMENT',
})
const wizardReady = ref(false)
const wizardMessage = ref('')
const wizardPreview = ref<SyncPreviewResult | null>(null)
const taskLoading = ref(false)
const syncTasks = ref<OrgSyncTask[]>([])
const taskPage = ref(1)
const taskSize = ref(10)
const taskTotal = ref(0)
const taskPlatformFilter = ref<string>()
const mappingLoading = ref(false)
const mappings = ref<OrganizationMapping[]>([])
const mappingPlatformFilter = ref<string>()

/** 平台标识 → 中文名称（未知标识原样展示） */
function platformName(platform?: string): string {
  if (!platform) return '-'
  return PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES] || platform
}

// ==================== 部门管理 ====================
const deptFormRef = ref<FormInstance>()
const deptSaving = ref(false)
const deptDialog = reactive<{ visible: boolean; id?: number; form: OrgDepartmentPayload }>({
  visible: false,
  id: undefined,
  form: {
    deptCode: '',
    deptName: '',
    parentId: 0,
    sortOrder: 0,
    leaderName: undefined,
    phone: undefined,
    email: undefined,
    status: 'ACTIVE',
  },
})
/** 部门必填校验（后端 DTO 无校验注解，编码在租户内唯一） */
const deptRules: FormRules = {
  deptCode: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

/** 上级部门可选项（编辑时排除自身，避免自引用） */
const parentOptions = computed(() =>
  deptOptions.value.filter((dept) => dept.id !== deptDialog.id),
)

/**
 * 按父部门推导 deptLevel/deptPath（后端照抄存储，不计算）。
 */
function deriveDeptFields(): { deptLevel: number; deptPath: string } {
  const parent = deptOptions.value.find((dept) => dept.id === deptDialog.form.parentId)
  const code = deptDialog.form.deptCode
  if (parent) {
    const level = (parent.deptLevel ?? 1) + 1
    const path = parent.deptPath ? `${parent.deptPath}/${code}` : `${parent.deptCode}/${code}`
    return { deptLevel: level, deptPath: path }
  }
  return { deptLevel: 1, deptPath: code }
}

/** 打开部门对话框（无参为新增） */
function openDeptDialog(row?: OrgDepartment): void {
  Object.assign(deptDialog.form, {
    deptCode: row?.deptCode ?? '',
    deptName: row?.deptName ?? '',
    parentId: row?.parentId ?? 0,
    sortOrder: row?.sortOrder ?? 0,
    leaderName: row?.leaderName,
    phone: row?.phone,
    email: row?.email,
    status: row?.status ?? 'ACTIVE',
  })
  deptDialog.id = row?.id
  deptDialog.visible = true
}

/** 提交部门新增/编辑 */
async function submitDept(): Promise<void> {
  if (!deptFormRef.value) return
  await deptFormRef.value.validate()
  deptSaving.value = true
  try {
    const payload: OrgDepartmentPayload = {
      ...deptDialog.form,
      ...deriveDeptFields(),
    }
    if (deptDialog.id) {
      await updateOrgDepartment(deptDialog.id, payload)
      ElMessage.success('部门已更新')
    } else {
      await createOrgDepartment(payload)
      ElMessage.success('部门已创建')
    }
    deptDialog.visible = false
    await Promise.all([loadDepartments(), loadDeptOptions()])
  } catch (error) {
    showError(error, '保存部门失败')
  } finally {
    deptSaving.value = false
  }
}

/** 删除部门（后端无级联检查，提示用户关注子部门与员工） */
async function handleDeleteDept(row: OrgDepartment): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除部门「${row.deptName}」？删除不影响其子部门与员工，请自行处理归属。`,
      '提示',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteOrgDepartment(row.id)
    ElMessage.success('部门已删除')
    await Promise.all([loadDepartments(), loadDeptOptions()])
  } catch (error) {
    showError(error, '删除部门失败')
  }
}

// ==================== 员工详情 ====================
const employeeDetailVisible = ref(false)
const employeeDetail = ref<OrgEmployee | null>(null)

/** 打开员工详情抽屉（拉取详情接口，取全量字段） */
async function showEmployeeDetail(row: OrgEmployee): Promise<void> {
  try {
    employeeDetail.value = await getOrgEmployee(row.id)
    employeeDetailVisible.value = true
  } catch (error) {
    showError(error, '加载员工详情失败')
  }
}

/** 同步状态 → 标签样式 */
function syncStatusTagType(status?: string): 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'SUCCESS':
      return 'success'
    case 'FAILED':
      return 'danger'
    case 'RUNNING':
      return 'warning'
    default:
      return 'info'
  }
}

/** 时间戳 → 本地化展示 */
function formatTime(time?: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

/** 加载部门当前页 */
async function loadDepartments(): Promise<void> {
  deptLoading.value = true
  try {
    const result = await listOrgDepartments({
      pageNum: deptPage.value,
      pageSize: deptSize.value,
      status: deptStatusFilter.value,
    })
    departments.value = result.list || []
    deptTotal.value = result.total
  } catch (error) {
    showError(error, '加载部门列表失败')
  } finally {
    deptLoading.value = false
  }
}

/** 加载部门下拉选项（员工过滤用，一次取 200 条） */
async function loadDeptOptions(): Promise<void> {
  try {
    const result = await listOrgDepartments({ pageNum: 1, pageSize: 200 })
    deptOptions.value = result.list || []
  } catch {
    deptOptions.value = []
  }
}

/** 加载员工当前页 */
async function loadEmployees(): Promise<void> {
  employeeLoading.value = true
  try {
    const result = await listOrgEmployees({
      pageNum: employeePage.value,
      pageSize: employeeSize.value,
      deptId: employeeDeptId.value,
    })
    employees.value = result.list || []
    employeeTotal.value = result.total
  } catch (error) {
    showError(error, '加载员工列表失败')
  } finally {
    employeeLoading.value = false
  }
}

/** 加载同步历史当前页 */
async function loadHistories(): Promise<void> {
  historyLoading.value = true
  try {
    const result = await listOrgSyncHistory({
      pageNum: historyPage.value,
      pageSize: historySize.value,
      syncSource: historySourceFilter.value,
      syncStatus: historyStatusFilter.value,
    })
    syncHistories.value = result.list || []
    historyTotal.value = result.total
  } catch (error) {
    showError(error, '加载同步历史失败')
  } finally {
    historyLoading.value = false
  }
}

/** 加载同步任务当前页（后端为 page/size 口径，返回数组无总数） */
async function loadTasks(): Promise<void> {
  taskLoading.value = true
  try {
    const list = await listOrgSyncTasks({
      platform: taskPlatformFilter.value,
      page: taskPage.value,
      size: taskSize.value,
    })
    syncTasks.value = list
    taskTotal.value = list.length
  } catch (error) {
    showError(error, '加载同步任务失败')
  } finally {
    taskLoading.value = false
  }
}

/** 加载平台映射列表 */
async function loadMappings(): Promise<void> {
  mappingLoading.value = true
  try {
    mappings.value = await listOrgMappings(mappingPlatformFilter.value)
  } catch (error) {
    showError(error, '加载平台映射失败')
  } finally {
    mappingLoading.value = false
  }
}

/** 部门过滤变化（重置页码） */
function onDeptFilterChange(): void {
  deptPage.value = 1
  loadDepartments()
}

/** 部门分页变化 */
function onDeptPageChange(page: number, size: number): void {
  deptPage.value = page
  deptSize.value = size
  loadDepartments()
}

/** 点击部门行 → 过滤该部门员工 */
function handleDeptRowClick(row: OrgDepartment): void {
  employeeDeptId.value = row.id
  employeeDeptName.value = row.deptName
  employeePage.value = 1
  loadEmployees()
}

/** 员工过滤变化（重置页码） */
function onEmployeeFilterChange(): void {
  employeeDeptName.value =
    deptOptions.value.find((dept) => dept.id === employeeDeptId.value)?.deptName || ''
  employeePage.value = 1
  loadEmployees()
}

/** 员工分页变化 */
function onEmployeePageChange(page: number, size: number): void {
  employeePage.value = page
  employeeSize.value = size
  loadEmployees()
}

/** 历史过滤变化（重置页码） */
function onHistoryFilterChange(): void {
  historyPage.value = 1
  loadHistories()
}

/** 历史分页变化 */
function onHistoryPageChange(page: number, size: number): void {
  historyPage.value = page
  historySize.value = size
  loadHistories()
}

/** 任务过滤变化（重置页码） */
function onTaskFilterChange(): void {
  taskPage.value = 1
  loadTasks()
}

/** 任务分页变化 */
function onTaskPageChange(page: number, size: number): void {
  taskPage.value = page
  taskSize.value = size
  loadTasks()
}

/** 触发组织同步 */
async function handleTriggerSync(): Promise<void> {
  syncing.value = true
  try {
    const result = await triggerOrgSync({ ...syncForm })
    if (result.success) {
      ElMessage.success(result.message || `同步任务已提交（任务ID ${result.taskId ?? '-'}）`)
    } else {
      ElMessage.warning(result.message || '同步任务提交未成功')
    }
    taskPage.value = 1
    await Promise.all([loadTasks(), loadHistories()])
  } catch (error) {
    showError(error, '触发同步失败')
  } finally {
    syncing.value = false
  }
}

/** 同步向导：预检（确认必要配置是否就绪） */
async function handleWizardPreflight(): Promise<void> {
  wizardLoading.value = true
  wizardPreview.value = null
  try {
    const result = await preflightOrgSync(wizardForm.platform)
    wizardReady.value = result.ready
    wizardMessage.value = result.ready
      ? '预检通过，可以执行同步'
      : `预检未通过，缺少：${result.missingItems.join('、') || '未知项'}`
  } catch (error) {
    wizardReady.value = false
    showError(error, '预检失败')
  } finally {
    wizardLoading.value = false
  }
}

/** 同步向导：预览（估算变更规模，不落库） */
async function handleWizardPreview(): Promise<void> {
  wizardLoading.value = true
  try {
    wizardPreview.value = await previewOrgSync(wizardForm.platform, wizardForm.syncType)
  } catch (error) {
    showError(error, '预览失败')
  } finally {
    wizardLoading.value = false
  }
}

/** 同步向导：执行（创建同步任务） */
async function handleWizardExecute(): Promise<void> {
  wizardLoading.value = true
  try {
    const result = await executeOrgSync({ ...wizardForm, fullSync: false })
    if (result.success) {
      ElMessage.success(result.message || `同步任务已提交（任务ID ${result.taskId ?? '-'}）`)
    } else {
      ElMessage.warning(result.message || '同步任务提交未成功')
    }
    taskPage.value = 1
    await Promise.all([loadTasks(), loadHistories()])
  } catch (error) {
    showError(error, '执行同步失败')
  } finally {
    wizardLoading.value = false
  }
}

/** 重试失败的同步任务（向导创建的任务） */
async function handleWizardRetry(row: OrgSyncTask): Promise<void> {
  try {
    const result = await retryWizardSyncTask(row.id)
    if (result.success) {
      ElMessage.success('重试已提交')
    } else {
      ElMessage.warning(result.message || '重试提交未成功')
    }
    await loadTasks()
  } catch (error) {
    showError(error, '重试失败')
  }
}

/** Tab 切换时按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'history' && syncHistories.value.length === 0) loadHistories()
  if (tab === 'sync' && syncTasks.value.length === 0) {
    loadTasks()
    loadMappings()
  }
}

onMounted(() => {
  loadDepartments()
  loadDeptOptions()
  loadEmployees()
})
</script>

<style scoped lang="scss">
.organization-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.sync-form {
  margin-bottom: 8px;
}
</style>
