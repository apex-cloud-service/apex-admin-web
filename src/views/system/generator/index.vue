<!--
  代码生成页面
  ------------------------------------------------------------------
  功能：数据源管理、表结构扫描、代码生成配置、代码生成与生成历史查询
  （当前页面未提供代码预览、模板管理和历史回滚入口）

  权限：
    - system:generator:view - 查看代码生成
    - system:generator:generate - 生成代码
-->
<template>
  <div class="generator-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>代码生成器</span>
          <div>
            <el-button type="primary" @click="handleAddDataSource" v-permission="'system:generator:create'">
              <el-icon><Plus /></el-icon>
              新增数据源
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="数据源管理" name="datasource">
          <el-table :data="datasources" border stripe v-loading="loading">
            <el-table-column prop="name" label="数据源名称" min-width="150" />
            <el-table-column prop="dbType" label="数据库类型" width="120">
              <template #default="{ row }">
                <el-tag :type="dbTypeTagMap[row.dbType]">{{ row.dbType.toUpperCase() }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="host" label="主机" min-width="150" />
            <el-table-column prop="port" label="端口" width="80" />
            <el-table-column prop="database" label="数据库" min-width="150" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                  {{ row.status === 1 ? '正常' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleTestConnection(row)" v-permission="'system:generator:test'">
                  测试连接
                </el-button>
                <el-button link type="primary" @click="handleViewTables(row)" v-permission="'system:generator:view'">
                  查看表
                </el-button>
                <el-button link type="primary" @click="handleEditDataSource(row)" v-permission="'system:generator:edit'">
                  编辑
                </el-button>
                <el-button link type="danger" @click="handleDeleteDataSource(row)" v-permission="'system:generator:delete'">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="代码生成配置" name="config">
          <div class="config-toolbar">
            <el-button type="primary" @click="handleAddConfig" v-permission="'system:generator:config:create'">
              <el-icon><Plus /></el-icon>
              新增配置
            </el-button>
          </div>
          <el-table :data="configs" border stripe v-loading="configLoading">
            <el-table-column prop="tableName" label="表名" min-width="150" />
            <el-table-column prop="businessName" label="业务名称" width="120" />
            <el-table-column prop="className" label="类名" min-width="150" />
            <el-table-column prop="moduleName" label="模块名" width="100" />
            <el-table-column prop="functionName" label="功能名称" width="120" />
            <el-table-column prop="author" label="作者" width="100" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="handleGenerate(row)" v-permission="'system:generator:generate'">
                  生成
                </el-button>
                <el-button link type="primary" @click="handleShowHistory(row)" v-permission="'system:generator:history'">
                  历史
                </el-button>
                <el-button link type="primary" @click="handleEditConfig(row)" v-permission="'system:generator:config:edit'">
                  编辑
                </el-button>
                <el-button link type="danger" @click="handleDeleteConfig(row)" v-permission="'system:generator:config:delete'">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="configQuery.page"
            v-model:page-size="configQuery.size"
            :total="configTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadConfigs"
            @current-change="loadConfigs"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="datasourceDialogVisible" :title="datasourceForm.id ? '编辑数据源' : '新增数据源'" width="600px">
      <el-form :model="datasourceForm" :rules="datasourceRules" ref="datasourceFormRef" label-width="100px">
        <el-form-item label="数据源名称" prop="name">
          <el-input v-model="datasourceForm.name" placeholder="请输入数据源名称" />
        </el-form-item>
        <el-form-item label="数据库类型" prop="dbType">
          <el-select v-model="datasourceForm.dbType" placeholder="请选择数据库类型">
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
            <el-option label="Oracle" value="oracle" />
            <el-option label="SQL Server" value="sqlserver" />
          </el-select>
        </el-form-item>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="datasourceForm.host" placeholder="请输入主机地址" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="datasourceForm.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="数据库名" prop="database">
          <el-input v-model="datasourceForm.database" placeholder="请输入数据库名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="datasourceForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="datasourceForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="datasourceForm.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="datasourceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDataSource">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="tablesDialogVisible" title="数据表列表" width="900px">
      <el-table :data="tables" border stripe v-loading="tablesLoading" max-height="500px">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="tableName" label="表名" min-width="200" />
        <el-table-column prop="tableComment" label="表注释" min-width="200" />
        <el-table-column prop="engine" label="引擎" width="100" />
        <el-table-column prop="charset" label="字符集" width="100" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewColumns(row)">查看字段</el-button>
            <el-button link type="primary" @click="handleConfigFromTable(row)">
              生成配置
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="columnsDialogVisible" :title="`字段明细 · ${columnsTableName}`" width="860px">
      <el-table :data="columns" border stripe v-loading="columnsLoading" max-height="500px">
        <el-table-column prop="columnName" label="字段名" min-width="160" />
        <el-table-column prop="dataType" label="数据类型" width="130" />
        <el-table-column prop="columnComment" label="注释" min-width="200" show-overflow-tooltip />
        <el-table-column label="主键" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.columnKey === 'PRI'" type="success" size="small">PK</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="extra" label="额外信息" width="130" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="configDialogVisible" :title="configForm.id ? '编辑生成配置' : '新增生成配置'" width="700px">
      <el-form :model="configForm" :rules="configRules" ref="configFormRef" label-width="120px">
        <el-form-item label="数据源" prop="datasourceId">
          <el-select v-model="configForm.datasourceId" placeholder="请选择数据源" @change="handleDatasourceChange">
            <el-option v-for="ds in datasources" :key="ds.id" :label="ds.name" :value="ds.id!" />
          </el-select>
        </el-form-item>
        <el-form-item label="表名" prop="tableName">
          <el-select v-model="configForm.tableName" placeholder="请选择表" filterable>
            <el-option v-for="table in tables" :key="table.tableName" :label="table.tableName" :value="table.tableName" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块名" prop="moduleName">
          <el-input v-model="configForm.moduleName" placeholder="如: system" />
        </el-form-item>
        <el-form-item label="包名" prop="packageName">
          <el-input v-model="configForm.packageName" placeholder="如: com.example.system" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="configForm.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="表前缀" prop="tablePrefix">
          <el-input v-model="configForm.tablePrefix" placeholder="如: sys_" />
        </el-form-item>
        <el-form-item label="业务名称" prop="businessName">
          <el-input v-model="configForm.businessName" placeholder="如: user" />
        </el-form-item>
        <el-form-item label="类名" prop="className">
          <el-input v-model="configForm.className" placeholder="如: User" />
        </el-form-item>
        <el-form-item label="功能名称" prop="functionName">
          <el-input v-model="configForm.functionName" placeholder="如: 用户管理" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitConfig">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="historyDialogVisible" :title="`生成历史 · ${historyConfigLabel}`" width="1000px">
      <el-table :data="history" border stripe v-loading="historyLoading">
        <el-table-column prop="id" label="历史 ID" width="90" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="generatedFiles" label="生成文件" min-width="300" show-overflow-tooltip />
        <el-table-column prop="outputPath" label="输出目录" min-width="200" show-overflow-tooltip />
        <el-table-column prop="errorMessage" label="错误信息" min-width="160" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="180" />
      </el-table>
      <el-pagination
        v-model:current-page="historyQuery.page"
        v-model:page-size="historyQuery.size"
        :total="historyTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadHistory"
        @current-change="loadHistory"
      />
    </el-dialog>
  </div>
</template>

/**
 * 代码生成器管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. 数据源管理 - 配置数据库连接,支持MySQL/PostgreSQL/Oracle/SQL Server
 * 2. 表结构扫描 - 自动扫描数据库表结构和字段信息
 * 3. 代码生成配置 - 配置生成参数(模块名、包名、作者等)
 * 4. 代码生成 - 按配置一键生成代码文件
 * 5. 生成历史 - 按配置查看生成历史（当前页面未提供代码预览、模板管理和历史回滚入口）
 *
 * 权限要求:
 * - system:generator:view - 查看权限(必需)
 * - system:generator:create - 创建数据源
 * - system:generator:edit - 编辑配置
 * - system:generator:delete - 删除操作
 * - system:generator:generate - 生成代码
 *
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  listDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSourceConnection,
  listTables,
  listGeneratorConfigs,
  createGeneratorConfig,
  updateGeneratorConfig,
  deleteGeneratorConfig,
  generateCode,
  getTableColumns,
  listGenerateHistory,
  type DataSource,
  type TableInfo,
  type ColumnInfo,
  type GeneratorConfig,
  type GenerateHistory,
} from '@/api/generator'
import type { PageQuery } from '@/types'

// 当前激活的标签页
const activeTab = ref('datasource')
// 数据源列表加载状态
const loading = ref(false)
// 数据源列表
const datasources = ref<DataSource[]>([])

// 数据库类型对应的标签颜色映射
const dbTypeTagMap: Record<string, string> = {
  mysql: 'primary',
  postgresql: 'success',
  oracle: 'warning',
  sqlserver: 'info',
}

// 数据源对话框状态
const datasourceDialogVisible = ref(false)
const datasourceFormRef = ref<FormInstance>()
// 数据源表单数据
const datasourceForm = reactive<Partial<DataSource>>({
  name: '',
  dbType: 'mysql',
  host: '',
  port: 3306,
  database: '',
  username: '',
  password: '',
  status: 1,
})

// 数据源表单验证规则
const datasourceRules: FormRules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
}

// 数据表对话框状态
const tablesDialogVisible = ref(false)
const tables = ref<TableInfo[]>([])
const tablesLoading = ref(false)
const currentDatasourceId = ref<number>()

// 生成配置相关状态
const configLoading = ref(false)
const configs = ref<GeneratorConfig[]>([])
const configQuery = reactive<PageQuery>({ page: 1, size: 10 })
const configTotal = ref(0)

const configDialogVisible = ref(false)
const configFormRef = ref<FormInstance>()
const configForm = reactive<Partial<GeneratorConfig>>({
  datasourceId: undefined,
  tableName: '',
  moduleName: '',
  packageName: '',
  author: '',
  tablePrefix: '',
  businessName: '',
  className: '',
  functionName: '',
})

const configRules: FormRules = {
  datasourceId: [{ required: true, message: '请选择数据源', trigger: 'change' }],
  tableName: [{ required: true, message: '请选择表名', trigger: 'change' }],
  moduleName: [{ required: true, message: '请输入模块名', trigger: 'blur' }],
  packageName: [{ required: true, message: '请输入包名', trigger: 'blur' }],
  businessName: [{ required: true, message: '请输入业务名称', trigger: 'blur' }],
  className: [{ required: true, message: '请输入类名', trigger: 'blur' }],
  functionName: [{ required: true, message: '请输入功能名称', trigger: 'blur' }],
}

const historyDialogVisible = ref(false)
const historyLoading = ref(false)
const history = ref<GenerateHistory[]>([])
const historyQuery = reactive<PageQuery>({ page: 1, size: 10 })
const historyTotal = ref(0)
/** 当前查看历史记录的生成配置 */
const historyConfig = ref<GeneratorConfig | null>(null)
/** 历史弹窗标题用的配置标识 */
const historyConfigLabel = ref('')

/**
 * 加载数据源列表
 */
async function loadDataSources() {
  loading.value = true
  try {
    datasources.value = await listDataSources()
  } catch (error) {
    ElMessage.error('加载数据源失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开新增数据源对话框
 */
function handleAddDataSource() {
  Object.assign(datasourceForm, {
    id: undefined,
    name: '',
    dbType: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    status: 1,
  })
  datasourceDialogVisible.value = true
}

/**
 * 打开编辑数据源对话框
 */
function handleEditDataSource(row: DataSource) {
  Object.assign(datasourceForm, { ...row, password: '' })
  datasourceDialogVisible.value = true
}

/**
 * 提交数据源表单(新增或编辑)
 */
async function submitDataSource() {
  if (!datasourceFormRef.value) return
  await datasourceFormRef.value.validate()
  try {
    if (datasourceForm.id) {
      await updateDataSource(datasourceForm.id, datasourceForm as DataSource)
      ElMessage.success('更新成功')
    } else {
      await createDataSource(datasourceForm as DataSource)
      ElMessage.success('创建成功')
    }
    datasourceDialogVisible.value = false
    await loadDataSources()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 测试数据源连接（按已保存的数据源 ID，由后端校验连通性）
 */
async function handleTestConnection(row: DataSource) {
  if (!row.id) return
  try {
    const ok = await testDataSourceConnection(row.id)
    if (ok) {
      ElMessage.success('连接成功')
    } else {
      ElMessage.error('连接失败')
    }
  } catch (error) {
    ElMessage.error('测试连接失败')
  }
}

/**
 * 查看数据源下的数据表列表（弹窗展示）
 * @param row 目标数据源行
 */
async function handleViewTables(row: DataSource) {
  if (!row.id) return
  currentDatasourceId.value = row.id
  tablesLoading.value = true
  tablesDialogVisible.value = true
  try {
    tables.value = await listTables(row.id)
  } catch (error) {
    ElMessage.error('加载表列表失败')
  } finally {
    tablesLoading.value = false
  }
}

/** 字段明细对话框可见性 */
const columnsDialogVisible = ref(false)
/** 字段明细加载中 */
const columnsLoading = ref(false)
/** 当前查看字段的表名 */
const columnsTableName = ref('')
/** 字段列表 */
const columns = ref<ColumnInfo[]>([])

/**
 * 查看数据表字段明细（复用表列表对话框所在数据源上下文）
 * @param row 目标表行
 */
async function handleViewColumns(row: TableInfo) {
  if (!currentDatasourceId.value) return
  columnsTableName.value = row.tableName
  columnsLoading.value = true
  columnsDialogVisible.value = true
  try {
    columns.value = await getTableColumns(currentDatasourceId.value, row.tableName)
  } catch (error) {
    ElMessage.error('加载字段明细失败')
  } finally {
    columnsLoading.value = false
  }
}

/**
 * 删除数据源（二次确认后删除并刷新列表）
 * @param row 目标数据源行
 */
async function handleDeleteDataSource(row: DataSource) {
  if (!row.id) return
  await ElMessageBox.confirm('确认删除该数据源?', '提示', { type: 'warning' })
  try {
    await deleteDataSource(row.id)
    ElMessage.success('删除成功')
    await loadDataSources()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

/**
 * 分页加载生成配置列表
 */
async function loadConfigs() {
  configLoading.value = true
  try {
    const result = await listGeneratorConfigs(configQuery)
    configs.value = result.list || []
    configTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载配置失败')
  } finally {
    configLoading.value = false
  }
}

/**
 * 打开新建生成配置弹窗（表单恢复默认值）
 */
function handleAddConfig() {
  Object.assign(configForm, {
    id: undefined,
    datasourceId: undefined,
    tableName: '',
    moduleName: '',
    packageName: '',
    author: '',
    tablePrefix: '',
    businessName: '',
    className: '',
    functionName: '',
  })
  configDialogVisible.value = true
}

/**
 * 打开编辑生成配置弹窗（回填所选行）
 * @param row 目标配置行
 */
function handleEditConfig(row: GeneratorConfig) {
  Object.assign(configForm, row)
  configDialogVisible.value = true
}

/**
 * 配置表单数据源变更时联动刷新可选表列表
 * @param datasourceId 新选中的数据源 ID
 */
async function handleDatasourceChange(datasourceId: number) {
  currentDatasourceId.value = datasourceId
  try {
    tables.value = await listTables(datasourceId)
  } catch (error) {
    ElMessage.error('加载表列表失败')
  }
}

/**
 * 从表列表弹窗快捷创建配置：按表名推导业务名/类名预填表单
 * @param table 所选数据表信息
 */
async function handleConfigFromTable(table: TableInfo) {
  const tableName = table.tableName
  // 去掉表前缀并把下划线命名转为大驼峰，如 sys_user_role → UserRole
  const businessName = tableName.replace(/^[a-z]+_/i, '').replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const className = businessName.charAt(0).toUpperCase() + businessName.slice(1)

  Object.assign(configForm, {
    datasourceId: currentDatasourceId.value,
    tableName,
    businessName,
    className,
    functionName: table.tableComment || className,
  })
  tablesDialogVisible.value = false
  configDialogVisible.value = true
}

/**
 * 提交生成配置：按有无 id 区分创建/更新，成功后刷新列表
 */
async function submitConfig() {
  if (!configFormRef.value) return
  await configFormRef.value.validate()
  try {
    if (configForm.id) {
      await updateGeneratorConfig(configForm.id, configForm as GeneratorConfig)
      ElMessage.success('更新成功')
    } else {
      await createGeneratorConfig(configForm as GeneratorConfig)
      ElMessage.success('创建成功')
    }
    configDialogVisible.value = false
    await loadConfigs()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 删除生成配置（二次确认后删除并刷新列表）
 * @param row 目标配置行
 */
async function handleDeleteConfig(row: GeneratorConfig) {
  if (!row.id) return
  await ElMessageBox.confirm('确认删除该配置?', '提示', { type: 'warning' })
  try {
    await deleteGeneratorConfig(row.id)
    ElMessage.success('删除成功')
    await loadConfigs()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

/**
 * 执行代码生成（确认后按配置生成全部文件）
 * @param row 目标配置行
 */
async function handleGenerate(row: GeneratorConfig) {
  if (!row.id) return
  await ElMessageBox.confirm('确认生成代码?', '提示', { type: 'info' })
  try {
    const files = await generateCode(row.id)
    const okCount = files.filter((f) => f.success !== false).length
    const failCount = files.length - okCount
    ElMessage.success(`代码生成完成，成功 ${okCount} 个文件${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
  } catch (error) {
    ElMessage.error('生成失败')
  }
}

/**
 * 打开指定配置的生成历史弹窗
 * @param row 目标配置行
 */
async function handleShowHistory(row: GeneratorConfig) {
  if (!row.id) return
  historyConfig.value = row
  historyConfigLabel.value = `${row.tableName}（${row.functionName || row.className || `#${row.id}`}）`
  historyDialogVisible.value = true
  historyQuery.page = 1
  await loadHistory()
}

/**
 * 分页加载当前配置的代码生成历史
 */
async function loadHistory() {
  if (!historyConfig.value?.id) return
  historyLoading.value = true
  try {
    const result = await listGenerateHistory(historyConfig.value.id, historyQuery)
    history.value = result.list || []
    historyTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载历史记录失败')
  } finally {
    historyLoading.value = false
  }
}

// 挂载时加载数据源与生成配置
onMounted(() => {
  loadDataSources()
  loadConfigs()
})
</script>

<style scoped lang="scss">
.generator-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-toolbar {
  margin-bottom: 16px;
}

.code-preview {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  max-height: 600px;
}
</style>
