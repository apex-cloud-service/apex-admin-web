<!--
  消息中心页面
  ------------------------------------------------------------------
  站内信收发与消息模板管理（数据来自 /api/v1/messages 与 /admin-api/v1/message-templates）：
  - 收件箱：分页查看接收消息，点击查看详情并自动标记已读
  - 已发送：分页查看本人发送的消息
  - 消息模板：启用模板列表与增改删
  发送站内信时接收人取同步员工中已绑定系统账号（userId 非空）的人员。
-->
<template>
  <div class="message-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>消息中心</span>
          <div class="header-actions">
            <el-button :disabled="unreadCount === 0" @click="handleReadAll">
              全部已读
            </el-button>
            <el-button type="primary" @click="openSendDialog">
              <el-icon><Position /></el-icon>
              发送消息
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 收件箱 -->
        <el-tab-pane label="收件箱" name="inbox">
          <el-table
            v-loading="inboxLoading"
            :data="inboxMessages"
            border
            stripe
            highlight-current-row
            @row-click="openDetail"
          >
            <el-table-column label="优先级" width="90">
              <template #default="{ row }">
                <el-tag :type="priorityTagType(row.priority)" size="small">
                  {{ priorityName(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="主题" min-width="240">
              <template #default="{ row }">
                <span :class="{ 'unread-subject': !row.readStatus }">{{ row.subject }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">{{ messageTypeName(row.messageType) }}</template>
            </el-table-column>
            <el-table-column prop="senderName" label="发送人" width="120" />
            <el-table-column label="发送时间" width="180">
              <template #default="{ row }">{{ formatTime(row.sendTime) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.readStatus ? 'info' : 'danger'" size="small">
                  {{ row.readStatus ? '已读' : '未读' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <Pagination class="pager" :total="inboxTotal" @change="onInboxPageChange" />
        </el-tab-pane>

        <!-- 已发送 -->
        <el-tab-pane label="已发送" name="sent">
          <el-table v-loading="sentLoading" :data="sentMessages" border stripe>
            <el-table-column prop="subject" label="主题" min-width="240" show-overflow-tooltip />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">{{ messageTypeName(row.messageType) }}</template>
            </el-table-column>
            <el-table-column prop="senderName" label="发送人" width="120" />
            <el-table-column label="发送时间" width="180">
              <template #default="{ row }">{{ formatTime(row.sendTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button link type="primary" @click="openDeliveries(row)">投递记录</el-button>
              </template>
            </el-table-column>
          </el-table>
          <Pagination class="pager" :total="sentTotal" @change="onSentPageChange" />
        </el-tab-pane>

        <!-- 消息模板 -->
        <el-tab-pane label="消息模板" name="templates">
          <div class="tab-toolbar">
            <el-button type="primary" @click="openTemplateDialog()">
              <el-icon><Plus /></el-icon>
              新增模板
            </el-button>
          </div>
          <el-table v-loading="templateLoading" :data="templates" border stripe>
            <el-table-column prop="templateCode" label="模板编码" width="160" />
            <el-table-column prop="templateName" label="模板名称" width="160" />
            <el-table-column prop="templateType" label="模板类型" width="120" />
            <el-table-column
              prop="templateContent"
              label="模板内容"
              min-width="280"
              show-overflow-tooltip
            />
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                  {{ row.enabled ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openTemplateDialog(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 消息详情抽屉 -->
    <el-drawer v-model="detailVisible" title="消息详情" size="480px">
      <el-descriptions v-if="detailMessage" :column="1" border>
        <el-descriptions-item label="主题">{{ detailMessage.subject }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ messageTypeName(detailMessage.messageType) }}
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          {{ priorityName(detailMessage.priority) }}
        </el-descriptions-item>
        <el-descriptions-item label="发送人">{{ detailMessage.senderName }}</el-descriptions-item>
        <el-descriptions-item label="发送时间">
          {{ formatTime(detailMessage.sendTime) }}
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="detailMessage" class="detail-content">{{ detailMessage.content }}</div>
    </el-drawer>

    <!-- 渠道投递记录抽屉：发送人看全部接收人，接收人仅本人；断线补偿以此与未读数为准 -->
    <el-drawer v-model="deliveriesVisible" title="渠道投递记录" size="520px">
      <el-table v-loading="deliveriesLoading" :data="deliveries" border stripe size="small">
        <el-table-column label="渠道" width="110">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ deliveryChannelName(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recipientId" label="接收人 ID" width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="deliveryStatusMeta(row.deliveryStatus).tag" size="small">
              {{ deliveryStatusMeta(row.deliveryStatus).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="送达时间" width="170">
          <template #default="{ row }">{{ row.deliveredAt ? formatTime(row.deliveredAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="failureReason" label="失败原因" min-width="140" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!deliveriesLoading && deliveries.length === 0" description="暂无投递记录" :image-size="80" />
    </el-drawer>

    <!-- 发送消息对话框 -->
    <el-dialog v-model="sendVisible" title="发送站内信" width="640px" destroy-on-close>
      <el-form ref="sendFormRef" :model="sendForm" :rules="sendRules" label-width="90px">
        <el-form-item label="接收人" prop="recipientIds">
          <el-select
            v-model="sendForm.recipientIds"
            multiple
            filterable
            placeholder="选择接收员工（已绑定系统账号）"
            style="width: 100%"
          >
            <el-option
              v-for="employee in recipientOptions"
              :key="employee.userId"
              :label="`${employee.employeeName}${employee.deptName ? `（${employee.deptName}）` : ''}`"
              :value="employee.userId as number"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="主题" prop="subject">
          <el-input v-model="sendForm.subject" maxlength="200" placeholder="请输入消息主题" />
        </el-form-item>
        <el-form-item label="消息类型" prop="messageType">
          <el-select v-model="sendForm.messageType" placeholder="默认系统消息" clearable>
            <el-option label="系统" value="SYSTEM" />
            <el-option label="通知" value="NOTICE" />
            <el-option label="任务" value="TASK" />
            <el-option label="告警" value="ALERT" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="sendForm.priority" placeholder="默认普通" clearable>
            <el-option label="低" value="LOW" />
            <el-option label="普通" value="NORMAL" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="8"
            maxlength="16000"
            show-word-limit
            placeholder="请输入消息内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sendVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="submitSend">发送</el-button>
      </template>
    </el-dialog>

    <!-- 模板编辑对话框 -->
    <el-dialog
      v-model="templateVisible"
      :title="templateForm.id ? '编辑模板' : '新增模板'"
      width="640px"
    >
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="90px">
        <el-form-item label="模板编码" prop="templateCode">
          <el-input
            v-model="templateForm.templateCode"
            :disabled="!!templateForm.id"
            placeholder="唯一编码，如 approval-remind"
          />
        </el-form-item>
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="templateForm.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板类型" prop="templateType">
          <el-input v-model="templateForm.templateType" placeholder="如 SYSTEM / NOTICE" />
        </el-form-item>
        <el-form-item label="模板内容" prop="templateContent">
          <el-input
            v-model="templateForm.templateContent"
            type="textarea"
            :rows="8"
            placeholder="支持 {variable} 形式的变量占位"
          />
        </el-form-item>
        <el-form-item label="启用" prop="enabled">
          <el-switch v-model="templateForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateSaving" @click="submitTemplate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Position } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  createMessageTemplate,
  deleteMessageTemplate,
  getUnreadCount,
  listInboxMessages,
  listMessageDeliveries,
  listMessageTemplates,
  listSentMessages,
  markAllMessagesRead,
  markMessageRead,
  PRIORITY_NAMES,
  PRIORITY_TAG_TYPES,
  sendMessage,
  MESSAGE_TYPE_NAMES,
  updateMessageTemplate,
  type MessageDelivery,
} from '@/api/message'
import { listOrgEmployees } from '@/api/office-new'
import { subscribeMessagePush } from '@/utils/message-socket'
import type {
  InternalMessage,
  MessageTemplate,
  OrgEmployee,
  SendMessagePayload,
} from '@/types'

/** 站内信推送退订函数 */
let unsubscribePush: (() => void) | undefined

/** 接收人下拉选项（员工名 + 部门） */
interface RecipientOption {
  userId: number
  employeeName: string
  deptName?: string
}

// ==================== 列表状态 ====================
const activeTab = ref('inbox')
const inboxMessages = ref<InternalMessage[]>([])
const inboxLoading = ref(false)
const inboxPage = ref(1)
const inboxSize = ref(10)
/** 后端返回纯数组，无总数，以数组长度作为分页展示值 */
const inboxTotal = ref(0)
const sentMessages = ref<InternalMessage[]>([])
const sentLoading = ref(false)
const sentPage = ref(1)
const sentSize = ref(10)
const sentTotal = ref(0)
const unreadCount = ref(0)

// ==================== 详情抽屉 ====================
const detailVisible = ref(false)
const detailMessage = ref<InternalMessage | null>(null)

// ==================== 发送对话框 ====================
const sendVisible = ref(false)
const sending = ref(false)
const sendFormRef = ref<FormInstance>()
const recipientOptions = ref<RecipientOption[]>([])
const sendForm = reactive<SendMessagePayload>({
  subject: '',
  content: '',
  messageType: undefined,
  priority: undefined,
  recipientIds: [],
})
const sendRules: FormRules = {
  recipientIds: [{ required: true, message: '请选择接收人', trigger: 'change' }],
  subject: [{ required: true, message: '请输入消息主题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
}

// ==================== 模板对话框 ====================
const templateVisible = ref(false)
const templateSaving = ref(false)
const templateLoading = ref(false)
const templates = ref<MessageTemplate[]>([])
const templateFormRef = ref<FormInstance>()
const templateForm = reactive<MessageTemplate>({
  id: undefined,
  templateCode: '',
  templateName: '',
  templateType: undefined,
  templateContent: '',
  enabled: true,
})
const templateRules: FormRules = {
  templateCode: [{ required: true, message: '请输入模板编码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateContent: [{ required: true, message: '请输入模板内容', trigger: 'blur' }],
}

/** 消息类型展示名 */
function messageTypeName(type?: string): string {
  return (type && MESSAGE_TYPE_NAMES[type]) || type || '-'
}

/** 优先级展示名 */
function priorityName(priority?: string): string {
  return (priority && PRIORITY_NAMES[priority]) || priority || '-'
}

/** 优先级标签样式 */
function priorityTagType(priority?: string): 'info' | 'success' | 'warning' | 'danger' {
  return (priority && PRIORITY_TAG_TYPES[priority]) || 'info'
}

/** 时间戳 → 本地化展示 */
function formatTime(time?: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

/** 加载收件箱当前页 */
async function loadInbox(): Promise<void> {
  inboxLoading.value = true
  try {
    const list = await listInboxMessages(inboxPage.value, inboxSize.value)
    inboxMessages.value = list
    inboxTotal.value = list.length
    await refreshUnread()
  } catch (error) {
    showError(error, '加载收件箱失败')
  } finally {
    inboxLoading.value = false
  }
}

/** 加载已发送当前页 */
async function loadSent(): Promise<void> {
  sentLoading.value = true
  try {
    const list = await listSentMessages(sentPage.value, sentSize.value)
    sentMessages.value = list
    sentTotal.value = list.length
  } catch (error) {
    showError(error, '加载已发送列表失败')
  } finally {
    sentLoading.value = false
  }
}

/** 加载消息模板列表 */
async function loadTemplates(): Promise<void> {
  templateLoading.value = true
  try {
    templates.value = await listMessageTemplates()
  } catch (error) {
    showError(error, '加载消息模板失败')
  } finally {
    templateLoading.value = false
  }
}

/** 刷新未读数（仅以未读接口为准） */
async function refreshUnread(): Promise<void> {
  try {
    unreadCount.value = await getUnreadCount()
  } catch {
    unreadCount.value = 0
  }
}

/** Tab 切换时按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'sent' && sentMessages.value.length === 0) loadSent()
  if (tab === 'templates' && templates.value.length === 0) loadTemplates()
}

/** 收件箱分页变化 */
function onInboxPageChange(page: number, size: number): void {
  inboxPage.value = page
  inboxSize.value = size
  loadInbox()
}

/** 已发送分页变化 */
function onSentPageChange(page: number, size: number): void {
  sentPage.value = page
  sentSize.value = size
  loadSent()
}

/** 打开消息详情（收件箱未读消息自动标记已读） */
async function openDetail(row: InternalMessage): Promise<void> {
  detailMessage.value = row
  detailVisible.value = true
  if (!row.readStatus) {
    try {
      await markMessageRead(row.id)
      row.readStatus = true
      await refreshUnread()
    } catch (error) {
      showError(error, '标记已读失败')
    }
  }
}

// ==================== 渠道投递记录 ====================
/** 投递记录抽屉可见性 */
const deliveriesVisible = ref(false)
/** 投递记录加载中 */
const deliveriesLoading = ref(false)
/** 当前消息的投递记录 */
const deliveries = ref<MessageDelivery[]>([])

/** 投递渠道 → 中文名称 */
const DELIVERY_CHANNEL_NAMES: Record<string, string> = {
  INBOX: '站内',
  FEISHU: '飞书',
  DINGTALK: '钉钉',
  WECOM: '企微',
}

/** 投递状态 → 名称与标签样式 */
const DELIVERY_STATUS_META: Record<string, { label: string; tag: 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING: { label: '待投递', tag: 'info' },
  SUCCESS: { label: '已送达', tag: 'success' },
  FAILED: { label: '失败', tag: 'danger' },
  UNKNOWN: { label: '未知', tag: 'warning' },
}

/** 渠道中文名（未知渠道原样返回） */
function deliveryChannelName(channel: string): string {
  return DELIVERY_CHANNEL_NAMES[channel] || channel
}

/** 投递状态元信息（未知状态回退为 info） */
function deliveryStatusMeta(status: string): { label: string; tag: 'success' | 'warning' | 'danger' | 'info' } {
  return DELIVERY_STATUS_META[status] || { label: status || '-', tag: 'info' }
}

/** 打开指定消息的渠道投递记录抽屉 */
async function openDeliveries(row: InternalMessage): Promise<void> {
  deliveriesVisible.value = true
  deliveriesLoading.value = true
  deliveries.value = []
  try {
    deliveries.value = await listMessageDeliveries(row.id)
  } catch (error) {
    showError(error, '加载投递记录失败')
  } finally {
    deliveriesLoading.value = false
  }
}

/** 全部标记已读 */
async function handleReadAll(): Promise<void> {
  try {
    await markAllMessagesRead()
    ElMessage.success('已全部标记为已读')
    await Promise.all([refreshUnread(), loadInbox()])
  } catch (error) {
    showError(error, '全部已读失败')
  }
}

/** 加载可选择的接收员工（已绑定系统账号的人员） */
async function loadRecipientOptions(): Promise<void> {
  try {
    const page = await listOrgEmployees({ pageNum: 1, pageSize: 200 })
    recipientOptions.value = (page.list || [])
      .filter((employee: OrgEmployee) => employee.userId != null)
      .map((employee: OrgEmployee) => ({
        userId: employee.userId as number,
        employeeName: employee.employeeName,
        deptName: employee.deptName,
      }))
  } catch (error) {
    showError(error, '加载员工列表失败')
  }
}

/** 打开发送对话框 */
function openSendDialog(): void {
  sendForm.subject = ''
  sendForm.content = ''
  sendForm.messageType = undefined
  sendForm.priority = undefined
  sendForm.recipientIds = []
  sendVisible.value = true
  if (recipientOptions.value.length === 0) loadRecipientOptions()
}

/** 提交发送站内信 */
async function submitSend(): Promise<void> {
  if (!sendFormRef.value) return
  await sendFormRef.value.validate()
  sending.value = true
  try {
    await sendMessage({ ...sendForm })
    ElMessage.success('发送成功')
    sendVisible.value = false
    activeTab.value = 'sent'
    sentPage.value = 1
    await loadSent()
  } catch (error) {
    showError(error, '发送失败')
  } finally {
    sending.value = false
  }
}

/** 打开模板对话框（无参为新增） */
function openTemplateDialog(row?: MessageTemplate): void {
  Object.assign(templateForm, {
    id: row?.id,
    templateCode: row?.templateCode ?? '',
    templateName: row?.templateName ?? '',
    templateType: row?.templateType,
    templateContent: row?.templateContent ?? '',
    enabled: row?.enabled ?? true,
  })
  templateVisible.value = true
}

/** 提交模板新增/编辑 */
async function submitTemplate(): Promise<void> {
  if (!templateFormRef.value) return
  await templateFormRef.value.validate()
  templateSaving.value = true
  try {
    if (templateForm.id) {
      await updateMessageTemplate(templateForm.id, { ...templateForm })
      ElMessage.success('模板已更新')
    } else {
      await createMessageTemplate({ ...templateForm })
      ElMessage.success('模板已创建')
    }
    templateVisible.value = false
    await loadTemplates()
  } catch (error) {
    showError(error, '保存模板失败')
  } finally {
    templateSaving.value = false
  }
}

/** 删除模板（确认后提交） */
async function handleDeleteTemplate(row: MessageTemplate): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除模板「${row.templateName}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteMessageTemplate(row.id as number)
    ElMessage.success('模板已删除')
    await loadTemplates()
  } catch (error) {
    showError(error, '删除模板失败')
  }
}

onMounted(() => {
  loadInbox()
  // 订阅站内信推送：收件箱 Tab 收到新消息立即刷新，其余 Tab 仅刷新未读数
  unsubscribePush = subscribeMessagePush(() => {
    if (activeTab.value === 'inbox') {
      loadInbox()
    } else {
      refreshUnread()
    }
  })
})

onBeforeUnmount(() => {
  unsubscribePush?.()
})
</script>

<style scoped lang="scss">
.message-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.tab-toolbar {
  margin-bottom: 16px;
}

.unread-subject {
  font-weight: 600;
}

.detail-content {
  margin-top: 16px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
}
</style>
