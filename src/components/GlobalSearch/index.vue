<!--
  全局搜索组件
  ------------------------------------------------------------------
  基于 Meilisearch 的全文搜索：用户/角色/菜单/部门/字典/配置
-->
<template>
  <div class="global-search">
    <el-popover
      v-model:visible="visible"
      :width="600"
      trigger="click"
      placement="bottom-start"
    >
      <template #reference>
        <el-input
          v-model="keyword"
          placeholder="搜索..."
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
          @focus="visible = true"
          style="width: 300px"
        />
      </template>

      <div v-loading="loading" class="search-results">
        <div v-if="results.length === 0 && !loading" class="no-data">
          {{ keyword ? '暂无搜索结果' : '请输入关键词搜索' }}
        </div>

        <div v-else class="result-list">
          <div
            v-for="item in results"
            :key="item.resourceId"
            class="result-item"
            @click="handleClick(item)"
          >
            <div class="result-header">
              <el-tag :type="getTagType(item.resourceType)" size="small">
                {{ getTypeName(item.resourceType) }}
              </el-tag>
              <span class="result-title">{{ item.title }}</span>
            </div>
            <div v-if="item.subtitle" class="result-subtitle">
              {{ item.subtitle }}
            </div>
            <div v-if="item.description" class="result-description">
              {{ item.description }}
            </div>
          </div>
        </div>

        <div v-if="total > pageSize" class="result-footer">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            small
            @current-change="handleSearch"
          />
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { search, type SearchResult } from '@/api/search'
import { ElMessage } from 'element-plus'

const router = useRouter()
const visible = ref(false)
const keyword = ref('')
const loading = ref(false)
const results = ref<SearchResult[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 防抖搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, (val) => {
  if (!val) {
    results.value = []
    total.value = 0
    return
  }

  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    handleSearch()
  }, 300)
})

async function handleSearch(): Promise<void> {
  if (!keyword.value) return

  loading.value = true
  try {
    const res = await search({
      keyword: keyword.value,
      page: page.value,
      size: pageSize.value,
    })
    results.value = res.list || []
    total.value = res.total || 0
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

function handleClick(item: SearchResult): void {
  // 根据资源类型跳转到对应页面
  const routes: Record<string, string> = {
    user: '/system/user',
    role: '/system/role',
    menu: '/system/menu',
    dept: '/system/dept',
    dict: '/system/dict',
    config: '/system/config',
  }

  const route = routes[item.resourceType]
  if (route) {
    router.push(`${route}?id=${item.resourceId}`)
  }
  visible.value = false
}

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    user: '用户',
    role: '角色',
    menu: '菜单',
    dept: '部门',
    dict: '字典',
    config: '配置',
  }
  return names[type] || type
}

function getTagType(type: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' | '' {
  const types: Record<string, 'success' | 'warning' | 'info' | 'primary' | 'danger' | ''> = {
    user: 'success',
    role: 'warning',
    menu: 'info',
    dept: 'primary',
    dict: 'danger',
    config: '',
  }
  return types[type] || ''
}
</script>

<style scoped>
.search-results {
  max-height: 500px;
  overflow-y: auto;
}

.no-data {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
}

.result-list {
  padding: 10px 0;
}

.result-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: var(--el-fill-color-light);
}

.result-item:last-child {
  border-bottom: none;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.result-subtitle {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}

.result-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.result-footer {
  padding: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}
</style>
