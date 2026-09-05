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

const activeTab = ref('statistics')
</script>

<style scoped>
.workflow-monitor {
  padding: 20px;
}
</style>
