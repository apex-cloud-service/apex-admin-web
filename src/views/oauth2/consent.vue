<!--
  授权同意页（OAuth2 consent，方案批次 A5）
  ------------------------------------------------------------------
  背景：认证中心 authorize 端点对「无有效同意记录 / 请求 scope 超出已同意范围」的客户端
  返回 400 {"error":"consent_required"}，需用户先完成同意再重试授权。
  契约：
  - 本页为**匿名可访问**的独立页（方案 §12.3），挂在 AdminLayout 之外；
    页面渲染只依赖查询参数，未登录时提交会先跳登录并携带本页完整地址回跳。
    注意：同意记录必须绑定已认证主体，后端 /oauth2/consent 亦要求认证，
    因此「匿名」指页面可匿名打开，不表示可匿名写入同意。
  - 查询参数：client_id（必填）、scope（空格分隔）、redirect_uri、state、code_challenge、
    code_challenge_method 等授权参数，同意后原样带回 /oauth2/authorize 重试。
  - 提交：POST /oauth2/consent（form-urlencoded：client_id / scope / decision）。
    拒绝会撤销既有同意并停留在本页，不发起授权重试。
-->
<template>
  <div class="consent-page">
    <el-card class="consent-card" shadow="never">
      <template #header>
        <div class="consent-header">
          <el-icon :size="22"><Lock /></el-icon>
          <span>授权确认</span>
        </div>
      </template>

      <el-alert
        v-if="!clientId"
        type="error"
        :closable="false"
        show-icon
        title="缺少 client_id"
        description="授权请求不完整，无法展示授权确认页。请从客户端重新发起授权。"
      />

      <template v-else>
        <el-descriptions :column="1" border size="small" class="consent-info">
          <el-descriptions-item label="应用">{{ clientId }}</el-descriptions-item>
          <el-descriptions-item label="请求权限">
            <div v-if="scopeList.length" class="scope-list">
              <el-tag v-for="scope in scopeList" :key="scope" size="small" type="info">{{ scope }}</el-tag>
            </div>
            <span v-else class="scope-empty">未声明 scope</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="授权后该应用可在你同意的范围内访问你的数据"
          description="请确认应用来源可信。拒绝将撤销此前对该应用的授权记录。"
          class="consent-tip"
        />

        <div class="consent-actions">
          <el-button :loading="submitting" @click="handleDecision('deny')">拒绝</el-button>
          <el-button type="primary" :loading="submitting" @click="handleDecision('approve')">
            同意并继续
          </el-button>
        </div>

        <div v-if="!canRetryAuthorize" class="consent-hint">
          授权参数不完整（缺少 redirect_uri 或 PKCE 参数），同意后无法自动重试授权，请从客户端重新发起。
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 授权同意页脚本
 * - 从查询参数还原授权请求上下文（client_id / scope / redirect_uri / PKCE / state）
 * - 提交同意后按原参数重试 GET /oauth2/authorize（浏览器跳转，由后端 302 回客户端）
 * - 拒绝时仅提交 deny，不发起授权重试
 * - 本页为匿名可访问页（方案 §12.3）：未登录时先跳登录并携带本页完整地址回跳，
 *   因为同意记录必须绑定已认证主体（后端 /oauth2/consent 亦要求认证）
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { submitConsent } from '@/api/oauth2'
import { getToken } from '@/utils/auth'
import { showError } from '@/utils/request'

const route = useRoute()
const router = useRouter()

/** 客户端 ID（缺失时页面只展示错误提示） */
const clientId = computed(() => String(route.query.client_id || ''))
/** 请求 scope（空格分隔） */
const scope = computed(() => String(route.query.scope || ''))
/** scope 列表（用于展示） */
const scopeList = computed(() => scope.value.split(' ').filter(Boolean))
/** 提交中标记 */
const submitting = ref(false)

/** 授权重试所需的最小参数是否齐全（PKCE 为认证中心强制要求） */
const canRetryAuthorize = computed(
  () =>
    !!clientId.value &&
    !!route.query.redirect_uri &&
    !!route.query.code_challenge &&
    route.query.code_challenge_method === 'S256',
)

/**
 * 提交同意或拒绝。
 * @param decision approve=同意并重试授权；deny=拒绝
 */
async function handleDecision(decision: 'approve' | 'deny'): Promise<void> {
  if (!clientId.value) return
  // 匿名访问时先登录：同意记录必须绑定已认证主体，登录后原样回到本页
  if (!getToken()) {
    const redirect = route.fullPath
    router.push({ path: '/login', query: { redirect } })
    return
  }
  submitting.value = true
  try {
    const result = await submitConsent({ clientId: clientId.value, scope: scope.value || undefined, decision })
    if (decision === 'deny') {
      ElMessage.info(result.consented ? '已记录拒绝' : '已撤销对该应用的授权')
      return
    }
    if (!canRetryAuthorize.value) {
      ElMessage.warning('已记录授权同意，但授权参数不完整，请从客户端重新发起授权')
      return
    }
    // 携带原授权参数重试 authorize：后端签发授权码并 302 回客户端 redirect_uri
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') params.append(key, value)
    }
    window.location.href = `/oauth2/authorize?${params.toString()}`
  } catch (error) {
    showError(error, decision === 'approve' ? '授权确认失败' : '拒绝授权失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.consent-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d3557 0%, #457b9d 100%);
  padding: 24px;
}

.consent-card {
  width: 520px;
  border-radius: 12px;
}

.consent-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.consent-info {
  margin-bottom: 16px;
}

.scope-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scope-empty {
  color: var(--el-text-color-secondary);
}

.consent-tip {
  margin-bottom: 20px;
}

.consent-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.consent-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
