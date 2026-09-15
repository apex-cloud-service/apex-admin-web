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
import { computed } from 'vue'
import { PLATFORM_NAMES, type OfficePlatform } from '@/api/office-new'

interface Props {
  modelValue?: OfficePlatform | ''
  platforms?: OfficePlatform[]
  title?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: OfficePlatform): void
  (e: 'change', value: OfficePlatform): void
}

const props = withDefaults(defineProps<Props>(), {
  platforms: () => ['FEISHU', 'DINGTALK', 'WECOM'],
  disabled: false,
})

const emit = defineEmits<Emits>()

const selectedPlatform = computed(() => props.modelValue)
const availablePlatforms = computed(() => props.platforms)

const getPlatformIcon = (platform: OfficePlatform) => {
  const iconMap: Record<OfficePlatform, string> = {
    FEISHU: '🚀',
    DINGTALK: '📱',
    WECOM: '💼',
  }
  return iconMap[platform] || '📋'
}

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
