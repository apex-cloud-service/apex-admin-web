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
/**
 * 全局搜索组件逻辑
 * - 顶栏搜索入口，防抖调用 Meilisearch 全文搜索接口
 * - 搜索结果按资源类型跳转到对应管理页（携带 ?id= 定位）
 */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { search, type SearchResult } from '@/api/search'
import { ElMessage } from 'element-plus'

/** ========== 组件状态 ========== */

const router = useRouter()
/** 搜索弹层是否可见 */
const visible = ref(false)
/** 搜索关键词 */
const keyword = ref('')
/** 搜索请求进行中 */
const loading = ref(false)
/** 搜索结果列表 */
const results = ref<SearchResult[]>([])
/** 当前页码 */
const page = ref(1)
/** 每页结果条数 */
const pageSize = ref(10)
/** 结果总数 */
const total = ref(0)

/** ========== 关键词防抖 ========== */

// 关键词变化后 300ms 内无新输入才触发搜索（防抖）
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

/**
 * 执行搜索：按当前关键词与页码请求后端，回填结果与总数
 */
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

/**
 * 点击搜索结果：按资源类型跳转到对应管理页并携带 id 定位
 *
 * @param item 被点击的搜索结果项
 */
function handleClick(item: SearchResult): void {
  // 资源类型 → 管理页路由映射（新增可搜索资源类型时需同步维护）
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

/**
 * 资源类型显示名称
 *
 * @param type 后端资源类型标识（如 user/role/menu）
 * @returns 中文类型名（未知类型原样返回）
 */
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

/**
 * 资源类型对应的标签颜色
 *
 * @param type 后端资源类型标识
 * @returns el-tag 类型（未知类型返回默认色）
 */
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
