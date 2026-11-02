<!--
  能力目录与能力用量（方案批次 D4）
  ------------------------------------------------------------------
  契约：
  - GET /api/v2/capabilities            - 能力目录（权限码 tenant:read）
  - GET /api/v2/capabilities/subscribed - 当前租户已订阅能力（套餐 features 为空=全量）
  - GET /api/v2/capability-usage        - 按 租户 × 能力 的调用量分页（权限码 capability:usage:read）
  用量口径：基于操作审计日志聚合，只读不计费；时间区间缺省近 7 天、最大 92 天。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>能力运营</span>
        <el-tag type="info" size="small">能力目录 + 订阅状态 + 调用用量</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab">
      <!-- 能力目录 -->
      <el-tab-pane label="能力目录" name="catalog">
        <el-table v-loading="catalogLoading" :data="catalog" border stripe>
          <el-table-column prop="code" label="能力编码" width="200">
            <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="name" label="能力名称" min-width="150" />
          <el-table-column prop="center" label="所属中心" width="150" />
          <el-table-column prop="component" label="承载组件" width="160" />
          <el-table-column label="开放 scope" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="scope in row.openScopes || []" :key="scope" size="small" type="info" class="scope-tag">
                {{ scope }}
              </el-tag>
              <span v-if="!(row.openScopes || []).length">-</span>
            </template>
          </el-table-column>
          <el-table-column label="本租户订阅" width="120">
            <template #default="{ row }">
              <el-tag :type="subscribedCodes.has(row.code) ? 'success' : 'info'" size="small">
                {{ subscribedCodes.has(row.code) ? '已订阅' : '未订阅' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
        </el-table>
        <div class="catalog-hint">
          说明：套餐 features 为空表示全量订阅；未订阅能力会被网关按路由→能力映射拒绝（403「能力未开通」）。
        </div>
      </el-tab-pane>

      <!-- 能力用量 -->
      <el-tab-pane label="调用用量" name="usage">
        <el-form :inline="true" class="query-form">
          <el-form-item label="能力">
            <el-select v-model="usageQuery.capability" placeholder="选择能力" style="width: 220px">
              <el-option
                v-for="item in catalog"
                :key="item.code"
                :label="`${item.name}（${item.code}）`"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="租户">
            <el-input v-model="usageQuery.tenantId" placeholder="缺省当前租户" clearable style="width: 160px" />
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="起始"
              end-placeholder="结束"
              :clearable="true"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="searchUsage">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="usageLoading" :data="usageList" border stripe>
          <el-table-column prop="tenantId" label="租户" width="160" />
          <el-table-column prop="capability" label="能力" min-width="180" />
          <el-table-column prop="callCount" label="调用次数" width="140" />
        </el-table>
        <Pagination :total="usageTotal" @change="onUsagePageChange" />
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 能力运营脚本
 * - 目录与订阅状态并行加载；订阅状态用集合做 O(1) 判定
 * - 用量按 capability 必填查询，日期区间最大 92 天（后端约束，前端提示）
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import {
  listCapabilities,
  listSubscribedCapabilities,
  queryCapabilityUsage,
  type CapabilityUsageQuery,
} from '@/api/capability'
import type { CapabilityInfo, CapabilityUsage } from '@/types'

/** 当前页签 */
const activeTab = ref('catalog')

/** 能力目录 */
const catalog = ref<CapabilityInfo[]>([])
const catalogLoading = ref(false)
/** 已订阅能力 */
const subscribed = ref<CapabilityInfo[]>([])

/** 已订阅能力编码集合 */
const subscribedCodes = computed(() => new Set(subscribed.value.map((item) => item.code)))

/** 用量查询条件 */
const usageQuery = reactive<CapabilityUsageQuery>({
  capability: '',
  tenantId: undefined,
  pageNum: 1,
  pageSize: 10,
})
/** 日期区间 */
const dateRange = ref<[string, string] | null>(null)

/** 用量列表 */
const usageList = ref<CapabilityUsage[]>([])
const usageTotal = ref(0)
const usageLoading = ref(false)

/** 加载能力目录与订阅状态 */
async function loadCatalog(): Promise<void> {
  catalogLoading.value = true
  try {
    const [all, mine] = await Promise.all([
      listCapabilities(),
      listSubscribedCapabilities().catch(() => [] as CapabilityInfo[]),
    ])
    catalog.value = all || []
    subscribed.value = mine || []
  } catch (error) {
    showError(error, '加载能力目录失败')
  } finally {
    catalogLoading.value = false
  }
}

/** 查询用量（校验能力必选与区间跨度） */
function searchUsage(): void {
  if (!usageQuery.capability) {
    ElMessage.warning('请先选择能力编码')
    return
  }
  if (dateRange.value) {
    const [from, to] = dateRange.value
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 // 一天的毫秒数
    if (days > 92) {
      ElMessage.warning('时间区间最大跨度为 92 天')
      return
    }
    usageQuery.from = from
    usageQuery.to = to
  } else {
    usageQuery.from = undefined
    usageQuery.to = undefined
  }
  usageQuery.pageNum = 1
  fetchUsage()
}

/** 拉取用量 */
async function fetchUsage(): Promise<void> {
  usageLoading.value = true
  try {
    const result = await queryCapabilityUsage(usageQuery)
    usageList.value = result.list || []
    usageTotal.value = result.total || 0
  } catch (error) {
    showError(error, '查询能力用量失败')
  } finally {
    usageLoading.value = false
  }
}

/** 用量分页变化 */
function onUsagePageChange(page: number, size: number): void {
  usageQuery.pageNum = page
  usageQuery.pageSize = size
  fetchUsage()
}

onMounted(loadCatalog)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scope-tag {
  margin-right: 4px;
}

.query-form {
  margin-bottom: 8px;
}

.catalog-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
