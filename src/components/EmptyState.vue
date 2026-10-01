<!--
  空状态展示组件
  ------------------------------------------------------------------
  列表/表格/搜索结果为空时的友好提示，基于 el-empty 二次封装。
  支持按场景切换内置空态类型，或自定义图片与描述；
  默认插槽用于放置操作按钮（如「新增」）。

  Props：
    - description: 空态描述文案
    - image: 自定义图片 URL（优先于 type 的内置图）
    - imageSize: 图片尺寸（px）
    - type: 空态场景（default=暂无数据 search=无搜索结果
            network=网络异常 permission=无权限）

  Emits：无

  使用方式：
    <EmptyState description="暂无用户数据">
      <el-button type="primary">新增用户</el-button>
    </EmptyState>
-->
<script setup lang="ts">
/**
 * 空状态展示组件逻辑
 * - 按 type 映射内置空态图，或使用自定义 image
 */
import { computed } from 'vue'

/** 组件入参定义 */
interface Props {
  /** 空态描述文案 */
  description?: string
  /** 自定义图片 URL（优先于 type 内置图） */
  image?: string
  /** 图片尺寸（px） */
  imageSize?: number
  /** 空态场景类型 */
  type?: 'default' | 'search' | 'network' | 'permission'
}

const props = withDefaults(defineProps<Props>(), {
  description: '暂无数据',
  imageSize: 200,
  type: 'default'
})

/**
 * 实际渲染的空态图片
 * @returns 自定义图片 URL，或按 type 映射的内置图标识（default 时交给 el-empty 默认图）
 */
const finalImage = computed(() => {
  if (props.image) return props.image

  switch (props.type) {
    case 'search':
      return 'search'
    case 'network':
      return 'network'
    case 'permission':
      return 'permission'
    default:
      return undefined
  }
})
</script>

<template>
  <div class="empty-state">
    <el-empty
      :description="description"
      :image="finalImage"
      :image-size="imageSize"
    >
      <slot />
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 40px 20px;
}
</style>
