<!--
  空状态展示组件
  ------------------------------------------------------------------
  列表/表格/搜索结果为空时的友好提示，基于 el-empty 二次封装。
  支持描述、自定义图片与场景类型字段；search/network/permission 使用
  仓库内 SVG 资产，default 使用 el-empty 默认图。
  默认插槽用于放置操作按钮（如「新增」）。

  Props：
    - description: 空态描述文案
    - image: 自定义图片 URL（优先于 type 对应的场景图）
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
 * - 自定义 image 优先；否则按 type 选择仓库内场景 SVG
 * - default 场景不传 image，交给 el-empty 默认图
 */
import { computed } from 'vue'
import emptySearch from '@/assets/empty/search.svg'
import emptyNetwork from '@/assets/empty/network.svg'
import emptyPermission from '@/assets/empty/permission.svg'

/** 空态场景类型 */
type EmptyStateType = 'default' | 'search' | 'network' | 'permission'

/** 组件入参定义 */
interface Props {
  /** 空态描述文案 */
  description?: string
  /** 自定义图片 URL（优先于 type 对应的场景图） */
  image?: string
  /** 图片尺寸（px） */
  imageSize?: number
  /** 空态场景类型 */
  type?: EmptyStateType
}

/** 场景 → 内置图片资产（default 不在映射内，使用 el-empty 默认图） */
const SCENE_IMAGES: Record<Exclude<EmptyStateType, 'default'>, string> = {
  search: emptySearch,
  network: emptyNetwork,
  permission: emptyPermission,
}

const props = withDefaults(defineProps<Props>(), {
  description: '暂无数据',
  imageSize: 200,
  type: 'default'
})

/**
 * 实际渲染的空态图片
 * @returns 自定义图片 URL，或按 type 解析的场景 SVG 地址；default 返回 undefined 使用 el-empty 默认图
 */
const finalImage = computed(() => {
  if (props.image) return props.image
  if (props.type === 'default') return undefined
  return SCENE_IMAGES[props.type]
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
