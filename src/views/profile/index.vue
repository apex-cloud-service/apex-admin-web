<!--
  个人中心
  ------------------------------------------------------------------
  当前登录用户信息展示（UserDTO + 角色码/权限码，由用户 store 合并）：
  - 租户来自登录响应记录的 tenantId（后端从令牌解析，前端只读展示）
  - 权限明细按模块分组展示并支持搜索，用于核对 @RequirePermission 精确匹配所需的权限码
-->
<template>
  <el-card shadow="never" class="profile-card">
    <el-descriptions title="个人信息" :column="2" border>
      <el-descriptions-item label="用户 ID">{{ identity?.id ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="账号">{{ identity?.username || identity?.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="昵称">{{ identity?.nickName || identity?.nickname || '-' }}</el-descriptions-item>
      <el-descriptions-item label="手机号">{{ identity?.phone ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="性别">
        {{ identity?.gender === 1 ? '男' : identity?.gender === 2 ? '女' : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="生日">{{ identity?.birthday ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="最后登录">{{ identity?.lastLoginTime ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="租户">
        {{ identity?.tenantId || '未携带（登录响应未返回租户）' }}
      </el-descriptions-item>
      <el-descriptions-item label="角色">
        <el-tag v-for="role in identity?.roles || []" :key="role" size="small" style="margin-right: 6px">
          {{ role }}
        </el-tag>
        <span v-if="!identity?.roles?.length">-</span>
      </el-descriptions-item>
      <el-descriptions-item label="权限">
        <el-button
          link
          type="primary"
          :disabled="!identity?.permissions?.length"
          @click="permissionVisible = true"
        >
          {{ identity?.permissions?.length ?? 0 }} 个（点击查看明细）
        </el-button>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 权限明细对话框：按模块分组 + 搜索（后端 @RequirePermission 为精确匹配，核对权限码用） -->
    <el-dialog v-model="permissionVisible" title="我的权限明细" width="680px">
      <el-input
        v-model="permissionKeyword"
        placeholder="搜索权限码或模块"
        clearable
        :prefix-icon="Search"
        style="margin-bottom: 12px"
      />
      <el-empty v-if="groupedPermissions.length === 0" description="无匹配权限" :image-size="70" />
      <div v-else class="permission-groups">
        <div v-for="group in groupedPermissions" :key="group.module" class="permission-group">
          <div class="group-title">
            <el-tag size="small" type="info">{{ group.module }}</el-tag>
            <span class="group-count">{{ group.codes.length }} 项</span>
          </div>
          <div class="group-codes">
            <el-tag
              v-for="code in group.codes"
              :key="code"
              size="small"
              class="code-tag"
              type="success"
            >
              {{ code }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 个人中心脚本
 * - 展示当前登录用户身份信息（来自用户 store，登录时加载并合并角色/权限码）
 * - 权限明细按权限码首段（模块）分组，支持按权限码/模块搜索
 */
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

/** 权限分组（模块 → 权限码列表） */
interface PermissionGroup {
  module: string
  codes: string[]
}

const userStore = useUserStore()

/** 当前用户身份（computed 保证响应式） */
const identity = computed(() => userStore.identity)

/** 权限明细对话框可见性 */
const permissionVisible = ref(false)
/** 权限搜索关键词 */
const permissionKeyword = ref('')

/** 按模块（权限码首段）分组并应用搜索过滤 */
const groupedPermissions = computed<PermissionGroup[]>(() => {
  const keyword = permissionKeyword.value.trim().toLowerCase()
  const groupMap = new Map<string, string[]>()
  for (const code of identity.value?.permissions ?? []) {
    if (keyword && !code.toLowerCase().includes(keyword)) continue
    const module = code.includes(':') ? code.split(':')[0] : 'other'
    const codes = groupMap.get(module) ?? []
    codes.push(code)
    groupMap.set(module, codes)
  }
  return Array.from(groupMap.entries())
    .map(([module, codes]) => ({ module, codes: codes.sort() }))
    .sort((a, b) => a.module.localeCompare(b.module))
})
</script>

<style scoped>
/* 个人信息卡片 */
.profile-card {
  max-width: 720px;
}

.permission-groups {
  max-height: 420px;
  overflow-y: auto;
}

.permission-group {
  margin-bottom: 14px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.group-count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.group-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.code-tag {
  font-family: 'Courier New', monospace;
}
</style>
