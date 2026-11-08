<!--
  办公平台授权回调页（静态路由 /office/callback）
  ------------------------------------------------------------------
  承接飞书/钉钉/企微 OAuth2 授权完成后的重定向：
    1. 提取回调参数（code/state/platform）
    2. 调用 officeCallback 用授权码换取会话令牌
    3. 保存登录态并加载用户身份，成功跳工作台
    4. 平台账号未绑定时提示「等待管理员审批」，其余失败提示错误

  后端接口：
    - GET /api/v1/office/callback - 办公平台授权回调（见 api/office-platform.ts）

  Props / Emits：无（路由页面）
-->
<template>
  <div class="office-callback-container">
    <el-card class="callback-card">
      <div v-if="loading" class="loading-content">
        <el-icon class="loading-icon" :size="50"><Loading /></el-icon>
        <div class="loading-text">正在处理{{ platformName }}登录...</div>
        <div class="loading-desc">请稍候，即将跳转到主页</div>
      </div>

      <div v-else-if="error" class="error-content">
        <el-icon class="error-icon" :size="50"><CircleCloseFilled /></el-icon>
        <div class="error-text">登录失败</div>
        <div class="error-desc">{{ errorMessage }}</div>
        <el-button type="primary" @click="goToLogin" class="action-btn">
          返回登录页
        </el-button>
      </div>

      <div v-else-if="needApproval" class="approval-content">
        <el-icon class="approval-icon" :size="50"><Clock /></el-icon>
        <div class="approval-text">等待管理员审批</div>
        <div class="approval-desc">
          您的{{ platformName }}账号绑定申请已提交，请等待管理员审批后再次登录
        </div>
        <el-button type="primary" @click="goToLogin" class="action-btn">
          返回登录页
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台授权回调处理逻辑
 * - 挂载后自动执行 handleCallback 完成登录换取
 * - 页面展示三种状态：处理中 / 等待审批 / 登录失败
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { Loading, CircleCloseFilled, Clock } from '@element-plus/icons-vue'
import { officeCallback, PLATFORM_NAMES, type OfficePlatform } from '@/api/office-platform'
import { setToken, setRefreshToken, removeRefreshToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

/** 是否处于登录处理中 */
const loading = ref(true)
/** 是否登录失败 */
const error = ref(false)
/** 平台账号是否待管理员审批（绑定流程） */
const needApproval = ref(false)
/** 登录失败文案 */
const errorMessage = ref('')
/** 本次回调对应的平台类型（缺省飞书） */
const platform = ref<OfficePlatform>('FEISHU')

/** 当前平台的中文名称（文案展示用） */
const platformName = computed(() => PLATFORM_NAMES[platform.value])

/**
 * 执行授权回调：换取令牌 → 保存登录态 → 加载身份 → 跳转主页
 * 绑定待审批与一般失败分别落在 needApproval / error 状态
 */
const handleCallback = async () => {
  try {
    // 获取 URL 参数
    const code = route.query.code as string
    const state: string | undefined = route.query.state as string
    platform.value = (route.query.platform as OfficePlatform) || 'FEISHU'

    if (!code || !state) {
      throw new Error('缺少必要的回调参数')
    }

    // 调用回调接口
    const result = await officeCallback(platform.value, code, state)

    // 保存登录态：统一走 auth.ts 工具函数（键为 apex.admin.token 等），
    // 禁止直接操作 localStorage——旧实现写入 access_token 键，
    // 拦截器经 getToken() 读取不到，会导致后续请求缺失 Bearer Token
    setToken(result.accessToken)
    userStore.token = result.accessToken
    removeRefreshToken()
    if (result.refreshToken) {
      setRefreshToken(result.refreshToken)
    }

    // 加载用户身份（用户信息/角色/权限码，与 oauth2 回调页保持同一入口）
    await userStore.loadIdentity()

    ElMessage.success(`${platformName.value}登录成功`)

    // 跳转到主页
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  } catch (err: any) {
    loading.value = false

    // 判断是否需要审批
    if (err.message?.includes('等待审批') || err.message?.includes('PENDING')) {
      needApproval.value = true
    } else {
      error.value = true
      errorMessage.value = err.message || '登录失败，请重试'
    }
  }
}

/**
 * 返回登录页（失败/待审批场景的操作按钮回调）
 */
const goToLogin = () => {
  router.push('/login')
}

// 挂载即开始处理授权回调
onMounted(() => {
  handleCallback()
})
</script>

<style scoped lang="scss">
.office-callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .callback-card {
    width: 400px;
    text-align: center;

    .loading-content,
    .error-content,
    .approval-content {
      padding: 40px 20px;

      .loading-icon,
      .error-icon,
      .approval-icon {
        margin-bottom: 20px;
      }

      .loading-icon {
        color: #409eff;
        animation: rotate 1s linear infinite;
      }

      .error-icon {
        color: #f56c6c;
      }

      .approval-icon {
        color: #e6a23c;
      }

      .loading-text,
      .error-text,
      .approval-text {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 12px;
      }

      .loading-desc,
      .error-desc,
      .approval-desc {
        font-size: 14px;
        color: #909399;
        line-height: 1.6;
      }

      .action-btn {
        margin-top: 24px;
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
