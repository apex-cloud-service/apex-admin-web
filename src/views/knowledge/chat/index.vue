<!--
  知识智能问答页面
  ------------------------------------------------------------------
  功能：基于知识库的 RAG 流式问答（SSE），会话列表 + 消息区 + 输入区；
        回答展示引用文档标题与片段摘要（片段最多显示两行，无展开控件）。
  权限要求：kb:chat:ask（问答接口）；会话管理接口登录即可。
  菜单组件路径：knowledge/chat/index
  流式说明：POST /api/v1/kb/chat/ask 使用 fetch 读取响应流，
           仅复用 notification-stream 的 createSseParser 分帧解析器，
           携带 Accept: text/event-stream 与 Authorization 头，不经过 Axios 拦截器，
           不具备自动重连；收到终止事件或读取失败时取消响应流并释放读取锁。
-->
<template>
  <div class="chat-page">
    <!-- 会话列表 -->
    <el-card class="conversation-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>历史会话</span>
          <el-button link type="primary" @click="startNewConversation">新建会话</el-button>
        </div>
      </template>
      <div v-loading="conversationsLoading" class="conversation-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === conversationId }"
          @click="switchConversation(conversation.id)"
        >
          <span class="conversation-title">{{ conversation.title || '未命名会话' }}</span>
          <el-icon class="conversation-delete" @click.stop="handleDeleteConversation(conversation)">
            <Delete />
          </el-icon>
        </div>
        <el-empty v-if="conversations.length === 0" description="暂无会话" :image-size="60" />
      </div>
    </el-card>

    <!-- 消息区 -->
    <el-card class="message-card" shadow="never">
      <div ref="messageContainer" class="message-container">
        <el-empty v-if="messages.length === 0 && !streaming" description="向知识库提问，回答将附带引用来源" />
        <div v-for="(message, index) in messages" :key="index" class="message-row" :class="message.role.toLowerCase()">
          <div class="message-bubble">
            <div class="message-content">{{ message.content }}<span v-if="message.streaming" class="cursor">▍</span></div>
            <div v-if="message.role === 'ASSISTANT' && message.citations && message.citations.length > 0" class="citations">
              <el-divider content-position="left">引用来源</el-divider>
              <div v-for="citation in message.citations" :key="citation.index" class="citation-item">
                <el-tag size="small" type="warning">[{{ citation.index }}]</el-tag>
                <span class="citation-title">{{ citation.documentTitle }}</span>
                <div class="citation-snippet">{{ citation.snippet }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <el-input
          v-model="question"
          type="textarea"
          :rows="3"
          placeholder="输入问题，Enter 发送（Shift+Enter 换行）"
          :disabled="streaming"
          @keydown.enter="handleKeydownEnter"
        />
        <div class="input-actions">
          <span class="tip-text">{{ streaming ? '回答生成中…' : '' }}</span>
          <el-button type="primary" :loading="streaming" :disabled="!question.trim()" @click="handleAsk">
            发送
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteConversation, getConversationMessages, listConversations } from '@/api/knowledge'
import type { KbCitation, KbConversation, KbMessage } from '@/types'
import { showError } from '@/utils/request'
import { getToken } from '@/utils/auth'
import { apiUrl } from '@/utils/api-base'
import { createSseParser } from '@/utils/notification-stream'

/** 页面内消息结构（含流式状态） */
interface ChatMessage {
  role: 'USER' | 'ASSISTANT'
  content: string
  citations?: KbCitation[]
  streaming?: boolean
}

const conversations = ref<KbConversation[]>([])
const conversationsLoading = ref(false)
const conversationId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const question = ref('')
const streaming = ref(false)
const messageContainer = ref<HTMLDivElement>()

/** 加载当前用户第一页会话（最多 50 条，页面未提供后续分页入口） */
async function fetchConversations(): Promise<void> {
  conversationsLoading.value = true
  try {
    const result = await listConversations({ page: 1, size: 50 })
    conversations.value = result.list
  } catch (error) {
    showError(error, '加载会话列表失败')
  } finally {
    conversationsLoading.value = false
  }
}

/** 切换会话并加载最近 50 条历史消息；列表顺序由后端按消息 ID 升序返回 */
async function switchConversation(id: number): Promise<void> {
  conversationId.value = id
  try {
    const history = await getConversationMessages(id)
    messages.value = history.map((message: KbMessage) => ({
      role: message.role === 'USER' ? 'USER' : 'ASSISTANT',
      content: message.content,
      citations: message.citations,
    }))
    await scrollToBottom()
  } catch (error) {
    showError(error, '加载会话消息失败')
  }
}

/** 新建会话（清空消息区，首次提问时后端自动建会话） */
function startNewConversation(): void {
  conversationId.value = null
  messages.value = []
}

/** 删除会话 */
async function handleDeleteConversation(conversation: KbConversation): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除会话「${conversation.title || '未命名会话'}」吗？`, '删除确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteConversation(conversation.id)
    ElMessage.success('会话删除成功')
    if (conversationId.value === conversation.id) {
      startNewConversation()
    }
    await fetchConversations()
  } catch (error) {
    showError(error, '会话删除失败')
  }
}

/** Enter 发送（Shift+Enter 换行） */
function handleKeydownEnter(event: KeyboardEvent): void {
  if (event.shiftKey) return
  event.preventDefault()
  void handleAsk()
}

/**
 * 发起一次 SSE 问答并累积回答；终止事件后停止消费，失败保留已有正文并显示一次提示。
 * fetch 不经过 Axios 的令牌刷新与错误转换，error 帧兼容 JSON 协议和旧纯文本。
 * @returns 响应流结束并复位生成状态，随后异步刷新第一页会话
 */
async function handleAsk(): Promise<void> {
  const text = question.value.trim()
  if (!text || streaming.value) return
  streaming.value = true
  question.value = ''
  messages.value.push({ role: 'USER', content: text })
  const assistantMessage = reactive<ChatMessage>({ role: 'ASSISTANT', content: '', streaming: true })
  messages.value.push(assistantMessage)
  await scrollToBottom()

  const controller = new AbortController()
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let terminated = false
  let completed = false
  let failureShown = false
  const appendFailure = (message: string): void => {
    if (failureShown) return
    failureShown = true
    assistantMessage.content += assistantMessage.content ? '\n\n' : ''
    assistantMessage.content += `[回答失败] ${message}`
  }
  try {
    const response = await fetch(apiUrl('/api/v1/kb/chat/ask'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId: conversationId.value, question: text }),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      throw new Error(`问答请求失败：HTTP ${response.status}`)
    }
    reader = response.body.getReader()
    const parser = createSseParser((eventName: string, data: string) => {
      if (terminated) return
      if (eventName === 'citations') {
        assistantMessage.citations = safeParseCitations(data)
      } else if (eventName === 'delta') {
        assistantMessage.content += data
        void scrollToBottom()
      } else if (eventName === 'done') {
        let done: unknown
        try {
          done = JSON.parse(data)
        } catch {
          throw new Error('问答完成事件格式无效')
        }
        if (!done || typeof done !== 'object' || Array.isArray(done)) {
          throw new Error('问答完成事件格式无效')
        }
        const id = Number((done as { conversationId?: unknown }).conversationId)
        if (!conversationId.value && Number.isFinite(id) && Number.isInteger(id) && id > 0) {
          conversationId.value = id
        }
        completed = true
        terminated = true
      } else if (eventName === 'error') {
        appendFailure(parseStreamError(data))
        terminated = true
      }
    })
    const decoder = new TextDecoder()
    while (!terminated) {
      const { done, value } = await reader.read()
      if (done) break
      parser.processChunk(decoder.decode(value, { stream: true }))
    }
    if (!completed && !failureShown) appendFailure('回答流中断，请重试')
  } catch (error) {
    appendFailure(error instanceof Error && error.message ? error.message : '服务暂时不可用')
  } finally {
    controller.abort()
    if (reader) {
      try {
        await reader.cancel()
      } catch {
        // 流可能已经关闭，取消失败不覆盖原始回答或错误。
      } finally {
        reader.releaseLock()
      }
    }
    assistantMessage.streaming = false
    streaming.value = false
    void scrollToBottom()
    void fetchConversations()
  }
}

/** 解析问答错误消息；旧纯文本可展示，畸形 JSON 与非字符串消息使用安全默认文案 */
function parseStreamError(data: string): string {
  const fallback = '服务暂时不可用'
  const text = data.trim()
  if (!text) return fallback
  try {
    const value: unknown = JSON.parse(text)
    if (typeof value === 'string') return value.trim() || fallback
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const message = (value as { message?: unknown }).message
      return typeof message === 'string' && message.trim() ? message.trim() : fallback
    }
    return fallback
  } catch {
    return /^[{["<]/.test(text) ? fallback : text
  }
}

/** 解析引用 JSON（服务端 citations 事件） */
function safeParseCitations(data: string): KbCitation[] {
  try {
    return JSON.parse(data) as KbCitation[]
  } catch {
    return []
  }
}

/** 滚动到消息底部 */
async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

onMounted(() => {
  void fetchConversations()
})
</script>

<style scoped>
.chat-page {
  display: flex;
  gap: 12px;
  height: calc(100vh - 140px);
}

.conversation-card {
  width: 260px;
  flex-shrink: 0;
}

.message-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-list {
  overflow-y: auto;
  height: calc(100% - 20px);
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.conversation-item:hover {
  background: var(--el-fill-color-light);
}

.conversation-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.conversation-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.conversation-delete {
  color: #909399;
}

.conversation-delete:hover {
  color: var(--el-color-danger);
}

.message-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  white-space: pre-wrap;
  word-break: break-word;
}

.message-row.user .message-bubble {
  background: var(--el-color-primary-light-9);
}

.message-content {
  font-size: 14px;
  line-height: 1.7;
}

.cursor {
  animation: blink 1s step-start infinite;
  color: var(--el-color-primary);
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.citations {
  margin-top: 8px;
  font-size: 12px;
}

.citations :deep(.el-divider__text) {
  font-size: 12px;
  color: #909399;
}

.citation-item {
  margin-bottom: 6px;
}

.citation-title {
  font-weight: 600;
  margin-left: 6px;
}

.citation-snippet {
  color: #909399;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.input-area {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 10px;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.tip-text {
  color: #909399;
  font-size: 12px;
}
</style>
