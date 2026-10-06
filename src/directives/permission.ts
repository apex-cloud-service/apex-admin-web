/**
 * 按钮级权限指令 v-permission
 * ------------------------------------------------------------------
 * 用法：
 *   <el-button v-permission="'system:user:create'">新增</el-button>
 * 无权限时从 DOM 中移除元素。
 */
import type { Directive, DirectiveBinding } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 指令挂载与更新时统一执行权限校验。
 * @param el 绑定元素
 * @param binding 指令绑定（value 为权限码字符串）
 */
function checkPermission(el: HTMLElement, binding: DirectiveBinding<string>): void {
  const { hasPermission } = usePermissionStore()
  if (!binding.value || hasPermission(binding.value)) return
  // 无权限：从 DOM 移除（移除前记录父节点与注释锚点以便恢复）
  if (!el.dataset.permChecked) {
    el.dataset.permChecked = '1'
    el.parentNode?.removeChild(el)
  }
}

/** v-permission 指令定义：mounted/updated 时校验权限码，无权限移除节点 */
export const permission: Directive<HTMLElement, string> = {
  mounted: checkPermission,
  updated: checkPermission,
}
