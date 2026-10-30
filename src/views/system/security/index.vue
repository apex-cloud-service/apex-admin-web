<!--
  账号安全（MFA 与 IP 访问控制）
  ------------------------------------------------------------------
  两个 Tab：
  - 多因素认证：查看我的 MFA 配置、启用 TOTP（二维码+密钥）、短信/邮箱 MFA、备用码、关闭
  - IP 访问控制：白名单/黑名单管理（新增/删除/启停/清理过期/放行检查）
  契约要点：MFA 配置与 IP 规则列表均为裸数组；IP 写操作参数走 query string。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>账号安全</span>
        <el-tag type="info" size="small">MFA 与 IP 访问控制</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 多因素认证 -->
      <el-tab-pane label="多因素认证" name="mfa">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openTotpSetup">启用动态口令（TOTP）</el-button>
          <el-button @click="openSmsDialog">启用短信验证</el-button>
          <el-button @click="openEmailDialog">启用邮箱验证</el-button>
          <el-button :disabled="!hasActiveMfa" @click="handleRegenerateBackup">重新生成备用码</el-button>
        </div>
        <el-table v-loading="mfaLoading" :data="mfaConfigs" border stripe>
          <el-table-column label="类型" width="180">
            <template #default="{ row }">{{ MFA_TYPE_NAMES[row.type] || row.type }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="MFA_STATUS_META[row.status]?.tag || 'info'" size="small">
                {{ MFA_STATUS_META[row.status]?.label || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="deviceInfo" label="设备信息" min-width="160" show-overflow-tooltip />
          <el-table-column prop="lastVerifiedAt" label="最近验证" width="180" />
          <el-table-column prop="failedAttempts" label="失败次数" width="100" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.type !== 'BACKUP_CODE'"
                link
                type="danger"
                @click="handleDisableMfa(row)"
              >关闭</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-alert
          v-if="!mfaLoading && mfaConfigs.length === 0"
          title="尚未启用任何多因素认证方式"
          type="info"
          :closable="false"
          style="margin-top: 12px"
        />
      </el-tab-pane>

      <!-- IP 访问控制 -->
      <el-tab-pane label="IP 访问控制" name="ip">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openIpDialog('WHITELIST')">新增白名单</el-button>
          <el-button type="danger" @click="openIpDialog('BLACKLIST')">新增黑名单</el-button>
          <el-button @click="handleCleanup">清理过期规则</el-button>
          <el-button @click="checkVisible = true">放行检查</el-button>
        </div>

        <el-divider content-position="left">白名单</el-divider>
        <el-table v-loading="ipLoading" :data="whitelist" border stripe>
          <el-table-column prop="ipAddress" label="IP 地址" min-width="180" />
          <el-table-column prop="description" label="备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="优先级" width="90" prop="priority" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                {{ row.enabled ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleToggleIp(row)">
                {{ row.enabled ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteIp(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-divider content-position="left">黑名单</el-divider>
        <el-table v-loading="ipLoading" :data="blacklist" border stripe>
          <el-table-column prop="ipAddress" label="IP 地址" min-width="180" />
          <el-table-column prop="description" label="备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="过期时间" width="180">
            <template #default="{ row }">{{ row.expiresAt || '永久' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'danger' : 'info'" size="small">
                {{ row.enabled ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleToggleIp(row)">
                {{ row.enabled ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteIp(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- TOTP 初始化 -->
    <el-dialog v-model="totpVisible" title="启用动态口令（TOTP）" width="520px">
      <el-alert
        title="请用认证器 App 扫描二维码或手动输入密钥，然后输入 6 位动态码完成激活"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-descriptions v-if="totpInfo" :column="1" border>
        <el-descriptions-item label="密钥">
          <code class="secret-code">{{ totpInfo.secret }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="手动输入码">
          <code class="secret-code">{{ totpInfo.manualEntryKey }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="二维码链接">
          <el-link :href="totpInfo.qrCodeUrl" type="primary" target="_blank" rel="noopener">
            在认证器 App 中打开
          </el-link>
        </el-descriptions-item>
      </el-descriptions>
      <el-form label-width="90px" style="margin-top: 16px">
        <el-form-item label="动态码">
          <el-input v-model="totpCode" maxlength="6" placeholder="6 位数字" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="totpVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitTotpActivate">激活</el-button>
      </template>
    </el-dialog>

    <!-- 短信/邮箱启用 -->
    <el-dialog v-model="contactVisible" :title="contactType === 'SMS' ? '启用短信验证' : '启用邮箱验证'" width="440px">
      <el-form label-width="90px">
        <el-form-item :label="contactType === 'SMS' ? '手机号' : '邮箱'">
          <el-input v-model="contactValue" :placeholder="contactType === 'SMS' ? '请输入手机号' : '请输入邮箱'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contactVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitContact">确定</el-button>
      </template>
    </el-dialog>

    <!-- 备用码展示 -->
    <el-dialog v-model="backupVisible" title="备用恢复码" width="480px">
      <el-alert
        title="备用码仅展示一次，请妥善保存。每个备用码只能使用一次。"
        type="warning"
        :closable="false"
        style="margin-bottom: 12px"
      />
      <div class="backup-codes">
        <el-tag v-for="code in backupCodes" :key="code" class="backup-code">{{ code }}</el-tag>
      </div>
      <template #footer>
        <el-button type="primary" @click="backupVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增 IP 规则 -->
    <el-dialog
      v-model="ipDialogVisible"
      :title="ipForm.type === 'WHITELIST' ? '新增白名单' : '新增黑名单'"
      width="480px"
    >
      <el-form ref="ipFormRef" :model="ipForm" :rules="ipRules" label-width="110px">
        <el-form-item label="IP 地址" prop="ipAddress">
          <el-input v-model="ipForm.ipAddress" placeholder="支持 IP、CIDR（如 10.0.0.0/8）或通配符" />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input v-model="ipForm.description" placeholder="选填" />
        </el-form-item>
        <el-form-item v-if="ipForm.type === 'BLACKLIST'" label="有效期(分钟)" prop="durationMinutes">
          <el-input-number v-model="ipForm.durationMinutes" :min="1" :controls="false" placeholder="留空表示永久" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitIpRule">确定</el-button>
      </template>
    </el-dialog>

    <!-- IP 放行检查 -->
    <el-dialog v-model="checkVisible" title="IP 放行检查" width="420px">
      <el-form label-width="80px">
        <el-form-item label="IP 地址">
          <el-input v-model="checkIp" placeholder="请输入待检查的 IP" />
        </el-form-item>
        <el-form-item v-if="checkResult !== null" label="结果">
          <el-tag :type="checkResult ? 'success' : 'danger'">
            {{ checkResult ? '允许访问' : '拒绝访问' }}
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="checkVisible = false">关闭</el-button>
        <el-button type="primary" :loading="saving" @click="submitCheck">检查</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 账号安全脚本
 * - MFA：查看配置、TOTP 初始化与激活、短信/邮箱启用、备用码、关闭
 * - IP 访问控制：白名单/黑名单增删启停、清理过期、放行检查
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { showError } from '@/utils/request'
import {
  activateTotp,
  disableMfa,
  enableEmailMfa,
  enableSmsMfa,
  enableTotp,
  listMfaConfigs,
  MFA_STATUS_META,
  MFA_TYPE_NAMES,
  regenerateBackupCodes,
  type MfaType,
} from '@/api/mfa'
import {
  addIpRule,
  checkIpAccess,
  cleanupIpRules,
  deleteIpRule,
  listIpRules,
  toggleIpRule,
  type IpRuleType,
} from '@/api/ip-access-control'
import type { IpAccessRule, MfaConfigInfo, TotpSetupInfo } from '@/types'

const activeTab = ref('mfa')
const saving = ref(false)

// ==================== MFA ====================
const mfaLoading = ref(false)
const mfaConfigs = ref<MfaConfigInfo[]>([])
const totpVisible = ref(false)
const totpInfo = ref<TotpSetupInfo | null>(null)
const totpCode = ref('')
const contactVisible = ref(false)
const contactType = ref<'SMS' | 'EMAIL'>('SMS')
const contactValue = ref('')
const backupVisible = ref(false)
const backupCodes = ref<string[]>([])

/** 是否存在已激活的 MFA（备用码操作需先有激活配置） */
const hasActiveMfa = computed(() => mfaConfigs.value.some((item) => item.status === 'ACTIVE'))

/** 加载我的 MFA 配置（后端返回裸数组） */
async function loadMfaConfigs(): Promise<void> {
  mfaLoading.value = true
  try {
    mfaConfigs.value = (await listMfaConfigs()) || []
  } catch (error) {
    showError(error, '加载 MFA 配置失败')
  } finally {
    mfaLoading.value = false
  }
}

/** 打开 TOTP 初始化对话框 */
async function openTotpSetup(): Promise<void> {
  saving.value = true
  try {
    totpInfo.value = await enableTotp()
    totpCode.value = ''
    totpVisible.value = true
  } catch (error) {
    showError(error, '生成 TOTP 密钥失败')
  } finally {
    saving.value = false
  }
}

/** 提交 TOTP 激活 */
async function submitTotpActivate(): Promise<void> {
  if (!/^\d{6}$/.test(totpCode.value)) {
    ElMessage.warning('请输入 6 位动态码')
    return
  }
  saving.value = true
  try {
    const result = await activateTotp(totpCode.value)
    totpVisible.value = false
    if (result.backupCodes?.length) {
      backupCodes.value = result.backupCodes
      backupVisible.value = true
    }
    ElMessage.success('动态口令已启用')
    await loadMfaConfigs()
  } catch (error) {
    showError(error, '激活失败，请检查动态码')
  } finally {
    saving.value = false
  }
}

/** 打开短信/邮箱启用对话框 */
function openSmsDialog(): void {
  contactType.value = 'SMS'
  contactValue.value = ''
  contactVisible.value = true
}

/** 打开邮箱启用对话框 */
function openEmailDialog(): void {
  contactType.value = 'EMAIL'
  contactValue.value = ''
  contactVisible.value = true
}

/** 提交短信/邮箱 MFA 启用 */
async function submitContact(): Promise<void> {
  if (!contactValue.value.trim()) {
    ElMessage.warning(contactType.value === 'SMS' ? '请输入手机号' : '请输入邮箱')
    return
  }
  saving.value = true
  try {
    if (contactType.value === 'SMS') {
      await enableSmsMfa(contactValue.value.trim())
    } else {
      await enableEmailMfa(contactValue.value.trim())
    }
    ElMessage.success('已提交启用')
    contactVisible.value = false
    await loadMfaConfigs()
  } catch (error) {
    showError(error, '启用失败')
  } finally {
    saving.value = false
  }
}

/** 关闭指定 MFA */
async function handleDisableMfa(row: MfaConfigInfo): Promise<void> {
  const type = row.type as MfaType
  try {
    await ElMessageBox.confirm(
      `确认关闭「${MFA_TYPE_NAMES[type] || type}」？关闭后该验证方式将不再生效。`,
      '提示',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await disableMfa(type)
    ElMessage.success('已关闭')
    await loadMfaConfigs()
  } catch (error) {
    showError(error, '关闭失败')
  }
}

/** 重新生成备用恢复码 */
async function handleRegenerateBackup(): Promise<void> {
  try {
    await ElMessageBox.confirm('重新生成后旧备用码立即失效，确认继续？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    const result = await regenerateBackupCodes()
    backupCodes.value = result.codes || []
    backupVisible.value = true
  } catch (error) {
    showError(error, '生成备用码失败')
  }
}

// ==================== IP 访问控制 ====================
const ipLoading = ref(false)
const whitelist = ref<IpAccessRule[]>([])
const blacklist = ref<IpAccessRule[]>([])
const ipDialogVisible = ref(false)
const ipFormRef = ref<FormInstance>()
const ipForm = reactive<{
  type: IpRuleType
  ipAddress: string
  description?: string
  durationMinutes?: number
}>({ type: 'WHITELIST', ipAddress: '', description: undefined, durationMinutes: undefined })
const ipRules: FormRules = {
  ipAddress: [{ required: true, message: '请输入 IP 地址', trigger: 'blur' }],
}
const checkVisible = ref(false)
const checkIp = ref('')
const checkResult = ref<boolean | null>(null)

/** 加载白名单与黑名单 */
async function loadIpRules(): Promise<void> {
  ipLoading.value = true
  try {
    const [white, black] = await Promise.all([listIpRules('WHITELIST'), listIpRules('BLACKLIST')])
    whitelist.value = white || []
    blacklist.value = black || []
  } catch (error) {
    showError(error, '加载 IP 规则失败')
  } finally {
    ipLoading.value = false
  }
}

/** 打开新增规则对话框 */
function openIpDialog(type: IpRuleType): void {
  Object.assign(ipForm, {
    type,
    ipAddress: '',
    description: undefined,
    durationMinutes: undefined,
  })
  ipDialogVisible.value = true
}

/** 提交新增规则 */
async function submitIpRule(): Promise<void> {
  if (!ipFormRef.value) return
  await ipFormRef.value.validate()
  saving.value = true
  try {
    await addIpRule(ipForm.type, ipForm.ipAddress.trim(), ipForm.description, ipForm.durationMinutes)
    ElMessage.success('规则已添加')
    ipDialogVisible.value = false
    await loadIpRules()
  } catch (error) {
    showError(error, '添加规则失败')
  } finally {
    saving.value = false
  }
}

/** 启用/停用规则 */
async function handleToggleIp(row: IpAccessRule): Promise<void> {
  try {
    await toggleIpRule(row.id, !row.enabled)
    ElMessage.success('状态已更新')
    await loadIpRules()
  } catch (error) {
    showError(error, '更新状态失败')
  }
}

/** 删除规则 */
async function handleDeleteIp(row: IpAccessRule): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除规则「${row.ipAddress}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteIpRule(row.id)
    ElMessage.success('规则已删除')
    await loadIpRules()
  } catch (error) {
    showError(error, '删除规则失败')
  }
}

/** 清理已过期规则 */
async function handleCleanup(): Promise<void> {
  try {
    const count = await cleanupIpRules()
    ElMessage.success(`已清理 ${count ?? 0} 条过期规则`)
    await loadIpRules()
  } catch (error) {
    showError(error, '清理失败')
  }
}

/** 检查指定 IP 是否放行 */
async function submitCheck(): Promise<void> {
  if (!checkIp.value.trim()) {
    ElMessage.warning('请输入 IP 地址')
    return
  }
  saving.value = true
  try {
    checkResult.value = await checkIpAccess(checkIp.value.trim())
  } catch (error) {
    showError(error, '检查失败')
  } finally {
    saving.value = false
  }
}

/** Tab 切换按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'ip' && whitelist.value.length === 0 && blacklist.value.length === 0) loadIpRules()
}

onMounted(loadMfaConfigs)
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tab-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.secret-code {
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.backup-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.backup-code {
  font-family: 'Courier New', monospace;
}
</style>
