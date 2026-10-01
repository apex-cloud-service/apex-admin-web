<!--
  登录页
  ------------------------------------------------------------------
  账号密码 + 图形验证码登录（PASSWORD 登录方式），
  登录成功后按 redirect 参数跳转（默认进入工作台）。
-->
<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="login-title">Apex Scaffold 管理后台</h2>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <!-- 账号 -->
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" clearable />
        </el-form-item>
        <!-- 密码 -->
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <!-- 图形验证码 -->
        <el-form-item prop="captchaCode">
          <div class="captcha-row">
            <el-input
              v-model="form.captchaCode"
              placeholder="验证码（点击图片刷新）"
              :prefix-icon="Key"
              maxlength="6"
            />
            <img
              v-if="captchaImage"
              :src="captchaImage"
              class="captcha-img"
              alt="验证码"
              title="点击刷新验证码"
              @click="loadCaptcha"
            />
          </div>
        </el-form-item>
        <!-- 登录按钮 -->
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider>其他登录方式</el-divider>

      <div class="social-login">
        <el-tooltip content="微信登录" placement="top">
          <el-button :icon="ChatDotRound" circle size="large" @click="handleSocialLogin('wechat')" />
        </el-tooltip>
        <el-tooltip content="GitHub 登录" placement="top">
          <svg class="social-icon" viewBox="0 0 1024 1024" @click="handleSocialLogin('github')">
            <path d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v126.293333c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667" />
          </svg>
        </el-tooltip>
        <el-tooltip content="钉钉登录" placement="top">
          <svg class="social-icon dingtalk-icon" viewBox="0 0 1024 1024" @click="handleSocialLogin('dingtalk')">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m244.5 337.7c-23.1 0-41.8 18.8-41.8 41.8 0 23.1 18.8 41.8 41.8 41.8s41.8-18.8 41.8-41.8c0-23-18.7-41.8-41.8-41.8z m-489 0c-23.1 0-41.8 18.8-41.8 41.8 0 23.1 18.8 41.8 41.8 41.8s41.8-18.8 41.8-41.8c0-23-18.7-41.8-41.8-41.8z m244.5 292c-77.2 0-139.7-62.5-139.7-139.7s62.5-139.7 139.7-139.7 139.7 62.5 139.7 139.7-62.5 139.7-139.7 139.7z m0-223.5c-46.3 0-83.8 37.5-83.8 83.8s37.5 83.8 83.8 83.8 83.8-37.5 83.8-83.8-37.5-83.8-83.8-83.8z" fill="#1296db"/>
          </svg>
        </el-tooltip>
        <el-tooltip content="飞书登录" placement="top">
          <svg class="social-icon feishu-icon" viewBox="0 0 1024 1024" @click="handleSocialLogin('feishu')">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 736c-159.1 0-288-128.9-288-288s128.9-288 288-288 288 128.9 288 288-128.9 288-288 288z" fill="#00d6b9"/>
            <path d="M512 288c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224-100.3-224-224-224z m0 384c-88.4 0-160-71.6-160-160s71.6-160 160-160 160 71.6 160 160-71.6 160-160 160z" fill="#00d6b9"/>
          </svg>
        </el-tooltip>
        <el-tooltip content="企业微信登录" placement="top">
          <svg class="social-icon wecom-icon" viewBox="0 0 1024 1024" @click="handleSocialLogin('wecom')">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m213.3 572.3c-7.1 1.4-11.3-6.9-6.4-12.4 57.8-64.7 81.7-141.1 42.8-213.8-36.2-67.6-116.3-99.8-192.3-77.4-76 22.4-123.5 94-113.8 171.6 9.7 77.5 70.6 136.5 146.2 141.5 75.6 5 141.1-36.2 157.3-107.4 1.4-6.1 8.5-9.3 13.5-6.1 5 3.2 6.4 9.7 3.2 14.7-38.3 76-123.5 120.2-213.8 110.5-90.2-9.7-160.2-80.3-169.9-169.9-9.7-89.6 51.7-168.7 136.5-186.2 84.8-17.5 169.9 31.2 201.1 115.3 31.2 84.1 3.2 173.4-85.5 219.6z" fill="#4fc3f7"/>
          </svg>
        </el-tooltip>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录页脚本
 * - 表单校验：账号/密码/验证码必填
 * - 登录流程：加载验证码 → 提交登录 → 成功跳转
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ChatDotRound, Key, Lock, User } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/auth'
import { buildAuthUrl } from '@/api/oauth2'
import { useUserStore } from '@/stores/user'
import { showError } from '@/utils/request'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

/** 表单实例（用于校验） */
const formRef = ref<FormInstance>()
/** 登录请求进行中标记 */
const loading = ref(false)
/** 验证码图片（data:image/png;base64,...） */
const captchaImage = ref('')
/** 当前验证码 ID（提交登录时回传） */
const captchaId = ref('')

/** 登录表单数据 */
const form = reactive({
  username: '',
  password: '',
  captchaCode: '',
})

/** 表单校验规则 */
const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码长度 6-64 位', trigger: 'blur' },
  ],
  captchaCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 6, message: '验证码 4-6 位', trigger: 'blur' },
  ],
}

/**
 * 加载图形验证码（页面挂载与点击刷新时调用）。
 */
async function loadCaptcha(): Promise<void> {
  try {
    const captcha = await getCaptcha()
    captchaId.value = captcha.captchaId
    captchaImage.value = `data:image/png;base64,${captcha.image}`
    form.captchaCode = ''
  } catch (error) {
    showError(error)
  }
}

/**
 * 提交登录：校验 → 调用登录接口 → 跳转目标页。
 */
async function handleLogin(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    // 校验失败：刷新验证码并中止
    loadCaptcha()
    return
  }
  loading.value = true
  try {
    await userStore.login({
      username: form.username,
      password: form.password,
      captchaId: captchaId.value,
      captchaCode: form.captchaCode,
    })
    ElMessage.success('登录成功')
    // 携带 redirect 参数则跳转原目标，否则进入工作台
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error) {
    showError(error)
    // 登录失败后刷新验证码（验证码一次性消费）
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

/**
 * 第三方登录处理函数
 * @param provider 登录平台类型（wechat/github/google等）
 */
async function handleSocialLogin(_provider: string): Promise<void> {
  try {
    const authUrl = await buildAuthUrl({
      clientId: import.meta.env.VITE_OAUTH2_CLIENT_ID || '',
      redirectUri: window.location.origin + '/oauth2/callback',
      scope: 'read write',
    })
    window.location.href = authUrl
  } catch (error) {
    showError(error)
  }
}

// 页面挂载即加载验证码
onMounted(loadCaptcha)
</script>

<style scoped>
/* 登录页：全屏渐变背景，卡片垂直水平居中 */
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d3557 0%, #457b9d 100%);
}

.login-card {
  width: 400px;
  padding: 8px 16px;
  border-radius: 12px;
}

.login-title {
  text-align: center;
  color: var(--el-color-primary);
  margin: 8px 0 24px;
}

/* 验证码输入与图片并排 */
.captcha-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.captcha-img {
  height: 40px;
  width: 120px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--el-border-color);
}

.login-btn {
  width: 100%;
}

.social-login {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}


.github-icon:hover {
  border-color: var(--el-color-primary);
  fill: var(--el-color-primary);
  transform: scale(1.1);
}

.social-icon {
  width: 40px;
  height: 40px;
  padding: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  fill: var(--el-text-color-primary);
}

.social-icon:hover {
  border-color: var(--el-color-primary);
  transform: scale(1.1);
}

/* 钉钉图标特定样式 */
.dingtalk-icon:hover {
  border-color: #1296db;
}

/* 飞书图标特定样式 */
.feishu-icon:hover {
  border-color: #00d6b9;
}

/* 企业微信图标特定样式 */
.wecom-icon:hover {
  border-color: #4fc3f7;
}
.social-icon {
  width: 40px;
  height: 40px;
  padding: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  fill: var(--el-text-color-primary);
}

.social-icon:hover {
  border-color: var(--el-color-primary);
  transform: scale(1.1);
}

.dingtalk-icon:hover {
  border-color: #1296db;
}

.feishu-icon:hover {
  border-color: #00d6b9;
}

.wecom-icon:hover {
  border-color: #4fc3f7;
}
</style>
