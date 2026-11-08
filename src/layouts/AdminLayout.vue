<!--
  管理后台主布局
  ------------------------------------------------------------------
  左侧：菜单侧边栏（基于路由表渲染，目录/菜单树形展示）
  顶部：折叠开关、全局搜索、通知中心（SSE）、站内信未读提醒、明暗主题切换、用户信息与登出
  主体：<router-view> 渲染当前页面
-->
<template>
  <el-container class="admin-layout">
    <!-- 左侧菜单侧边栏 -->
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="layout-aside">
      <div class="layout-logo" @click="router.push('/')">
        <span v-if="!appStore.sidebarCollapsed">Apex Scaffold</span>
        <span v-else>A</span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="appStore.sidebarCollapsed"
          :collapse-transition="false"
          router
          background-color="transparent"
        >
          <!-- 递归渲染菜单树 -->
          <template v-for="route in menuRoutes" :key="route.path">
            <el-sub-menu v-if="route.children && route.children.length" :index="route.path">
              <template #title>
                <el-icon><component :is="iconOf(route)" /></el-icon>
                <span>{{ route.meta?.title }}</span>
              </template>
              <el-menu-item
                v-for="child in route.children"
                :key="child.path"
                :index="resolvePath(route.path, child.path)"
              >
                <el-icon><component :is="iconOf(child)" /></el-icon>
                <span>{{ child.meta?.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="route.path">
              <el-icon><component :is="iconOf(route)" /></el-icon>
              <span>{{ route.meta?.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="layout-body">
      <!-- 顶部导航栏 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="appStore.toggleSidebar()">
            <Expand v-if="appStore.sidebarCollapsed" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 全局搜索 -->
          <GlobalSearch />
          <!-- 通知中心（system 域，SSE 实时推送） -->
          <NotificationCenter />
          <!-- 站内信未读提醒 -->
          <el-tooltip content="站内信" placement="bottom">
            <el-badge
              :value="unreadCount"
              :hidden="unreadCount === 0"
              :max="99"
              class="notice-badge"
            >
              <el-icon class="notice-btn" @click="router.push('/office/message')">
                <Bell />
              </el-icon>
            </el-badge>
          </el-tooltip>
          <!-- 明暗主题切换 -->
          <el-tooltip :content="appStore.theme === 'dark' ? '切换浅色' : '切换深色'">
            <el-icon class="theme-btn" @click="toggleTheme">
              <Moon v-if="appStore.theme === 'light'" />
              <Sunny v-else />
            </el-icon>
          </el-tooltip>
          <!-- 用户下拉 -->
          <el-dropdown @command="handleCommand">
            <span class="user-trigger">
              <el-avatar :size="28" class="user-avatar">{{ avatarText }}</el-avatar>
              <span class="user-name">{{ userStore.identity?.nickName || userStore.identity?.username || '用户' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
/**
 * AdminLayout 脚本
 * - 菜单数据来源于路由表（动态路由由后端菜单驱动）
 * - 提供面包屑、全局搜索、主题切换、退出登录能力
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, type RouteRecordRaw } from 'vue-router'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { Bell, Expand, Fold, Moon, Sunny } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import GlobalSearch from '@/components/GlobalSearch/index.vue'
import NotificationCenter from '@/components/NotificationCenter/index.vue'
import { getUnreadCount } from '@/api/message'
import { subscribeMessagePush } from '@/utils/message-socket'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

/** 当前激活菜单路径（高亮） */
const activeMenu = computed(() => (route.meta.activeMenu as string) || route.path)

/** 布局下的菜单路由（过滤掉无标题项与隐藏菜单 visible=0） */
const menuRoutes = computed(() => {
  const root = router.options.routes.find((r) => r.name === 'Root')
  return (root?.children || []).filter((r) => r.meta?.title && !r.meta?.hidden)
})

/** 面包屑：从根到当前路由的标题链 */
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({ path: item.path, title: item.meta.title as string }))
})

/** 用户头像占位文本（取昵称首字符） */
const avatarText = computed(() => {
  const name = userStore.identity?.nickName || userStore.identity?.username || 'A'
  return name.charAt(0).toUpperCase()
})

/** 站内信未读数：WebSocket 推送实时刷新，60 秒轮询兜底（失败静默避免打扰） */
const unreadCount = ref(0)
let unreadTimer: ReturnType<typeof setInterval> | undefined
let unsubscribePush: (() => void) | undefined

/** 拉取一次站内信未读数 */
async function refreshUnread(): Promise<void> {
  try {
    unreadCount.value = await getUnreadCount()
  } catch {
    unreadCount.value = 0
  }
}

onMounted(() => {
  refreshUnread()
  unreadTimer = setInterval(refreshUnread, 60000)
  // 订阅站内信推送：收到新消息帧立即刷新角标
  unsubscribePush = subscribeMessagePush(() => {
    refreshUnread()
  })
})

onBeforeUnmount(() => {
  if (unreadTimer) clearInterval(unreadTimer)
  unsubscribePush?.()
})

/**
 * 菜单图标解析：优先使用路由 meta.icon（Element Plus 图标名），默认 Grid。
 * @param routeRecord 路由记录
 * @returns 图标组件
 */
function iconOf(routeRecord: RouteRecordRaw): unknown {
  const icon = routeRecord.meta?.icon
  if (icon) return icon
  return 'Grid'
}

/**
 * 拼接父子路径（子路径相对时补全斜杠）。
 * @param parent 父路径
 * @param child 子路径
 */
function resolvePath(parent: string, child: string): string {
  if (child.startsWith('/')) return child
  return `${parent}/${child}`.replace(/\/+/g, '/')
}

/**
 * 切换明暗主题。
 */
function toggleTheme(): void {
  appStore.setTheme(appStore.theme === 'light' ? 'dark' : 'light')
}

/**
 * 处理用户下拉指令。
 * @param command profile=个人中心 logout=退出登录
 */
function handleCommand(command: string): void {
  if (command === 'profile') {
    router.push('/profile')
    return
  }
  if (command === 'logout') {
    ElMessageBox.confirm('确认退出当前登录？', '提示', { type: 'warning' })
      .then(async () => {
        await userStore.logout()
        router.push('/login')
      })
      .catch(() => {
        /* 用户取消退出 */
      })
  }
}
</script>

<style scoped>
/* 布局容器：铺满视口 */
.admin-layout {
  height: 100vh;
}

/* 侧边栏：固定宽度切换（折叠 64px / 展开 220px） */
.layout-aside {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.2s;
  overflow: hidden;
}

/* Logo 区域 */
.layout-logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  color: var(--el-color-primary);
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-light);
}

/* 主体区域：flex 纵向布局 */
.layout-body {
  flex-direction: column;
  overflow: hidden;
}

/* 顶部导航栏 */
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 折叠按钮与主题按钮：悬停高亮 */
.collapse-btn,
.theme-btn {
  font-size: 18px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.collapse-btn:hover,
.theme-btn:hover {
  color: var(--el-color-primary);
}

/* 站内信铃铛 */
.notice-badge {
  display: flex;
  align-items: center;
}

.notice-btn {
  font-size: 18px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.notice-btn:hover {
  color: var(--el-color-primary);
}

/* 用户触发区 */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  background-color: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
}

/* 主内容区：允许滚动 */
.layout-main {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background-color: var(--el-fill-color-light);
}
</style>
