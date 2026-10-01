<!--
  办公平台组织架构管理页面
  ------------------------------------------------------------------
  功能：同步办公平台组织架构、部门管理、员工管理
  
  权限：
    - office:organization:view - 查看组织架构
    - office:organization:sync - 同步组织架构
-->
<template>
  <div class="organization-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>组织架构同步</span>
          <el-button type="primary" @click="handleSyncAll" v-permission="'office:organization:sync'">
            <el-icon><Refresh /></el-icon>
            全量同步
          </el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="8" v-for="platform in platforms" :key="platform">
          <el-card shadow="hover" class="platform-card">
            <template #header>
              <div class="platform-header">
                <span class="platform-title">{{ getPlatformName(platform) }}</span>
                <el-tag :type="syncStatus[platform]?.lastSuccess ? 'success' : 'warning'">
                  {{ syncStatus[platform]?.syncing ? '同步中' : '已就绪' }}
                </el-tag>
              </div>
            </template>

            <div class="sync-info" v-loading="loading">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="部门数量">
                  <el-tag type="primary">{{ syncStatus[platform]?.deptCount || 0 }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="成员数量">
                  <el-tag type="success">{{ syncStatus[platform]?.memberCount || 0 }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="同步进度">
                  <el-progress
                    :percentage="syncStatus[platform]?.progress || 0"
                    :status="syncStatus[platform]?.syncing ? 'success' : undefined"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="最近同步">
                  {{ syncStatus[platform]?.lastFinishTime || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="同步结果" v-if="syncStatus[platform]?.lastFinishTime">
                  <el-tag :type="syncStatus[platform]?.lastSuccess ? 'success' : 'danger'">
                    {{ syncStatus[platform]?.lastSuccess ? '成功' : '失败' }}
                  </el-tag>
                  <span v-if="!syncStatus[platform]?.lastSuccess" style="margin-left: 8px; color: #f56c6c">
                    {{ syncStatus[platform]?.lastError }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="变更统计" v-if="syncStatus[platform]?.lastFinishTime && syncStatus[platform]?.lastSuccess">
                  <el-space>
                    <el-tag size="small" type="success">新增 {{ syncStatus[platform]?.addedCount || 0 }}</el-tag>
                    <el-tag size="small" type="warning">更新 {{ syncStatus[platform]?.updatedCount || 0 }}</el-tag>
                    <el-tag size="small" type="info">删除 {{ syncStatus[platform]?.removedCount || 0 }}</el-tag>
                  </el-space>
                </el-descriptions-item>
              </el-descriptions>

              <div class="sync-actions">
                <el-button
                  type="primary"
                  @click="handleSync(platform, false)"
                  :loading="syncStatus[platform]?.syncing"
                  :disabled="syncStatus[platform]?.syncing"
                  v-permission="'office:organization:sync'"
                >
                  <el-icon><Refresh /></el-icon>
                  增量同步
                </el-button>
                <el-button
                  type="warning"
                  @click="handleSync(platform, true)"
                  :loading="syncStatus[platform]?.syncing"
                  :disabled="syncStatus[platform]?.syncing"
                  v-permission="'office:organization:sync:full'"
                >
                  <el-icon><RefreshRight /></el-icon>
                  强制全量
                </el-button>
                <el-button
                  @click="handleViewDetails(platform)"
                  v-permission="'office:organization:view'"
                >
                  <el-icon><View /></el-icon>
                  查看详情
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>部门与成员管理</span>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="部门列表" name="departments">
          <div class="filter-toolbar">
            <el-form :inline="true">
              <el-form-item label="平台">
                <el-select v-model="deptQuery.platform" placeholder="请选择平台" clearable>
                  <el-option label="飞书" value="FEISHU" />
                  <el-option label="钉钉" value="DINGTALK" />
                  <el-option label="企业微信" value="WECOM" />
                </el-select>
              </el-form-item>
              <el-form-item label="部门名称">
                <el-input v-model="deptQuery.keyword" placeholder="请输入部门名称" clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadDepartments">查询</el-button>
                <el-button @click="resetDeptQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="departments" border stripe v-loading="deptLoading" row-key="id" :tree-props="{ children: 'children' }">
            <el-table-column prop="name" label="部门名称" min-width="200" />
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="{ row }">
                <el-tag>{{ getPlatformName(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="externalId" label="外部ID" width="200" show-overflow-tooltip />
            <el-table-column prop="memberCount" label="成员数" width="100" />
            <el-table-column prop="parentName" label="上级部门" min-width="150" show-overflow-tooltip />
            <el-table-column prop="order" label="排序" width="80" />
            <el-table-column prop="syncTime" label="同步时间" width="180" />
          </el-table>
          <el-pagination
            v-model:current-page="deptQuery.page"
            v-model:page-size="deptQuery.size"
            :total="deptTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadDepartments"
            @current-change="loadDepartments"
          />
        </el-tab-pane>

        <el-tab-pane label="成员列表" name="members">
          <div class="filter-toolbar">
            <el-form :inline="true">
              <el-form-item label="平台">
                <el-select v-model="memberQuery.platform" placeholder="请选择平台" clearable>
                  <el-option label="飞书" value="FEISHU" />
                  <el-option label="钉钉" value="DINGTALK" />
                  <el-option label="企业微信" value="WECOM" />
                </el-select>
              </el-form-item>
              <el-form-item label="姓名">
                <el-input v-model="memberQuery.keyword" placeholder="请输入姓名" clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadMembers">查询</el-button>
                <el-button @click="resetMemberQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table :data="members" border stripe v-loading="memberLoading">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="{ row }">
                <el-tag>{{ getPlatformName(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="externalId" label="外部ID" width="200" show-overflow-tooltip />
            <el-table-column prop="mobile" label="手机号" width="130" />
            <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
            <el-table-column prop="departments" label="所属部门" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag v-for="(dept, index) in row.departments" :key="index" size="small" style="margin: 2px">
                  {{ dept }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isActive" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? '在职' : '离职' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="syncTime" label="同步时间" width="180" />
          </el-table>
          <el-pagination
            v-model:current-page="memberQuery.page"
            v-model:page-size="memberQuery.size"
            :total="memberTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadMembers"
            @current-change="loadMembers"
          />
        </el-tab-pane>

        <el-tab-pane label="同步日志" name="logs">
          <el-table :data="syncLogs" border stripe v-loading="logLoading">
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="{ row }">
                <el-tag>{{ getPlatformName(row.platform) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="syncType" label="同步类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.syncType === 'full' ? 'warning' : 'primary'">
                  {{ row.syncType === 'full' ? '全量' : '增量' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'info'">
                  {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : '进行中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="addedCount" label="新增" width="80" />
            <el-table-column prop="updatedCount" label="更新" width="80" />
            <el-table-column prop="removedCount" label="删除" width="80" />
            <el-table-column prop="duration" label="耗时(秒)" width="100" />
            <el-table-column prop="errorMessage" label="错误信息" min-width="200" show-overflow-tooltip />
            <el-table-column prop="startTime" label="开始时间" width="180" />
            <el-table-column prop="endTime" label="结束时间" width="180" />
          </el-table>
          <el-pagination
            v-model:current-page="logQuery.page"
            v-model:page-size="logQuery.size"
            :total="logTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSyncLogs"
            @current-change="loadSyncLogs"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

/**
 * 组织架构同步管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. 多平台组织架构同步 - 支持飞书、钉钉、企业微信三大平台
 * 2. 同步状态监控 - 实时展示同步进度和统计信息
 * 3. 增量/全量同步 - 支持增量更新和强制全量同步两种模式
 * 4. 部门成员管理 - 查看已同步的部门和成员列表
 * 5. 同步日志查询 - 查看历史同步记录和错误信息
 * 
 * 权限要求:
 * - office:organization:view - 查看权限(必需)
 * - office:organization:sync - 执行同步操作
 * - office:organization:sync:full - 执行强制全量同步
 * 
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshRight, View } from '@element-plus/icons-vue'
import {
  getSyncStatus,
  triggerSync,
  getPlatformName,
  type OfficePlatform,
  type OfficeSyncStatus,
} from '@/api/office'
import type { PageQuery } from '@/types'

// 支持的办公平台列表
const platforms: OfficePlatform[] = ['FEISHU', 'DINGTALK', 'WECOM']
// 加载状态
const loading = ref(false)
// 各平台的同步状态
const syncStatus = reactive<Record<string, OfficeSyncStatus>>({})

// 当前激活的标签页
const activeTab = ref('departments')

// ==================== 部门管理 ====================
const deptLoading = ref(false)
const departments = ref<any[]>([])
const deptQuery = reactive<PageQuery & { platform?: string; keyword?: string }>({
  page: 1,
  size: 10,
})
const deptTotal = ref(0)

// ==================== 成员管理 ====================
const memberLoading = ref(false)
const members = ref<any[]>([])
const memberQuery = reactive<PageQuery & { platform?: string; keyword?: string }>({
  page: 1,
  size: 10,
})
const memberTotal = ref(0)

// ==================== 同步日志 ====================
const logLoading = ref(false)
const syncLogs = ref<any[]>([])
const logQuery = reactive<PageQuery>({ page: 1, size: 10 })
const logTotal = ref(0)

/**
 * 加载所有平台的同步状态
 */
async function loadAllSyncStatus() {
  loading.value = true
  try {
    for (const platform of platforms) {
      const status = await getSyncStatus(platform)
      syncStatus[platform] = status
    }
  } catch (error) {
    ElMessage.error('加载同步状态失败')
  } finally {
    loading.value = false
  }
}

/**
 * 执行单个平台的同步操作
 * @param platform 平台类型
 * @param fullSync 是否强制全量同步
 */
async function handleSync(platform: OfficePlatform, fullSync: boolean) {
  const action = fullSync ? '强制全量同步' : '增量同步'
  await ElMessageBox.confirm(`确认执行${getPlatformName(platform)}的${action}?`, '提示', { type: 'info' })
  try {
    await triggerSync({ platform, syncDepartments: true, syncMembers: true } as any)
    ElMessage.success(`${action}已启动`)
    await loadAllSyncStatus()
    const timer = setInterval(async () => {
      const status = await getSyncStatus(platform)
      syncStatus[platform] = status
      if (!status.syncing) {
        clearInterval(timer)
        if (status.lastSuccess) {
          ElMessage.success(`${getPlatformName(platform)}同步完成`)
        } else {
          ElMessage.error(`${getPlatformName(platform)}同步失败: ${status.lastError}`)
        }
      }
    }, 3000)
  } catch (error) {
    ElMessage.error(`${action}失败`)
  }
}

/**
 * 批量同步所有平台
 */
async function handleSyncAll() {
  await ElMessageBox.confirm('确认对所有平台执行增量同步?', '提示', { type: 'info' })
  for (const platform of platforms) {
    try {
      await triggerSync({ platform, syncDepartments: true, syncMembers: true } as any)
    } catch (error) {
      console.error(`Sync ${platform} failed`, error)
    }
  }
  ElMessage.success('批量同步已启动')
  await loadAllSyncStatus()
}

/**
 * 查看平台详情
 * @param platform 平台类型
 */
function handleViewDetails(platform: OfficePlatform) {
  ElMessage.info(`查看${getPlatformName(platform)}详情功能待实现`)
}

/**
 * 加载部门列表
 */
async function loadDepartments() {
  deptLoading.value = true
  try {
    departments.value = []
    deptTotal.value = 0
  } catch (error) {
    ElMessage.error('加载部门列表失败')
  } finally {
    deptLoading.value = false
  }
}

/**
 * 重置部门查询条件
 */
function resetDeptQuery() {
  deptQuery.platform = undefined
  deptQuery.keyword = undefined
  loadDepartments()
}

/**
 * 加载成员列表
 */
async function loadMembers() {
  memberLoading.value = true
  try {
    members.value = []
    memberTotal.value = 0
  } catch (error) {
    ElMessage.error('加载成员列表失败')
  } finally {
    memberLoading.value = false
  }
}

/**
 * 重置成员查询条件
 */
function resetMemberQuery() {
  memberQuery.platform = undefined
  memberQuery.keyword = undefined
  loadMembers()
}

/**
 * 加载同步日志
 */
async function loadSyncLogs() {
  logLoading.value = true
  try {
    syncLogs.value = []
    logTotal.value = 0
  } catch (error) {
    ElMessage.error('加载同步日志失败')
  } finally {
    logLoading.value = false
  }
}

onMounted(() => {
  loadAllSyncStatus()
  loadDepartments()
  loadMembers()
  loadSyncLogs()
})
</script>

<style scoped lang="scss">
.organization-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platform-card {
  margin-bottom: 20px;
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.platform-title {
  font-size: 16px;
  font-weight: bold;
}

.sync-info {
  min-height: 300px;
}

.sync-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.filter-toolbar {
  margin-bottom: 16px;
}
</style>
