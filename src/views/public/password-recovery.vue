<!--
  自助密码找回独立页（/password-recovery，匿名可访问）
  ------------------------------------------------------------------
  三段式流程（与登录页内的找回弹窗共用同一套后端契约）：
  1. 申请：选择通道（EMAIL/SMS）并提交已验证联系方式 → 恢复单 ID
  2. 校验：输入 6 位验证码 → 一次性确认令牌（最多 5 次尝试）
  3. 重设：提交新密码 → 会话撤销（PENDING 表示尚未完成，不宣称全端已退出）
  后端按 IP 与联系方式双维度限流；对账号存在与否保持同一响应形态。
-->
<template>
  <div class="recovery-page">
    <el-card class="recovery-card">
      <template #header>
        <span>自助密码找回</span>
      </template>
      <el-steps :active="step" align-center finish-status="success" style="margin-bottom: 20px">
        <el-step title="申请恢复单" />
        <el-step title="校验验证码" />
        <el-step title="重设密码" />
      </el-steps>

      <!-- 第一步：申请 -->
      <el-form v-if="step === 0" label-width="90px" @submit.prevent>
        <el-form-item label="找回通道">
          <el-radio-group v-model="channel">
            <el-radio-button label="EMAIL">已验证邮箱</el-radio-button>
            <el-radio-button label="SMS">已验证手机号</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input
            v-model="contact"
            :placeholder="channel === 'EMAIL' ? '请输入已绑定的邮箱' : '请输入已绑定的手机号'"
            clearable
            @keyup.enter="handleInitiate"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleInitiate">发送验证码</el-button>
        </el-form-item>
      </el-form>

      <!-- 第二步：校验 -->
      <el-form v-else-if="step === 1" label-width="90px" @submit.prevent>
        <el-form-item label="验证码">
          <el-input v-model="code" placeholder="请输入 6 位验证码" maxlength="6" @keyup.enter="handleVerify" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleVerify">校验</el-button>
          <el-button @click="step = 0">上一步</el-button>
        </el-form-item>
      </el-form>

      <!-- 第三步：重设 -->
      <el-form v-else-if="step === 2" label-width="90px" @submit.prevent>
        <el-form-item label="新密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="须符合系统密码策略" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleConfirm">确认重设</el-button>
        </el-form-item>
      </el-form>

      <!-- 完成态 -->
      <el-result v-else icon="success" title="密码已重设">
        <template #sub-title>
          <p v-if="sessionRevocation === 'PENDING'">
            会话撤销仍在处理中（PENDING），全部设备完全退出前请留意账号安全。
          </p>
          <p v-else>全部会话已撤销，请使用新密码重新登录。</p>
        </template>
        <template #extra>
          <el-button type="primary" @click="goLogin">前往登录</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 自助密码找回页脚本
 * - 三步推进；申请阶段对不存在账号返回统一响应形态，不提示账号是否存在
 * - 确认成功后展示会话撤销状态，PENDING 如实提示不伪称完成
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { showError } from '@/utils/request'
import {
  confirmPasswordRecovery,
  initiatePasswordRecovery,
  verifyPasswordRecovery,
  type PasswordRecoveryChannel,
} from '@/api/password-recovery'

const router = useRouter()

/** 当前步骤（0 申请 / 1 校验 / 2 重设 / 3 完成） */
const step = ref(0)
/** 找回通道 */
const channel = ref<PasswordRecoveryChannel>('EMAIL')
/** 已验证联系方式 */
const contact = ref('')
/** 恢复单 ID */
const recoveryId = ref('')
/** 6 位验证码 */
const code = ref('')
/** 一次性确认令牌 */
const confirmToken = ref('')
/** 新密码 */
const newPassword = ref('')
/** 确认密码 */
const confirmPassword = ref('')
/** 请求加载中 */
const loading = ref(false)
/** 会话撤销状态 */
const sessionRevocation = ref('')

/** 提交找回申请 */
async function handleInitiate(): Promise<void> {
  if (!contact.value.trim()) {
    ElMessage.warning('请输入联系方式')
    return
  }
  loading.value = true
  try {
    const result = await initiatePasswordRecovery(channel.value, contact.value.trim())
    recoveryId.value = result.recoveryId
    step.value = 1
    ElMessage.success('验证码已发送')
  } catch (error) {
    showError(error, '申请失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/** 校验验证码换取一次性确认令牌 */
async function handleVerify(): Promise<void> {
  if (!code.value.trim()) {
    ElMessage.warning('请输入验证码')
    return
  }
  loading.value = true
  try {
    const result = await verifyPasswordRecovery(recoveryId.value, code.value.trim())
    confirmToken.value = result.confirmToken
    step.value = 2
  } catch (error) {
    showError(error, '验证码无效或已过期')
  } finally {
    loading.value = false
  }
}

/** 确认重设密码 */
async function handleConfirm(): Promise<void> {
  if (!newPassword.value) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    const result = await confirmPasswordRecovery(recoveryId.value, confirmToken.value, newPassword.value)
    sessionRevocation.value = result.sessionRevocation || ''
    step.value = 3
  } catch (error) {
    showError(error, '重设失败：密码可能不符合策略或令牌已过期')
  } finally {
    loading.value = false
  }
}

/** 跳转登录页 */
function goLogin(): void {
  void router.push('/login')
}
</script>

<style scoped lang="scss">
.recovery-page {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 48px 16px;
  background: var(--el-bg-color-page);
}

.recovery-card {
  width: 520px;
  max-width: 100%;
}
</style>
