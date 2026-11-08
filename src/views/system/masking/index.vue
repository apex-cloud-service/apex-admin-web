<!--
  数据脱敏页面
  ------------------------------------------------------------------
  消费脱敏服务（apex-masking-service）的两个只读/试算接口：
  - 规则查看：当前租户授权的规则版本与字段脱敏类型（规则为启动配置，无 CRUD）
  - 脱敏试算：选择版本并粘贴 JSON 文档数组，调用批量脱敏接口预览脱敏结果
  ⚠️ 生产网关当前未声明 masking 路由，本页仅开发环境可达（见 AGENTS.md 排障表）。
-->
<template>
  <div class="masking-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>数据脱敏</span>
          <el-tag type="info" size="small">规则为服务启动配置，只读</el-tag>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 规则查看 -->
        <el-tab-pane label="脱敏规则" name="rules">
          <el-table v-loading="rulesLoading" :data="ruleRows" border stripe>
            <el-table-column prop="version" label="规则版本" width="140" />
            <el-table-column prop="fieldPath" label="字段路径" min-width="220" />
            <el-table-column label="脱敏类型" width="160">
              <template #default="{ row }">
                <el-tag size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="自定义规则" min-width="200">
              <template #default="{ row }">{{ row.customRule || '-' }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 脱敏试算 -->
        <el-tab-pane label="脱敏试算" name="trial">
          <el-alert
            title="粘贴 JSON 文档数组（1~100 个），服务端按所选版本脱敏后原结构返回；请求体上限 256KB"
            type="info"
            :closable="false"
            style="margin-bottom: 12px"
          />
          <el-form :inline="true" class="trial-form">
            <el-form-item label="规则版本">
              <el-select v-model="trialVersion" placeholder="选择规则版本" style="width: 180px">
                <el-option v-for="version in versions" :key="version" :label="version" :value="version" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="trialLoading" @click="handleTrial">
                执行脱敏
              </el-button>
            </el-form-item>
          </el-form>
          <el-input
            v-model="trialInput"
            type="textarea"
            :rows="10"
            placeholder='[{"name": "张三", "phone": "13800138000"}]'
          />
          <div v-if="trialOutput" class="trial-output">
            <div class="output-title">脱敏结果（版本 {{ trialVersion }}）</div>
            <pre>{{ trialOutput }}</pre>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { showError } from '@/utils/request'
import { listMaskingRules, maskBatch } from '@/api/masking'
import type { MaskingRule } from '@/types'

/** 规则表格行（版本 + 字段路径展开） */
interface MaskingRuleRow {
  version: string
  fieldPath: string
  type: string
  customRule?: string | null
}

const activeTab = ref('rules')

// ==================== 规则查看 ====================
const rulesLoading = ref(false)
/** 版本 → 字段路径 → 规则 的原始映射 */
const ruleMap = ref<Record<string, Record<string, MaskingRule>>>({})

/** 展开为表格行（按版本与字段路径排序） */
const ruleRows = computed<MaskingRuleRow[]>(() => {
  const rows: MaskingRuleRow[] = []
  Object.keys(ruleMap.value)
    .sort()
    .forEach((version) => {
      const fields = ruleMap.value[version] || {}
      Object.keys(fields)
        .sort()
        .forEach((fieldPath) => {
          rows.push({ version, fieldPath, type: fields[fieldPath].type, customRule: fields[fieldPath].customRule })
        })
    })
  return rows
})

/** 已授权版本列表 */
const versions = computed(() => Object.keys(ruleMap.value).sort())

/** 加载脱敏规则 */
async function loadRules(): Promise<void> {
  rulesLoading.value = true
  try {
    ruleMap.value = (await listMaskingRules()) || {}
  } catch (error) {
    showError(error, '加载脱敏规则失败')
  } finally {
    rulesLoading.value = false
  }
}

// ==================== 脱敏试算 ====================
const trialVersion = ref('')
const trialInput = ref('')
const trialOutput = ref('')
const trialLoading = ref(false)

/** 执行脱敏试算（校验 JSON 数组与数量上限） */
async function handleTrial(): Promise<void> {
  if (!trialVersion.value) {
    ElMessage.warning('请选择规则版本')
    return
  }
  let documents: unknown[]
  try {
    const parsed: unknown = JSON.parse(trialInput.value)
    if (!Array.isArray(parsed)) {
      ElMessage.error('输入必须是 JSON 数组')
      return
    }
    if (parsed.length === 0 || parsed.length > 100) {
      ElMessage.error('文档数量须为 1~100 个')
      return
    }
    documents = parsed
  } catch {
    ElMessage.error('输入不是合法的 JSON')
    return
  }
  trialLoading.value = true
  try {
    const result = await maskBatch(trialVersion.value, documents)
    trialOutput.value = JSON.stringify(result.documents, null, 2)
    ElMessage.success('脱敏完成')
  } catch (error) {
    showError(error, '脱敏失败')
  } finally {
    trialLoading.value = false
  }
}

/** 切换到试算 Tab 时默认选中第一个已授权版本 */
function handleTabChange(tab: string | number): void {
  if (tab === 'trial' && !trialVersion.value && versions.value.length > 0) {
    trialVersion.value = versions.value[0]
  }
}

onMounted(() => {
  loadRules()
})
</script>

<style scoped lang="scss">
.masking-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trial-form {
  margin-bottom: 12px;
}

.trial-output {
  margin-top: 16px;

  .output-title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  pre {
    padding: 12px;
    overflow: auto;
    max-height: 400px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    background-color: var(--el-fill-color-light);
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
