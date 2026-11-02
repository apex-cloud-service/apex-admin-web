<!--
  统一通知门面（方案批次 D1）
  ------------------------------------------------------------------
  两个页签：
  - 通知模板：分页查询、创建、编辑、删除（/api/v2/office/notify/templates）
  - 投递留痕：按通道/模板/状态查询投递记录（/api/v2/office/notify/requests）
  契约要点：
  - 模板正文含 ${key} 占位符，paramsSchema 为参数契约 JSON 文本，仅作管理端提示。
  - 按模板投递走内部端点 POST /internal/v1/notify（集群内直连，管理端不提供发送入口）。
  - 权限要求（按钮 v-permission）：office:notify:template:manage。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>统一通知</span>
        <el-tag type="info" size="small">模板 + 投递留痕（站内信 / 飞书 / 钉钉 / 企微 / 短信 / 邮件）</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 通知模板 -->
      <el-tab-pane label="通知模板" name="templates">
        <el-form :inline="true" class="query-form">
          <el-form-item label="通道">
            <el-select v-model="templateQuery.channel" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="(name, key) in NOTIFY_CHANNEL_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字">
            <el-input v-model="templateQuery.keyword" placeholder="模板编码" clearable style="width: 180px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="searchTemplates">查询</el-button>
            <el-button type="success" :icon="Plus" @click="openTemplateDialog()" v-permission="'office:notify:template:manage'">
              新增模板
            </el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="templateLoading" :data="templates" border stripe>
          <el-table-column prop="templateCode" label="模板编码" width="180">
            <template #default="{ row }"><el-tag>{{ row.templateCode }}</el-tag></template>
          </el-table-column>
          <el-table-column label="默认通道" width="110">
            <template #default="{ row }">{{ NOTIFY_CHANNEL_NAMES[row.channel] || row.channel }}</template>
          </el-table-column>
          <el-table-column prop="title" label="主题" min-width="180" show-overflow-tooltip />
          <el-table-column prop="body" label="正文模板" min-width="240" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'DISABLED' ? 'info' : 'success'" size="small">
                {{ row.status === 'DISABLED' ? '停用' : '启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="170" />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTemplateDialog(row)" v-permission="'office:notify:template:manage'">
                编辑
              </el-button>
              <el-button link type="danger" @click="handleDeleteTemplate(row)" v-permission="'office:notify:template:manage'">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <Pagination :total="templateTotal" @change="onTemplatePageChange" />
      </el-tab-pane>

      <!-- 投递留痕 -->
      <el-tab-pane label="投递留痕" name="records">
        <el-form :inline="true" class="query-form">
          <el-form-item label="通道">
            <el-select v-model="recordQuery.channel" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="(name, key) in NOTIFY_CHANNEL_NAMES" :key="key" :label="name" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item label="模板编码">
            <el-input v-model="recordQuery.templateCode" placeholder="精确匹配" clearable style="width: 160px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="recordQuery.status" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="(meta, key) in NOTIFY_STATUS_META" :key="key" :label="meta.label" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="searchRecords">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="recordLoading" :data="records" border stripe>
          <el-table-column prop="id" label="ID" width="90" />
          <el-table-column label="通道" width="110">
            <template #default="{ row }">{{ NOTIFY_CHANNEL_NAMES[row.channel] || row.channel }}</template>
          </el-table-column>
          <el-table-column prop="templateCode" label="模板编码" width="180" />
          <el-table-column prop="recipient" label="接收目标" min-width="160" show-overflow-tooltip />
          <el-table-column prop="params" label="渲染参数" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="NOTIFY_STATUS_META[row.status]?.tag || 'info'" size="small">
                {{ NOTIFY_STATUS_META[row.status]?.label || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="errorMessage" label="失败原因" min-width="160" show-overflow-tooltip />
          <el-table-column prop="createTime" label="创建时间" width="170" />
        </el-table>
        <Pagination :total="recordTotal" @change="onRecordPageChange" />
      </el-tab-pane>
    </el-tabs>

    <!-- 模板编辑 -->
    <el-dialog v-model="templateDialogVisible" :title="templateForm.id ? '编辑通知模板' : '新增通知模板'" width="640px">
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="100px">
        <el-form-item label="模板编码" prop="templateCode">
          <el-input v-model="templateForm.templateCode" placeholder="租户内唯一，如 ORDER_SHIPPED" />
        </el-form-item>
        <el-form-item label="默认通道" prop="channel">
          <el-select v-model="templateForm.channel" style="width: 100%">
            <el-option v-for="(name, key) in NOTIFY_CHANNEL_NAMES" :key="key" :label="name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="templateForm.title" placeholder="可含 ${key} 占位符" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="正文模板" prop="body">
          <el-input
            v-model="templateForm.body"
            type="textarea"
            :rows="4"
            placeholder="如：您好 ${name}，您的订单已发出"
          />
        </el-form-item>
        <el-form-item label="参数契约">
          <el-input
            v-model="templateForm.paramsSchema"
            type="textarea"
            :rows="2"
            placeholder='JSON 文本，如 {"name":"收件人姓名"}（仅管理端提示）'
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="templateForm.status">
            <el-radio value="ENABLED">启用</el-radio>
            <el-radio value="DISABLED">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateSaving" @click="submitTemplate">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 统一通知脚本
 * - 模板 CRUD（分页 pageNum/pageSize）
 * - 投递留痕只读查询
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  createNotifyTemplate,
  deleteNotifyTemplate,
  listNotifyRecords,
  listNotifyTemplates,
  NOTIFY_CHANNEL_NAMES,
  NOTIFY_STATUS_META,
  updateNotifyTemplate,
  type NotifyRecordQuery,
  type NotifyTemplateQuery,
} from '@/api/notify'
import type {
  NotifyRequestRecord,
  NotifyTemplate,
  NotifyTemplateCreatePayload,
  NotifyTemplateUpdatePayload,
} from '@/types'

/** 当前页签 */
const activeTab = ref('templates')

// ==================== 模板 ====================
const templateLoading = ref(false)
const templateSaving = ref(false)
const templates = ref<NotifyTemplate[]>([])
const templateTotal = ref(0)
const templateQuery = reactive<NotifyTemplateQuery>({ pageNum: 1, pageSize: 10 })

/** 模板弹窗 */
const templateDialogVisible = ref(false)
const templateFormRef = ref<FormInstance>()
const templateForm = reactive<NotifyTemplateCreatePayload & { id?: number }>({
  id: undefined,
  templateCode: '',
  channel: 'INBOX',
  title: '',
  body: '',
  paramsSchema: '',
  status: 'ENABLED',
})
/** 模板校验规则（与后端 CreateNotifyTemplateRequest 对齐） */
const templateRules: FormRules = {
  templateCode: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  channel: [{ required: true, message: '请选择默认通道', trigger: 'change' }],
  body: [{ required: true, message: '请输入正文模板', trigger: 'blur' }],
}

// ==================== 投递留痕 ====================
const recordLoading = ref(false)
const records = ref<NotifyRequestRecord[]>([])
const recordTotal = ref(0)
const recordQuery = reactive<NotifyRecordQuery>({ pageNum: 1, pageSize: 10 })

/** 拉取模板列表 */
async function fetchTemplates(): Promise<void> {
  templateLoading.value = true
  try {
    const result = await listNotifyTemplates(templateQuery)
    templates.value = result.list || []
    templateTotal.value = result.total || 0
  } catch (error) {
    showError(error, '加载通知模板失败')
  } finally {
    templateLoading.value = false
  }
}

/** 查询模板（重置到第一页） */
function searchTemplates(): void {
  templateQuery.pageNum = 1
  fetchTemplates()
}

/** 模板分页变化 */
function onTemplatePageChange(page: number, size: number): void {
  templateQuery.pageNum = page
  templateQuery.pageSize = size
  fetchTemplates()
}

/** 拉取投递留痕 */
async function fetchRecords(): Promise<void> {
  recordLoading.value = true
  try {
    const result = await listNotifyRecords(recordQuery)
    records.value = result.list || []
    recordTotal.value = result.total || 0
  } catch (error) {
    showError(error, '加载投递留痕失败')
  } finally {
    recordLoading.value = false
  }
}

/** 查询留痕（重置到第一页） */
function searchRecords(): void {
  recordQuery.pageNum = 1
  fetchRecords()
}

/** 留痕分页变化 */
function onRecordPageChange(page: number, size: number): void {
  recordQuery.pageNum = page
  recordQuery.pageSize = size
  fetchRecords()
}

/** 页签切换按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'records' && records.value.length === 0) fetchRecords()
  if (tab === 'templates' && templates.value.length === 0) fetchTemplates()
}

/** 打开模板弹窗（无参为新增） */
function openTemplateDialog(row?: NotifyTemplate): void {
  Object.assign(templateForm, {
    id: row?.id,
    templateCode: row?.templateCode ?? '',
    channel: row?.channel ?? 'INBOX',
    title: row?.title ?? '',
    body: row?.body ?? '',
    paramsSchema: row?.paramsSchema ?? '',
    status: row?.status ?? 'ENABLED',
  })
  templateDialogVisible.value = true
}

/** 提交模板 */
async function submitTemplate(): Promise<void> {
  if (!templateFormRef.value) return
  try {
    await templateFormRef.value.validate()
  } catch {
    return
  }
  templateSaving.value = true
  try {
    if (templateForm.id) {
      const payload: NotifyTemplateUpdatePayload = {
        templateCode: templateForm.templateCode,
        channel: templateForm.channel,
        title: templateForm.title,
        body: templateForm.body,
        paramsSchema: templateForm.paramsSchema,
        status: templateForm.status,
      }
      await updateNotifyTemplate(templateForm.id, payload)
      ElMessage.success('模板已更新')
    } else {
      await createNotifyTemplate({ ...templateForm })
      ElMessage.success('模板已创建')
    }
    templateDialogVisible.value = false
    fetchTemplates()
  } catch (error) {
    showError(error, '保存通知模板失败')
  } finally {
    templateSaving.value = false
  }
}

/** 删除模板 */
async function handleDeleteTemplate(row: NotifyTemplate): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除模板「${row.templateCode}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteNotifyTemplate(row.id)
    ElMessage.success('模板已删除')
    fetchTemplates()
  } catch (error) {
    showError(error, '删除通知模板失败')
  }
}

onMounted(fetchTemplates)
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
</style>
