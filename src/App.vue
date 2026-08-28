<!--
  应用根组件
  ------------------------------------------------------------------
  仅承载路由出口，全局样式与主题配置在此声明。
-->
<template>
  <router-view />
</template>

<script setup lang="ts">
/**
 * App 根组件：无业务逻辑，路由视图由 <router-view> 渲染。
 */
</script>

<style>
/* 全局基础样式：统一盒模型与字体 */
* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family:
    'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 深色主题下滚动条配色适配 */
html.dark {
  color-scheme: dark;
}
</style>
