<!--
  办公平台日历管理页面
  ------------------------------------------------------------------
  功能：
  - 日历视图（按月展示当日事件，点击日期查询）
  - 事件列表（日期筛选、分页）
  - 事件创建 / 查看 / 编辑 / 删除

  权限要求：
  - office:calendar:create - 创建事件
  - office:calendar:query - 查看事件详情
  - office:calendar:update - 编辑事件
  - office:calendar:delete - 删除事件
-->
<template>
  <div class="office-calendar-container">
    <el-card class="header-card">
      <div class="header-content">
        <h2>日历管理</h2>
        <div class="header-actions">
          <el-select v-model="queryParams.platform" placeholder="选择平台" clearable style="width: 150px" @change="handleQuery">
            <el-option label="飞书" value="FEISHU" />
            <el-option label="钉钉" value="DINGTALK" />
            <el-option label="企业微信" value="WECOM" />
          </el-select>
          <el-button type="primary" :icon="Plus" @click="handleCreate" v-permission="'office:calendar:create'">创建事件</el-button>
        </div>
      </div>
    </el-card>

    <!-- 日历视图 -->
    <el-card class="calendar-card">
      <el-calendar v-model="currentDate">
        <template #date-cell="{ data }">
          <div class="calendar-day" @click="handleDayClick(data.day)">
            <p class="day-number">{{ data.day.split('-').slice(2).join('-') }}</p>
            <div v-if="getEventsForDay(data.day).length > 0" class="event-dots">
              <el-badge
                v-for="event in getEventsForDay(data.day).slice(0, 3)"
                :key="event.id"
                :type="getEventBadgeType(event.status)"
                is-dot
              />
              <span v-if="getEventsForDay(data.day).length > 3" class="more-events">
                +{{ getEventsForDay(data.day).length - 3 }}
              </span>
            </div>
          </div>
        </template>
      </el-calendar>
    </el-card>

    <!-- 事件列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>事件列表</span>
          <el-radio-group v-model="queryParams.status" @change="handleQuery">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="SCHEDULED">计划中</el-radio-button>
            <el-radio-button label="COMPLETED">已完成</el-radio-button>
            <el-radio-button label="CANCELLED">已取消</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table v-loading="loading" :data="eventList" stripe>
        <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="平台" width="100">
          <template #default="{ row }">
            <el-tag :type="getPlatformTagType(row.platform)">
              {{ PLATFORM_NAMES[row.platform as unknown as keyof typeof PLATFORM_NAMES] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="地点" prop="location" width="150" show-overflow-tooltip />
        <el-table-column label="参与人数" width="100">
          <template #default="{ row }">
            {{ row.attendeeIds?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)" v-permission="'office:calendar:query'">查看</el-button>
            <el-button link type="primary" @click="handleEdit(row)" v-permission="'office:calendar:update'">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-permission="'office:calendar:delete'">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
      />
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="平台" prop="platform">
          <el-select v-model="formData.platform" placeholder="请选择平台" :disabled="isEdit">
            <el-option label="飞书" value="FEISHU" />
            <el-option label="钉钉" value="DINGTALK" />
            <el-option label="企业微信" value="WECOM" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入事件标题" />
        </el-form-item>
        <el-form-item label="事件描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入事件描述"
          />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="formData.startTime"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-model="formData.endTime"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="地点" prop="location">
          <el-input v-model="formData.location" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="参与人" prop="attendeeIds">
          <el-select
            v-model="formData.attendeeIds"
            multiple
            filterable
            placeholder="请选择参与人"
            style="width: 100%"
          >
            <!-- 这里需要从用户列表API获取数据 -->
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="全天事件">
          <el-switch v-model="formData.allDay" />
        </el-form-item>
        <el-form-item label="提醒" prop="reminderMinutes">
          <el-select v-model="formData.reminderMinutes" placeholder="请选择提醒时间">
            <el-option label="不提醒" :value="undefined" />
            <el-option label="事件开始时" :value="0" />
            <el-option label="5分钟前" :value="5" />
            <el-option label="15分钟前" :value="15" />
            <el-option label="30分钟前" :value="30" />
            <el-option label="1小时前" :value="60" />
            <el-option label="1天前" :value="1440" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailVisible" title="事件详情" width="600px">
      <el-descriptions v-if="currentEvent" :column="2" border>
        <el-descriptions-item label="平台">
          <el-tag :type="getPlatformTagType(currentEvent.platform)">
            {{ PLATFORM_NAMES[currentEvent.platform] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentEvent.status)">
            {{ getStatusText(currentEvent.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">
          {{ currentEvent.title }}
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ currentEvent.description || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="开始时间">
          {{ formatDateTime(currentEvent.startTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="结束时间">
          {{ formatDateTime(currentEvent.endTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="地点" :span="2">
          {{ currentEvent.location || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="全天事件">
          {{ currentEvent.allDay ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="提醒">
          {{ getReminderText(currentEvent.reminderMinutes) }}
        </el-descriptions-item>
        <el-descriptions-item label="参与人" :span="2">
          <el-tag
            v-for="attendee in currentEvent.attendees"
            :key="attendee.userId"
            style="margin-right: 8px"
          >
            {{ attendee.userName }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(currentEvent.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDateTime(currentEvent.updateTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  type CalendarEvent,
  type CreateEventRequest,
  type UpdateEventRequest,
  type CalendarEventsQuery,
} from '@/api/office-calendar'
import { PLATFORM_NAMES, type OfficePlatform } from '@/api/office-platform'
import { listUsers } from '@/api/user'
import { showError } from '@/utils/request'

// ==================== 页面状态管理 ====================
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)

// ==================== 日历相关数据 ====================
const currentDate = ref(new Date())
const eventList = ref<CalendarEvent[]>([])
const allEvents = ref<CalendarEvent[]>([])
const total = ref(0)
const currentEvent = ref<CalendarEvent>()
const formRef = ref<FormInstance>()
const userList = ref<Array<{ id: string; name: string }>>([])

// ==================== 查询参数 ====================
const queryParams = reactive<CalendarEventsQuery>({
  platform: undefined,
  status: undefined,
  startTime: undefined,
  endTime: undefined,
  pageNum: 1,
  pageSize: 20,
})

// ==================== 表单数据 ====================
// 默认表单数据生成器
const defaultFormData = (): CreateEventRequest & Partial<UpdateEventRequest> => ({
  platform: 'FEISHU',
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  attendeeIds: [],
  allDay: false,
  reminderMinutes: 15,
})

// 日历事件表单数据
const formData = reactive<CreateEventRequest & Partial<UpdateEventRequest>>(defaultFormData())

// 日历事件表单验证规则
const formRules: FormRules = {
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
  title: [{ required: true, message: '请输入事件标题', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  attendeeIds: [{ required: true, message: '请选择参与人', trigger: 'change' }],
}

// 计算属性
const dialogTitle = computed(() => (isEdit.value ? '编辑事件' : '创建事件'))

/**
 * 加载日历事件列表
 */
const handleQuery = async () => {
  loading.value = true
  try {
    const res = await getCalendarEvents(queryParams)
    eventList.value = res.list
    total.value = res.total
    
    // 同时加载所有事件用于日历显示
    await loadAllEvents()
  } catch (error) {
    showError(error, '查询失败')
  } finally {
    loading.value = false
  }
}

/** 拉取当月全部事件到本地缓存（供月历视图展示） */
const loadAllEvents = async () => {
  try {
    const startOfMonth = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
    const endOfMonth = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0, 23, 59, 59)
    
    const res = await getCalendarEvents({
      startTime: startOfMonth.toISOString(),
      endTime: endOfMonth.toISOString(),
      pageNum: 1,
      pageSize: 1000,
    })
    allEvents.value = res.list
  } catch (error) {
    console.error('加载月度事件失败:', error)
  }
}

/** 过滤出指定日期的事件 */
const getEventsForDay = (day: string) => {
  return allEvents.value.filter(event => {
    const eventDate = new Date(event.startTime).toISOString().split('T')[0]
    return eventDate === day
  })
}

/** 点击月历某天：设置当天起止时间并查询事件列表 */
const handleDayClick = (day: string) => {
  queryParams.startTime = `${day} 00:00:00`
  queryParams.endTime = `${day} 23:59:59`
  handleQuery()
}

/** 重置表单并打开新增事件弹窗 */
const handleCreate = () => {
  isEdit.value = false
  Object.assign(formData, defaultFormData())
  dialogVisible.value = true
}

/** 加载事件详情回填表单并打开编辑弹窗 */
const handleEdit = async (row: CalendarEvent) => {
  isEdit.value = true
  try {
    const event = await getCalendarEvent(row.id)
    Object.assign(formData, {
      platform: event.platform,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      attendeeIds: event.attendeeIds,
      allDay: event.allDay,
      reminderMinutes: event.reminderMinutes,
    })
    currentEvent.value = event
    dialogVisible.value = true
  } catch (error) {
    showError(error, '加载事件详情失败')
  }
}

/** 加载事件详情并打开查看弹窗 */
const handleView = async (row: CalendarEvent) => {
  try {
    const event = await getCalendarEvent(row.id)
    currentEvent.value = event
    detailVisible.value = true
  } catch (error) {
    showError(error, '加载事件详情失败')
  }
}

/**
 * 删除日历事件
 */
const handleDelete = async (row: CalendarEvent) => {
  try {
    await ElMessageBox.confirm(`确定要删除事件"${row.title}"吗？`, '提示', {
      type: 'warning',
    })
    await deleteCalendarEvent(row.id)
    ElMessage.success('删除成功')
    handleQuery()
  } catch (error) {
    if (error !== 'cancel') {
      showError(error, '删除失败')
    }
  }
}

/**
 * 提交日历事件表单(新增或编辑)
 */
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEdit.value && currentEvent.value) {
        const updateReq: UpdateEventRequest = {
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          attendeeIds: formData.attendeeIds,
          allDay: formData.allDay,
          reminderMinutes: formData.reminderMinutes,
        }
        await updateCalendarEvent(currentEvent.value.id, updateReq)
        ElMessage.success('更新成功')
      } else {
        await createCalendarEvent(formData as CreateEventRequest)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      handleQuery()
    } catch (error) {
      showError(error, '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

/** 弹窗关闭时重置表单校验状态 */
const handleDialogClose = () => {
  formRef.value?.resetFields()
}

/** 平台 → 标签类型映射 */
const getPlatformTagType = (platform: OfficePlatform) => {
  const typeMap: Record<OfficePlatform, any> = {
    FEISHU: 'primary',
    DINGTALK: 'success',
    WECOM: 'warning',
  }
  return typeMap[platform] || ''
}

/** 事件状态 → 标签类型映射 */
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, any> = {
    SCHEDULED: '',
    COMPLETED: 'success',
    CANCELLED: 'info',
  }
  return typeMap[status] || ''
}

/** 事件状态 → 中文文案映射 */
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    SCHEDULED: '计划中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  }
  return textMap[status] || status
}

/** 事件状态 → 月历徽标颜色映射 */
const getEventBadgeType = (status: string) => {
  const typeMap: Record<string, any> = {
    SCHEDULED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'info',
  }
  return typeMap[status] || 'primary'
}

/** 提醒时间（分钟）→ 展示文案（不提醒/事件开始时/N分钟前 等） */
const getReminderText = (minutes?: number) => {
  if (minutes === undefined || minutes === null) return '不提醒'
  if (minutes === 0) return '事件开始时'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${minutes / 60}小时前`
  return `${minutes / 1440}天前`
}

/** ISO 时间 → "YYYY-MM-DD HH:mm:ss" 展示，空值返回 "-" */
const formatDateTime = (dateTime?: string) => {
  if (!dateTime) return '-'
  return dateTime.replace('T', ' ').substring(0, 19)
}

// 生命周期
onMounted(() => {
  handleQuery()
  // 加载用户列表，供「参与人」下拉框选择（失败不阻断页面，下拉框留空）
  loadUserList()
})

/**
 * 加载用户列表（参与人选择器数据源）
 * 取前 100 个用户，映射为 {id, name} 供下拉框渲染
 */
const loadUserList = async () => {
  try {
    const res = await listUsers({ page: 1, size: 100 })
    userList.value = (res.list || []).map((u) => ({ id: u.id, name: u.nickname }))
  } catch {
    // 用户列表拉取失败时参与人下拉框为空，不阻断日程管理主流程
  }
}
</script>

<style scoped lang="scss">
.office-calendar-container {
  padding: 16px;
  
  .header-card {
    margin-bottom: 16px;
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }
      
      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }
  
  .calendar-card {
    margin-bottom: 16px;
    
    .calendar-day {
      height: 80px;
      cursor: pointer;
      padding: 4px;
      
      &:hover {
        background-color: #f5f7fa;
      }
      
      .day-number {
        margin: 0;
        font-size: 14px;
        color: #606266;
      }
      
      .event-dots {
        margin-top: 4px;
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        
        .more-events {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
  
  .list-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    :deep(.el-table) {
      margin-bottom: 16px;
    }
  }
}
</style>
