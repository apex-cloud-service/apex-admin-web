<!--
  个人中心
  ------------------------------------------------------------------
  当前登录用户信息展示与修改密码入口
  （修改密码接口以后端 profile 能力为准，此处展示基础信息）。
-->
<template>
  <el-card shadow="never" class="profile-card">
    <el-descriptions title="个人信息" :column="2" border>
      <el-descriptions-item label="用户 ID">{{ identity?.id ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="账号">{{ identity?.username ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="昵称">{{ identity?.nickName || identity?.nickname || '-' }}</el-descriptions-item>
      <el-descriptions-item label="手机号">{{ identity?.phone ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="角色">
        <el-tag v-for="role in identity?.roles || []" :key="role" size="small" style="margin-right: 6px">
          {{ role }}
        </el-tag>
        <span v-if="!identity?.roles?.length">-</span>
      </el-descriptions-item>
      <el-descriptions-item label="权限数">{{ identity?.permissions?.length ?? 0 }} 个</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 个人中心脚本
 * - 展示当前登录用户身份信息（来自用户 store，登录时加载）
 */
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

/** 当前用户身份（computed 保证响应式） */
const identity = computed(() => userStore.identity)
</script>

<style scoped>
/* 个人信息卡片 */
.profile-card {
  max-width: 720px;
}
</style>
