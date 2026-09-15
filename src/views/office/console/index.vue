<template>
  <div class="office-console-container">
    <el-card class="header-card">
      <h2>办公平台控制台</h2>
      <p class="description">
        集成飞书、钉钉、企业微信的办公能力（组织同步、消息、审批等功能将在后续版本提供）
      </p>
    </el-card>

    <el-row :gutter="20">
      <!-- 平台状态卡片 -->
      <el-col :span="8" v-for="platform in platforms" :key="platform">
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <span class="platform-icon">{{ getPlatformIcon(platform) }}</span>
              <span class="platform-name">{{ PLATFORM_NAMES[platform] }}</span>
            </div>
          </template>

          <div class="status-info">
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="配置状态">
                <el-tag :type="hasConfig(platform) ? 'success' : 'info'" size="small">
                  {{ hasConfig(platform) ? '已配置' : '未配置' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="绑定用户数">
                <span>{{ getBindingCount(platform) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="待审批数">
                <el-badge :value="getPendingCount(platform)" :max="99" class="badge">
                  <span>待审批</span>
                </el-badge>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="quick-actions">
            <el-button type="primary" size="small" @click="goToConfig(platform)" plain>
              配置管理
            </el-button>
            <el-button type="success" size="small" @click="goToBindings(platform)" plain>
              绑定审批
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 功能预告卡片 -->
    <el-card class="feature-preview-card">
      <template #header>
        <h3>即将上线的功能</h3>
      </template>
      <el-row :gutter="16">
        <el-col :span="6" v-for="feature in upcomingFeatures" :key="feature.name">
          <div class="feature-item">
            <el-icon :size="32" class="feature-icon">
              <component :is="feature.icon" />
            </el-icon>
            <div class="feature-name">{{ feature.name }}</div>
            <div class="feature-desc">{{ feature.desc }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, ChatDotRound, Checked, Calendar, FolderOpened } from '@element-plus/icons-vue'
import { listApps, listBindings, PLATFORM_NAMES, type OfficePlatform } from '@/api/office-new'

const router = useRouter()
const platforms: OfficePlatform[] = ['FEISHU', 'DINGTALK', 'WECOM']
const apps = ref<any[]>([])
const bindingStats = ref<Record<OfficePlatform, { total: number; pending: number }>>({
  FEISHU: { total: 0, pending: 0 },
  DINGTALK: { total: 0, pending: 0 },
  WECOM: { total: 0, pending: 0 },
})

const upcomingFeatures = [
  {
    name: '组织同步',
    desc: '同步部门和成员',
    icon: Connection,
  },
  {
    name: '消息推送',
    desc: '发送通知消息',
    icon: ChatDotRound,
  },
  {
    name: '审批对接',
    desc: '对接审批流程',
    icon: Checked,
  },
  {
    name: '日历会议',
    desc: '管理日程安排',
    icon: Calendar,
  },
]

const getPlatformIcon = (platform: OfficePlatform) => {
  const iconMap: Record<OfficePlatform, string> = {
    FEISHU: '🚀',
    DINGTALK: '📱',
    WECOM: '💼',
  }
  return iconMap[platform] || '📋'
}

const hasConfig = (platform: OfficePlatform) => {
  return apps.value.some((app) => app.platform === platform)
}

const getBindingCount = (platform: OfficePlatform) => {
  return bindingStats.value[platform]?.total || 0
}

const getPendingCount = (platform: OfficePlatform) => {
  return bindingStats.value[platform]?.pending || 0
}

const goToConfig = (platform: OfficePlatform) => {
  router.push('/office/config')
}

const goToBindings = (platform: OfficePlatform) => {
  router.push('/office/bindings')
}

const loadData = async () => {
  try {
    // 加载应用配置
    apps.value = await listApps()

    // 加载绑定统计（需要遍历每个平台）
    for (const platform of platforms) {
      try {
        const bindings = await listBindings(platform, 1, 100)
        bindingStats.value[platform] = {
          total: bindings.length,
          pending: bindings.filter((b) => b.status === 'PENDING').length,
        }
      } catch (error) {
        // 忽略单个平台的错误
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.office-console-container {
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

  .status-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;

      .platform-icon {
        font-size: 20px;
      }

      .platform-name {
        font-size: 16px;
        font-weight: 600;
      }
    }

    .status-info {
      margin-bottom: 16px;

      .badge {
        width: 100%;
      }
    }

    .quick-actions {
      display: flex;
      gap: 8px;

      .el-button {
        flex: 1;
      }
    }
  }

  .feature-preview-card {
    h3 {
      margin: 0;
      font-size: 16px;
    }

    .feature-item {
      text-align: center;
      padding: 20px;
      border: 1px dashed #dcdfe6;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
        background: #ecf5ff;
      }

      .feature-icon {
        color: #909399;
        margin-bottom: 12px;
      }

      .feature-name {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .feature-desc {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
