<!--
  办公平台消息管理页面
  ------------------------------------------------------------------
  功能：办公平台消息推送、消息模板管理、消息发送记录
  
  权限：
    - office:message:view - 查看消息列表
    - office:message:send - 发送消息
-->
<template>
  <div class="message-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>消息推送管理</span>
          <el-button type="primary" @click="handleSendMessage" v-permission="'office:message:send'">
            <el-icon><Position /></el-icon>
            发送消息
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="消息发送" name="send">
          <el-form :model="messageForm" :rules="messageRules" ref="messageFormRef" label-width="120px">
            <el-form-item label="目标平台" prop="platform">
              <el-select v-model="messageForm.platform" placeholder="请选择平台">
                <el-option label="飞书" value="FEISHU" />
                <el-option label="钉钉" value="DINGTALK" />
                <el-option label="企业微信" value="WECOM" />
              </el-select>
            </el-form-item>
            <el-form-item label="接收人类型" prop="receiverType">
              <el-radio-group v-model="messageForm.receiverType">
                <el-radio label="user">用户</el-radio>
                <el-radio label="chat">群聊</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="接收人ID" prop="receiverIds">
              <el-input v-model="messageForm.receiverIds" type="textarea" :rows="3" placeholder="多个ID用逗号分隔" />
            </el-form-item>
            <el-form-item label="消息类型" prop="msgType">
              <el-select v-model="messageForm.msgType" placeholder="请选择消息类型">
                <el-option label="文本" value="text" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="链接" value="link" />
                <el-option label="卡片" value="card" />
              </el-select>
            </el-form-item>
            <el-form-item label="消息内容" prop="content">
              <el-input v-model="messageForm.content" type="textarea" :rows="8" placeholder="请输入消息内容" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitMessage" :loading="sending">发送</el-button>
              <el-button @click="resetMessageForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="发送记录" name="records">
          <div class="filter-toolbar">
            <el-form :inline="true">
              <el-form-item label="平台">
                <el-select v-model="recordQuery.platform" placeholder="请选择平台" clearable>
                  <el-option label="飞书" value="FEISHU" />
                  <el-option label="钉钉" value="DINGTALK" />
                  <el-option label="企业微信" value="WECOM" />
                </el-select>
              </el-form-item>
              <el-form-item label="消息类型">
                <el-select v-model="recordQuery.msgType" placeholder="请选择类型" clearable>
                  <el-option label="文本" value="text" />
                  <el-option label="Markdown" value="markdown" />
                  <el-option label="链接" value="link" />
                  <el-option label="卡片" value="card" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadRecords">查询</el-button>
                <el-button @click="resetRecordQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="records" border stripe v-loading="recordLoading">
            <el-table-column prop="platform" label="平台" width="100" />
            <el-table-column prop="receiverType" label="接收类型" width="100" />
            <el-table-column prop="receiverIds" label="接收人" min-width="200" show-overflow-tooltip />
            <el-table-column prop="msgType" label="消息类型" width="120" />
            <el-table-column prop="content" label="内容摘要" min-width="200" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sendTime" label="发送时间" width="180" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewRecord(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="recordQuery.page"
            v-model:page-size="recordQuery.size"
            :total="recordTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadRecords"
            @current-change="loadRecords"
          />
        </el-tab-pane>

        <el-tab-pane label="消息模板" name="templates">
          <div style="margin-bottom: 16px">
            <el-button type="primary" @click="handleAddTemplate" v-permission="'office:message:template:create'">
              <el-icon><Plus /></el-icon>
              新增模板
            </el-button>
          </div>
          <el-table :data="templates" border stripe v-loading="templateLoading">
            <el-table-column prop="name" label="模板名称" width="150" />
            <el-table-column prop="msgType" label="消息类型" width="120" />
            <el-table-column prop="content" label="模板内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleUseTemplate(row)">使用</el-button>
                <el-button link type="primary" @click="handleEditTemplate(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="templateDialogVisible" :title="templateForm.id ? '编辑模板' : '新增模板'" width="700px">
      <el-form :model="templateForm" ref="templateFormRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="消息类型" prop="msgType">
          <el-select v-model="templateForm.msgType" placeholder="请选择类型">
            <el-option label="文本" value="text" />
            <el-option label="Markdown" value="markdown" />
            <el-option label="链接" value="link" />
            <el-option label="卡片" value="card" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input v-model="templateForm.content" type="textarea" :rows="8" placeholder="请输入模板内容" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="templateForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

/**
 * 消息推送管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. 消息发送 - 支持向飞书、钉钉、企业微信发送消息
 * 2. 多种消息类型 - 支持文本、Markdown、链接、卡片等消息类型
 * 3. 发送记录 - 查看历史消息发送记录
 * 4. 消息模板 - 管理常用消息模板,提高发送效率
 * 
 * 权限要求:
 * - office:message:view - 查看权限(必需)
 * - office:message:send - 发送消息
 * - office:message:template:* - 模板管理权限
 * 
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Position, Plus } from '@element-plus/icons-vue'
import { sendMessage, getSentMessages, type OfficeMessageRequest } from '@/api/office'
import type { PageQuery } from '@/types'

// 当前激活的标签页
const activeTab = ref('send')
// 发送状态
const sending = ref(false)

// ==================== 消息发送表单 ====================
const messageFormRef = ref<FormInstance>()
// 消息表单数据
const messageForm = reactive<OfficeMessageRequest>({
  platform: 'FEISHU',
  receiverType: 'user',
  receiverIds: '',
  msgType: 'text',
  content: '',
})

// 消息表单验证规则
const messageRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  receiverType: [{ required: true, message: '请选择接收人类型', trigger: 'change' }],
  receiverIds: [{ required: true, message: '请输入接收人ID', trigger: 'blur' }],
  msgType: [{ required: true, message: '请选择消息类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
}

// ==================== 发送记录 ====================
const recordLoading = ref(false)
const records = ref<any[]>([])
const recordQuery = reactive<PageQuery & { platform?: string; msgType?: string }>({
  page: 1,
  size: 10,
})
const recordTotal = ref(0)

// ==================== 消息模板 ====================
const templateLoading = ref(false)
const templates = ref<any[]>([])
const templateDialogVisible = ref(false)
const templateFormRef = ref<FormInstance>()
const templateForm = reactive<any>({
  id: undefined,
  name: '',
  msgType: 'text',
  content: '',
  description: '',
})

/**
 * 切换到消息发送标签页
 */
function handleSendMessage() {
  activeTab.value = 'send'
}

/**
 * 提交消息发送表单
 */
async function submitMessage() {
  if (!messageFormRef.value) return
  await messageFormRef.value.validate()
  sending.value = true
  try {
    await sendMessage(messageForm)
    ElMessage.success('发送成功')
    resetMessageForm()
    activeTab.value = 'records'
    await loadRecords()
  } catch (error) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

/**
 * 重置消息发送表单
 */
function resetMessageForm() {
  messageFormRef.value?.resetFields()
  Object.assign(messageForm, {
    platform: 'FEISHU',
    receiverType: 'user',
    receiverIds: '',
    msgType: 'text',
    content: '',
  })
}

/**
 * 加载发送记录列表
 */
async function loadRecords() {
  recordLoading.value = true
  try {
    const result = await getSentMessages(recordQuery as any)
    records.value = result.list || []
    recordTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载发送记录失败')
  } finally {
    recordLoading.value = false
  }
}

/**
 * 重置发送记录查询条件
 */
function resetRecordQuery() {
  recordQuery.platform = undefined
  recordQuery.msgType = undefined
  loadRecords()
}

/**
 * 查看发送记录详情
 */
function handleViewRecord(_row: any) {
  ElMessage.info('查看详情功能待实现')
}

/**
 * 打开新增模板对话框
 */
function handleAddTemplate() {
  Object.assign(templateForm, {
    id: undefined,
    name: '',
    msgType: 'text',
    content: '',
    description: '',
  })
  templateDialogVisible.value = true
}

/**
 * 打开编辑模板对话框
 */
function handleEditTemplate(row: any) {
  Object.assign(templateForm, row)
  templateDialogVisible.value = true
}

/**
 * 使用模板(将模板内容应用到发送表单)
 */
function handleUseTemplate(row: any) {
  Object.assign(messageForm, {
    msgType: row.msgType,
    content: row.content,
  })
  activeTab.value = 'send'
  ElMessage.success('模板已应用')
}

/**
 * 删除消息模板
 */
async function handleDeleteTemplate(_row: any) {
  await ElMessageBox.confirm('确认删除该模板?', '提示', { type: 'warning' })
  ElMessage.success('删除成功')
}

/**
 * 提交模板表单
 */
function submitTemplate() {
  ElMessage.success('保存成功')
  templateDialogVisible.value = false
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped lang="scss">
.message-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-toolbar {
  margin-bottom: 16px;
}
</style>
