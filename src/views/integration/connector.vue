<!--
  集成中心：连接器与凭据（方案批次 E1/E2）
  ------------------------------------------------------------------
  两个页签：
  - 连接器配置：/integration/v1/connectors（分页 pageNum/pageSize、类型过滤、CRUD 逻辑删除）
  - 租户凭据：/integration/v1/credentials（列表为裸数组；注册/轮换/删除）
  契约要点：
  - configValue 为 JSON 文本，保存前做 JSON 合法性校验（后端仅要求非空，语义由连接器消费）。
  - 凭据 secret 仅上行，后端 AES-256-GCM 加密存储且明文不返前端；轮换后旧版本立即失效。
  - 入站 webhook 为第三方回调入口（HMAC 验签 + 去重），管理端不提供调用入口。
  权限要求（按钮 v-permission）：integration:connector:create / update / delete、integration:credential:manage。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>集成中心</span>
        <el-tag type="info" size="small">连接器配置 + 租户级凭据</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 连接器 -->
      <el-tab-pane label="连接器配置" name="connectors">
        <el-form :inline="true" class="query-form">
          <el-form-item label="连接器类型">
            <el-select v-model="connectorQuery.connectorType" placeholder="全部" clearable style="width: 180px">
              <el-option v-for="(name, key) in CONNECTOR_TYPE_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="searchConnectors">查询</el-button>
            <el-button
              type="success"
              :icon="Plus"
              @click="openConnectorDialog()"
              v-permission="'integration:connector:create'"
            >
              新增连接器
            </el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="connectorLoading" :data="connectors" border stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="类型" width="170">
            <template #default="{ row }">
              {{ CONNECTOR_TYPE_NAMES[row.connectorType] || row.connectorType }}
            </template>
          </el-table-column>
          <el-table-column prop="configKey" label="配置标识" width="180">
            <template #default="{ row }"><el-tag>{{ row.configKey }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="configValue" label="配置 JSON" min-width="260" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'info' : 'success'" size="small">
                {{ row.status === 0 ? '停用' : '启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
          <el-table-column prop="updateTime" label="更新时间" width="170" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openConnectorDialog(row)" v-permission="'integration:connector:update'">
                编辑
              </el-button>
              <el-button link type="danger" @click="handleDeleteConnector(row)" v-permission="'integration:connector:delete'">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <Pagination :total="connectorTotal" @change="onConnectorPageChange" />
      </el-tab-pane>

      <!-- 凭据 -->
      <el-tab-pane label="租户凭据" name="credentials">
        <div class="tab-toolbar">
          <el-button
            type="success"
            :icon="Plus"
            @click="openCredentialDialog()"
            v-permission="'integration:credential:manage'"
          >
            注册凭据
          </el-button>
          <span class="toolbar-hint">凭据明文仅上行，后端加密存储且不回传；轮换后旧版本立即失效。</span>
        </div>

        <el-table v-loading="credentialLoading" :data="credentials" border stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="credentialKey" label="凭据标识" width="200">
            <template #default="{ row }"><el-tag>{{ row.credentialKey }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="credentialType" label="类型" width="140" />
          <el-table-column prop="versionNo" label="版本" width="90" />
          <el-table-column prop="rotatedAt" label="最近轮换" width="170" />
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="warning" @click="openRotateDialog(row)" v-permission="'integration:credential:manage'">
                轮换
              </el-button>
              <el-button link type="danger" @click="handleDeleteCredential(row)" v-permission="'integration:credential:manage'">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!credentialLoading && credentials.length === 0" description="暂无已注册凭据" />
      </el-tab-pane>
    </el-tabs>

    <!-- 连接器编辑 -->
    <el-dialog
      v-model="connectorDialogVisible"
      :title="connectorForm.id ? '编辑连接器' : '新增连接器'"
      width="620px"
    >
      <el-form ref="connectorFormRef" :model="connectorForm" :rules="connectorRules" label-width="100px">
        <el-form-item label="连接器类型" prop="connectorType">
          <el-select v-model="connectorForm.connectorType" filterable allow-create default-first-option style="width: 100%">
            <el-option v-for="(name, key) in CONNECTOR_TYPE_NAMES" :key="key" :label="name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置标识" prop="configKey">
          <el-input v-model="connectorForm.configKey" placeholder="租户内唯一，如 order-sync" />
        </el-form-item>
        <el-form-item label="配置 JSON" prop="configValue">
          <el-input
            v-model="connectorForm.configValue"
            type="textarea"
            :rows="6"
            placeholder='如 {"baseUrl":"https://api.example.com","timeoutMs":3000}'
          />
        </el-form-item>
        <el-form-item v-if="connectorForm.id" label="状态">
          <el-radio-group v-model="connectorForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="connectorForm.remark" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="connectorDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitConnector">保存</el-button>
      </template>
    </el-dialog>

    <!-- 凭据注册 / 轮换 -->
    <el-dialog
      v-model="credentialDialogVisible"
      :title="rotateTarget ? '轮换凭据' : '注册凭据'"
      width="520px"
    >
      <el-form ref="credentialFormRef" :model="credentialForm" :rules="credentialRules" label-width="100px">
        <el-form-item v-if="!rotateTarget" label="凭据标识" prop="credentialKey">
          <el-input v-model="credentialForm.credentialKey" placeholder="如 feishu-app-secret" />
        </el-form-item>
        <el-form-item v-if="!rotateTarget" label="凭据类型">
          <el-input v-model="credentialForm.credentialType" placeholder="如 API_KEY / OAUTH_SECRET" />
        </el-form-item>
        <el-form-item label="凭据内容" prop="secret">
          <el-input
            v-model="credentialForm.secret"
            type="password"
            show-password
            :placeholder="rotateTarget ? '新凭据内容（旧版本立即失效）' : '明文仅上行，不落本地'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="credentialDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCredential">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 集成中心脚本
 * - 连接器分页 CRUD（配置 JSON 提交前做语法校验）
 * - 凭据列表/注册/轮换/删除（secret 仅上行）
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  CONNECTOR_TYPE_NAMES,
  createConnector,
  deleteConnector,
  deleteCredential,
  listConnectors,
  listCredentials,
  registerCredential,
  rotateCredential,
  updateConnector,
  type ConnectorQuery,
} from '@/api/integration'
import type {
  ConnectorConfig,
  ConnectorConfigCreatePayload,
  ConnectorConfigUpdatePayload,
  CredentialRegisterPayload,
  IntegrationCredential,
} from '@/types'

/** 当前页签 */
const activeTab = ref('connectors')
/** 保存中 */
const saving = ref(false)

// ==================== 连接器 ====================
const connectorLoading = ref(false)
const connectors = ref<ConnectorConfig[]>([])
const connectorTotal = ref(0)
const connectorQuery = reactive<ConnectorQuery>({ pageNum: 1, pageSize: 10 })

const connectorDialogVisible = ref(false)
const connectorFormRef = ref<FormInstance>()
const connectorForm = reactive<ConnectorConfigCreatePayload & { id?: number; status?: number }>({
  id: undefined,
  connectorType: 'HTTP',
  configKey: '',
  configValue: '',
  remark: '',
  status: 1,
})

/** 连接器校验规则（含 JSON 语法校验） */
const connectorRules: FormRules = {
  connectorType: [{ required: true, message: '请选择或输入连接器类型', trigger: 'change' }],
  configKey: [
    { required: true, message: '请输入配置标识', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  configValue: [
    { required: true, message: '请输入配置 JSON', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        try {
          JSON.parse(value)
          callback()
        } catch {
          callback(new Error('配置必须为合法 JSON'))
        }
      },
      trigger: 'blur',
    },
  ],
}

// ==================== 凭据 ====================
const credentialLoading = ref(false)
const credentials = ref<IntegrationCredential[]>([])
const credentialDialogVisible = ref(false)
const credentialFormRef = ref<FormInstance>()
const rotateTarget = ref<IntegrationCredential | null>(null)
const credentialForm = reactive<CredentialRegisterPayload>({
  credentialKey: '',
  credentialType: '',
  secret: '',
})

/** 凭据校验规则 */
const credentialRules: FormRules = {
  credentialKey: [
    { required: true, message: '请输入凭据标识', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  secret: [{ required: true, message: '请输入凭据内容', trigger: 'blur' }],
}

/** 拉取连接器列表 */
async function fetchConnectors(): Promise<void> {
  connectorLoading.value = true
  try {
    const result = await listConnectors(connectorQuery)
    connectors.value = result.list || []
    connectorTotal.value = result.total || 0
  } catch (error) {
    showError(error, '加载连接器失败')
  } finally {
    connectorLoading.value = false
  }
}

/** 查询连接器（重置到第一页） */
function searchConnectors(): void {
  connectorQuery.pageNum = 1
  fetchConnectors()
}

/** 连接器分页变化 */
function onConnectorPageChange(page: number, size: number): void {
  connectorQuery.pageNum = page
  connectorQuery.pageSize = size
  fetchConnectors()
}

/** 拉取凭据列表 */
async function fetchCredentials(): Promise<void> {
  credentialLoading.value = true
  try {
    credentials.value = (await listCredentials()) || []
  } catch (error) {
    showError(error, '加载凭据失败')
  } finally {
    credentialLoading.value = false
  }
}

/** 页签切换按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'credentials' && credentials.value.length === 0) fetchCredentials()
  if (tab === 'connectors' && connectors.value.length === 0) fetchConnectors()
}

/** 打开连接器弹窗（无参为新增） */
function openConnectorDialog(row?: ConnectorConfig): void {
  Object.assign(connectorForm, {
    id: row?.id,
    connectorType: row?.connectorType ?? 'HTTP',
    configKey: row?.configKey ?? '',
    configValue: row?.configValue ?? '',
    remark: row?.remark ?? '',
    status: row?.status ?? 1,
  })
  connectorDialogVisible.value = true
}

/** 提交连接器 */
async function submitConnector(): Promise<void> {
  if (!connectorFormRef.value) return
  try {
    await connectorFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (connectorForm.id) {
      const payload: ConnectorConfigUpdatePayload = {
        connectorType: connectorForm.connectorType,
        configKey: connectorForm.configKey,
        configValue: connectorForm.configValue,
        status: connectorForm.status,
        remark: connectorForm.remark,
      }
      await updateConnector(connectorForm.id, payload)
      ElMessage.success('连接器已更新')
    } else {
      await createConnector({
        connectorType: connectorForm.connectorType,
        configKey: connectorForm.configKey,
        configValue: connectorForm.configValue,
        remark: connectorForm.remark,
      })
      ElMessage.success('连接器已创建')
    }
    connectorDialogVisible.value = false
    fetchConnectors()
  } catch (error) {
    showError(error, '保存连接器失败')
  } finally {
    saving.value = false
  }
}

/** 删除连接器（逻辑删除） */
async function handleDeleteConnector(row: ConnectorConfig): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除连接器「${row.configKey}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteConnector(row.id)
    ElMessage.success('连接器已删除')
    fetchConnectors()
  } catch (error) {
    showError(error, '删除连接器失败')
  }
}

/** 打开凭据注册弹窗 */
function openCredentialDialog(): void {
  rotateTarget.value = null
  Object.assign(credentialForm, { credentialKey: '', credentialType: '', secret: '' })
  credentialDialogVisible.value = true
}

/** 打开凭据轮换弹窗 */
function openRotateDialog(row: IntegrationCredential): void {
  rotateTarget.value = row
  Object.assign(credentialForm, { credentialKey: row.credentialKey, credentialType: row.credentialType, secret: '' })
  credentialDialogVisible.value = true
}

/** 提交凭据注册或轮换 */
async function submitCredential(): Promise<void> {
  if (!credentialFormRef.value) return
  try {
    await credentialFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (rotateTarget.value) {
      await rotateCredential(rotateTarget.value.id, credentialForm.secret)
      ElMessage.success('凭据已轮换，旧版本已失效')
    } else {
      await registerCredential({ ...credentialForm })
      ElMessage.success('凭据已注册')
    }
    credentialDialogVisible.value = false
    credentialForm.secret = ''
    fetchCredentials()
  } catch (error) {
    showError(error, '保存凭据失败')
  } finally {
    saving.value = false
  }
}

/** 删除凭据 */
async function handleDeleteCredential(row: IntegrationCredential): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除凭据「${row.credentialKey}」？使用该凭据的集成将立即失败。`,
      '危险操作确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteCredential(row.id)
    ElMessage.success('凭据已删除')
    fetchCredentials()
  } catch (error) {
    showError(error, '删除凭据失败')
  }
}

onMounted(fetchConnectors)
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

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
