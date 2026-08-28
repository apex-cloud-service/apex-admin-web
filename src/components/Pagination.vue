<!--
  通用分页组件
  ------------------------------------------------------------------
  基于 el-pagination 封装，内置分页参数与变更回调，
  供各列表页面统一复用（当前页/每页条数/总数）。
-->
<template>
  <el-pagination
    v-model:current-page="current"
    v-model:page-size="pageSize"
    :total="total"
    :page-sizes="PAGE_SIZE_OPTIONS"
    layout="total, sizes, prev, pager, next, jumper"
    background
    @current-change="onChange"
    @size-change="onSizeChange"
  />
</template>

<script setup lang="ts">
/**
 * Pagination 组件脚本
 * - props：total 总数
 * - emits：change 页码或每页条数变化（携带最新分页参数）
 */
import { ref, watch } from 'vue'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/settings'

/** 组件对外暴露属性 */
const props = defineProps<{ total: number }>()

/** 事件：change 分页参数变化 */
const emit = defineEmits<{ (e: 'change', page: number, size: number): void }>()

/** 当前页码 */
const current = ref(1)
/** 每页条数 */
const pageSize = ref(DEFAULT_PAGE_SIZE)

/** 总数变化时：若当前页超出范围则回退到最后一页 */
watch(
  () => props.total,
  (total) => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
    if (current.value > maxPage) {
      current.value = maxPage
      emit('change', current.value, pageSize.value)
    }
  },
)

/** 页码变化回调 */
function onChange(page: number): void {
  emit('change', page, pageSize.value)
}

/** 每页条数变化回调（重置到第一页） */
function onSizeChange(size: number): void {
  pageSize.value = size
  current.value = 1
  emit('change', 1, size)
}
</script>
