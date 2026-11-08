<!--
  物联网设备管理（方案批次 E3）
  ------------------------------------------------------------------
  契约（apex-integration IotDeviceRouter，前缀 /integration/v1/iot）：
  - GET    /devices                  - 设备分页（status 过滤）
  - POST   /devices                  - 注册设备（响应含一次性明文 secret）
  - GET    /devices/{id}             - 设备详情
  - DELETE /devices/{id}             - 注销设备
  - GET    /devices/{id}/telemetry   - 遥测历史分页
  - GET    /devices/{id}/shadow      - 设备影子（desired/reported + version）
  - GET    /devices/{id}/commands    - 命令历史分页
  - POST   /devices/{id}/commands    - 命令下发（commandId 幂等）
  权限要求（按钮 v-permission）：iot:device:manage、iot:command:send。

  边界说明：
  - 设备影子只读；方案 E3 未定义 desired 写接口，页面不提供影子修改。
  - MQTT 认证钩子（/internal/v1/iot/mqtt/auth|acl）为集群内部端点，管理端不调用。
  - 设备 secret 仅注册响应返回一次，页面只内存展示。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>物联网设备</span>
        <el-button type="primary" :icon="Plus" @click="openRegisterDialog" v-permission="'iot:device:manage'">
          注册设备
        </el-button>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="(meta, key) in DEVICE_STATUS_META" :key="key" :label="meta.label" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="deviceKey" label="设备标识" min-width="180">
        <template #default="{ row }"><el-tag>{{ row.deviceKey }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="DEVICE_STATUS_META[row.status]?.tag || 'info'" size="small">
            {{ DEVICE_STATUS_META[row.status]?.label || row.status || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="firmwareVersion" label="固件版本" width="130" />
      <el-table-column label="标签" min-width="180">
        <template #default="{ row }">
          <el-tag v-for="(value, key) in row.labels || {}" :key="key" size="small" type="info" class="label-tag">
            {{ key }}={{ value }}
          </el-tag>
          <span v-if="!Object.keys(row.labels || {}).length">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="lastActiveAt" label="最后活跃" width="170" />
      <el-table-column prop="createTime" label="注册时间" width="170" />
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDevice(row)">详情</el-button>
          <el-button
            link
            type="danger"
            @click="handleDeregister(row)"
            v-permission="'iot:device:manage'"
          >
            注销
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" @change="onPageChange" />

    <!-- 设备详情：影子 / 遥测 / 命令 -->
    <el-drawer v-model="detailVisible" :title="`设备详情 · ${detailTarget?.deviceKey ?? ''}`" size="760px">
      <el-tabs v-model="detailTab">
        <!-- 影子 -->
        <el-tab-pane label="设备影子" name="shadow">
          <el-alert
            v-if="shadowError"
            type="info"
            :closable="false"
            show-icon
            :title="shadowError"
          />
          <template v-else>
            <el-descriptions :column="2" border size="small" class="shadow-meta">
              <el-descriptions-item label="设备标识">{{ detailTarget?.deviceKey }}</el-descriptions-item>
              <el-descriptions-item label="影子版本">{{ shadow?.version ?? '-' }}</el-descriptions-item>
            </el-descriptions>
            <el-divider content-position="left">desired（期望状态）</el-divider>
            <pre class="json-block">{{ formatJson(shadow?.desired, shadow?.desiredRaw) }}</pre>
            <el-divider content-position="left">reported（上报状态）</el-divider>
            <pre class="json-block">{{ formatJson(shadow?.reported, shadow?.reportedRaw) }}</pre>
            <div class="drawer-hint">影子为只读视图（方案 E3 未定义 desired 写接口）。</div>
          </template>
        </el-tab-pane>

        <!-- 遥测 -->
        <el-tab-pane label="遥测历史" name="telemetry">
          <el-table v-loading="telemetryLoading" :data="telemetry" border stripe size="small">
            <el-table-column prop="id" label="ID" width="90" />
            <el-table-column prop="metric" label="遥测数据" min-width="240" show-overflow-tooltip />
            <el-table-column prop="recordedAt" label="采集时间" width="170" />
          </el-table>
          <Pagination :total="telemetryTotal" @change="onTelemetryPageChange" />
          <el-empty v-if="!telemetryLoading && telemetry.length === 0" description="暂无遥测记录" />
        </el-tab-pane>

        <!-- 命令 -->
        <el-tab-pane label="命令" name="commands">
          <div class="tab-toolbar">
            <el-button type="primary" :icon="Promotion" @click="openCommandDialog" v-permission="'iot:command:send'">
              下发命令
            </el-button>
            <el-button :icon="Refresh" @click="fetchCommands">刷新</el-button>
          </div>
          <el-table v-loading="commandLoading" :data="commands" border stripe size="small">
            <el-table-column prop="commandId" label="命令 ID" width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="commandStatusMeta(row.status).tag" size="small">
                  {{ commandStatusMeta(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="payload" label="载荷" min-width="200" show-overflow-tooltip />
            <el-table-column prop="timeoutAt" label="超时时间" width="170" />
            <el-table-column prop="ackedAt" label="确认时间" width="170" />
          </el-table>
          <Pagination :total="commandTotal" @change="onCommandPageChange" />
          <el-empty v-if="!commandLoading && commands.length === 0" description="暂无命令记录" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <!-- 命令下发 -->
    <el-dialog v-model="commandVisible" title="下发设备命令" width="560px">
      <el-form ref="commandFormRef" :model="commandForm" :rules="commandRules" label-width="100px">
        <el-form-item label="命令 ID" prop="commandId">
          <el-input v-model="commandForm.commandId" placeholder="租户内唯一，重放同一 ID 视为幂等" maxlength="64" />
        </el-form-item>
        <el-form-item label="载荷 JSON" prop="payloadText">
          <el-input
            v-model="commandForm.payloadText"
            type="textarea"
            :rows="4"
            placeholder='如 {"switch":"on","brightness":80}'
          />
        </el-form-item>
        <el-form-item label="超时(秒)">
          <el-input-number v-model="commandForm.timeoutSeconds" :min="0" :max="3600" :controls="false" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="commandVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatching" @click="submitCommand">下发</el-button>
      </template>
    </el-dialog>

    <!-- 注册设备 -->
    <el-dialog v-model="registerVisible" title="注册设备" width="560px">
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="110px">
        <el-form-item label="设备标识" prop="deviceKey">
          <el-input v-model="registerForm.deviceKey" placeholder="租户内唯一，MQTT topic 中使用" />
        </el-form-item>
        <el-form-item label="证书指纹">
          <el-input v-model="registerForm.certFingerprint" placeholder="选填：X.509 指纹" />
        </el-form-item>
        <el-form-item label="固件版本">
          <el-input v-model="registerForm.firmwareVersion" placeholder="选填，如 1.0.3" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="labelText"
            type="textarea"
            :rows="2"
            placeholder="选填，逗号分隔的 key=value，如 site=shanghai,line=3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRegister">注册</el-button>
      </template>
    </el-dialog>

    <!-- 一次性设备凭据 -->
    <el-dialog v-model="secretVisible" title="设备凭据（仅显示一次）" width="520px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="请立即写入设备"
        description="关闭后无法再次查看；丢失需注销设备后重新注册。"
        style="margin-bottom: 12px"
      />
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="设备标识">{{ secretDeviceKey }}</el-descriptions-item>
        <el-descriptions-item label="设备凭据">{{ secretValue }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="secretVisible = false">我已保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 物联网设备管理脚本
 * - 设备分页、注册（一次性 secret）、注销
 * - 详情抽屉三页签：影子（只读）/ 遥测历史（分页）/ 命令（历史 + 下发）
 * - 注册 secret 与命令载荷只在内存处理，不写入本地存储
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Promotion, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  DEVICE_STATUS_META,
  deregisterDevice,
  dispatchDeviceCommand,
  getDeviceShadow,
  listDeviceCommands,
  listDevices,
  listDeviceTelemetry,
  registerDevice,
  type DeviceQuery,
} from '@/api/iot'
import type {
  CommandDispatchPayload,
  DeviceCommand,
  DeviceRegisterPayload,
  DeviceShadow,
  DeviceTelemetry,
  IotDevice,
} from '@/types'

/** 列表加载中 */
const loading = ref(false)
/** 保存中 */
const saving = ref(false)
/** 设备列表 */
const list = ref<IotDevice[]>([])
const total = ref(0)
/** 查询条件 */
const query = reactive<DeviceQuery>({ status: undefined, pageNum: 1, pageSize: 10 })

// ==================== 注册 ====================
const registerVisible = ref(false)
const registerFormRef = ref<FormInstance>()
const registerForm = reactive<DeviceRegisterPayload>({
  deviceKey: '',
  certFingerprint: '',
  firmwareVersion: '',
})
/** 标签输入（逗号分隔 key=value） */
const labelText = ref('')

/** 注册校验规则 */
const registerRules: FormRules = {
  deviceKey: [
    { required: true, message: '请输入设备标识', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
}

// ==================== 一次性凭据 ====================
const secretVisible = ref(false)
const secretValue = ref('')
const secretDeviceKey = ref('')

// ==================== 详情（影子 / 遥测 / 命令） ====================
const detailVisible = ref(false)
const detailTab = ref('shadow')
const detailTarget = ref<IotDevice | null>(null)

/** 影子 */
const shadow = ref<DeviceShadow | null>(null)
const shadowError = ref('')

/** 遥测 */
const telemetryLoading = ref(false)
const telemetry = ref<DeviceTelemetry[]>([])
const telemetryTotal = ref(0)
const telemetryPage = reactive({ pageNum: 1, pageSize: 10 })

/** 命令 */
const commandLoading = ref(false)
const commandTotal = ref(0)
const commands = ref<DeviceCommand[]>([])
const commandPage = reactive({ pageNum: 1, pageSize: 10 })

/** 命令状态 → 名称与标签样式 */
const COMMAND_STATUS_META: Record<string, { label: string; tag: 'success' | 'info' | 'warning' | 'danger' }> = {
  PENDING: { label: '待下发', tag: 'warning' },
  SENT: { label: '已下发', tag: 'info' },
  ACK: { label: '已确认', tag: 'success' },
  TIMEOUT: { label: '已超时', tag: 'danger' },
}

/** 命令下发弹窗 */
const commandVisible = ref(false)
const dispatching = ref(false)
const commandFormRef = ref<FormInstance>()
const commandForm = reactive({
  commandId: '',
  payloadText: '',
  timeoutSeconds: 60,
})

/** 命令下发校验规则 */
const commandRules: FormRules = {
  commandId: [
    { required: true, message: '请输入命令 ID', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  payloadText: [
    { required: true, message: '请输入载荷 JSON', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        try {
          JSON.parse(value)
          callback()
        } catch {
          callback(new Error('载荷必须为合法 JSON'))
        }
      },
      trigger: 'blur',
    },
  ],
}

/**
 * 命令状态展示元信息。
 * @param status 状态码
 */
function commandStatusMeta(status: string): { label: string; tag: 'success' | 'info' | 'warning' | 'danger' } {
  return COMMAND_STATUS_META[status] || { label: status, tag: 'info' }
}

/**
 * 格式化影子 JSON（优先使用解析后的对象，回退原始文本）。
 * @param parsed 解析后的 JSON
 * @param raw 原始文本
 */
function formatJson(parsed?: Record<string, unknown> | null, raw?: string): string {
  if (parsed) return JSON.stringify(parsed, null, 2)
  if (raw) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }
  return '（空）'
}

/** 拉取设备列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listDevices(query)
    list.value = result.list || []
    total.value = result.total || 0
  } catch (error) {
    showError(error, '加载设备列表失败')
  } finally {
    loading.value = false
  }
}

/** 查询（重置到第一页） */
function search(): void {
  query.pageNum = 1
  fetchList()
}

/** 重置查询条件 */
function reset(): void {
  query.status = undefined
  search()
}

/** 分页变化 */
function onPageChange(page: number, size: number): void {
  query.pageNum = page
  query.pageSize = size
  fetchList()
}

/** 打开注册弹窗 */
function openRegisterDialog(): void {
  Object.assign(registerForm, { deviceKey: '', certFingerprint: '', firmwareVersion: '' })
  labelText.value = ''
  registerVisible.value = true
}

/**
 * 解析标签文本（逗号分隔的 key=value）。
 * @param text 标签输入
 */
function parseLabels(text: string): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const pair of text.split(',')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    labels[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return labels
}

/** 提交注册 */
async function submitRegister(): Promise<void> {
  if (!registerFormRef.value) return
  try {
    await registerFormRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const labels = parseLabels(labelText.value)
    const result = await registerDevice({
      deviceKey: registerForm.deviceKey.trim(),
      certFingerprint: registerForm.certFingerprint || undefined,
      firmwareVersion: registerForm.firmwareVersion || undefined,
      labels: Object.keys(labels).length ? labels : undefined,
    })
    registerVisible.value = false
    if (result?.secret) {
      secretDeviceKey.value = result.deviceKey
      secretValue.value = result.secret
      secretVisible.value = true
    } else {
      ElMessage.success('设备已注册')
    }
    fetchList()
  } catch (error) {
    showError(error, '注册设备失败')
  } finally {
    saving.value = false
  }
}

/** 注销设备 */
async function handleDeregister(row: IotDevice): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认注销设备「${row.deviceKey}」？该设备凭据与 topic 授权将立即失效。`,
      '危险操作确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deregisterDevice(row.id)
    ElMessage.success('设备已注销')
    fetchList()
  } catch (error) {
    showError(error, '注销设备失败')
  }
}

/** 打开设备详情（影子 / 遥测 / 命令三页签并行加载） */
function openDevice(row: IotDevice): void {
  detailTarget.value = row
  detailTab.value = 'shadow'
  shadow.value = null
  shadowError.value = ''
  telemetry.value = []
  telemetryTotal.value = 0
  telemetryPage.pageNum = 1
  commands.value = []
  commandTotal.value = 0
  commandPage.pageNum = 1
  detailVisible.value = true
  fetchShadow()
  fetchTelemetry()
  fetchCommands()
}

/** 拉取设备影子 */
async function fetchShadow(): Promise<void> {
  if (!detailTarget.value) return
  try {
    shadow.value = await getDeviceShadow(detailTarget.value.id)
    shadowError.value = ''
  } catch (error) {
    shadow.value = null
    shadowError.value = error instanceof Error ? error.message : '设备影子不可用'
  }
}

/** 拉取遥测历史 */
async function fetchTelemetry(): Promise<void> {
  if (!detailTarget.value) return
  telemetryLoading.value = true
  try {
    const result = await listDeviceTelemetry(detailTarget.value.id, telemetryPage.pageNum, telemetryPage.pageSize)
    telemetry.value = result.list || []
    telemetryTotal.value = result.total || 0
  } catch (error) {
    showError(error, '加载遥测记录失败')
  } finally {
    telemetryLoading.value = false
  }
}

/** 遥测分页变化 */
function onTelemetryPageChange(page: number, size: number): void {
  telemetryPage.pageNum = page
  telemetryPage.pageSize = size
  fetchTelemetry()
}

/** 拉取命令历史 */
async function fetchCommands(): Promise<void> {
  if (!detailTarget.value) return
  commandLoading.value = true
  try {
    const result = await listDeviceCommands(detailTarget.value.id, commandPage.pageNum, commandPage.pageSize)
    commands.value = result.list || []
    commandTotal.value = result.total || 0
  } catch (error) {
    showError(error, '加载命令历史失败')
  } finally {
    commandLoading.value = false
  }
}

/** 命令分页变化 */
function onCommandPageChange(page: number, size: number): void {
  commandPage.pageNum = page
  commandPage.pageSize = size
  fetchCommands()
}

/** 打开命令下发弹窗（预填随机命令 ID） */
function openCommandDialog(): void {
  Object.assign(commandForm, {
    commandId: `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    payloadText: '',
    timeoutSeconds: 60,
  })
  commandVisible.value = true
}

/** 提交命令下发 */
async function submitCommand(): Promise<void> {
  if (!detailTarget.value || !commandFormRef.value) return
  try {
    await commandFormRef.value.validate()
  } catch {
    return
  }
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(commandForm.payloadText) as Record<string, unknown>
  } catch {
    ElMessage.warning('载荷必须为合法 JSON 对象')
    return
  }
  const request: CommandDispatchPayload = {
    commandId: commandForm.commandId.trim(),
    payload,
    timeoutSeconds: commandForm.timeoutSeconds || undefined,
  }
  dispatching.value = true
  try {
    const result = await dispatchDeviceCommand(detailTarget.value.id, request)
    ElMessage.success(result.duplicate ? '命令 ID 已存在，已返回既有命令（幂等）' : '命令已下发')
    commandVisible.value = false
    commandPage.pageNum = 1
    fetchCommands()
  } catch (error) {
    showError(error, '下发命令失败')
  } finally {
    dispatching.value = false
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

.label-tag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.shadow-meta {
  margin-bottom: 8px;
}

.json-block {
  margin: 0;
  padding: 8px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}

.drawer-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tab-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
