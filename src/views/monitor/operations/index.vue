<!--
  运维健康
  ------------------------------------------------------------------
  消费 /api/v2/operations（apex-system OperationsRouter）：
  - 健康报告：实时聚合的健康状态与分组条目（含建议）
  - 快照：现场采集、按时间/状态分页查询（⚠️ page/size 口径）
  - 趋势：取样点统计、起止状态与是否改善展示
  - 导出：同步导出 CSV 或提交异步导出任务并按 ID 查询/下载
  注意：后端不存在 GET /api/v2/operations 根端点，也无导出任务列表端点。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>运维健康</span>
        <div class="header-actions">
          <el-tag v-if="report" :type="statusMeta(report.overallStatus).tag" size="small">
            {{ statusMeta(report.overallStatus).label }}
          </el-tag>
          <el-button :icon="Refresh" :loading="reportLoading" @click="loadReport">刷新报告</el-button>
        </div>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 健康报告 -->
      <el-tab-pane label="健康报告" name="report">
        <el-alert
          v-if="report"
          :title="report.summary || '无摘要'"
          :type="statusMeta(report.overallStatus).tag === 'success' ? 'success' : 'warning'"
          :closable="false"
          style="margin-bottom: 12px"
        />
        <div v-if="report?.counts" class="count-cards">
          <div v-for="item in countItems" :key="item.key" class="count-card">
            <div class="count-value" :class="item.key">{{ item.value }}</div>
            <div class="count-label">{{ item.label }}</div>
          </div>
        </div>

        <div v-loading="reportLoading">
          <el-collapse v-if="report?.groups?.length" v-model="expandedGroups">
            <el-collapse-item v-for="group in report.groups" :key="group.category" :name="group.category">
              <template #title>
                <el-tag :type="statusMeta(group.status).tag" size="small" style="margin-right: 8px">
                  {{ statusMeta(group.status).label }}
                </el-tag>
                <span>{{ group.title }}</span>
                <span class="group-count">（{{ group.items?.length ?? 0 }} 项）</span>
              </template>
              <el-table :data="group.items || []" border size="small">
                <el-table-column prop="name" label="检查项" min-width="180" show-overflow-tooltip />
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="statusMeta(row.status).tag" size="small">
                      {{ statusMeta(row.status).label }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="service" label="服务" width="130" show-overflow-tooltip />
                <el-table-column prop="evidence" label="依据" min-width="200" show-overflow-tooltip />
                <el-table-column prop="recommendation" label="建议" min-width="200" show-overflow-tooltip />
              </el-table>
            </el-collapse-item>
          </el-collapse>
          <el-empty v-else description="暂无健康报告数据" :image-size="80" />
        </div>
      </el-tab-pane>

      <!-- 快照 -->
      <el-tab-pane label="健康快照" name="snapshot">
        <div class="tab-toolbar">
          <el-button type="primary" :loading="capturing" @click="handleCapture">采集快照</el-button>
          <el-date-picker
            v-model="snapshotRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 360px"
          />
          <el-select v-model="snapshotStatus" placeholder="状态" clearable style="width: 130px">
            <el-option label="正常" value="UP" />
            <el-option label="降级" value="DEGRADED" />
            <el-option label="异常" value="DOWN" />
            <el-option label="未知" value="UNKNOWN" />
          </el-select>
          <el-button type="primary" @click="searchSnapshots">查询</el-button>
        </div>
        <el-table v-loading="snapshotLoading" :data="snapshots" border stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="总体状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusMeta(row.overallStatus).tag" size="small">
                {{ statusMeta(row.overallStatus).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="摘要" min-width="200" show-overflow-tooltip />
          <el-table-column prop="captureSource" label="采集来源" width="110" />
          <el-table-column label="正常/降级/异常" width="150">
            <template #default="{ row }">
              {{ row.upCount ?? 0 }} / {{ row.degradedCount ?? 0 }} / {{ row.downCount ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="ruleVersion" label="规则版本" width="110" />
          <el-table-column prop="generatedAt" label="生成时间" width="180" />
        </el-table>
        <Pagination :total="snapshotTotal" @change="onSnapshotPageChange" />
      </el-tab-pane>

      <!-- 趋势 -->
      <el-tab-pane label="健康趋势" name="trend">
        <div class="tab-toolbar">
          <el-date-picker
            v-model="trendRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 360px"
          />
          <el-button type="primary" :loading="trendLoading" @click="loadTrend">查询</el-button>
        </div>
        <template v-if="trend">
          <el-descriptions :column="4" border style="margin-bottom: 12px">
            <el-descriptions-item label="取样点">{{ trend.sampleCount }}</el-descriptions-item>
            <el-descriptions-item label="起始状态">{{ trend.startStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束状态">{{ trend.endStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="趋势">
              <el-tag :type="trend.improving ? 'success' : 'warning'" size="small">
                {{ trend.improving ? '改善' : '未改善' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <el-table :data="trend.points || []" border stripe max-height="420">
            <el-table-column prop="generatedAt" label="采样时间" width="180" />
            <el-table-column label="总体状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusMeta(row.overallStatus).tag" size="small">
                  {{ statusMeta(row.overallStatus).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="upCount" label="正常" width="90" />
            <el-table-column prop="degradedCount" label="降级" width="90" />
            <el-table-column prop="downCount" label="异常" width="90" />
            <el-table-column prop="unknownCount" label="未知" width="90" />
            <el-table-column prop="notConfiguredCount" label="未配置" width="100" />
          </el-table>
        </template>
        <el-empty v-else description="请选择时间范围后查询" :image-size="80" />
      </el-tab-pane>

      <!-- 导出 -->
      <el-tab-pane label="快照导出" name="export">
        <el-alert
          title="同步导出上限 5000 行；异步任务可提交后凭任务 ID 查询与下载（后端无任务列表端点）"
          type="info"
          :closable="false"
          style="margin-bottom: 12px"
        />
        <el-form :inline="true">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="exportFrom"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="from"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="exportTo"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="to"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="exportStatus" placeholder="全部" clearable style="width: 130px">
              <el-option label="正常" value="UP" />
              <el-option label="降级" value="DEGRADED" />
              <el-option label="异常" value="DOWN" />
              <el-option label="未知" value="UNKNOWN" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :loading="exporting" @click="handleSyncExport">同步导出 CSV</el-button>
            <el-button type="primary" :loading="taskCreating" @click="handleCreateTask">提交异步导出</el-button>
          </el-form-item>
        </el-form>

        <el-divider content-position="left">异步任务</el-divider>
        <el-form :inline="true">
          <el-form-item label="任务 ID">
            <el-input v-model="taskIdInput" placeholder="输入导出任务 ID" style="width: 180px" />
          </el-form-item>
          <el-form-item>
            <el-button @click="handleQueryTask">查询任务</el-button>
            <el-button
              type="success"
              :disabled="!exportTask || exportTask.status !== 'COMPLETED'"
              @click="handleDownloadTask"
            >下载结果</el-button>
          </el-form-item>
        </el-form>
        <el-descriptions v-if="exportTask" :column="3" border>
          <el-descriptions-item label="任务 ID">{{ exportTask.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ exportTask.status }}</el-descriptions-item>
          <el-descriptions-item label="行数">{{ exportTask.rowCount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ exportTask.fileName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ exportTask.completedAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="错误">{{ exportTask.lastError || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <!-- 租户摘要 -->
      <el-tab-pane label="租户摘要" name="tenant" lazy>
        <div class="tab-toolbar">
          <el-button type="primary" :loading="tenantSummaryLoading" @click="loadTenantSummary">刷新</el-button>
        </div>
        <template v-if="tenantSummary">
          <el-descriptions :column="4" border>
            <el-descriptions-item label="当前结论">
              <el-tag :type="statusMeta(tenantSummary.overallStatus).tag">
                {{ statusMeta(tenantSummary.overallStatus).label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="快照时间">{{ tenantSummary.snapshotAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="口径">{{ tenantSummary.scope || '-' }}</el-descriptions-item>
            <el-descriptions-item label="正常/降级/异常/未知">
              {{
                tenantSummary.riskCounts
                  ? `${tenantSummary.riskCounts.healthy}/${tenantSummary.riskCounts.degraded}/${tenantSummary.riskCounts.down}/${tenantSummary.riskCounts.unknown}`
                  : '-'
              }}
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="tenantSummary.scopeNotice"
            :title="tenantSummary.scopeNotice"
            type="warning"
            :closable="false"
            style="margin-top: 12px"
          />
          <el-alert
            v-if="tenantSummary.summary"
            :title="tenantSummary.summary"
            type="info"
            :closable="false"
            style="margin-top: 12px"
          />
          <el-table
            v-if="tenantSummary.recentTrend?.length"
            :data="tenantSummary.recentTrend"
            border
            stripe
            max-height="320"
            style="margin-top: 12px"
          >
            <el-table-column prop="generatedAt" label="采样时间" width="200" />
            <el-table-column label="总体状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusMeta(row.overallStatus).tag" size="small">
                  {{ statusMeta(row.overallStatus).label }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-empty v-else description="点击刷新获取租户健康摘要" :image-size="80" />
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 运维健康脚本
 * - 报告/快照/趋势/导出四块；除现场采集快照为写操作外，其余为查询或导出
 * - 快照分页使用后端 page/size 口径
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  captureHealthSnapshot,
  createHealthExportTask,
  downloadHealthExportTask,
  exportHealthSnapshots,
  getHealthExportTask,
  getHealthReport,
  getHealthTrend,
  getTenantHealthSummary,
  HEALTH_STATUS_META,
  listHealthSnapshots,
  type HealthSnapshotQuery,
} from '@/api/operations'
import type { HealthExportTask, HealthReport, HealthSnapshot, HealthTrend, TenantHealthSummary } from '@/types'

const activeTab = ref('report')

/** 状态元信息（未知状态回退为 info） */
function statusMeta(status?: string): { label: string; tag: 'success' | 'warning' | 'danger' | 'info' } {
  return HEALTH_STATUS_META[status || ''] || { label: status || '-', tag: 'info' }
}

// ==================== 报告 ====================
const report = ref<HealthReport | null>(null)
const reportLoading = ref(false)
const expandedGroups = ref<string[]>([])

/** 计数卡片 */
const countItems = computed(() => {
  const counts = report.value?.counts
  if (!counts) return []
  return [
    { key: 'up', label: '正常', value: counts.up },
    { key: 'degraded', label: '降级', value: counts.degraded },
    { key: 'down', label: '异常', value: counts.down },
    { key: 'unknown', label: '未知', value: counts.unknown },
    { key: 'notConfigured', label: '未配置', value: counts.notConfigured },
  ]
})

/** 加载健康报告 */
async function loadReport(): Promise<void> {
  reportLoading.value = true
  try {
    report.value = await getHealthReport()
  } catch (error) {
    showError(error, '加载健康报告失败')
  } finally {
    reportLoading.value = false
  }
}

// ==================== 快照 ====================
const snapshotLoading = ref(false)
const snapshots = ref<HealthSnapshot[]>([])
const snapshotTotal = ref(0)
const snapshotPage = reactive({ page: 1, size: 10 })
const snapshotRange = ref<string[]>([])
const snapshotStatus = ref<string>()
const capturing = ref(false)

/** 构建快照查询参数 */
function snapshotQuery(): HealthSnapshotQuery {
  return {
    from: snapshotRange.value?.[0],
    to: snapshotRange.value?.[1],
    status: snapshotStatus.value,
    page: snapshotPage.page,
    size: snapshotPage.size,
  }
}

/** 加载快照当前页 */
async function loadSnapshots(): Promise<void> {
  snapshotLoading.value = true
  try {
    const result = await listHealthSnapshots(snapshotQuery())
    snapshots.value = result.list || []
    snapshotTotal.value = result.total
  } catch (error) {
    showError(error, '加载健康快照失败')
  } finally {
    snapshotLoading.value = false
  }
}

/** 查询快照（重置第一页） */
function searchSnapshots(): void {
  snapshotPage.page = 1
  loadSnapshots()
}

/** 快照分页变化 */
function onSnapshotPageChange(page: number, size: number): void {
  snapshotPage.page = page
  snapshotPage.size = size
  loadSnapshots()
}

/** 现场采集快照 */
async function handleCapture(): Promise<void> {
  capturing.value = true
  try {
    await captureHealthSnapshot()
    ElMessage.success('快照已采集')
    searchSnapshots()
  } catch (error) {
    showError(error, '采集快照失败')
  } finally {
    capturing.value = false
  }
}

// ==================== 趋势 ====================
const trend = ref<HealthTrend | null>(null)
const trendLoading = ref(false)
const trendRange = ref<string[]>([])

/** 加载趋势 */
async function loadTrend(): Promise<void> {
  trendLoading.value = true
  try {
    trend.value = await getHealthTrend({
      from: trendRange.value?.[0],
      to: trendRange.value?.[1],
      limit: 200,
    })
  } catch (error) {
    showError(error, '加载健康趋势失败')
  } finally {
    trendLoading.value = false
  }
}

// ==================== 导出 ====================
const exportFrom = ref('')
const exportTo = ref('')
const exportStatus = ref<string>()
const exporting = ref(false)
const taskCreating = ref(false)
const taskIdInput = ref('')
const exportTask = ref<HealthExportTask | null>(null)

/** 触发浏览器下载 */
function downloadBlob(blob: Blob, fallbackName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fallbackName
  link.click()
  URL.revokeObjectURL(url)
}

/** 同步导出 CSV */
async function handleSyncExport(): Promise<void> {
  exporting.value = true
  try {
    const blob = await exportHealthSnapshots({
      from: exportFrom.value || undefined,
      to: exportTo.value || undefined,
      status: exportStatus.value,
    })
    downloadBlob(blob, `health-snapshots-${Date.now()}.csv`)
    ElMessage.success('导出完成')
  } catch (error) {
    showError(error, '导出失败')
  } finally {
    exporting.value = false
  }
}

/** 提交异步导出任务 */
async function handleCreateTask(): Promise<void> {
  taskCreating.value = true
  try {
    const task = await createHealthExportTask({
      from: exportFrom.value || undefined,
      to: exportTo.value || undefined,
      status: exportStatus.value,
    })
    exportTask.value = task
    taskIdInput.value = String(task.id)
    ElMessage.success(`导出任务已提交（ID ${task.id}）`)
  } catch (error) {
    showError(error, '提交导出任务失败')
  } finally {
    taskCreating.value = false
  }
}

/** 按 ID 查询导出任务 */
async function handleQueryTask(): Promise<void> {
  const id = Number(taskIdInput.value)
  if (!Number.isInteger(id) || id <= 0) {
    ElMessage.warning('请输入有效的任务 ID')
    return
  }
  try {
    exportTask.value = await getHealthExportTask(id)
  } catch (error) {
    showError(error, '查询导出任务失败')
  }
}

/** 下载异步导出结果 */
async function handleDownloadTask(): Promise<void> {
  if (!exportTask.value) return
  try {
    const blob = await downloadHealthExportTask(exportTask.value.id)
    downloadBlob(blob, exportTask.value.fileName || `health-export-${exportTask.value.id}.csv`)
  } catch (error) {
    showError(error, '下载失败')
  }
}

// ==================== 租户摘要 ====================
const tenantSummary = ref<TenantHealthSummary | null>(null)
const tenantSummaryLoading = ref(false)

/** 加载租户侧健康摘要（当前结论 + 风险计数 + 近端趋势，不下发逐项证据） */
async function loadTenantSummary(): Promise<void> {
  tenantSummaryLoading.value = true
  try {
    tenantSummary.value = await getTenantHealthSummary()
  } catch (error) {
    showError(error, '加载租户健康摘要失败')
  } finally {
    tenantSummaryLoading.value = false
  }
}

/** Tab 切换按需加载 */
function handleTabChange(tab: string | number): void {
  if (tab === 'snapshot' && snapshots.value.length === 0) loadSnapshots()
  if (tab === 'trend' && !trend.value) loadTrend()
  if (tab === 'tenant' && !tenantSummary.value) loadTenantSummary()
}

onMounted(loadReport)
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.count-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.count-card {
  flex: 1;
  padding: 12px;
  text-align: center;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;

  .count-value {
    font-size: 22px;
    font-weight: 600;

    &.up {
      color: var(--el-color-success);
    }

    &.degraded {
      color: var(--el-color-warning);
    }

    &.down {
      color: var(--el-color-danger);
    }

    &.unknown,
    &.notConfigured {
      color: var(--el-text-color-secondary);
    }
  }

  .count-label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.tab-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.group-count {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
