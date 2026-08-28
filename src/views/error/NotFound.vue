<!--
  404 页面
  ------------------------------------------------------------------
  兜底路由页面：路径不匹配时展示，提供返回首页入口。
-->
<template>
  <div class="not-found">
    <el-result icon="warning" title="404" sub-title="页面不存在或已被移除">
      <template #extra>
        <el-button type="primary" @click="router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
/**
 * NotFound 脚本：返回首页入口。
 */
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
/* 404 页面垂直水平居中 */
.not-found {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
