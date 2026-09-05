<!--
  工作流监控页面
  
  提供工作流的监控和管理功能，包含两个主要模块：
  - 统计看板：展示工作流的统计数据和趋势分析
  - 流程实例：展示和管理所有流程实例
  
  @module views/workflow/monitor
-->
<template>
  <div class="workflow-monitor">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="统计看板" name="statistics">
        <Statistics />
      </el-tab-pane>
      
      <el-tab-pane label="流程实例" name="instances">
        <InstanceList />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Statistics from './Statistics.vue'
import InstanceList from './InstanceList.vue'

/** 当前激活的标签页 */
const activeTab = ref('statistics')
</script>

<style scoped>
.workflow-monitor {
  padding: 20px;
}
</style>
