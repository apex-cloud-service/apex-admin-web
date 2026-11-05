<!--
  办公平台配置页面
  ------------------------------------------------------------------
  功能：飞书、钉钉、企业微信平台配置管理（AppId、AppSecret、回调 URL）

  权限：
    - office:app:create - 创建平台配置
    - office:app:update - 编辑平台配置
    - office:app:delete - 删除平台配置
-->
<template>
  <div class="office-config-container">
    <el-card class="header-card">
      <h2>办公平台应用配置</h2>
      <p class="description">管理飞书、钉钉、企业微信的应用配置信息</p>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="8" v-for="platform in platforms" :key="platform">
        <el-card class="platform-card" :class="{ disabled: !getAppConfig(platform)?.enabled }">
          <template #header>
            <div class="card-header">
              <span class="platform-name">{{ PLATFORM_NAMES[platform] }}</span>
              <el-tag :type="getAppConfig(platform)?.enabled ? 'success' : 'info'" size="small">
                {{ getAppConfig(platform)?.enabled ? '已启用' : '未启用' }}
              </el-tag>
            </div>
          </template>

          <div class="config-info" v-if="getAppConfig(platform)">
            <div class="info-item">
              <span class="label">应用ID:</span>
              <span class="value">{{ getAppConfig(platform)?.appId || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">回调地址:</span>
              <span class="value ellipsis" :title="getAppConfig(platform)?.redirectUri">
                {{ getAppConfig(platform)?.redirectUri || '-' }}
              </span>
            </div>
          </div>
          <div class="no-config" v-else>
            <el-empty description="未配置" :image-size="60" />
          </div>

          <div class="actions">
            <el-button
              type="primary"
              size="small"
              @click="openEditDialog(platform)"
              v-permission="'office:app:update'"
              v-if="getAppConfig(platform)"
            >
              编辑配置
            </el-button>
            <el-button type="success" size="small" @click="openCreateDialog(platform)" v-else v-permission="'office:app:create'">
              创建配置
            </el-button>
            <el-button
              type="danger"
              size="small"
              v-permission="'office:app:delete'"
              @click="handleDelete(platform)"
              v-if="getAppConfig(platform)"
            >
              删除
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑/创建对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="140px">
        <el-form-item label="平台类型">
          <el-input v-model="currentPlatformName" disabled />
        </el-form-item>
        <el-form-item label="应用ID" prop="appId">
          <el-input v-model="form.appId" placeholder="飞书 App ID / 钉钉 AppKey / 企微 CorpID" />
        </el-form-item>
        <el-form-item label="密钥环境变量" prop="secretReference">
          <el-input
            v-model="form.secretReference"
            placeholder="如 FEISHU_SECRET"
          >
            <template #append>
              <el-tooltip content="密钥通过环境变量引用，不保存明文" placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="回调地址" prop="redirectUri">
          <el-input
            v-model="form.redirectUri"
            placeholder="https://your-domain.com/api/v1/office/callback"
          />
        </el-form-item>
        <el-form-item label="签名密钥环境变量">
          <el-input
            v-model="form.signingSecretReference"
            placeholder="可选，用于验证事件回调"
          />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台配置页逻辑
 * - 三平台配置卡片展示 + 创建/编辑/删除（密钥以环境变量引用，不回显明文）
 * - 更新/删除均携带 version 乐观锁，冲突时后端拒绝
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import {
  listApps,
  createApp,
  updateApp,
  deleteApp,
  PLATFORM_NAMES,
  type OfficePlatform,
  type OfficeAppResponse,
  type OfficeAppRequest,
} from '@/api/office-platform'

/** ========== 状态定义 ========== */

/** 管理的三大平台（固定顺序渲染卡片） */
const platforms: OfficePlatform[] = ['FEISHU', 'DINGTALK', 'WECOM']
/** 各平台应用配置（keyed 查询见 getAppConfig） */
const apps = ref<OfficeAppResponse[]>([])
/** 创建/编辑弹窗是否可见 */
const dialogVisible = ref(false)
/** 提交按钮 loading */
const submitLoading = ref(false)
/** 弹窗模式：true=编辑已有配置，false=创建新配置 */
const isEdit = ref(false)
/** 当前操作的目标平台 */
const currentPlatform = ref<OfficePlatform>('FEISHU')
/** 表单实例（校验/重置用） */
const formRef = ref<FormInstance>()

/** 配置表单（密钥字段为环境变量引用，不回显明文） */
const form = reactive<OfficeAppRequest>({
  appId: '',
  secretReference: '',
  redirectUri: '',
  signingSecretReference: '',
  enabled: true,
})

/** 表单校验规则 */
const rules: FormRules = {
  appId: [{ required: true, message: '请输入应用ID', trigger: 'blur' }],
  secretReference: [{ required: true, message: '请输入密钥环境变量', trigger: 'blur' }],
  redirectUri: [
    { required: true, message: '请输入回调地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' },
  ],
}

/** 弹窗标题（区分创建/编辑模式） */
const dialogTitle = computed(() => {
  const platformName = PLATFORM_NAMES[currentPlatform.value]
  return isEdit.value ? `编辑${platformName}配置` : `创建${platformName}配置`
})

/** 当前平台中文名称（表单内只读展示） */
const currentPlatformName = computed(() => PLATFORM_NAMES[currentPlatform.value])

/** ========== 配置读取与展示 ========== */

/**
 * 获取指定平台的配置项
 * @param platform 平台类型
 * @returns 对应配置（未配置时返回 undefined）
 */
const getAppConfig = (platform: OfficePlatform) => {
  return apps.value.find((app) => app.platform === platform)
}

/**
 * 加载全部平台配置（挂载与增删改后调用）
 */
const loadApps = async () => {
  try {
    apps.value = await listApps()
  } catch (error) {
    ElMessage.error('加载配置失败')
  }
}

/** ========== 配置维护操作 ========== */

/**
 * 打开创建配置弹窗
 * @param platform 目标平台
 */
const openCreateDialog = (platform: OfficePlatform) => {
  isEdit.value = false
  currentPlatform.value = platform
  dialogVisible.value = true
}

/**
 * 打开编辑配置弹窗（密钥引用不回显，需重新填写）
 * @param platform 目标平台
 */
const openEditDialog = (platform: OfficePlatform) => {
  const app = getAppConfig(platform)
  if (!app) return

  isEdit.value = true
  currentPlatform.value = platform
  Object.assign(form, {
    appId: app.appId,
    secretReference: '',
    redirectUri: app.redirectUri,
    signingSecretReference: '',
    enabled: app.enabled,
  })
  dialogVisible.value = true
}

/**
 * 提交配置：按弹窗模式调用创建/更新接口（更新携带 version 乐观锁）
 */
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value) {
        const app = getAppConfig(currentPlatform.value)
        if (!app) return
        await updateApp(currentPlatform.value, app.version, form)
        ElMessage.success('更新成功')
      } else {
        await createApp(currentPlatform.value, form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      await loadApps()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

/**
 * 删除平台配置（二次确认 + version 乐观锁）
 * @param platform 目标平台
 */
const handleDelete = async (platform: OfficePlatform) => {
  const app = getAppConfig(platform)
  if (!app) return

  try {
    await ElMessageBox.confirm(`确定要删除${PLATFORM_NAMES[platform]}的配置吗？`, '提示', {
      type: 'warning',
    })
    await deleteApp(platform, app.version)
    ElMessage.success('删除成功')
    await loadApps()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

/**
 * 重置表单（弹窗关闭时由 @close 触发）
 */
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    appId: '',
    secretReference: '',
    redirectUri: '',
    signingSecretReference: '',
    enabled: true,
  })
}

// 挂载时加载全部平台配置
onMounted(() => {
  loadApps()
})
</script>

<style scoped lang="scss">
.office-config-container {
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

  .platform-card {
    margin-bottom: 20px;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &.disabled {
      opacity: 0.7;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .platform-name {
        font-size: 16px;
        font-weight: 600;
      }
    }

    .config-info {
      min-height: 100px;

      .info-item {
        margin-bottom: 12px;
        display: flex;

        .label {
          width: 80px;
          color: #666;
          flex-shrink: 0;
        }

        .value {
          flex: 1;
          color: #333;

          &.ellipsis {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .no-config {
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;

      .el-button {
        flex: 1;
      }
    }
  }
}
</style>
