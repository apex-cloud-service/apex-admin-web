/**
 * 表单草稿自动保存 Composable
 * ------------------------------------------------------------------
 * 自动保存表单数据到 localStorage，防止意外丢失。
 * 持久化统一走 utils/storage.ts（键前缀 DRAFT_KEY_PREFIX 收敛于 settings.ts），
 * 禁止在本文件直接调用 localStorage。
 */
import { watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'
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
 * @param form 表单数据的 Ref（深层监听其 value）
 * @param options 配置选项
 */
export function useFormDraft<T extends Record<string, unknown>>(
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
   * 保存草稿与时间戳键。
   * 两次写入独立执行，内容写入失败时仍会尝试更新时间戳；返回值只用于日志判断，不保证原子。
   */
  const saveDraft = () => {
    const saved = writeJSON(storageKey, form.value)
    const stamped = writeRaw(timestampKey, Date.now().toString())
    if (saved && stamped) {
      console.log(`[草稿] 已保存: ${formKey}`)
    }
  }

  /**
   * 加载草稿
   * @returns 草稿数据；缺草稿/时间戳、JSON 解析失败、时间戳非法或超过 ttl 时返回 null
   * 不校验草稿结构；缺失或非法时间戳按过期处理并清除。
   */
  const loadDraft = (): T | null => {
    const draftStr = readJSON<T>(storageKey)
    const timestampStr = readRaw(timestampKey)

    if (!draftStr || !timestampStr) {
      return null
    }

    // 时间戳非法（NaN/非正）按已过期处理，避免永不过期的草稿
    const timestamp = Number(timestampStr)
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || Date.now() - timestamp > ttl) {
      clearDraft()
      return null
    }

    console.log(`[草稿] 已加载: ${formKey}`)
    return draftStr
  }

  // 自行维护防抖定时器（useDebounceFn 返回的函数不带 cancel，无法在 clearDraft 中取消）
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  const cancelPendingSave = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }
  const debouncedSave = () => {
    cancelPendingSave()
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveDraft()
    }, debounce)
  }

  /**
   * 删除当前草稿与时间戳键、复位 dirty，并取消待执行的防抖保存。
   * 取消防抖后，清除前已排期的写入不会再把草稿写回。
   */
  const clearDraft = () => {
    cancelPendingSave()
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
   * 确认后将草稿浅合并到当前表单，不整体替换。
   * @returns 合并成功为 true，无草稿为 false；确认或合并异常统一清除草稿并返回 false
   * 异常不向外传播，也不保证撤销已经发生的部分合并。
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
      // 取消确认或合并异常均清除草稿，不保证撤销已发生的部分合并
      clearDraft()
      return false
    }
  }

  // 监听表单变化
  const stopWatching = watch(
    form,
    () => {
      isDirty = true
      debouncedSave()
    },
    { deep: true, flush: 'sync' }
  )

  // 页面离开前提示（使用浏览器 beforeunload，不拦截 SPA 路由切换）
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

  // 卸载前取消定时器与监听，再同步保存一次，避免卸载后旧防抖任务重复写入
  onBeforeUnmount(() => {
    cancelPendingSave()
    stopWatching()
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
