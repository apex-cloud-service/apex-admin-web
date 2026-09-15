<template>
  <div class="organization-sync-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>组织架构同步</span>
          <el-button type="primary" :loading="syncing" @click="handleTriggerSync">
            <el-icon><Refresh /></el-icon>
            {{ syncing ? '同步中...' : '立即同步' }}
          </el-button>
        </div>
      </template>

      <!-- 同步状态面板 -->
      <el-descriptions :column="3" border class="sync-status-desc">
        <el-descriptions-item label="同步状态">
          <el-tag :type="syncStatus.syncing ? 'warning' : 'success'">
            {{ syncStatus.syncing ? '同步中' : '空闲' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="同步进度">
          <el-progress :percentage="syncStatus.progress || 0" :status="syncStatus.progress === 100 ? 'success' : undefined" />
        </el-descriptions-item>
        <el-descriptions-item label="最后同步">
          {{ syncStatus.lastFinishTime || '从未同步' }}
        </el-descriptions-item>
        <el-descriptions-item label="部门总数">
          <el-statistic :value="syncStatus.deptCount || 0" />
        </el-descriptions-item>
        <el-descriptions-item label="成员总数">
          <el-statistic :value="syncStatus.memberCount || 0" />
        </el-descriptions-item>
        <el-descriptions-item label="变更统计">
          <div class="change-stats">
            <el-tag type="success">新增 {{ syncStatus.addedCount || 0 }}</el-tag>
            <el-tag type="warning">更新 {{ syncStatus.updatedCount || 0 }}</el-tag>
            <el-tag type="danger">删除 {{ syncStatus.removedCount || 0 }}</el-tag>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 同步日志 -->
      <el-divider>同步日志</el-divider>
      <el-timeline v-if="syncLogs.length > 0">
        <el-timeline-item
          v-for="log in syncLogs"
          :key="log.timestamp"
          :timestamp="log.timestamp"
          :type="log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'primary'"
        >
          {{ log.message }}
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无同步日志" :image-size="100" />
    </el-card>

    <!-- 组织架构树 -->
    <el-card shadow="never" class="org-tree-card">
      <template #header>
        <div class="card-header">
          <span>组织架构</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索部门或成员"
            clearable
            style="width: 300px"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-tree
        v-if="orgTree.length > 0"
        :data="orgTree"
        :props="treeProps"
        :filter-node-method="filterNode"
        :default-expand-all="false"
        node-key="id"
        ref="treeRef"
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node">
            <el-icon v-if="data.type === 'dept'"><OfficeBuilding /></el-icon>
            <el-icon v-else><User /></el-icon>
            <span class="node-label">{{ node.label }}</span>
            <el-tag v-if="data.memberCount" size="small" type="info">
              {{ data.memberCount }} 人
            </el-tag>
          </span>
        </template>
      </el-tree>
      <el-empty v-else description="暂无组织架构数据，请先进行同步" :image-size="150" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElTree } from 'element-plus'
import { Refresh, Search, OfficeBuilding, User } from '@element-plus/icons-vue'
import { getSyncStatus, triggerSync } from '@/api/office'
import type { SyncStatus, SyncLog, OrgNode } from '@/api/office'

const syncing = ref(false)
const searchKeyword = ref('')
const treeRef = ref<InstanceType<typeof ElTree>>()

const syncStatus = ref<SyncStatus>({
  syncing: false,
  progress: 0,
  lastFinishTime: '',
  deptCount: 0,
  memberCount: 0,
  addedCount: 0,
  updatedCount: 0,
  removedCount: 0
})

const syncLogs = ref<SyncLog[]>([])
const orgTree = ref<OrgNode[]>([])

const treeProps = {
  children: 'children',
  label: 'name'
}

const loadSyncStatus = async () => {
  try {
    const data = await getSyncStatus()
    syncStatus.value = data
    if (data.logs) {
      syncLogs.value = data.logs.slice(0, 20)
    }
    if (data.orgTree) {
      orgTree.value = data.orgTree
    }
  } catch (error) {
    console.error('加载同步状态失败:', error)
  }
}

const handleTriggerSync = async () => {
  try {
    syncing.value = true
    await triggerSync()
    ElMessage.success('同步任务已启动')
    
    const pollInterval = setInterval(async () => {
      await loadSyncStatus()
      if (!syncStatus.value.syncing) {
        clearInterval(pollInterval)
        syncing.value = false
        ElMessage.success('组织架构同步完成')
      }
    }, 2000)
    
    setTimeout(() => {
      clearInterval(pollInterval)
      syncing.value = false
    }, 600000)
  } catch (error: any) {
    syncing.value = false
    ElMessage.error(error.message || '同步失败')
  }
}

const filterNode = (value: string, data: OrgNode) => {
  if (!value) return true
  return data.name.includes(value)
}

const handleSearch = (keyword: string) => {
  nextTick(() => {
    treeRef.value?.filter(keyword)
  })
}

onMounted(() => {
  loadSyncStatus()
  
  setInterval(() => {
    if (!syncing.value) {
      loadSyncStatus()
    }
  }, 30000)
})
</script>

<style scoped lang="scss">
.organization-sync-container {
  padding: 20px;
  
  .el-card {
    margin-bottom: 20px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .sync-status-desc {
    margin-bottom: 20px;
    
    .change-stats {
      display: flex;
      gap: 8px;
    }
  }
  
  .org-tree-card {
    .custom-tree-node {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      
      .node-label {
        flex: 1;
      }
    }
  }
}
</style>
