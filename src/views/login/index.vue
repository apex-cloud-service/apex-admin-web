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
import { Key, Lock, User } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/auth'
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
</style>
