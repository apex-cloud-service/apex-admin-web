<!--
  开放应用管理（方案批次 D2）
  ------------------------------------------------------------------
  契约：
  - 管理面 /api/v1/open-apps（apex-system OpenAppAdminRouter）
      GET  /                        - 分页查询（page 从 0 开始，返回数组，无 total）
      POST /                        - 创建（响应含一次性明文 clientSecret）
      PUT  /{clientId}              - 更新
      POST /{clientId}/reset-secret - 重置密钥（响应含一次性明文 clientSecret）
  - scope 目录 /api/v1/open-apps/scopes（apex-system，与创建校验同源注册表）
  - 存量迁移 /admin-api/v1/open-apps/migration/export|import（导出含哈希不含明文，
      导入逐条汇总成功与失败，单条失败不影响其余）
  权限要求（按钮 v-permission）：open:app:manage。
  明文密钥只在创建/重置响应出现一次，页面仅内存展示，不写入本地存储。
  主体用户（subjectUserId）须为同租户启用用户，文件/工作流开放写 scope 必填。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>开放应用</span>
        <div class="header-actions">
          <el-button :icon="Download" @click="handleExportMigration" v-permission="'open:app:manage'">
            导出配置
          </el-button>
          <el-button @click="triggerImportFile" v-permission="'open:app:manage'">导入配置</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate" v-permission="'open:app:manage'">
            注册应用
          </el-button>
        </div>
      </div>
    </template>

    <input
      ref="importFileInput"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="handleImportFile"
    />

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="clientId" label="客户端 ID" min-width="180">
        <template #default="{ row }"><el-tag>{{ row.clientId }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="appName" label="应用名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="主体用户" width="130">
        <template #default="{ row }">
          {{ subjectUserLabel(row.subjectUserId) }}
        </template>
      </el-table-column>
      <el-table-column label="scope" min-width="220">
        <template #default="{ row }">
          <el-tag v-for="scope in parseScopes(row.scopes)" :key="scope" size="small" type="info" class="scope-tag">
            {{ scope }}
          </el-tag>
          <span v-if="parseScopes(row.scopes).length === 0">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="rateLimitTier" label="限流档" width="110" />
      <el-table-column prop="contact" label="联系人" width="150" show-overflow-tooltip />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'DISABLED' ? 'info' : 'success'" size="small">
            {{ row.status === 'DISABLED' ? '已停用' : '启用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)" v-permission="'open:app:manage'">编辑</el-button>
          <el-button link type="warning" @click="handleResetSecret(row)" v-permission="'open:app:manage'">
            重置密钥
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-button :disabled="page === 0" @click="prevPage">上一页</el-button>
      <span class="pager-text">第 {{ page + 1 }} 页</span>
      <el-button :disabled="list.length < size" @click="nextPage">下一页</el-button>
    </div>

    <!-- 注册/编辑 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑开放应用' : '注册开放应用'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="客户端 ID" prop="clientId">
          <el-input v-model="form.clientId" :disabled="isEdit" placeholder="全局唯一，如 partner-data-platform" />
        </el-form-item>
        <el-form-item label="应用名称" prop="appName">
          <el-input v-model="form.appName" placeholder="开放应用名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="scope">
          <el-select
            v-model="form.scopes"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或直接输入 scope"
            style="width: 100%"
          >
            <el-option
              v-for="item in scopes"
              :key="item.scope"
              :label="`${item.scope}（${item.permission}）`"
              :value="item.scope"
            />
          </el-select>
          <div v-if="scopeCatalogUnavailable" class="scope-hint">
            scope 目录接口未返回数据，已按开放 scope 命名约定直接输入（后端仍会做合法性校验）。
          </div>
        </el-form-item>
        <el-form-item label="回调地址">
          <el-select
            v-model="form.redirectUris"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入回调 URL 后回车"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="限流档">
          <el-input v-model="form.rateLimitTier" placeholder="如 default / standard" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" placeholder="技术联系人邮箱" />
        </el-form-item>
        <el-form-item label="主体用户">
          <el-select
            v-model="form.subjectUserId"
            filterable
            clearable
            placeholder="选择主体用户（文件/工作流开放写必填）"
            style="width: 100%"
          >
            <el-option
              v-for="user in subjectUsers"
              :key="user.id"
              :label="`${user.nickname}（${user.id}）`"
              :value="Number(user.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="ENABLED">启用</el-radio>
            <el-radio value="DISABLED">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 一次性明文密钥 -->
    <el-dialog v-model="secretVisible" title="客户端密钥（仅显示一次）" width="520px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="请立即复制保存"
        description="关闭本对话框后无法再次查看；丢失只能重置密钥。"
        style="margin-bottom: 12px"
      />
      <el-input :model-value="secretValue" readonly>
        <template #append>
          <el-button @click="copySecret">复制</el-button>
        </template>
      </el-input>
    </el-dialog>

    <!-- 迁移导入结果 -->
    <el-dialog v-model="importResultVisible" title="迁移导入结果" width="560px">
      <el-result
        :icon="importSummary?.failures.length ? 'warning' : 'success'"
        :title="`共 ${importSummary?.total ?? 0} 条，成功 ${importSummary?.succeeded ?? 0} 条`"
      >
        <template #sub-title>
          <div v-if="importSummary?.failures.length" class="failure-list">
            <div v-for="item in importSummary.failures" :key="item.importId" class="failure-item">
              {{ item.importId }}：{{ item.error }}
            </div>
          </div>
          <span v-else>全部导入成功</span>
        </template>
      </el-result>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 开放应用管理脚本
 * - 列表分页为 page/size 且后端返回数组（无 total），以「本页满页」判断下一页
 * - 创建/重置返回的一次性 clientSecret 仅内存展示
 * - 主体用户下拉取后台用户列表；迁移导出下载 JSON、导入解析后逐条上行
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  createOpenApp,
  exportOpenAppMigration,
  importOpenAppMigration,
  listOpenApps,
  listOpenAppScopes,
  resetOpenAppSecret,
  updateOpenApp,
} from '@/api/open-app'
import { listUsers } from '@/api/user'
import type {
  AdminUser,
  OpenApp,
  OpenAppImportItem,
  OpenAppMigrationSummary,
  OpenAppPayload,
  OpenAppScope,
} from '@/types'

/** 列表加载中 */
const loading = ref(false)
/** 保存中 */
const saving = ref(false)
/** 当前页（后端 page 从 0 开始） */
const page = ref(0)
/** 每页条数 */
const size = ref(20)
/** 应用列表 */
const list = ref<OpenApp[]>([])
/** scope 目录 */
const scopes = ref<OpenAppScope[]>([])
/** scope 目录不可用（接口失败或空）——此时允许手输 scope */
const scopeCatalogUnavailable = ref(false)
/** 主体用户候选（同租户后台用户） */
const subjectUsers = ref<AdminUser[]>([])

/** 弹窗状态 */
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
/** 表单 */
const form = reactive<OpenAppPayload>({
  clientId: '',
  appName: '',
  description: '',
  redirectUris: [],
  scopes: [],
  rateLimitTier: 'default',
  contact: '',
  status: 'ENABLED',
  subjectUserId: undefined,
})
/** 校验规则 */
const rules: FormRules = {
  clientId: [{ required: true, message: '请输入客户端 ID', trigger: 'blur' }],
  appName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
}

/** 一次性密钥弹窗 */
const secretVisible = ref(false)
const secretValue = ref('')

/** 迁移导入文件选择器与结果弹窗 */
const importFileInput = ref<HTMLInputElement>()
const importResultVisible = ref(false)
const importSummary = ref<OpenAppMigrationSummary>()

/**
 * 解析 scope（后端列表接口可能返回 JSON 文本或数组）。
 * @param value scope 字段
 */
function parseScopes(value?: string[] | string): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 主体用户展示文案（id 映射昵称，未匹配显示数字 ID）。
 * @param userId 主体用户ID
 */
function subjectUserLabel(userId?: number): string {
  if (!userId) return '-'
  const user = subjectUsers.value.find((item) => Number(item.id) === userId)
  return user ? user.nickname : String(userId)
}

/** 加载应用列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listOpenApps({ page: page.value, size: size.value })) || []
  } catch (error) {
    showError(error, '加载开放应用失败')
  } finally {
    loading.value = false
  }
}

/** 加载 scope 目录（失败不阻塞注册，允许手输 scope） */
async function fetchScopes(): Promise<void> {
  try {
    scopes.value = (await listOpenAppScopes()) || []
    scopeCatalogUnavailable.value = scopes.value.length === 0
  } catch {
    scopes.value = []
    scopeCatalogUnavailable.value = true
  }
}

/** 上一页 */
function prevPage(): void {
  if (page.value === 0) return
  page.value -= 1
  fetchList()
}

/** 下一页（后端无 total，以本页是否满页判断） */
function nextPage(): void {
  if (list.value.length < size.value) return
  page.value += 1
  fetchList()
}

/** 打开注册弹窗 */
function openCreate(): void {
  isEdit.value = false
  Object.assign(form, {
    clientId: '',
    appName: '',
    description: '',
    redirectUris: [],
    scopes: [],
    rateLimitTier: 'default',
    contact: '',
    status: 'ENABLED',
    subjectUserId: undefined,
  })
  dialogVisible.value = true
}

/** 打开编辑弹窗 */
function openEdit(row: OpenApp): void {
  isEdit.value = true
  Object.assign(form, {
    clientId: row.clientId,
    appName: row.appName,
    description: row.description ?? '',
    redirectUris: row.redirectUris ?? [],
    scopes: parseScopes(row.scopes),
    rateLimitTier: row.rateLimitTier ?? 'default',
    contact: row.contact ?? '',
    status: row.status ?? 'ENABLED',
    subjectUserId: row.subjectUserId,
  })
  dialogVisible.value = true
}

/** 提交注册/更新 */
async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (isEdit.value && form.clientId) {
      await updateOpenApp(form.clientId, { ...form })
      ElMessage.success('应用已更新')
    } else {
      const created = await createOpenApp({ ...form })
      ElMessage.success('应用已注册')
      if (created?.clientSecret) showSecret(created.clientSecret)
    }
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    showError(error, '保存开放应用失败')
  } finally {
    saving.value = false
  }
}

/** 重置密钥（危险操作，二次确认） */
async function handleResetSecret(row: OpenApp): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认重置应用「${row.appName || row.clientId}」的客户端密钥？旧密钥将立即失效。`,
      '危险操作确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const result = await resetOpenAppSecret(row.clientId)
    if (result?.clientSecret) showSecret(result.clientSecret)
    else ElMessage.success('密钥已重置')
  } catch (error) {
    showError(error, '重置密钥失败')
  }
}

/** 展示一次性明文密钥 */
function showSecret(secret: string): void {
  secretValue.value = secret
  secretVisible.value = true
}

/** 复制密钥到剪贴板 */
async function copySecret(): Promise<void> {
  try {
    await navigator.clipboard.writeText(secretValue.value)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择文本')
  }
}

/** 加载主体用户候选（前 100 个，失败不阻断页面） */
async function fetchSubjectUsers(): Promise<void> {
  try {
    const result = await listUsers({ page: 1, size: 100 })
    subjectUsers.value = result.list || []
  } catch {
    subjectUsers.value = []
  }
}

/** 导出迁移配置（含密钥哈希，JSON 文件下载） */
async function handleExportMigration(): Promise<void> {
  try {
    const items = (await exportOpenAppMigration()) || []
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `open-apps-migration-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已导出 ${items.length} 条配置`)
  } catch (error) {
    showError(error, '导出迁移配置失败')
  }
}

/** 触发迁移导入文件选择 */
function triggerImportFile(): void {
  importFileInput.value?.click()
}

/**
 * 解析所选 JSON 文件并提交迁移导入
 * @param event 文件选择事件
 */
async function handleImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  let items: OpenAppImportItem[]
  try {
    const parsed = JSON.parse(await file.text())
    if (!Array.isArray(parsed) || parsed.length === 0) {
      ElMessage.warning('导入文件须为非空 JSON 数组')
      return
    }
    items = parsed
  } catch {
    ElMessage.error('导入文件不是合法的 JSON')
    return
  }

  try {
    await ElMessageBox.confirm(`确认导入 ${items.length} 条开放应用配置？`, '提示', { type: 'warning' })
  } catch {
    return
  }

  try {
    importSummary.value = await importOpenAppMigration(items)
    importResultVisible.value = true
    fetchList()
  } catch (error) {
    showError(error, '迁移导入失败')
  }
}

onMounted(async () => {
  await Promise.all([fetchList(), fetchScopes(), fetchSubjectUsers()])
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.scope-tag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.failure-list {
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  font-size: 13px;
  color: var(--el-color-danger);
}

.failure-item {
  padding: 2px 0;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.pager-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.scope-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
