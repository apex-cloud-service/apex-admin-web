<!--
  知识检索页面
  ------------------------------------------------------------------
  功能：基于知识库的全文/语义混合检索（embedding 未启用时自动词法兜底），
        展示高亮片段与命中来源（空间/文档）。
  权限要求：kb:search:query（检索接口）。
  菜单组件路径：knowledge/search/index
-->
<template>
  <div class="search-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识检索</span>
          <el-tag v-if="searched" :type="result?.hybridUsed ? 'success' : 'info'" size="small">
            {{ result?.hybridUsed ? '语义+词法混合' : '词法检索' }}
          </el-tag>
        </div>
      </template>

      <el-form inline :model="queryForm" class="query-form" @submit.prevent>
        <el-form-item label="空间">
          <el-select v-model="queryForm.spaceIds" multiple collapse-tags placeholder="全部空间" style="width: 260px">
            <el-option v-for="space in spaces" :key="space.id" :label="space.name" :value="space.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="queryForm.keyword"
            placeholder="输入关键词，Enter 检索"
            clearable
            style="width: 420px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" :loading="loading" @click="handleSearch">检索</el-button>
        </el-form-item>
      </el-form>

      <el-empty v-if="searched && !loading && (result?.items.length ?? 0) === 0" description="未检索到相关内容" />

      <div v-for="item in result?.items ?? []" :key="item.chunkId" class="hit-item">
        <div class="hit-meta">
          <el-tag size="small" type="primary">{{ item.spaceName || '未命名空间' }}</el-tag>
          <span class="hit-title">{{ item.documentTitle }}</span>
          <span class="hit-score">相关度 {{ (item.score * 100).toFixed(1) }}%</span>
        </div>
        <!-- highlight 为索引引擎返回的高亮片段；无高亮时回退正文截断 -->
        <div class="hit-content" v-html="renderHighlight(item)"></div>
      </div>

      <Pagination v-if="(result?.total ?? 0) > 0" :total="result?.total ?? 0" @change="handlePageChange" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { listKbSpaces, searchKnowledge } from '@/api/knowledge'
import type { KbSearchItem, KbSearchResult, KnowledgeSpace } from '@/types'
import { showError } from '@/utils/request'
import Pagination from '@/components/Pagination.vue'

const loading = ref(false)
const searched = ref(false)
const spaces = ref<KnowledgeSpace[]>([])
const result = ref<KbSearchResult | null>(null)

const queryForm = reactive({ keyword: '', spaceIds: [] as number[], page: 1, size: 10 })

/** 加载空间选择器数据 */
async function fetchSpaces(): Promise<void> {
  try {
    spaces.value = await listKbSpaces()
  } catch (error) {
    showError(error, '加载空间列表失败')
  }
}

/** 执行检索 */
async function handleSearch(): Promise<void> {
  if (!queryForm.keyword.trim()) {
    result.value = null
    searched.value = false
    return
  }
  loading.value = true
  try {
    result.value = await searchKnowledge({
      keyword: queryForm.keyword,
      spaceIds: queryForm.spaceIds,
      page: queryForm.page,
      size: queryForm.size,
    })
    searched.value = true
  } catch (error) {
    showError(error, '知识检索失败')
  } finally {
    loading.value = false
  }
}

/** 分页变化（重新检索） */
function handlePageChange(page: number, size: number): void {
  queryForm.page = page
  queryForm.size = size
  void handleSearch()
}

/**
 * 渲染索引引擎返回的高亮片段，缺少高亮时回退正文；超过 320 个字符时截断并追加省略号。
 * 转义内容后仅恢复 <em> 标签，不直接信任服务端 HTML；检索响应为 JSON，不是 SSE。
 * @param item 检索命中条目（highlight 可为空）
 * @returns 仅允许 <em> 高亮标记的 HTML 片段
 */
function renderHighlight(item: KbSearchItem): string {
  const source = item.highlight && item.highlight.trim().length > 0 ? item.highlight : item.content
  const truncated = source.length > 320 ? `${source.slice(0, 320)}…` : source
  // 转义全部 HTML 后仅放行服务端 <em> 标记
  const escaped = truncated
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>')
}

onMounted(() => {
  void fetchSpaces()
})
</script>

<style scoped>
.search-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-form {
  margin-bottom: 8px;
}

.hit-item {
  padding: 12px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.hit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.hit-title {
  font-weight: 600;
}

.hit-score {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.hit-content {
  color: #606266;
  line-height: 1.7;
  font-size: 13px;
}

.hit-content :deep(em) {
  color: var(--el-color-danger);
  font-style: normal;
  font-weight: 600;
}
</style>
