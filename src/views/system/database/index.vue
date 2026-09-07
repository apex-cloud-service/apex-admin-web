<!--
  数据库配置采集页
  ------------------------------------------------------------------
  定位：部署配置采集与导出工具，不是运行时数据库管理控制台。
  功能：数据库类型选择、连接参数填写、连接测试、配置导出。
  安全边界：密码不长期保存，仅用于一次性生成配置。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>数据库配置采集</span>
        <el-tag type="info" size="small">部署配置生成工具</el-tag>
      </div>
    </template>

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
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import {
  testDatabaseConnection,
  generateDeploymentConfig,
  getCurrentDatabaseInfo
} from '@/api/database'
import type { DatabaseConfig, CurrentDatabaseInfo } from '@/types'

const formRef = ref<FormInstance>()
const testing = ref(false)
const generating = ref(false)

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

const formRules: FormRules = {
  dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  environment: [{ required: true, message: '请选择部署环境', trigger: 'change' }]
}

const currentDb = ref<CurrentDatabaseInfo | null>(null)

const exportDialog = reactive({
  visible: false,
  activeTab: 'yaml',
  yaml: '',
  env: '',
  dockerCompose: ''
})

const handleDbTypeChange = () => {
  if (form.dbType === 'mysql') {
    form.port = 3306
  } else if (form.dbType === 'postgresql') {
    form.port = 5432
  }
}

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
  } catch (error: any) {
    if (error?.constructor?.name !== 'Error') {
      showError(error)
    }
  } finally {
    testing.value = false
  }
}

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

const handleReset = () => {
  formRef.value?.resetFields()
  form.password = ''
  form.connectionParams = ''
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const fetchCurrentDb = async () => {
  try {
    currentDb.value = await getCurrentDatabaseInfo()
  } catch (error) {
    console.error('获取当前数据库信息失败:', error)
  }
}

onMounted(() => {
  fetchCurrentDb()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
