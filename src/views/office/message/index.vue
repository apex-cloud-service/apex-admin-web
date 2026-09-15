<template>
  <div class="message-send-container">
    <el-card class="header-card">
      <h2>消息发送</h2>
      <p class="description">向飞书、钉钉、企业微信发送消息通知</p>
    </el-card>

    <el-row :gutter="20">
      <!-- 左侧：发送消息表单 -->
      <el-col :span="14">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <el-icon><ChatDotRound /></el-icon>
              <span>发送消息</span>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="目标平台" prop="platform">
              <el-select v-model="form.platform" placeholder="请选择平台" style="width: 100%">
                <el-option label="飞书" value="FEISHU" />
                <el-option label="钉钉" value="DINGTALK" />
                <el-option label="企业微信" value="WECOM" />
              </el-select>
            </el-form-item>

            <el-form-item label="接收人类型" prop="receiverType">
              <el-radio-group v-model="form.receiverType">
                <el-radio label="user">用户</el-radio>
                <el-radio label="group">群组</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="接收人ID" prop="receiverId">
              <el-input
                v-model="form.receiverId"
                placeholder="请输入接收人ID或群组ID"
                clearable
              />
              <div class="form-tip">提示：输入平台侧的用户ID或群组ID</div>
            </el-form-item>

            <el-form-item label="消息类型" prop="messageType">
              <el-radio-group v-model="form.messageType" @change="handleMessageTypeChange">
                <el-radio label="TEXT">文本</el-radio>
                <el-radio label="IMAGE">图片</el-radio>
                <el-radio label="FILE">文件</el-radio>
                <el-radio label="CARD">卡片</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 文本消息 -->
            <el-form-item
              v-if="form.messageType === 'TEXT'"
              label="消息内容"
              prop="content"
            >
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="6"
                placeholder="请输入消息内容"
                maxlength="2000"
                show-word-limit
              />
            </el-form-item>

            <!-- 图片消息 -->
            <el-form-item
              v-if="form.messageType === 'IMAGE'"
              label="图片URL"
              prop="imageUrl"
            >
              <el-input
                v-model="form.imageUrl"
                placeholder="请输入图片URL"
                clearable
              />
              <div class="form-tip">提示：需要是可公开访问的图片链接</div>
            </el-form-item>

            <!-- 文件消息 -->
            <template v-if="form.messageType === 'FILE'">
              <el-form-item label="文件URL" prop="fileUrl">
                <el-input
                  v-model="form.fileUrl"
                  placeholder="请输入文件URL"
                  clearable
                />
              </el-form-item>
              <el-form-item label="文件名" prop="fileName">
                <el-input
                  v-model="form.fileName"
                  placeholder="请输入文件名（含扩展名）"
                  clearable
                />
              </el-form-item>
            </template>

            <!-- 卡片消息 -->
            <el-form-item
              v-if="form.messageType === 'CARD'"
              label="卡片内容"
              prop="cardContent"
            >
              <el-input
                v-model="form.cardContent"
                type="textarea"
                :rows="8"
                placeholder="请输入卡片JSON内容"
              />
              <div class="form-tip">提示：需要符合目标平台的卡片格式规范</div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSend" :loading="sending">
                <el-icon><Promotion /></el-icon>
                <span>发送消息</span>
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：消息模板 -->
      <el-col :span="10">
        <el-card class="template-card">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>消息模板</span>
            </div>
          </template>

          <el-collapse v-model="activeTemplates">
            <el-collapse-item title="文本消息示例" name="text">
              <pre class="template-content">{{ textTemplate }}</pre>
              <el-button size="small" text @click="useTemplate('TEXT', textTemplate)">
                使用此模板
              </el-button>
            </el-collapse-item>

            <el-collapse-item title="卡片消息示例（飞书）" name="card">
              <pre class="template-content">{{ cardTemplate }}</pre>
              <el-button size="small" text @click="useTemplate('CARD', cardTemplate)">
                使用此模板
              </el-button>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <!-- 已发送消息列表 -->
    <el-card class="list-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <div>
            <el-icon><List /></el-icon>
            <span>已发送消息</span>
          </div>
          <el-button size="small" @click="loadMessages">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table :data="messages" v-loading="loading" stripe>
        <el-table-column prop="messageId" label="消息ID" width="200" />
        <el-table-column label="平台" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getPlatformName(row.platform) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ getMessageTypeName(row.messageType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receiverId" label="接收人ID" width="150" />
        <el-table-column prop="content" label="消息内容" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sendTime" label="发送时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadMessages"
        @size-change="loadMessages"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <!-- 消息详情弹窗 -->
    <el-dialog v-model="detailVisible" title="消息详情" width="600px">
      <el-descriptions :column="1" border v-if="currentMessage">
        <el-descriptions-item label="消息ID">{{ currentMessage.messageId }}</el-descriptions-item>
        <el-descriptions-item label="平台">
          {{ getPlatformName(currentMessage.platform) }}
        </el-descriptions-item>
        <el-descriptions-item label="消息类型">
          {{ getMessageTypeName(currentMessage.messageType) }}
        </el-descriptions-item>
        <el-descriptions-item label="接收人类型">
          {{ currentMessage.receiverType === 'user' ? '用户' : '群组' }}
        </el-descriptions-item>
        <el-descriptions-item label="接收人ID">
          {{ currentMessage.receiverId }}
        </el-descriptions-item>
        <el-descriptions-item label="接收人名称">
          {{ currentMessage.receiverName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="消息内容">
          <pre style="white-space: pre-wrap; margin: 0">{{ currentMessage.content }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="发送状态">
          <el-tag
            :type="
              currentMessage.status === 'SUCCESS'
                ? 'success'
                : currentMessage.status === 'FAILED'
                ? 'danger'
                : 'warning'
            "
          >
            {{ currentMessage.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发送时间">
          {{ currentMessage.sendTime }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" v-if="currentMessage.errorMessage">
          <span style="color: #f56c6c">{{ currentMessage.errorMessage }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ChatDotRound,
  Document,
  List,
  Refresh,
  View,
  Promotion,
} from '@element-plus/icons-vue'
import {
  sendTextMessage,
  sendImageMessage,
  sendFileMessage,
  sendCardMessage,
  getSentMessages,
  getPlatformName,
  getMessageTypeName,
  type MessageRecord,
  type OfficePlatform,
  type SendTextMessageRequest,
  type SendImageMessageRequest,
  type SendFileMessageRequest,
  type SendCardMessageRequest,
} from '@/api/office'

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const form = reactive({
  platform: 'FEISHU' as OfficePlatform,
  receiverType: 'user' as 'user' | 'group',
  receiverId: '',
  messageType: 'TEXT' as 'TEXT' | 'IMAGE' | 'FILE' | 'CARD',
  content: '',
  imageUrl: '',
  fileUrl: '',
  fileName: '',
  cardContent: '',
})

// 表单验证规则
const rules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  receiverType: [{ required: true, message: '请选择接收人类型', trigger: 'change' }],
  receiverId: [{ required: true, message: '请输入接收人ID', trigger: 'blur' }],
  messageType: [{ required: true, message: '请选择消息类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入消息内容', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请输入图片URL', trigger: 'blur' }],
  fileUrl: [{ required: true, message: '请输入文件URL', trigger: 'blur' }],
  fileName: [{ required: true, message: '请输入文件名', trigger: 'blur' }],
  cardContent: [{ required: true, message: '请输入卡片内容', trigger: 'blur' }],
}

// 发送状态
const sending = ref(false)

// 消息列表
const messages = ref<MessageRecord[]>([])
const loading = ref(false)
const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

// 消息详情
const detailVisible = ref(false)
const currentMessage = ref<MessageRecord | null>(null)

// 模板展开状态
const activeTemplates = ref(['text'])

// 消息模板
const textTemplate = '您好，这是一条测试消息。\n\n发送时间：' + new Date().toLocaleString()

const cardTemplate = JSON.stringify(
  {
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: '通知标题',
      },
      template: 'blue',
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'plain_text',
          content: '这是一条卡片消息示例',
        },
      },
    ],
  },
  null,
  2,
)

/**
 * 消息类型切换处理
 */
const handleMessageTypeChange = () => {
  // 清空之前的内容
  form.content = ''
  form.imageUrl = ''
  form.fileUrl = ''
  form.fileName = ''
  form.cardContent = ''
}

/**
 * 使用模板
 */
const useTemplate = (type: string, content: string) => {
  form.messageType = type as any
  if (type === 'TEXT') {
    form.content = content
  } else if (type === 'CARD') {
    form.cardContent = content
  }
  ElMessage.success('已应用模板')
}

/**
 * 发送消息
 */
const handleSend = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      sending.value = true
      let result

      if (form.messageType === 'TEXT') {
        const request: SendTextMessageRequest = {
          platform: form.platform,
          receiverType: form.receiverType,
          receiverId: form.receiverId,
          content: form.content,
        }
        result = await sendTextMessage(request)
      } else if (form.messageType === 'IMAGE') {
        const request: SendImageMessageRequest = {
          platform: form.platform,
          receiverType: form.receiverType,
          receiverId: form.receiverId,
          imageUrl: form.imageUrl,
        }
        result = await sendImageMessage(request)
      } else if (form.messageType === 'FILE') {
        const request: SendFileMessageRequest = {
          platform: form.platform,
          receiverType: form.receiverType,
          receiverId: form.receiverId,
          fileUrl: form.fileUrl,
          fileName: form.fileName,
        }
        result = await sendFileMessage(request)
      } else if (form.messageType === 'CARD') {
        const request: SendCardMessageRequest = {
          platform: form.platform,
          receiverType: form.receiverType,
          receiverId: form.receiverId,
          cardContent: form.cardContent,
        }
        result = await sendCardMessage(request)
      }

      ElMessage.success('消息发送成功，消息ID：' + result?.messageId)
      handleReset()
      loadMessages()
    } catch (error: any) {
      ElMessage.error(error.message || '发送失败')
    } finally {
      sending.value = false
    }
  })
}

/**
 * 重置表单
 */
const handleReset = () => {
  formRef.value?.resetFields()
  form.content = ''
  form.imageUrl = ''
  form.fileUrl = ''
  form.fileName = ''
  form.cardContent = ''
}

/**
 * 加载消息列表
 */
const loadMessages = async () => {
  try {
    loading.value = true
    const response = await getSentMessages({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    messages.value = response.records || []
    pagination.total = response.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

/**
 * 查看消息详情
 */
const viewDetail = (message: MessageRecord) => {
  currentMessage.value = message
  detailVisible.value = true
}

onMounted(() => {
  loadMessages()
})
</script>

<style scoped lang="scss">
.message-send-container {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 600;

    > div {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }

  .template-content {
    margin: 0 0 12px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 12px;
    overflow-x: auto;
  }
}
</style>
