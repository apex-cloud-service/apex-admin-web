<!--
  SSO 配置页面
  ------------------------------------------------------------------
  功能：SSO 提供商配置、协议配置、用户映射规则
  
  权限：
    - system:sso:view - 查看 SSO 配置
    - system:sso:edit - 编辑 SSO 配置
-->
<template>
  <div class="sso-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="SSO提供商" name="providers">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>SSO提供商列表</span>
              <el-button
                v-permission="'system:sso:create'"
                type="primary"
                :icon="Plus"
                @click="handleAdd"
              >
                新增提供商
              </el-button>
            </div>
          </template>

          <el-table v-loading="loading" :data="providers" stripe>
            <el-table-column prop="displayName" label="显示名称" min-width="150" />
            <el-table-column prop="name" label="标识名" min-width="120" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.type)">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  v-permission="'system:sso:edit'"
                  @change="handleToggle(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'system:sso:test'"
                  link
                  type="primary"
                  @click="handleTest(row)"
                >
                  测试连接
                </el-button>
                <el-button
                  v-permission="'system:sso:view'"
                  link
                  type="info"
                  @click="handleViewMetadata(row)"
                >
                  查看元数据
                </el-button>
                <el-button
                  v-permission="'system:sso:edit'"
                  link
                  type="primary"
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-permission="'system:sso:delete'"
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
              <span>SSO会话列表</span>
              <el-button
                v-permission="'system:sso:session:terminate'"
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
            <el-table-column prop="provider" label="提供商" width="120" />
            <el-table-column prop="ipAddress" label="IP地址" width="140" />
            <el-table-column prop="userAgent" label="浏览器" min-width="200" show-overflow-tooltip />
            <el-table-column prop="loginTime" label="登录时间" width="160" />
            <el-table-column prop="lastAccessTime" label="最后访问" width="160" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-permission="'system:sso:session:terminate'"
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
            <el-form :inline="true" :model="logQuery">
              <el-form-item label="提供商">
                <el-input v-model="logQuery.provider" placeholder="提供商名称" clearable />
              </el-form-item>
              <el-form-item label="操作">
                <el-select v-model="logQuery.action" placeholder="操作类型" clearable>
                  <el-option label="登录" value="LOGIN" />
                  <el-option label="登出" value="LOGOUT" />
                  <el-option label="刷新" value="REFRESH" />
                  <el-option label="验证" value="VALIDATE" />
                  <el-option label="错误" value="ERROR" />
                </el-select>
              </el-form-item>
              <el-form-item label="结果">
                <el-select v-model="logQuery.result" placeholder="结果" clearable>
                  <el-option label="成功" value="SUCCESS" />
                  <el-option label="失败" value="FAILURE" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadLogs">查询</el-button>
                <el-button @click="resetLogQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </template>

          <el-table v-loading="logLoading" :data="logs" stripe>
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="provider" label="提供商" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-tag>{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.result === 'SUCCESS' ? 'success' : 'danger'">
                  {{ row.result === 'SUCCESS' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ipAddress" label="IP地址" width="140" />
            <el-table-column prop="errorMessage" label="错误信息" min-width="200" show-overflow-tooltip />
            <el-table-column prop="createTime" label="时间" width="160" />
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
              <el-statistic title="提供商总数" :value="statistics.totalProviders" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="已启用" :value="statistics.enabledProviders" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="活跃会话" :value="statistics.activeSessions" />
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card>
              <el-statistic title="今日登录" :value="statistics.todayLogins" />
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="12">
            <el-card>
              <el-statistic
                title="登录成功率"
                :value="statistics.loginSuccessRate"
                suffix="%"
                :precision="2"
              />
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
        <el-form-item label="显示名称" prop="displayName">
          <el-input v-model="form.displayName" placeholder="请输入显示名称" />
        </el-form-item>
        <el-form-item label="标识名" prop="name">
          <el-input v-model="form.name" placeholder="请输入唯一标识名" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择SSO类型" @change="handleTypeChange">
            <el-option label="SAML 2.0" value="SAML" />
            <el-option label="CAS" value="CAS" />
            <el-option label="LDAP" value="LDAP" />
            <el-option label="OAuth2" value="OAUTH2" />
            <el-option label="OpenID Connect" value="OIDC" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <el-divider content-position="left">{{ form.type }} 配置</el-divider>

        <template v-if="form.type === 'SAML'">
          <el-form-item label="Entity ID" prop="config.entityId">
            <el-input v-model="form.config.entityId" />
          </el-form-item>
          <el-form-item label="SSO URL" prop="config.ssoUrl">
            <el-input v-model="form.config.ssoUrl" />
          </el-form-item>
          <el-form-item label="SLO URL">
            <el-input v-model="form.config.sloUrl" />
          </el-form-item>
          <el-form-item label="证书" prop="config.certificate">
            <el-input v-model="form.config.certificate" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="签名请求">
            <el-switch v-model="form.config.signAuthnRequest" />
          </el-form-item>
        </template>

        <template v-if="form.type === 'CAS'">
          <el-form-item label="服务器地址" prop="config.serverUrl">
            <el-input v-model="form.config.serverUrl" />
          </el-form-item>
          <el-form-item label="登录URL" prop="config.loginUrl">
            <el-input v-model="form.config.loginUrl" />
          </el-form-item>
          <el-form-item label="验证URL" prop="config.validateUrl">
            <el-input v-model="form.config.validateUrl" />
          </el-form-item>
          <el-form-item label="协议版本">
            <el-select v-model="form.config.protocol">
              <el-option label="CAS 1.0" value="CAS_1_0" />
              <el-option label="CAS 2.0" value="CAS_2_0" />
              <el-option label="CAS 3.0" value="CAS_3_0" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="form.type === 'LDAP'">
          <el-form-item label="服务器地址" prop="config.serverUrl">
            <el-input v-model="form.config.serverUrl" placeholder="ldap://localhost:389" />
          </el-form-item>
          <el-form-item label="Base DN" prop="config.baseDn">
            <el-input v-model="form.config.baseDn" placeholder="dc=example,dc=com" />
          </el-form-item>
          <el-form-item label="Bind DN" prop="config.bindDn">
            <el-input v-model="form.config.bindDn" />
          </el-form-item>
          <el-form-item label="Bind密码" prop="config.bindPassword">
            <el-input v-model="form.config.bindPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="用户过滤器" prop="config.userFilter">
            <el-input v-model="form.config.userFilter" placeholder="(uid={0})" />
          </el-form-item>
          <el-form-item label="用户名属性">
            <el-input v-model="form.config.usernameAttribute" placeholder="uid" />
          </el-form-item>
        </template>

        <template v-if="form.type === 'OAUTH2' || form.type === 'OIDC'">
          <el-form-item label="Issuer" prop="config.issuer">
            <el-input v-model="form.config.issuer" />
          </el-form-item>
          <el-form-item label="Client ID" prop="config.clientId">
            <el-input v-model="form.config.clientId" />
          </el-form-item>
          <el-form-item label="Client Secret" prop="config.clientSecret">
            <el-input v-model="form.config.clientSecret" type="password" show-password />
          </el-form-item>
          <el-form-item label="授权端点" prop="config.authorizationEndpoint">
            <el-input v-model="form.config.authorizationEndpoint" />
          </el-form-item>
          <el-form-item label="令牌端点" prop="config.tokenEndpoint">
            <el-input v-model="form.config.tokenEndpoint" />
          </el-form-item>
          <el-form-item label="用户信息端点" prop="config.userInfoEndpoint">
            <el-input v-model="form.config.userInfoEndpoint" />
          </el-form-item>
          <el-form-item label="Scope">
            <el-input v-model="form.config.scope" placeholder="openid profile email" />
          </el-form-item>
        </template>
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

/**
 * SSO单点登录配置管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. SSO提供商管理 - 配置和管理多种SSO协议(SAML/CAS/LDAP/OAuth2/OIDC)
 * 2. 会话管理 - 查看当前活跃的SSO会话,支持强制下线
 * 3. 审计日志 - 记录所有SSO相关的操作日志
 * 4. 统计信息 - 展示SSO使用情况统计数据
 * 
 * 支持的SSO协议:
 * - SAML 2.0 - 企业级标准单点登录协议
 * - CAS - 中央认证服务
 * - LDAP - 轻量级目录访问协议
 * - OAuth2 - 开放授权标准
 * - OIDC - OpenID Connect
 * 
 * 权限要求:
 * - system:sso:view - 查看权限(必需)
 * - system:sso:create - 创建SSO提供商
 * - system:sso:edit - 编辑SSO提供商
 * - system:sso:delete - 删除SSO提供商
 * - system:sso:test - 测试SSO连接
 * - system:sso:metadata - 查看SSO元数据
 * - system:sso:session:terminate - 强制下线会话
 * - system:sso:audit:view - 查看审计日志
 * 
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listSSOProviders,
  createSSOProvider,
  updateSSOProvider,
  deleteSSOProvider,
  testSSOConnection,
  toggleSSOProvider,
  getSSOMetadata,
  listSSOSessions,
  terminateSSOSession,
  batchTerminateSSOSessions,
  listSSOAuditLogs,
  getSSOStatistics,
  type SSOProvider,
  type SSOSession,
  type SSOAuditLog,
} from '@/api/sso'
import type { PageQuery } from '@/types'

// 当前激活的标签页
const activeTab = ref('providers')

// ==================== SSO提供商管理 ====================
const loading = ref(false)
const providers = ref<SSOProvider[]>([])

// 提供商表单对话框
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
// 提供商表单数据
const form = reactive<Partial<SSOProvider> & Pick<SSOProvider, 'config'>>({
  name: '',
  type: 'SAML',
  enabled: true,
  displayName: '',
  description: '',
  config: {},
})

// 提供商表单验证规则
const rules: FormRules = {
  name: [{ required: true, message: '请输入标识名', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择SSO类型', trigger: 'change' }],
}

// ==================== 会话管理 ====================
const sessionLoading = ref(false)
const sessions = ref<SSOSession[]>([])
const sessionQuery = reactive<PageQuery>({ page: 1, size: 10 })
const sessionTotal = ref(0)
// 选中的会话列表(用于批量下线)
const selectedSessions = ref<SSOSession[]>([])

// ==================== 审计日志 ====================
const logLoading = ref(false)
const logs = ref<SSOAuditLog[]>([])
const logQuery = reactive<PageQuery & { provider?: string; action?: string; result?: string }>({
  page: 1,
  size: 10,
})
const logTotal = ref(0)

// ==================== 统计信息 ====================
const statistics = ref({
  totalProviders: 0,
  enabledProviders: 0,
  activeSessions: 0,
  todayLogins: 0,
  loginSuccessRate: 0,
})

// ==================== 元数据对话框 ====================
const metadataVisible = ref(false)
const metadata = ref('')

/**
 * 根据SSO类型获取标签颜色
 */
function getTypeTagType(type: string): string {
  const map: Record<string, string> = {
    SAML: 'primary',
    CAS: 'success',
    LDAP: 'warning',
    OAUTH2: 'info',
    OIDC: 'danger',
  }
  return map[type] || 'info'
}

/**
 * 加载SSO提供商列表
 */
async function loadProviders() {
  loading.value = true
  try {
    providers.value = await listSSOProviders()
  } catch (error) {
    ElMessage.error('加载SSO提供商失败')
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
    name: '',
    type: 'SAML',
    enabled: true,
    displayName: '',
    description: '',
    config: {},
  })
  dialogVisible.value = true
}

/**
 * 打开编辑提供商对话框
 */
function handleEdit(row: SSOProvider) {
  Object.assign(form, { ...row, config: { ...row.config } })
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
    ElMessage.error('删除失败')
  }
}

/**
 * 切换提供商启用状态
 */
async function handleToggle(row: SSOProvider) {
  try {
    if (row.id) {
      await toggleSSOProvider(row.id, row.enabled)
      ElMessage.success(row.enabled ? '已启用' : '已禁用')
    }
  } catch (error) {
    ElMessage.error('操作失败')
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
    ElMessage.error('测试连接失败')
  }
}

/**
 * 查看SSO元数据
 */
async function handleViewMetadata(row: SSOProvider) {
  try {
    if (row.id) {
      metadata.value = await getSSOMetadata(row.id)
      metadataVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取元数据失败')
  }
}

/**
 * SSO类型变更时清空配置
 */
function handleTypeChange() {
  form.config = {}
}

/**
 * 提交提供商表单
 */
async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate()
  try {
    if (form.id) {
      await updateSSOProvider(form.id, form as SSOProvider)
      ElMessage.success('更新成功')
    } else {
      await createSSOProvider(form as SSOProvider)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadProviders()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 重置表单
 */
function resetForm() {
  formRef.value?.resetFields()
}

/**
 * 加载SSO会话列表
 */
async function loadSessions() {
  sessionLoading.value = true
  try {
    const result = await listSSOSessions(sessionQuery)
    sessions.value = result.list || []
    sessionTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载会话列表失败')
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
    await terminateSSOSession(row.sessionId)
    ElMessage.success('下线成功')
    await loadSessions()
  } catch (error) {
    ElMessage.error('操作失败')
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
    const sessionIds = selectedSessions.value.map((s) => s.sessionId)
    await batchTerminateSSOSessions(sessionIds)
    ElMessage.success('批量下线成功')
    await loadSessions()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 加载审计日志列表
 */
async function loadLogs() {
  logLoading.value = true
  try {
    const result = await listSSOAuditLogs(logQuery)
    logs.value = result.list || []
    logTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载审计日志失败')
  } finally {
    logLoading.value = false
  }
}

/**
 * 重置日志查询条件
 */
function resetLogQuery() {
  logQuery.provider = undefined
  logQuery.action = undefined
  logQuery.result = undefined
  loadLogs()
}

/**
 * 加载统计信息
 */
async function loadStatistics() {
  try {
    statistics.value = await getSSOStatistics()
  } catch (error) {
    ElMessage.error('加载统计信息失败')
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
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>
