/**
 * 表单草稿自动保存 Composable
 * ------------------------------------------------------------------
 * 自动保存表单数据到 localStorage，防止意外丢失。
 * 持久化统一走 utils/storage.ts（键前缀 DRAFT_KEY_PREFIX 收敛于 settings.ts），
 * 禁止在本文件直接调用 localStorage。
 */
import { watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessageBox } from 'element-plus'
import { readJSON, writeJSON, readRaw, writeRaw, removeItem, hasItem } from '@/utils/storage'
import { DRAFT_KEY_PREFIX, DRAFT_TIMESTAMP_KEY_SUFFIX } from '@/settings'

/** 表单草稿自动保存配置 */
export interface UseFormDraftOptions {
  /** 自动保存延迟（毫秒） */
  debounce?: number
  /** 是否在页面离开时提示 */
  warnOnLeave?: boolean
  /** 草稿过期时间（毫秒），默认 7 天 */
  ttl?: number
}

/**
 * 表单草稿自动保存
 * @param formKey 表单唯一标识
 * @param form 表单数据（响应式对象）
 * @param options 配置选项
 */
export function useFormDraft<T extends Record<string, any>>(
  formKey: string,
  form: Ref<T>,
  options: UseFormDraftOptions = {}
) {
  const {
    debounce = 1000,
    warnOnLeave = true,
    ttl = 7 * 24 * 60 * 60 * 1000 // 7天
  } = options

  // 存储键：前缀 + 表单唯一标识；时间戳键用于 TTL 过期判断（键定义收敛在 settings.ts）
  const storageKey = `${DRAFT_KEY_PREFIX}${formKey}`
  const timestampKey = `${storageKey}${DRAFT_TIMESTAMP_KEY_SUFFIX}`

  /** 表单是否被修改过（用于离开提示与卸载前保存） */
  let isDirty = false

  /**
   * 保存草稿
   */
  const saveDraft = () => {
    const saved = writeJSON(storageKey, form.value)
    // 时间戳与草稿内容分开存储，写入失败时不更新时间戳（保留旧草稿的有效期）
    const stamped = writeRaw(timestampKey, Date.now().toString())
    if (saved && stamped) {
      console.log(`[草稿] 已保存: ${formKey}`)
    }
  }

  /**
   * 加载草稿
   * @returns 草稿数据；不存在、已过期（超过 ttl）或数据损坏时返回 null
   */
  const loadDraft = (): T | null => {
    const draftStr = readJSON<T>(storageKey)
    const timestampStr = readRaw(timestampKey)

    if (!draftStr || !timestampStr) {
      return null
    }

    // 检查是否过期（超期草稿直接清除）
    const timestamp = parseInt(timestampStr)
    if (Date.now() - timestamp > ttl) {
      clearDraft()
      return null
    }

    console.log(`[草稿] 已加载: ${formKey}`)
    return draftStr
  }

  /**
   * 清除草稿
   */
  const clearDraft = () => {
    removeItem(storageKey)
    removeItem(timestampKey)
    isDirty = false
    console.log(`[草稿] 已清除: ${formKey}`)
  }

  /**
   * 检查是否有草稿
   * @returns true=存在草稿（可能已过期，过期判断以 loadDraft 为准）
   */
  const hasDraft = (): boolean => {
    return hasItem(storageKey)
  }

  /**
   * 恢复草稿（带确认）
   */
  const restoreDraft = async (): Promise<boolean> => {
    const draft = loadDraft()
    if (!draft) {
      return false
    }

    try {
      await ElMessageBox.confirm(
        '检测到未保存的草稿，是否恢复？',
        '恢复草稿',
        {
          type: 'info',
          confirmButtonText: '恢复',
          cancelButtonText: '放弃'
        }
      )

      Object.assign(form.value, draft)
      return true
    } catch {
      // 用户选择放弃
      clearDraft()
      return false
    }
  }

  // 防抖保存
  const debouncedSave = useDebounceFn(saveDraft, debounce)

  // 监听表单变化
  watch(
    form,
    () => {
      isDirty = true
      debouncedSave()
    },
    { deep: true }
  )

  // 页面离开前提示（使用原生 beforeunload）
  if (warnOnLeave) {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    onMounted(() => {
      window.addEventListener('beforeunload', handleBeforeUnload)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
  }

  // 组件挂载时检查草稿
  onMounted(async () => {
    if (hasDraft()) {
      await restoreDraft()
    }
  })

  // 组件卸载前保存
  onBeforeUnmount(() => {
    if (isDirty) {
      saveDraft()
    }
  })

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    restoreDraft
  }
}
