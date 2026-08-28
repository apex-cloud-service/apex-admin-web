<!--
  角色管理
  ------------------------------------------------------------------
  后台角色列表与角色详情展示（角色的权限配置能力以后端
  /api/v1/auth/roles* 为基座，此处展示只读列表 + 详情）。
-->
<template>
  <el-card shadow="never">
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="角色名称" min-width="140" />
      <el-table-column prop="code" label="角色编码" min-width="140">
        <template #default="{ row }"><el-tag>{{ row.code }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 角色管理脚本
 * - 列表来源：/admin-api/v1/staff-roles（后台可分配角色）
 * - 角色权限树配置接口见 /api/v1/auth/permissions（按需扩展弹窗）
 */
import { onMounted, ref } from 'vue'
import { listStaffRoles } from '@/api/user'
import { showError } from '@/utils/request'
import type { StaffRole } from '@/types'

/** 加载状态 */
const loading = ref(false)
/** 角色列表 */
const list = ref<StaffRole[]>([])

/**
 * 拉取后台角色列表。
 */
async function fetchRoles(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listStaffRoles()) || []
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchRoles)
</script>
