<!--
  办公会议室管理
  ------------------------------------------------------------------
  会议室台账分页查询（含状态筛选）与 CRUD、时间段可用性查询、预订。

  权限要求：
  - office:meeting-room:manage - 新增/编辑/删除会议室
  - office:meeting-room:read - 查询可用会议室
  - office:meeting-room:book - 预订会议室
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>会议室管理</span>
        <el-button type="primary" :icon="Plus" @click="openRoomDialog()" v-permission="'office:meeting-room:manage'">新增会议室</el-button>
      </div>
    </template>

    <el-form :inline="true" class="query-form">
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="编码/名称" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="启用" value="ENABLED" />
          <el-option label="停用" value="DISABLED" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button @click="availableVisible = true" v-permission="'office:meeting-room:read'">查询可用</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="roomCode" label="编码" width="140" />
      <el-table-column prop="roomName" label="名称" min-width="160" />
      <el-table-column prop="capacity" label="容量" width="80" />
      <el-table-column prop="location" label="位置" min-width="150" />
      <el-table-column prop="floor" label="楼层" width="90" />
      <el-table-column label="设备" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ equipmentText(row.equipment) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">
            {{ row.status === 'ENABLED' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openRoomDialog(row)" v-permission="'office:meeting-room:manage'">编辑</el-button>
          <el-button link type="success" @click="openBookingDialog(row)" v-permission="'office:meeting-room:book'">预订</el-button>
          <el-button link type="danger" @click="handleDelete(row)" v-permission="'office:meeting-room:manage'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" @change="onPageChange" />

    <!-- 会议室编辑 -->
    <el-dialog v-model="roomVisible" :title="roomForm.id ? '编辑会议室' : '新增会议室'" width="580px">
      <el-form ref="roomFormRef" :model="roomForm" :rules="roomRules" label-width="100px">
        <el-form-item label="编码" prop="roomCode"><el-input v-model="roomForm.roomCode" :disabled="!!roomForm.id" /></el-form-item>
        <el-form-item label="名称" prop="roomName"><el-input v-model="roomForm.roomName" /></el-form-item>
        <el-form-item label="容量" prop="capacity"><el-input-number v-model="roomForm.capacity" :min="1" :controls="false" /></el-form-item>
        <el-form-item label="位置"><el-input v-model="roomForm.location" /></el-form-item>
        <el-form-item label="楼层"><el-input v-model="roomForm.floor" /></el-form-item>
        <el-form-item label="设备">
          <el-select v-model="roomForm.equipment" multiple filterable allow-create default-first-option style="width: 100%" placeholder="输入后回车添加" />
        </el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="roomForm.status"><el-radio value="ENABLED">启用</el-radio><el-radio value="DISABLED">停用</el-radio></el-radio-group></el-form-item>
        <el-form-item label="备注"><el-input v-model="roomForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="roomVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitRoom">保存</el-button></template>
    </el-dialog>

    <!-- 时间段可用性 -->
    <el-dialog v-model="availableVisible" title="查询可用会议室" width="700px">
      <el-form :inline="true">
        <el-form-item label="开始"><el-date-picker v-model="availableForm.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="结束"><el-date-picker v-model="availableForm.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item><el-button type="primary" @click="queryAvailable">查询</el-button></el-form-item>
      </el-form>
      <el-table :data="availableRooms" border stripe><el-table-column prop="roomCode" label="编码" /><el-table-column prop="roomName" label="名称" /><el-table-column prop="capacity" label="容量" width="80" /><el-table-column prop="location" label="位置" /></el-table>
    </el-dialog>

    <!-- 预订 -->
    <el-dialog v-model="bookingVisible" title="预订会议室" width="520px">
      <el-form ref="bookingFormRef" :model="bookingForm" :rules="bookingRules" label-width="90px">
        <el-form-item label="会议室"><span>{{ bookingRoom?.roomName }}（{{ bookingRoom?.roomCode }}）</span></el-form-item>
        <el-form-item label="标题"><el-input v-model="bookingForm.title" placeholder="会议主题（选填）" /></el-form-item>
        <el-form-item label="开始" prop="startTime"><el-date-picker v-model="bookingForm.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="结束" prop="endTime"><el-date-picker v-model="bookingForm.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="bookingVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitBooking">预订</el-button></template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import Pagination from '@/components/Pagination.vue'
import { showError } from '@/utils/request'
import { bookMeetingRoom, createMeetingRoom, deleteMeetingRoom, listAvailableMeetingRooms, listMeetingRooms, updateMeetingRoom, type MeetingRoom, type CreateMeetingRoomPayload, type BookMeetingRoomPayload } from '@/api/meeting-room'

const loading = ref(false)
const saving = ref(false)
const list = ref<MeetingRoom[]>([])
const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 10, keyword: undefined as string | undefined, status: undefined as string | undefined })
const roomVisible = ref(false)
const roomFormRef = ref<FormInstance>()
const roomForm = reactive<CreateMeetingRoomPayload & { id?: number }>({ roomCode: '', roomName: '', capacity: 1, equipment: [], status: 'ENABLED', id: undefined })
const roomRules: FormRules = { roomCode: [{ required: true, message: '请输入编码', trigger: 'blur' }], roomName: [{ required: true, message: '请输入名称', trigger: 'blur' }], capacity: [{ required: true, message: '请输入容量', trigger: 'blur' }] }
const availableVisible = ref(false)
const availableForm = reactive({ startTime: '', endTime: '' })
const availableRooms = ref<MeetingRoom[]>([])
const bookingVisible = ref(false)
const bookingRoom = ref<MeetingRoom | null>(null)
const bookingFormRef = ref<FormInstance>()
const bookingForm = reactive<BookMeetingRoomPayload>({ title: '', startTime: '', endTime: '' })
const bookingRules: FormRules = { startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }], endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }] }

function equipmentText(value?: string | string[]): string { if (!value) return '-'; if (Array.isArray(value)) return value.join('、'); try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.join('、') : value } catch { return value } }
async function fetchList(): Promise<void> { loading.value = true; try { const result = await listMeetingRooms(query); list.value = result.list || []; total.value = result.total } catch (error) { showError(error, '加载会议室失败') } finally { loading.value = false } }
function search(): void { query.pageNum = 1; fetchList() }
function reset(): void { query.keyword = undefined; query.status = undefined; search() }
function onPageChange(page: number, size: number): void { query.pageNum = page; query.pageSize = size; fetchList() }
function openRoomDialog(row?: MeetingRoom): void { Object.assign(roomForm, { id: row?.id, roomCode: row?.roomCode || '', roomName: row?.roomName || '', capacity: row?.capacity || 1, location: row?.location, floor: row?.floor, equipment: Array.isArray(row?.equipment) ? row.equipment : [], status: row?.status || 'ENABLED', remark: row?.remark }); roomVisible.value = true }
async function submitRoom(): Promise<void> { if (!roomFormRef.value) return; await roomFormRef.value.validate(); saving.value = true; try { const { id, ...payload } = roomForm; if (id) await updateMeetingRoom(id, payload); else await createMeetingRoom(payload); ElMessage.success('保存成功'); roomVisible.value = false; fetchList() } catch (error) { showError(error, '保存失败') } finally { saving.value = false } }
async function handleDelete(row: MeetingRoom): Promise<void> { try { await ElMessageBox.confirm(`确认删除会议室「${row.roomName}」？`, '提示', { type: 'warning' }); await deleteMeetingRoom(row.id); ElMessage.success('删除成功'); fetchList() } catch (error) { if (error !== 'cancel') showError(error, '删除失败') } }
async function queryAvailable(): Promise<void> { if (!availableForm.startTime || !availableForm.endTime) { ElMessage.warning('请选择时间范围'); return } try { availableRooms.value = await listAvailableMeetingRooms(availableForm.startTime, availableForm.endTime) } catch (error) { showError(error, '查询失败') } }
function openBookingDialog(row: MeetingRoom): void { bookingRoom.value = row; Object.assign(bookingForm, { title: '', startTime: '', endTime: '' }); bookingVisible.value = true }
async function submitBooking(): Promise<void> { if (!bookingFormRef.value || !bookingRoom.value) return; await bookingFormRef.value.validate(); saving.value = true; try { await bookMeetingRoom(bookingRoom.value.id, { ...bookingForm }); ElMessage.success('预订成功'); bookingVisible.value = false } catch (error) { showError(error, '预订失败') } finally { saving.value = false } }
onMounted(fetchList)
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.query-form { margin-bottom: 8px; }
</style>
