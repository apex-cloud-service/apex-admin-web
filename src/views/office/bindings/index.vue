<!--
  办公平台绑定页面
  ------------------------------------------------------------------
  功能：用户与办公平台账号绑定、解绑操作
  
  权限：
    - office:binding:view - 查看绑定状态
    - office:binding:bind - 绑定账号
    - office:binding:unbind - 解绑账号
-->
<template>
  <div class="office-bindings-container">
    <el-card class="header-card">
      <h2>账号绑定审批管理</h2>
      <p class="description">管理用户与办公平台账号的绑定关系</p>
    </el-card>

    <el-card>
      <!-- 查询表单 -->
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="平台">
          <el-select v-model="queryForm.platform" placeholder="全部平台" clearable style="width: 150px">
            <el-option
              v-for="platform in platforms"
              :key="platform"
              :label="PLATFORM_NAMES[platform as OfficePlatform]"
              :value="platform"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="待审批" value="PENDING" />
            <el-option label="已批准" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
            <el-option label="已撤销" value="REVOKED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="bindings" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="平台" width="120">
          <template #default="{ row }">
            <el-tag :type="getPlatformTagType(row.platform)">
              {{ PLATFORM_NAMES[row.platform as OfficePlatform] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="externalUserId" label="平台用户ID" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.enabled" color="#67C23A"><CircleCheckFilled /></el-icon>
            <el-icon v-else color="#F56C6C"><CircleCloseFilled /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="版本" prop="version" width="80" align="center" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'PENDING'"
              type="success"
              size="small"
              @click="handleApprove(row)"
            >
              批准
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              type="warning"
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button
              v-if="row.status === 'APPROVED'"
              type="danger"
              size="small"
              @click="handleUnbind(row)"
            >
              解绑
            </el-button>
            <el-tag v-if="row.status === 'REJECTED'" type="info" size="small">已处理</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
        class="pagination"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台绑定审批页逻辑
 * - 按平台+状态查询绑定申请，支持批准/拒绝（PENDING）与解绑（APPROVED）
 * - 审批与解绑均携带 version 乐观锁，冲突时后端拒绝
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import {
  listBindings,
  reviewBinding,
  unbindBinding,
  PLATFORM_NAMES,
  type OfficePlatform,
  type OfficeBindingResponse,
} from '@/api/office-new'

/** ========== 状态定义 ========== */

/** 可选平台列表（与后端枚举一致） */
const platforms: OfficePlatform[] = ['FEISHU', 'DINGTALK', 'WECOM']
/** 列表请求进行中 */
const loading = ref(false)
/** 绑定记录列表 */
const bindings = ref<OfficeBindingResponse[]>([])

/** 查询条件（平台 + 状态） */
const queryForm = reactive({
  platform: '' as OfficePlatform | '',
  status: '',
})

/** 分页状态（页码/条数/总数） */
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
})

/** ========== 展示辅助 ========== */

/**
 * 平台对应的标签颜色
 * @param platform 平台类型
 * @returns el-tag 类型
 */
const getPlatformTagType = (platform: OfficePlatform) => {
  const typeMap: Record<OfficePlatform, any> = {
    FEISHU: 'primary',
    DINGTALK: 'success',
    WECOM: 'warning',
  }
  return typeMap[platform as OfficePlatform] || ''
}

/**
 * 绑定状态对应的标签颜色
 * @param status 绑定状态
 * @returns el-tag 类型
 */
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, any> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    REVOKED: 'info',
  }
  return typeMap[status] || 'info'
}

/**
 * 绑定状态的中文文案
 * @param status 绑定状态
 * @returns 中文文案（未知状态原样返回）
 */
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    PENDING: '待审批',
    APPROVED: '已批准',
    REJECTED: '已拒绝',
    REVOKED: '已撤销',
  }
  return textMap[status] || status
}

/** ========== 查询操作 ========== */

/**
 * 加载绑定列表（必须先选择平台；后端暂未返回 total，以当前页条数模拟）
 */
const loadBindings = async () => {
  if (!queryForm.platform) {
    ElMessage.warning('请选择平台')
    return
  }

  loading.value = true
  try {
    const data = await listBindings(
      queryForm.platform as OfficePlatform,
      pagination.page,
      pagination.size,
    )
    bindings.value = data
    // 注意：后端暂未返回 total，这里模拟分页
    pagination.total = data.length
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

/**
 * 查询：重置回第一页后加载
 */
const handleQuery = () => {
  pagination.page = 1
  loadBindings()
}

/**
 * 重置查询条件并清空列表
 */
const handleReset = () => {
  queryForm.platform = ''
  queryForm.status = ''
  bindings.value = []
  pagination.total = 0
}

/** ========== 审批与解绑操作 ========== */

/**
 * 批准绑定申请（二次确认 + version 乐观锁）
 * @param row 目标绑定记录
 */
const handleApprove = async (row: OfficeBindingResponse) => {
  try {
    await ElMessageBox.confirm(
      `确定要批准用户 ${row.userId} 与 ${PLATFORM_NAMES[row.platform as OfficePlatform]} 的绑定吗？`,
      '批准绑定',
      {
        type: 'success',
      },
    )

    await reviewBinding(row.id, {
      approved: true,
      version: row.version,
    })

    ElMessage.success('批准成功')
    await loadBindings()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批准失败')
    }
  }
}

/**
 * 拒绝绑定申请（二次确认 + version 乐观锁）
 * @param row 目标绑定记录
 */
const handleReject = async (row: OfficeBindingResponse) => {
  try {
    await ElMessageBox.confirm(
      `确定要拒绝用户 ${row.userId} 与 ${PLATFORM_NAMES[row.platform as OfficePlatform]} 的绑定吗？`,
      '拒绝绑定',
      {
        type: 'warning',
      },
    )

    await reviewBinding(row.id, {
      approved: false,
      version: row.version,
    })

    ElMessage.success('拒绝成功')
    await loadBindings()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '拒绝失败')
    }
  }
}

/**
 * 解除已批准的绑定（二次确认 + version 乐观锁，解绑后无法再通过该平台登录）
 * @param row 目标绑定记录
 */
const handleUnbind = async (row: OfficeBindingResponse) => {
  try {
    await ElMessageBox.confirm(
      `确定要解绑用户 ${row.userId} 与 ${PLATFORM_NAMES[row.platform as OfficePlatform]} 的账号吗？解绑后用户将无法通过该平台登录。`,
      '解绑账号',
      {
        type: 'error',
      },
    )

    await unbindBinding(row.id, row.version)
    ElMessage.success('解绑成功')
    await loadBindings()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '解绑失败')
    }
  }
}

// 默认不加载列表，等用户先选择平台再查询
onMounted(() => {
  // 默认不加载，等用户选择平台
})
</script>

<style scoped lang="scss">
.office-bindings-container {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .query-form {
    margin-bottom: 16px;
  }

  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
