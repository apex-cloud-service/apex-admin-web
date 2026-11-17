<!--
  OAuth2 授权回调页（静态路由 /oauth2/callback，public）
  ------------------------------------------------------------------
  承接第三方 OAuth2 服务商授权完成后的重定向：
    1. 校验 state（防 CSRF，消费 consumeAuthorization 一次性上下文）
    2. 用授权码 exchangeToken 换取会话令牌
    3. 保存 accessToken/refreshToken 并加载用户身份
    4. 成功跳工作台，失败清理会话回登录页

  后端接口：
    - POST /oauth2/token - 授权码换取令牌（见 api/oauth2.ts）

  Props / Emits：无（路由页面）
-->
<template>
  <!-- v-loading 指令挂容器（el-loading 并非 Element Plus 组件，原写法不渲染任何加载效果；文字经 element-loading-text 下发） -->
  <div v-loading="loading" :element-loading-text="loadingText" class="oauth2-callback" />
</template>

<script setup lang="ts">
/**
 * OAuth2 授权回调处理逻辑
 * - 全流程在 onMounted 中一次执行，页面仅承担「处理中」的加载态展示
 */
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { exchangeToken, consumeAuthorization } from '@/api/oauth2'
import { setToken, setRefreshToken, removeRefreshToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

/** 是否处于授权处理中（全屏加载） */
const loading = ref(true)
/** 加载提示文案 */
const loadingText = ref('正在完成授权登录...')

// 挂载即处理回调参数：error/缺失授权码/state 校验失败直接回登录页
onMounted(async () => {
  // 第三方回调携带的授权码与防 CSRF 随机串
  const code = route.query.code as string
  const state = route.query.state as string
  // 第三方返回的错误码与错误描述（用户拒绝授权等场景）
  const error = route.query.error as string
  const errorDescription = route.query.error_description as string

  // 校验并消费 state 一次性上下文（防止重放/伪造回调）
  const context = consumeAuthorization(typeof state === 'string' ? state : '')

  if (error) {
    ElMessage.error(`授权失败：${errorDescription || error}`)
    router.push('/login')
    return
  }

  if (!code) {
    ElMessage.error('授权失败：未获取到授权码')
    router.push('/login')
    return
  }

  if (!context) {
    ElMessage.error('授权失败：state 参数验证失败，可能存在 CSRF 攻击')
    router.push('/login')
    return
  }

  try {
    // 授权码换取令牌（授权码一次性，后端校验）
    const result = await exchangeToken({
      grantType: 'authorization_code',
      code,
      ...context,
    })

    // 保存会话令牌（refreshToken 仅在返回时保存）
    setToken(result.accessToken)
    userStore.token = result.accessToken
    removeRefreshToken()
    if (result.refreshToken) {
      setRefreshToken(result.refreshToken)
    }

    // 加载用户身份（用户信息/角色/权限码），失败则整体回滚到登录页
    await userStore.loadIdentity()

    ElMessage.success('授权登录成功')
    router.push('/dashboard')
  } catch {
    // 授权换取失败：清理本地会话避免残留半初始化状态
    userStore.clearLocal()
    ElMessage.error('授权登录失败，请重新登录')
    router.push('/login')
  }
})
</script>

<style scoped>
.oauth2-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
