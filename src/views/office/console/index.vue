<!--
  办公平台控制台页面
  ------------------------------------------------------------------
  功能：办公平台数据统计、消息推送统计、审批流程统计
  
  权限：
    - office:console:view - 查看办公平台控制台
-->
<template>
  <div class="office-console-container">
    <el-card class="header-card">
      <h2>办公平台控制台</h2>
      <p class="description">
        集成飞书、钉钉、企业微信的办公能力（组织同步、消息、审批、日历等，可从下方入口进入）
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
                <span v-if="bindingStats[platform].error">查询失败</span>
                <span v-else>{{ bindingStats[platform].total ?? '-' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="待审批数">
                <span v-if="bindingStats[platform].error">查询失败</span>
                <el-badge v-else :value="bindingStats[platform].pending ?? 0" :max="99" class="badge">
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
            <el-button type="primary" link size="small" @click="router.push(feature.path)">进入</el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台控制台逻辑
 * - 三平台状态总览（配置状态/绑定数/待审批数）+ 快捷入口
 * - 绑定统计通过逐平台分页查询 total 汇总（后端暂无统计接口）
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Connection, ChatDotRound, Checked, Calendar } from '@element-plus/icons-vue'
import { listApps, listBindingsPage, PLATFORM_NAMES, type OfficePlatform } from '@/api/office-platform'
import { showError } from '@/utils/request'

/** ========== 状态定义 ========== */

const router = useRouter()
/** 管理的三大平台（固定顺序渲染卡片） */
const platforms: OfficePlatform[] = ['FEISHU', 'DINGTALK', 'WECOM']
/** 各平台应用配置列表 */
const apps = ref<any[]>([])
/** 各平台绑定统计（来自后端真实 total；null = 未取到，error = 该平台查询失败） */
const bindingStats = ref<Record<OfficePlatform, { total: number | null; pending: number | null; error: boolean }>>({
  FEISHU: { total: null, pending: null, error: false },
  DINGTALK: { total: null, pending: null, error: false },
  WECOM: { total: null, pending: null, error: false },
})

/** 即将上线的功能预告卡片数据 */
const upcomingFeatures = [
  {
    name: '组织同步',
    desc: '同步部门和成员',
    icon: Connection,
    path: '/office/organization',
  },
  {
    name: '消息推送',
    desc: '发送通知消息',
    icon: ChatDotRound,
    path: '/office/message',
  },
  {
    name: '审批对接',
    desc: '对接审批流程',
    icon: Checked,
    path: '/office/approval',
  },
  {
    name: '日历会议',
    desc: '管理日程安排',
    icon: Calendar,
    path: '/office/calendar',
  },
]

/** ========== 展示辅助 ========== */

/**
 * 平台对应的展示图标（emoji）
 * @param platform 平台类型
 * @returns 图标字符（未知平台返回默认图标）
 */
const getPlatformIcon = (platform: OfficePlatform) => {
  const iconMap: Record<OfficePlatform, string> = {
    FEISHU: '🚀',
    DINGTALK: '📱',
    WECOM: '💼',
  }
  return iconMap[platform] || '📋'
}

/**
 * 判断平台是否已配置应用
 * @param platform 平台类型
 * @returns true=已配置
 */
const hasConfig = (platform: OfficePlatform) => {
  return apps.value.some((app) => app.platform === platform)
}

/** ========== 导航与数据加载 ========== */

/**
 * 跳转平台配置管理页
 * @param _platform 目标平台（当前配置页为统一入口，未区分平台）
 */
const goToConfig = (_platform: OfficePlatform) => {
  router.push('/office/config')
}

/**
 * 跳转绑定审批页（携带平台上下文，目标页预填平台筛选）
 * @param platform 目标平台
 */
const goToBindings = (platform: OfficePlatform) => {
  router.push({ path: '/office/bindings', query: { platform } })
}

/**
 * 加载单平台绑定统计：两个计数请求（全部状态 / 待审批），读真实 total
 */
const loadPlatformStats = async (platform: OfficePlatform) => {
  bindingStats.value[platform] = { total: null, pending: null, error: false }
  try {
    const [allPage, pendingPage] = await Promise.all([
      listBindingsPage(platform, undefined, 1, 1),
      listBindingsPage(platform, 'PENDING', 1, 1),
    ])
    bindingStats.value[platform] = {
      total: allPage.total,
      pending: pendingPage.total,
      error: false,
    }
  } catch {
    bindingStats.value[platform] = { total: null, pending: null, error: true }
  }
}

/**
 * 加载控制台数据：应用配置一次拉取（失败整体提示）；
 * 绑定统计逐平台并行查询，单平台失败仅影响该平台卡片
 */
const loadData = async () => {
  try {
    apps.value = await listApps()
  } catch (error: any) {
    showError(error, '加载数据失败')
  }
  await Promise.allSettled(platforms.map((platform) => loadPlatformStats(platform)))
}

// 挂载时加载控制台数据
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
