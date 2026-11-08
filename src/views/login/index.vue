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
      <!-- MFA 二步验证：密码校验通过但已启用 MFA 时切换到此分支 -->
      <el-form v-if="mfaChallenge" :model="mfaForm" size="large" @keyup.enter="handleVerifyMfa">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="该账号已启用多因素认证"
          description="请输入认证器中的 6 位动态验证码完成登录"
          style="margin-bottom: 18px"
        />
        <el-form-item>
          <el-input
            v-model="mfaForm.code"
            placeholder="6 位动态验证码"
            :prefix-icon="Key"
            maxlength="6"
            autofocus
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="mfaLoading" @click="handleVerifyMfa">
            验 证
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button link @click="cancelMfa">返回重新登录</el-button>
        </el-form-item>
      </el-form>
      <el-form v-else ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <!-- 账号 -->
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" clearable />
        </el-form-item>
        <!-- 租户（多租户部署时启用，VITE_AUTH_TENANT_ENABLED=true） -->
        <el-form-item v-if="tenantEnabled" prop="tenantId">
          <el-input v-model="form.tenantId" placeholder="租户标识（留空使用默认租户）" :prefix-icon="OfficeBuilding" clearable />
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
        <el-form-item>
          <el-button link type="primary" @click="openRecoveryDialog">忘记密码？</el-button>
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

    <!-- 密码找回（三步：申请 → 校验验证码 → 重设密码） -->
    <el-dialog v-model="recoveryVisible" title="找回密码" width="460px" @closed="resetRecovery">
      <el-steps :active="recoveryStep" simple style="margin-bottom: 18px">
        <el-step title="申请" />
        <el-step title="验证" />
        <el-step title="重设" />
      </el-steps>

      <el-form v-if="recoveryStep === 0" label-width="90px">
        <el-form-item label="找回方式">
          <el-radio-group v-model="recoveryForm.channel">
            <el-radio value="EMAIL">邮箱</el-radio>
            <el-radio value="SMS">手机号</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input
            v-model="recoveryForm.contact"
            :placeholder="recoveryForm.channel === 'EMAIL' ? '请输入已绑定邮箱' : '请输入已绑定手机号'"
          />
        </el-form-item>
      </el-form>

      <el-form v-else-if="recoveryStep === 1" label-width="90px">
        <el-form-item label="验证码">
          <el-input v-model="recoveryForm.code" maxlength="8" placeholder="请输入收到的验证码" />
        </el-form-item>
        <el-form-item>
          <span class="recovery-hint">恢复单 {{ recoveryId }}，验证码有效期 {{ recoveryExpiresIn }} 秒</span>
        </el-form-item>
      </el-form>

      <el-form v-else label-width="90px">
        <el-form-item label="新密码">
          <el-input v-model="recoveryForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="recoveryForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="recoveryVisible = false">取消</el-button>
        <el-button type="primary" :loading="recoveryLoading" @click="handleRecoveryNext">
          {{ recoveryStep === 2 ? '确认重设' : '下一步' }}
        </el-button>
      </template>
    </el-dialog>
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
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules } from 'element-plus'
import { ChatDotRound, Key, Lock, OfficeBuilding, User } from '@element-plus/icons-vue'
import { getCaptcha } from '@/api/auth'
import {
  confirmPasswordRecovery,
  initiatePasswordRecovery,
  verifyPasswordRecovery,
  type PasswordRecoveryChannel,
} from '@/api/password-recovery'
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

/** MFA 挑战凭据（非空表示处于二步验证分支） */
const mfaChallenge = ref('')
/** MFA 验证请求进行中标记 */
const mfaLoading = ref(false)
/** MFA 验证码表单 */
const mfaForm = reactive({ code: '' })

/** 是否启用登录租户标识输入（多租户部署，VITE_AUTH_TENANT_ENABLED=true 时生效） */
const tenantEnabled = import.meta.env.VITE_AUTH_TENANT_ENABLED === 'true'

/** 登录表单数据 */
const form = reactive({
  username: '',
  password: '',
  captchaCode: '',
  tenantId: '',
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
  // 租户标识可选，填写时仅允许与服务端一致的格式（1-64 位字母/数字/点/下划线/短横线）
  tenantId: [
    { pattern: /^[A-Za-z0-9._-]{1,64}$/, message: '租户标识仅允许 1-64 位字母、数字、点、下划线或短横线', trigger: 'blur' },
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
    const result = await userStore.login({
      username: form.username,
      password: form.password,
      captchaId: captchaId.value,
      captchaCode: form.captchaCode,
      tenantId: tenantEnabled && form.tenantId ? form.tenantId : undefined,
    })
    // MFA 挑战模式：不签发令牌，切换到二步验证分支
    if (result.mfaRequired && result.challengeToken) {
      mfaChallenge.value = result.challengeToken
      mfaForm.code = ''
      ElMessage.info('请输入动态验证码完成验证')
      return
    }
    completeLogin()
  } catch (error) {
    showLoginError(error)
    // 登录失败后刷新验证码（验证码一次性消费）
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

/**
 * 登录错误提示：租户门禁失败（A6）给出针对性指引，其余沿用统一提示。
 * 后端拒绝文案：租户不存在 / 租户已过期 / 租户不可用（状态: xxx）/ 租户状态暂不可用。
 * @param error 捕获的异常
 */
function showLoginError(error: unknown): void {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('租户不存在')) {
    ElMessage.error('租户不存在，请核对租户标识')
    return
  }
  if (message.includes('租户已过期')) {
    ElMessage.error('租户已过期，请联系平台管理员续期')
    return
  }
  if (message.includes('租户不可用')) {
    ElMessage.error(`租户当前不可用：${message}。请联系平台管理员处理`)
    return
  }
  if (message.includes('租户状态')) {
    ElMessage.error('租户状态校验暂不可用，请稍后重试')
    return
  }
  showError(error, '登录失败')
}

/**
 * MFA 二步验证：以挑战凭据 + 动态码交换正式令牌。
 */
async function handleVerifyMfa(): Promise<void> {
  if (!mfaChallenge.value) return
  const code = mfaForm.code.trim()
  if (!/^\d{6}$/.test(code)) {
    ElMessage.warning('请输入 6 位数字动态验证码')
    return
  }
  mfaLoading.value = true
  try {
    await userStore.verifyMfaChallenge(mfaChallenge.value, code)
    mfaChallenge.value = ''
    completeLogin()
  } catch (error) {
    showError(error, '验证失败')
    mfaForm.code = ''
  } finally {
    mfaLoading.value = false
  }
}

/** 取消 MFA 二步验证，返回密码登录并刷新验证码 */
function cancelMfa(): void {
  mfaChallenge.value = ''
  mfaForm.code = ''
  loadCaptcha()
}

/** 登录完成：提示并按 redirect 跳转（默认工作台） */
function completeLogin(): void {
  ElMessage.success('登录成功')
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
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

// ==================== 密码找回 ====================
const recoveryVisible = ref(false)
const recoveryStep = ref(0)
const recoveryLoading = ref(false)
const recoveryId = ref('')
const recoveryExpiresIn = ref(0)
const recoveryConfirmToken = ref('')
const recoveryForm = reactive({
  channel: 'EMAIL' as PasswordRecoveryChannel,
  contact: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

/** 打开密码找回对话框 */
function openRecoveryDialog(): void {
  resetRecovery()
  recoveryVisible.value = true
}

/** 重置找回流程状态 */
function resetRecovery(): void {
  recoveryStep.value = 0
  recoveryId.value = ''
  recoveryExpiresIn.value = 0
  recoveryConfirmToken.value = ''
  Object.assign(recoveryForm, {
    channel: 'EMAIL',
    contact: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })
}

/**
 * 推进找回流程：申请 → 校验验证码 → 确认重设
 */
async function handleRecoveryNext(): Promise<void> {
  if (recoveryStep.value === 0) {
    if (!recoveryForm.contact.trim()) {
      ElMessage.warning('请输入联系方式')
      return
    }
    recoveryLoading.value = true
    try {
      const result = await initiatePasswordRecovery(recoveryForm.channel, recoveryForm.contact.trim())
      recoveryId.value = result.recoveryId
      recoveryExpiresIn.value = result.expiresIn
      recoveryStep.value = 1
      ElMessage.success('验证码已发送')
    } catch (error) {
      showError(error, '提交找回申请失败')
    } finally {
      recoveryLoading.value = false
    }
    return
  }

  if (recoveryStep.value === 1) {
    if (!recoveryForm.code.trim()) {
      ElMessage.warning('请输入验证码')
      return
    }
    recoveryLoading.value = true
    try {
      const result = await verifyPasswordRecovery(recoveryId.value, recoveryForm.code.trim())
      recoveryConfirmToken.value = result.confirmToken
      recoveryStep.value = 2
    } catch (error) {
      showError(error, '验证码校验失败')
    } finally {
      recoveryLoading.value = false
    }
    return
  }

  if (!recoveryForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (recoveryForm.newPassword !== recoveryForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  recoveryLoading.value = true
  try {
    const result = await confirmPasswordRecovery(
      recoveryId.value,
      recoveryConfirmToken.value,
      recoveryForm.newPassword,
    )
    if (result.sessionRevocation === 'PENDING') {
      ElMessage.warning('密码已重设，但历史会话撤销尚未完成，建议稍后重新登录')
    } else {
      ElMessage.success('密码已重设，请使用新密码登录')
    }
    recoveryVisible.value = false
  } catch (error) {
    showError(error, '重设密码失败')
  } finally {
    recoveryLoading.value = false
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
