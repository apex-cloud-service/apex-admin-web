<!--
  SSO 配置页面
  ------------------------------------------------------------------
  功能：SSO 提供商配置、会话管理、审计日志、统计信息

  权限(与后端 @RequirePermission 一致)：
    - system:sso:provider:list/add/edit/remove/query/test/metadata
    - system:sso:session:list/revoke
    - system:sso:auditlog:list
-->
<template>
  <div class="sso-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="SSO提供商" name="providers">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-form :inline="true" @submit.prevent>
                <el-form-item label="名称">
                  <el-input
                    v-model="providerQuery.providerName"
                    placeholder="提供商名称"
                    clearable
                    @keyup.enter="loadProviders"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadProviders">查询</el-button>
                </el-form-item>
              </el-form>
              <el-button
                v-permission="'system:sso:provider:add'"
                type="primary"
                :icon="Plus"
                @click="handleAdd"
              >
                新增提供商
              </el-button>
            </div>
          </template>

          <el-table v-loading="loading" :data="providers" stripe>
            <el-table-column prop="providerName" label="名称" min-width="140" />
            <el-table-column label="协议" width="110">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.protocolType)">{{ row.protocolType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="authEndpoint" label="认证端点" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  v-permission="'system:sso:provider:edit'"
                  @change="handleToggle(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" width="170" />
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'system:sso:provider:test'"
                  link
                  type="primary"
                  @click="handleTest(row)"
                >
                  测试连接
                </el-button>
                <el-button
                  v-permission="'system:sso:provider:metadata'"
                  link
                  type="info"
                  @click="handleViewMetadata(row)"
                >
                  查看元数据
                </el-button>
                <el-button
                  v-permission="'system:sso:provider:edit'"
                  link
                  type="primary"
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-permission="'system:sso:provider:remove'"
                  link
                  type="danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="会话管理" name="sessions">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-form :inline="true" @submit.prevent>
                <el-form-item label="提供商">
                  <el-select v-model="sessionQuery.providerId" placeholder="全部" clearable>
                    <el-option
                      v-for="item in providers"
                      :key="item.id"
                      :label="item.providerName"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="状态">
                  <el-select v-model="sessionQuery.status" placeholder="全部" clearable>
                    <el-option label="活跃" value="ACTIVE" />
                    <el-option label="过期" value="EXPIRED" />
                    <el-option label="已登出" value="LOGOUT" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadSessions">查询</el-button>
                </el-form-item>
              </el-form>
              <el-button
                v-permission="'system:sso:session:revoke'"
                type="danger"
                :disabled="selectedSessions.length === 0"
                @click="handleBatchTerminate"
              >
                批量下线
              </el-button>
            </div>
          </template>

          <el-table
            v-loading="sessionLoading"
            :data="sessions"
            stripe
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="providerName" label="提供商" width="140" />
            <el-table-column prop="loginIp" label="IP地址" width="140" />
            <el-table-column prop="userAgent" label="浏览器" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="sessionStatusTagType(row.status)">{{ sessionStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="loginTime" label="登录时间" width="170" />
            <el-table-column prop="lastActiveTime" label="最后活跃" width="170" />
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'system:sso:session:revoke'"
                  link
                  type="danger"
                  @click="handleTerminateSession(row)"
                >
                  强制下线
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="sessionQuery.page"
            v-model:page-size="sessionQuery.size"
            :total="sessionTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadSessions"
            @current-change="loadSessions"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="审计日志" name="logs">
        <el-card>
          <template #header>
            <el-form :inline="true" :model="logQuery" @submit.prevent>
              <el-form-item label="提供商">
                <el-select v-model="logQuery.providerId" placeholder="全部" clearable>
                  <el-option
                    v-for="item in providers"
                    :key="item.id"
                    :label="item.providerName"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="操作">
                <el-input v-model="logQuery.operationType" placeholder="操作类型" clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadLogs">查询</el-button>
                <el-button @click="resetLogQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </template>

          <el-table v-loading="logLoading" :data="logs" stripe>
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="providerName" label="提供商" width="140" />
            <el-table-column prop="operationType" label="操作" width="120">
              <template #default="{ row }">
                <el-tag>{{ row.operationType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.result === 'SUCCESS' ? 'success' : 'danger'">
                  {{ row.result === 'SUCCESS' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operatorIp" label="IP地址" width="140" />
            <el-table-column prop="failureReason" label="失败原因" min-width="180" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>

          <el-pagination
            v-model:current-page="logQuery.page"
            v-model:page-size="logQuery.size"
            :total="logTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadLogs"
            @current-change="loadLogs"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="统计信息" name="statistics">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card>
              <el-statistic title="提供商总数" :value="statistics.totalProviderCount" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="已启用" :value="statistics.enabledProviderCount" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="活跃会话" :value="statistics.activeSessionCount" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="今日登录" :value="statistics.todayLoginCount" />
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="6">
            <el-card>
              <el-statistic
                title="登录成功率"
                :value="statistics.todayLoginSuccessRate"
                suffix="%"
                :precision="2"
              />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="今日新增会话" :value="statistics.todayNewSessionCount" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="今日撤销会话" :value="statistics.todayRevokedSessionCount" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <div class="most-used-provider">
                <div class="label">最常用提供商</div>
                <div class="value">{{ statistics.mostUsedProviderName || '—' }}</div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑SSO提供商' : '新增SSO提供商'"
      width="800px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="名称" prop="providerName">
          <el-input v-model="form.providerName" placeholder="请输入提供商名称(租户内唯一)" />
        </el-form-item>
        <el-form-item label="协议类型" prop="protocolType">
          <el-select v-model="form.protocolType" placeholder="请选择协议类型">
            <el-option label="SAML 2.0" value="SAML" />
            <el-option label="CAS" value="CAS" />
            <el-option label="LDAP" value="LDAP" />
            <el-option label="OpenID Connect" value="OIDC" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <el-divider content-position="left">连接配置</el-divider>

        <el-form-item label="认证端点" prop="authEndpoint">
          <el-input v-model="form.authEndpoint" placeholder="授权/登录端点 URL" />
        </el-form-item>
        <el-form-item label="登出端点">
          <el-input v-model="form.logoutEndpoint" placeholder="单点登出端点 URL" />
        </el-form-item>
        <el-form-item label="元数据URL">
          <el-input v-model="form.metadataUrl" placeholder="SAML/OIDC 元数据地址(可选)" />
        </el-form-item>
        <el-form-item label="Entity ID">
          <el-input v-model="form.entityId" placeholder="SAML 实体ID(可选)" />
        </el-form-item>
        <el-form-item label="证书">
          <el-input v-model="form.certificate" type="textarea" :rows="4" placeholder="X.509 证书内容(可选)" />
        </el-form-item>
        <el-form-item label="扩展配置" prop="configJson">
          <el-input
            v-model="form.configJson"
            type="textarea"
            :rows="4"
            placeholder='协议扩展配置,JSON 格式,例如 {"serverUrl":"https://cas.example.com"}'
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="metadataVisible" title="SSO元数据" width="800px">
      <el-input v-model="metadata" type="textarea" :rows="20" readonly />
      <template #footer>
        <el-button type="primary" @click="copyMetadata">复制</el-button>
        <el-button @click="metadataVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listSSOProviders,
  createSSOProvider,
  updateSSOProvider,
  deleteSSOProvider,
  testSSOConnection,
  getSSOMetadata,
  listSSOSessions,
  terminateSSOSession,
  batchTerminateSSOSessions,
  listSSOAuditLogs,
  getSSOStatistics,
  type SSOProvider,
  type SSOSession,
  type SSOAuditLog,
  type SSOStatistics,
} from '@/api/sso'
import type { PageQuery } from '@/types'
import { showError } from '@/utils/request'

// 当前激活的标签页
const activeTab = ref('providers')

// ==================== SSO提供商管理 ====================
const loading = ref(false)
const providers = ref<SSOProvider[]>([])
const providerQuery = reactive<{ providerName?: string }>({})

// 提供商表单对话框
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
// 提供商表单数据
const form = reactive<SSOProvider>({
  providerName: '',
  protocolType: 'SAML',
  enabled: true,
  sortOrder: 0,
  description: '',
  configJson: '',
})

// 提供商表单验证规则
const rules: FormRules = {
  providerName: [{ required: true, message: '请输入提供商名称', trigger: 'blur' }],
  protocolType: [{ required: true, message: '请选择协议类型', trigger: 'change' }],
  configJson: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) return callback()
        try {
          JSON.parse(value)
          callback()
        } catch {
          callback(new Error('扩展配置必须是合法的 JSON'))
        }
      },
      trigger: 'blur',
    },
  ],
}

// ==================== 会话管理 ====================
const sessionLoading = ref(false)
const sessions = ref<SSOSession[]>([])
const sessionQuery = reactive<PageQuery & { providerId?: number; status?: string }>({
  page: 1,
  size: 10,
})
const sessionTotal = ref(0)
// 选中的会话列表(用于批量下线)
const selectedSessions = ref<SSOSession[]>([])

// ==================== 审计日志 ====================
const logLoading = ref(false)
const logs = ref<SSOAuditLog[]>([])
const logQuery = reactive<PageQuery & { providerId?: number; operationType?: string }>({
  page: 1,
  size: 10,
})
const logTotal = ref(0)

// ==================== 统计信息 ====================
const statistics = ref<SSOStatistics>({
  activeSessionCount: 0,
  todayNewSessionCount: 0,
  todayRevokedSessionCount: 0,
  todayLoginCount: 0,
  todayLoginSuccessCount: 0,
  todayLoginFailureCount: 0,
  todayLoginSuccessRate: 0,
  todayAvgLoginDuration: 0,
  todayMaxLoginDuration: 0,
  enabledProviderCount: 0,
  totalProviderCount: 0,
})

// ==================== 元数据对话框 ====================
const metadataVisible = ref(false)
const metadata = ref('')

/**
 * 根据协议类型获取标签颜色
 */
function getTypeTagType(type: string): string {
  const map: Record<string, string> = {
    SAML: 'primary',
    CAS: 'success',
    LDAP: 'warning',
    OIDC: 'danger',
  }
  return map[type] || 'info'
}

/**
 * 会话状态标签颜色
 */
function sessionStatusTagType(status?: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'success',
    EXPIRED: 'info',
    LOGOUT: 'warning',
  }
  return map[status || ''] || 'info'
}

/**
 * 会话状态文案
 */
function sessionStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    ACTIVE: '活跃',
    EXPIRED: '过期',
    LOGOUT: '已登出',
  }
  return map[status || ''] || status || '—'
}

/**
 * 加载SSO提供商列表
 */
async function loadProviders() {
  loading.value = true
  try {
    providers.value = await listSSOProviders({
      page: 1,
      size: 100,
      providerName: providerQuery.providerName || undefined,
    })
  } catch (error) {
    showError(error, '加载SSO提供商失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开新增提供商对话框
 */
function handleAdd() {
  Object.assign(form, {
    id: undefined,
    providerName: '',
    protocolType: 'SAML',
    enabled: true,
    sortOrder: 0,
    description: '',
    authEndpoint: '',
    logoutEndpoint: '',
    entityId: '',
    certificate: '',
    metadataUrl: '',
    configJson: '',
  })
  dialogVisible.value = true
}

/**
 * 打开编辑提供商对话框
 */
function handleEdit(row: SSOProvider) {
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

/**
 * 删除SSO提供商
 */
async function handleDelete(row: SSOProvider) {
  await ElMessageBox.confirm('确认删除该SSO提供商?', '提示', { type: 'warning' })
  try {
    if (row.id) {
      await deleteSSOProvider(row.id)
      ElMessage.success('删除成功')
      await loadProviders()
    }
  } catch (error) {
    showError(error, '删除失败')
  }
}

/**
 * 切换提供商启用状态(后端为整体更新,须携带完整字段)
 */
async function handleToggle(row: SSOProvider) {
  try {
    if (row.id) {
      await updateSSOProvider(row.id, {
        providerName: row.providerName,
        protocolType: row.protocolType,
        enabled: row.enabled,
        authEndpoint: row.authEndpoint,
        logoutEndpoint: row.logoutEndpoint,
        entityId: row.entityId,
        certificate: row.certificate,
        metadataUrl: row.metadataUrl,
        configJson: row.configJson,
        description: row.description,
        sortOrder: row.sortOrder,
      })
      ElMessage.success(row.enabled ? '已启用' : '已禁用')
    }
  } catch (error) {
    showError(error, '操作失败')
    row.enabled = !row.enabled
  }
}

/**
 * 测试SSO连接
 */
async function handleTest(row: SSOProvider) {
  try {
    if (row.id) {
      const result = await testSSOConnection(row.id)
      if (result.success) {
        ElMessage.success('连接测试成功')
      } else {
        ElMessage.error(`连接测试失败: ${result.message}`)
      }
    }
  } catch (error) {
    showError(error, '测试连接失败')
  }
}

/**
 * 查看SSO元数据
 */
async function handleViewMetadata(row: SSOProvider) {
  try {
    if (row.id) {
      const data = await getSSOMetadata(row.id)
      metadata.value = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      metadataVisible.value = true
    }
  } catch (error) {
    showError(error, '获取元数据失败')
  }
}

/**
 * 提交提供商表单
 */
async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate()
  const payload: SSOProvider = {
    ...form,
    providerName: form.providerName.trim(),
    authEndpoint: form.authEndpoint?.trim() || undefined,
    logoutEndpoint: form.logoutEndpoint?.trim() || undefined,
    entityId: form.entityId?.trim() || undefined,
    certificate: form.certificate?.trim() || undefined,
    metadataUrl: form.metadataUrl?.trim() || undefined,
    configJson: form.configJson?.trim() || undefined,
    description: form.description?.trim() || undefined,
  }
  try {
    if (form.id) {
      await updateSSOProvider(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createSSOProvider(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadProviders()
  } catch (error) {
    showError(error, '操作失败')
  }
}

/**
 * 重置表单
 */
function resetForm() {
  formRef.value?.resetFields()
}

/**
 * 加载SSO会话列表(裸数组,total 取数组长度)
 */
async function loadSessions() {
  sessionLoading.value = true
  try {
    const list = await listSSOSessions({
      ...sessionQuery,
      providerId: sessionQuery.providerId || undefined,
      status: sessionQuery.status || undefined,
    })
    sessions.value = list || []
    sessionTotal.value = list?.length || 0
  } catch (error) {
    showError(error, '加载会话列表失败')
  } finally {
    sessionLoading.value = false
  }
}

/**
 * 会话选择变化
 */
function handleSelectionChange(selection: SSOSession[]) {
  selectedSessions.value = selection
}

/**
 * 强制下线单个会话
 */
async function handleTerminateSession(row: SSOSession) {
  await ElMessageBox.confirm('确认强制下线该会话?', '提示', { type: 'warning' })
  try {
    await terminateSSOSession(row.id)
    ElMessage.success('下线成功')
    await loadSessions()
  } catch (error) {
    showError(error, '操作失败')
  }
}

/**
 * 批量强制下线会话
 */
async function handleBatchTerminate() {
  await ElMessageBox.confirm(`确认批量下线 ${selectedSessions.value.length} 个会话?`, '提示', {
    type: 'warning',
  })
  try {
    await batchTerminateSSOSessions(selectedSessions.value.map((s) => s.id))
    ElMessage.success('批量下线成功')
    await loadSessions()
  } catch (error) {
    showError(error, '操作失败')
  }
}

/**
 * 加载审计日志列表(裸数组,total 取数组长度)
 */
async function loadLogs() {
  logLoading.value = true
  try {
    const list = await listSSOAuditLogs({
      ...logQuery,
      providerId: logQuery.providerId || undefined,
      operationType: logQuery.operationType || undefined,
    })
    logs.value = list || []
    logTotal.value = list?.length || 0
  } catch (error) {
    showError(error, '加载审计日志失败')
  } finally {
    logLoading.value = false
  }
}

/**
 * 重置日志查询条件
 */
function resetLogQuery() {
  logQuery.providerId = undefined
  logQuery.operationType = undefined
  loadLogs()
}

/**
 * 加载统计信息
 */
async function loadStatistics() {
  try {
    statistics.value = await getSSOStatistics()
  } catch (error) {
    showError(error, '加载统计信息失败')
  }
}

/**
 * 复制元数据到剪贴板
 */
function copyMetadata() {
  navigator.clipboard.writeText(metadata.value)
  ElMessage.success('已复制到剪贴板')
}

// 组件挂载时加载数据
onMounted(() => {
  loadProviders()
  loadSessions()
  loadLogs()
  loadStatistics()
})
</script>

<style scoped lang="scss">
.sso-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}

.most-used-provider {
  .label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .value {
    margin-top: 8px;
    font-size: 18px;
    font-weight: 600;
  }
}
</style>
