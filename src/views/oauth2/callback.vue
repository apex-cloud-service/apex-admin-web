<template>
  <div class="oauth2-callback">
    <el-loading v-loading="loading" :text="loadingText" fullscreen />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { exchangeToken, verifyState } from '@/api/oauth2'
import { setToken, setRefreshToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(true)
const loadingText = ref('正在完成授权登录...')

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const error = route.query.error as string
  const errorDescription = route.query.error_description as string

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

  if (!verifyState(state)) {
    ElMessage.error('授权失败：state 参数验证失败，可能存在 CSRF 攻击')
    router.push('/login')
    return
  }

  try {
    const result = await exchangeToken({
      grantType: 'authorization_code',
      code,
      redirectUri: window.location.origin + '/oauth2/callback',
    })

    setToken(result.accessToken)
    if (result.refreshToken) {
      setRefreshToken(result.refreshToken)
    }

    await userStore.loadIdentity()

    ElMessage.success('授权登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    console.error('OAuth2 登录失败：', error)
    ElMessage.error(`授权登录失败：${error.message || '未知错误'}`)
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
