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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, CircleCloseFilled, Clock } from '@element-plus/icons-vue'
import { officeCallback, PLATFORM_NAMES, type OfficePlatform } from '@/api/office-new'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const error = ref(false)
const needApproval = ref(false)
const errorMessage = ref('')
const platform = ref<OfficePlatform>('FEISHU')

const platformName = computed(() => PLATFORM_NAMES[platform.value])

const handleCallback = async () => {
  try {
    // 获取 URL 参数
    const code = route.query.code as string
    const state = route.query.state as string
    platform.value = (route.query.platform as OfficePlatform) || 'FEISHU'

    if (!code || !state) {
      throw new Error('缺少必要的回调参数')
    }

    // 调用回调接口
    const result = await officeCallback(platform.value, code, state)

    // 保存登录态
    localStorage.setItem('access_token', result.accessToken)
    localStorage.setItem('refresh_token', result.refreshToken)

    // 加载用户信息
    await userStore.loadUserInfo()

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

const goToLogin = () => {
  router.push('/login')
}

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
