<!--
  办公平台选择器组件（office 页面通用）
  ------------------------------------------------------------------
  以按钮组形式选择飞书/钉钉/企微平台，选中项高亮为 primary；
  支持 v-model 双向绑定与选中变更事件。

  Props：
    - modelValue: 当前选中的平台（空串表示未选择）
    - platforms: 可选平台列表（缺省为全部三大平台）
    - title: 顶部标题文案（不传则不渲染）
    - disabled: 是否禁用所有按钮

  Emits：
    - update:modelValue(value): v-model 绑定更新
    - change(value): 选中平台变更
-->
<template>
  <div class="platform-selector">
    <div class="platform-title" v-if="title">{{ title }}</div>
    <div class="platform-buttons">
      <el-button
        v-for="platform in availablePlatforms"
        :key="platform"
        :type="selectedPlatform === platform ? 'primary' : 'default'"
        :class="['platform-btn', `platform-${platform.toLowerCase()}`]"
        @click="handleSelect(platform)"
        :disabled="disabled"
      >
        <span class="platform-icon">{{ getPlatformIcon(platform) }}</span>
        <span class="platform-name">{{ PLATFORM_NAMES[platform] }}</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 办公平台选择器逻辑
 * - 受控组件：选中值由父组件通过 modelValue 传入，选择后回传更新
 */
import { computed } from 'vue'
import { PLATFORM_NAMES, type OfficePlatform } from '@/api/office-platform'

/** 组件入参定义 */
interface Props {
  /** 当前选中的平台（空串表示未选择） */
  modelValue?: OfficePlatform | ''
  /** 可选平台列表（缺省全部三大平台） */
  platforms?: OfficePlatform[]
  /** 顶部标题文案 */
  title?: string
  /** 是否禁用 */
  disabled?: boolean
}

/** 组件事件定义 */
interface Emits {
  /** v-model 绑定更新 */
  (e: 'update:modelValue', value: OfficePlatform): void
  /** 选中平台变更 */
  (e: 'change', value: OfficePlatform): void
}

const props = withDefaults(defineProps<Props>(), {
  platforms: () => ['FEISHU', 'DINGTALK', 'WECOM'],
  disabled: false,
})

const emit = defineEmits<Emits>()

/** 当前选中平台（映射自 modelValue） */
const selectedPlatform = computed(() => props.modelValue)
/** 可选平台列表（映射自 platforms） */
const availablePlatforms = computed(() => props.platforms)

/**
 * 平台对应的展示图标（emoji）
 * @param platform 平台类型
 * @returns 图标字符（未知平台返回默认图标）
 */
const getPlatformIcon = (platform: OfficePlatform) => {
  const iconMap: Record<OfficePlatform, string> = {
    FEISHU: '🚀',
    DINGTALK: '📱',
    WECOM: '💼',
  }
  return iconMap[platform] || '📋'
}

/**
 * 选中平台：同步 v-model 更新与 change 事件（禁用态忽略）
 * @param platform 被选中的平台
 */
const handleSelect = (platform: OfficePlatform) => {
  if (props.disabled) return
  emit('update:modelValue', platform)
  emit('change', platform)
}
</script>

<style scoped lang="scss">
.platform-selector {
  .platform-title {
    font-size: 14px;
    color: #606266;
    margin-bottom: 12px;
  }

  .platform-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    .platform-btn {
      flex: 1;
      min-width: 120px;
      height: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.3s;

      .platform-icon {
        font-size: 24px;
      }

      .platform-name {
        font-size: 14px;
      }

      &.platform-feishu:hover {
        border-color: #0064ff;
        color: #0064ff;
      }

      &.platform-dingtalk:hover {
        border-color: #2370ff;
        color: #2370ff;
      }

      &.platform-wecom:hover {
        border-color: #07c160;
        color: #07c160;
      }
    }
  }
}
</style>
