<!--
  数据库配置页
  ------------------------------------------------------------------
  两个模块：
  - 配置采集：部署配置采集与导出工具（连接测试、YAML/env/Compose 生成），
    密码仅用于一次性生成配置，不保存。
  - 数据源管理：数据源台账 CRUD 与连接池指标查看（后端不回显明文，url/username 已脱敏）。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>数据库配置</span>
        <el-tag type="info" size="small">配置采集与数据源管理</el-tag>
      </div>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="配置采集" name="collect">
    <el-alert
      title="安全提示"
      type="warning"
      :closable="false"
      style="margin-bottom: 20px"
    >
      此页面用于生成部署配置，密码仅用于一次性测试和配置导出，不会被保存。
    </el-alert>

    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="120px"
      style="max-width: 800px"
    >
      <el-form-item label="数据库类型" prop="dbType">
        <el-radio-group v-model="form.dbType" @change="handleDbTypeChange">
          <el-radio value="mysql">MySQL</el-radio>
          <el-radio value="postgresql">PostgreSQL</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="主机地址" prop="host">
        <el-input v-model="form.host" placeholder="如 localhost 或 192.168.1.100" />
      </el-form-item>

      <el-form-item label="端口" prop="port">
        <el-input-number
          v-model="form.port"
          :min="1"
          :max="65535"
          :controls="false"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="数据库名" prop="database">
        <el-input v-model="form.database" placeholder="数据库名称" />
      </el-form-item>

      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="数据库用户名" />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="数据库密码（不保存）"
          show-password
        />
      </el-form-item>

      <el-form-item label="连接参数">
        <el-input
          v-model="form.connectionParams"
          type="textarea"
          :rows="2"
          placeholder="可选，如 useSSL=false&serverTimezone=Asia/Shanghai"
        />
      </el-form-item>

      <el-form-item label="部署环境" prop="environment">
        <el-radio-group v-model="form.environment">
          <el-radio value="dev">开发环境</el-radio>
          <el-radio value="test">测试环境</el-radio>
          <el-radio value="prod">生产环境</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="testing" @click="handleTest">
          测试连接
        </el-button>
        <el-button type="success" :loading="generating" @click="handleGenerate">
          生成配置
        </el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 当前数据库信息 -->
    <el-divider />
    <div v-if="currentDb" class="current-db-info">
      <h3>当前数据库信息</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="数据库类型">
          <el-tag>{{ currentDb.type }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="数据库版本">
          {{ currentDb.version }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentDb.driverVersion" label="驱动版本">
          {{ currentDb.driverVersion }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
      </el-tab-pane>

      <!-- 数据源管理 -->
      <el-tab-pane label="数据源管理" name="datasources">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openDsDialog()">
            <el-icon><Plus /></el-icon>
            新增数据源
          </el-button>
        </div>
        <el-table v-loading="dsLoading" :data="dataSources" border stripe>
          <el-table-column prop="name" label="名称" width="160" />
          <el-table-column prop="type" label="类型" width="110" />
          <el-table-column prop="driver" label="驱动" min-width="200" show-overflow-tooltip />
          <el-table-column prop="url" label="连接地址" min-width="220" show-overflow-tooltip />
          <el-table-column prop="username" label="用户名" width="130" />
          <el-table-column prop="activeConnections" label="活跃连接" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'UP' ? 'success' : 'info'" size="small">
                {{ row.status || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="showMetrics(row)">指标</el-button>
              <el-button link type="primary" @click="openDsDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteDs(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <Pagination class="pager" :total="dsTotal" @change="onDsPageChange" />
      </el-tab-pane>
    </el-tabs>

    <!-- 配置导出弹窗 -->
    <el-dialog v-model="exportDialog.visible" title="部署配置" width="80%" top="5vh">
      <el-tabs v-model="exportDialog.activeTab">
        <el-tab-pane label="YAML 配置" name="yaml">
          <div class="code-block">
            <el-button
              size="small"
              :icon="CopyDocument"
              @click="copyToClipboard(exportDialog.yaml)"
            >
              复制
            </el-button>
            <pre>{{ exportDialog.yaml }}</pre>
          </div>
        </el-tab-pane>

        <el-tab-pane label="环境变量" name="env">
          <div class="code-block">
            <el-button
              size="small"
              :icon="CopyDocument"
              @click="copyToClipboard(exportDialog.env)"
            >
              复制
            </el-button>
            <pre>{{ exportDialog.env }}</pre>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="exportDialog.dockerCompose" label="Docker Compose" name="docker">
          <div class="code-block">
            <el-button
              size="small"
              :icon="CopyDocument"
              @click="copyToClipboard(exportDialog.dockerCompose)"
            >
              复制
            </el-button>
            <pre>{{ exportDialog.dockerCompose }}</pre>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="exportDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 数据源编辑对话框 -->
    <el-dialog
      v-model="dsDialog.visible"
      :title="dsDialog.form.id ? '编辑数据源' : '新增数据源'"
      width="640px"
    >
      <el-form ref="dsFormRef" :model="dsDialog.form" :rules="dsRules" label-width="110px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="dsDialog.form.name" placeholder="数据源名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="dsDialog.form.type" style="width: 100%">
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
          </el-select>
        </el-form-item>
        <el-form-item label="驱动" prop="driver">
          <el-input v-model="dsDialog.form.driver" placeholder="如 com.mysql.cj.jdbc.Driver" />
        </el-form-item>
        <el-form-item label="连接地址" prop="url">
          <el-input v-model="dsDialog.form.url" placeholder="JDBC 连接地址" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="dsDialog.form.username" placeholder="数据库用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="dsDialog.form.password"
            type="password"
            show-password
            placeholder="数据库密码（编辑时需重新输入，后端不回显）"
          />
        </el-form-item>
        <el-form-item label="最小空闲" prop="minIdle">
          <el-input-number v-model="dsDialog.form.minIdle" :min="1" :controls="false" />
        </el-form-item>
        <el-form-item label="最大连接" prop="maxPoolSize">
          <el-input-number v-model="dsDialog.form.maxPoolSize" :min="1" :controls="false" />
        </el-form-item>
        <el-form-item label="连接超时" prop="connectionTimeout">
          <el-input-number v-model="dsDialog.form.connectionTimeout" :min="1000" :step="1000" :controls="false" />
          <span class="unit-hint">ms</span>
        </el-form-item>
        <el-form-item label="空闲超时" prop="idleTimeout">
          <el-input-number v-model="dsDialog.form.idleTimeout" :min="10000" :step="10000" :controls="false" />
          <span class="unit-hint">ms</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dsDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dsSaving" @click="submitDataSource">确定</el-button>
      </template>
    </el-dialog>

    <!-- 连接池指标对话框 -->
    <el-dialog v-model="metricsVisible" title="连接池指标" width="560px">
      <el-descriptions v-if="metrics" :column="2" border>
        <el-descriptions-item label="总连接数">{{ metrics.totalConnections ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="活跃连接">{{ metrics.activeConnections ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="空闲连接">{{ metrics.idleConnections ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="等待线程">{{ metrics.waitingThreads ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="平均获取耗时">{{ metrics.averageGetTime ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="平均使用耗时">{{ metrics.averageUsageTime ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="最大等待时长">{{ metrics.maxWaitTime ?? '-' }} ms</el-descriptions-item>
        <el-descriptions-item label="累计创建">{{ metrics.totalConnectionsCreated ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="累计失败">{{ metrics.totalConnectionsFailed ?? '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="metricsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 数据库配置页逻辑
 * - 配置采集：填写连接参数 → 测试连接 → 生成 YAML/env/docker-compose 部署配置
 *   （密码仅用于一次性测试与配置生成，不保存不回显）
 * - 数据源管理：数据源台账 CRUD 与连接池指标查看（后端不回显明文）
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { CopyDocument, Plus } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import Pagination from '@/components/Pagination.vue'
import {
  testDatabaseConnection,
  generateDeploymentConfig,
  getCurrentDatabaseInfo,
  listDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  getDataSourceMetrics
} from '@/api/database'
import type { DatabaseConfig, CurrentDatabaseInfo, DataSourceInfo, DataSourceMetrics, DataSourcePayload } from '@/types'

/** ========== 状态定义 ========== */

/** 当前激活的标签页 */
const activeTab = ref('collect')

/** 表单实例（校验/重置用） */
const formRef = ref<FormInstance>()
/** 连接测试进行中 */
const testing = ref(false)
/** 配置生成进行中 */
const generating = ref(false)

/** 连接配置表单（密码仅前端暂存，不落库） */
const form = reactive<DatabaseConfig & { password: string }>({
  dbType: 'mysql',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  connectionParams: '',
  environment: 'dev'
})

/** 表单校验规则 */
const formRules: FormRules = {
  dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  environment: [{ required: true, message: '请选择部署环境', trigger: 'change' }]
}

/** 当前环境数据库信息（只读展示，拉取失败不影响主流程） */
const currentDb = ref<CurrentDatabaseInfo | null>(null)

/** 配置导出弹窗（YAML/env/docker-compose 三种格式切换） */
const exportDialog = reactive({
  visible: false,
  activeTab: 'yaml',
  yaml: '',
  env: '',
  dockerCompose: ''
})

/** ========== 交互处理 ========== */

/**
 * 数据库类型切换时联动默认端口（MySQL=3306，PostgreSQL=5432）
 */
const handleDbTypeChange = () => {
  if (form.dbType === 'mysql') {
    form.port = 3306
  } else if (form.dbType === 'postgresql') {
    form.port = 5432
  }
}

/**
 * 测试数据库连接：校验通过后调用连接测试接口并提示结果
 */
const handleTest = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    testing.value = true

    const result = await testDatabaseConnection(form)

    if (result.success) {
      ElMessage.success(`连接成功！${result.version ? '版本: ' + result.version : ''}`)
    } else {
      ElMessage.error(result.message || '连接失败')
    }
  } catch (error) {
    // 表单校验失败抛出的 Error 已由表单提示，无需重复展示
    if (error?.constructor?.name !== 'Error') {
      showError(error)
    }
  } finally {
    testing.value = false
  }
}

/**
 * 生成部署配置：校验通过后生成三种格式并在弹窗中展示
 */
const handleGenerate = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    generating.value = true

    const result = await generateDeploymentConfig(form)

    exportDialog.yaml = result.yaml
    exportDialog.env = result.env
    exportDialog.dockerCompose = result.dockerCompose || ''
    exportDialog.activeTab = 'yaml'
    exportDialog.visible = true

    ElMessage.success('配置生成成功')
  } catch (error) {
    showError(error)
  } finally {
    generating.value = false
  }
}

/**
 * 重置表单（含密码与连接参数）
 */
const handleReset = () => {
  formRef.value?.resetFields()
  form.password = ''
  form.connectionParams = ''
}

/**
 * 复制配置内容到剪贴板
 * @param text 待复制的配置文本
 */
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

/**
 * 拉取当前环境数据库信息（只读展示，失败仅记录日志）
 */
const fetchCurrentDb = async () => {
  try {
    currentDb.value = await getCurrentDatabaseInfo()
  } catch (error) {
    console.error('获取当前数据库信息失败:', error)
  }
}

/** ========== 数据源管理 ========== */

/** 数据源列表加载中 */
const dsLoading = ref(false)
/** 数据源列表 */
const dataSources = ref<DataSourceInfo[]>([])
/** 页码 */
const dsPage = ref(1)
/** 每页条数 */
const dsSize = ref(10)
/** 总数 */
const dsTotal = ref(0)
/** 数据源编辑对话框 */
const dsDialog = reactive<{ visible: boolean; form: DataSourcePayload & { id?: number } }>({
  visible: false,
  form: {
    id: undefined,
    name: '',
    type: 'mysql',
    driver: 'com.mysql.cj.jdbc.Driver',
    url: '',
    username: '',
    password: '',
    minIdle: 5,
    maxPoolSize: 20,
    connectionTimeout: 30000,
    idleTimeout: 600000
  }
})
/** 数据源表单实例 */
const dsFormRef = ref<FormInstance>()
/** 保存中 */
const dsSaving = ref(false)
/** 数据源校验规则（新增与编辑密码均必填：后端 @NotBlank，编辑需重新输入） */
const dsRules: FormRules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  driver: [{ required: true, message: '请输入驱动类', trigger: 'blur' }],
  url: [{ required: true, message: '请输入连接地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
/** 连接池指标对话框 */
const metricsVisible = ref(false)
/** 当前展示的指标 */
const metrics = ref<DataSourceMetrics | null>(null)

/**
 * 加载数据源当前页
 */
const loadDataSources = async () => {
  dsLoading.value = true
  try {
    const result = await listDataSources(dsPage.value, dsSize.value)
    dataSources.value = result.list || []
    dsTotal.value = result.total
  } catch (error) {
    showError(error, '加载数据源失败')
  } finally {
    dsLoading.value = false
  }
}

/**
 * 数据源分页变化
 */
const onDsPageChange = (page: number, size: number) => {
  dsPage.value = page
  dsSize.value = size
  loadDataSources()
}

/**
 * 打开数据源编辑对话框（无参为新增）
 */
const openDsDialog = (row?: DataSourceInfo) => {
  Object.assign(dsDialog.form, {
    id: row?.id,
    name: row?.name ?? '',
    type: row?.type ?? 'mysql',
    driver: row?.driver ?? 'com.mysql.cj.jdbc.Driver',
    url: row?.url ?? '',
    username: row?.username ?? '',
    password: '',
    // 超时缺省取 HikariCP 默认（连接 30000ms、空闲 600000ms）；池大小 minIdle=5/maxPoolSize=20 为页面预设
    minIdle: 5,
    maxPoolSize: 20,
    connectionTimeout: 30000,
    idleTimeout: 600000
  })
  dsDialog.visible = true
}

/**
 * 提交数据源新增/编辑（密码新增与编辑均必填：后端 @NotBlank，编辑须重新输入，留空无法通过校验）
 */
const submitDataSource = async () => {
  if (!dsFormRef.value) return
  try {
    await dsFormRef.value.validate()
  } catch {
    return
  }
  dsSaving.value = true
  try {
    if (dsDialog.form.id) {
      await updateDataSource(dsDialog.form.id, { ...dsDialog.form })
      ElMessage.success('数据源已更新')
    } else {
      await createDataSource({ ...dsDialog.form })
      ElMessage.success('数据源已创建')
    }
    dsDialog.visible = false
    await loadDataSources()
  } catch (error) {
    showError(error, '保存数据源失败')
  } finally {
    dsSaving.value = false
  }
}

/**
 * 删除数据源（确认后提交）
 */
const handleDeleteDs = async (row: DataSourceInfo) => {
  try {
    await ElMessageBox.confirm(`确认删除数据源「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteDataSource(row.id)
    ElMessage.success('数据源已删除')
    await loadDataSources()
  } catch (error) {
    showError(error, '删除数据源失败')
  }
}

/**
 * 查看数据源连接池指标
 */
const showMetrics = async (row: DataSourceInfo) => {
  try {
    metrics.value = await getDataSourceMetrics(row.id)
    metricsVisible.value = true
  } catch (error) {
    showError(error, '获取连接池指标失败')
  }
}

// 挂载时拉取当前数据库信息与数据源列表
onMounted(() => {
  fetchCurrentDb()
  loadDataSources()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tab-toolbar {
  margin-bottom: 16px;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.unit-hint {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.current-db-info {
  margin-top: 20px;
}

.current-db-info h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.code-block {
  position: relative;
}

.code-block .el-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.code-block pre {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  overflow: auto;
  max-height: 400px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}
</style>
