<!--
  物联网规则管理（方案批次 E3）
  ------------------------------------------------------------------
  契约（apex-integration IotDeviceRouter，前缀 /integration/v1/iot）：
  - GET  /rules              - 规则分页（keyword/enabled/pageNum/pageSize）
  - POST /rules              - 创建规则（ruleName / conditionJson / actionType / actionConfig / enabled）
  - GET  /rules/{id}         - 规则详情
  - PUT  /rules/{id}/toggle  - 启停（请求体 enabled 为字符串 "true"/"false"）
  权限要求（按钮 v-permission）：iot:rule:manage（新建/启停）。

  规则条件为结构化 JSON（字段/操作符/阈值），不执行自由脚本，无注入面。
  动作：NOTIFY（统一消息门面）/ WEBHOOK（出站）/ EVENT（领域事件）。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>物联网规则</span>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog" v-permission="'iot:rule:manage'">
          新建规则
        </el-button>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="规则名">
        <el-input v-model="query.keyword" placeholder="模糊匹配" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.enabled" placeholder="全部" clearable style="width: 120px">
          <el-option label="已启用" :value="true" />
          <el-option label="已停用" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column prop="ruleName" label="规则名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="动作类型" width="220">
        <template #default="{ row }">{{ RULE_ACTION_NAMES[row.actionType] || row.actionType }}</template>
      </el-table-column>
      <el-table-column prop="conditionJson" label="条件 JSON" min-width="260" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="ruleEnabled(row) ? 'success' : 'info'" size="small">
            {{ ruleEnabled(row) ? '已启用' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="170" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button
            link
            :type="ruleEnabled(row) ? 'warning' : 'success'"
            @click="handleToggle(row)"
            v-permission="'iot:rule:manage'"
          >
            {{ ruleEnabled(row) ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" @change="onPageChange" />
    <el-empty v-if="!loading && list.length === 0" description="暂无规则" />

    <!-- 规则详情 -->
    <el-drawer v-model="detailVisible" :title="`规则详情 · ${detail?.ruleName ?? ''}`" size="520px">
      <el-descriptions v-if="detail" :column="1" border size="small">
        <el-descriptions-item label="规则 ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="规则名称">{{ detail.ruleName }}</el-descriptions-item>
        <el-descriptions-item label="动作类型">
          {{ RULE_ACTION_NAMES[detail.actionType] || detail.actionType }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.enabled ? '已启用' : '已停用' }}</el-descriptions-item>
        <el-descriptions-item label="条件 JSON">
          <pre class="json-block">{{ detail.conditionJson }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="动作配置">
          <pre class="json-block">{{ detail.actionConfig || '-' }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="detail" class="drawer-actions">
        <el-button
          :type="detail.enabled ? 'warning' : 'success'"
          :loading="toggling"
          @click="handleToggle(detail)"
          v-permission="'iot:rule:manage'"
        >
          {{ detail.enabled ? '停用规则' : '启用规则' }}
        </el-button>
      </div>
    </el-drawer>

    <!-- 新建规则 -->
    <el-dialog v-model="createVisible" title="新建规则" width="680px" top="6vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="form.ruleName" placeholder="如：温度超阈值告警" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="条件 JSON" prop="conditionJson">
          <el-input
            v-model="form.conditionJson"
            type="textarea"
            :rows="5"
            placeholder='结构化条件，如 {"field":"temperature","operator":">","threshold":80}'
          />
        </el-form-item>
        <el-form-item label="动作类型" prop="actionType">
          <el-select v-model="form.actionType" style="width: 100%">
            <el-option v-for="(name, key) in RULE_ACTION_NAMES" :key="key" :label="name" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="动作配置">
          <el-input
            v-model="form.actionConfig"
            type="textarea"
            :rows="3"
            placeholder='动作参数 JSON，如 {"templateCode":"DEVICE_ALERT"}'
          />
        </el-form-item>
        <el-form-item label="立即启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 物联网规则管理脚本
 * - 分页列表（keyword/enabled 过滤）
 * - 详情抽屉、创建与启停；JSON 字段提交前做语法校验
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  createIotRule,
  getIotRule,
  listIotRules,
  RULE_ACTION_NAMES,
  toggleIotRule,
  type RuleQuery,
} from '@/api/iot'
import type { IotRule, IotRuleCreatePayload } from '@/types'

/** 列表加载中 */
const loading = ref(false)
/** 保存中 */
const saving = ref(false)
/** 启停中 */
const toggling = ref(false)
/** 规则列表 */
const list = ref<IotRule[]>([])
const total = ref(0)
/** 查询条件 */
const query = reactive<RuleQuery>({ keyword: undefined, enabled: undefined, pageNum: 1, pageSize: 10 })

/** 详情抽屉 */
const detailVisible = ref(false)
const detail = ref<IotRule | null>(null)

/** 新建弹窗 */
const createVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<IotRuleCreatePayload>({
  ruleName: '',
  conditionJson: '',
  actionType: 'NOTIFY',
  actionConfig: '',
  enabled: true,
})

/**
 * 兼容后端 enabled 的布尔/数字两种序列化（实体为 isEnabled()，列表 DTO 为 boolean）。
 * @param rule 规则
 */
function ruleEnabled(rule: IotRule): boolean {
  return Boolean(rule.enabled)
}

/** JSON 语法校验器 */
function jsonValidator(_rule: unknown, value: string, callback: (error?: Error) => void): void {
  try {
    JSON.parse(value)
    callback()
  } catch {
    callback(new Error('必须为合法 JSON'))
  }
}

/** 校验规则 */
const rules: FormRules = {
  ruleName: [
    { required: true, message: '请输入规则名称', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  conditionJson: [
    { required: true, message: '请输入条件 JSON', trigger: 'blur' },
    { validator: jsonValidator, trigger: 'blur' },
  ],
  actionType: [{ required: true, message: '请选择动作类型', trigger: 'change' }],
}

/** 拉取规则列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const result = await listIotRules(query)
    list.value = result.list || []
    total.value = result.total || 0
  } catch (error) {
    showError(error, '加载规则列表失败')
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
  query.keyword = undefined
  query.enabled = undefined
  search()
}

/** 分页变化 */
function onPageChange(page: number, size: number): void {
  query.pageNum = page
  query.pageSize = size
  fetchList()
}

/** 打开详情抽屉（拉取最新详情） */
async function openDetail(row: IotRule): Promise<void> {
  detail.value = row
  detailVisible.value = true
  try {
    detail.value = await getIotRule(row.id)
  } catch (error) {
    showError(error, '查询规则详情失败')
  }
}

/** 打开新建弹窗 */
function openCreateDialog(): void {
  Object.assign(form, {
    ruleName: '',
    conditionJson: '',
    actionType: 'NOTIFY',
    actionConfig: '',
    enabled: true,
  })
  createVisible.value = true
}

/** 提交新建 */
async function submitCreate(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (form.actionConfig) {
    try {
      JSON.parse(form.actionConfig)
    } catch {
      ElMessage.warning('动作配置必须为合法 JSON')
      return
    }
  }
  saving.value = true
  try {
    await createIotRule({ ...form })
    ElMessage.success('规则已创建')
    createVisible.value = false
    search()
  } catch (error) {
    showError(error, '创建规则失败')
  } finally {
    saving.value = false
  }
}

/** 启停规则（列表与详情共用） */
async function handleToggle(rule: IotRule): Promise<void> {
  const target = !ruleEnabled(rule)
  toggling.value = true
  try {
    await toggleIotRule(rule.id, target)
    rule.enabled = target
    if (detail.value?.id === rule.id) detail.value = { ...detail.value, enabled: target }
    ElMessage.success(target ? '规则已启用' : '规则已停用')
  } catch (error) {
    showError(error, '切换规则状态失败')
  } finally {
    toggling.value = false
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

.json-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
}

.drawer-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
