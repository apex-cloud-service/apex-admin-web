/**
 * 统一表单校验规则
 * 提供常用的表单验证规则，保持项目中验证逻辑的一致性
 */
import type { FormItemRule } from 'element-plus'

/**
 * 必填规则
 */
export const required = (message: string = '此项为必填项', trigger: string | string[] = 'blur'): FormItemRule => ({
  required: true,
  message,
  trigger
})

/**
 * 邮箱规则
 */
export const email = (message: string = '请输入正确的邮箱地址', trigger: string | string[] = 'blur'): FormItemRule => ({
  type: 'email',
  message,
  trigger
})

/**
 * 手机号规则（中国大陆）
 */
export const phone = (message: string = '请输入正确的手机号', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^1[3-9]\d{9}$/,
  message,
  trigger
})

/**
 * 用户名规则（4-16位字母、数字或下划线）
 */
export const username = (message: string = '用户名由4-16位字母、数字或下划线组成', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^[a-zA-Z0-9_]{4,16}$/,
  message,
  trigger
})

/**
 * 密码规则（至少8位，包含字母和数字）
 */
export const password = (message: string = '密码至少8位，需包含字母和数字', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  message,
  trigger
})

/**
 * 强密码规则（至少8位，包含大小写字母、数字和特殊字符）
 */
export const strongPassword = (message: string = '密码至少8位，需包含大小写字母、数字和特殊字符', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  message,
  trigger
})

/**
 * URL 规则
 */
export const url = (message: string = '请输入正确的 URL 地址', trigger: string | string[] = 'blur'): FormItemRule => ({
  type: 'url',
  message,
  trigger
})

/**
 * 数字规则
 */
export const number = (message: string = '请输入数字', trigger: string | string[] = 'blur'): FormItemRule => ({
  type: 'number',
  message,
  trigger
})

/**
 * 整数规则
 */
export const integer = (message: string = '请输入整数', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^-?\d+$/,
  message,
  trigger
})

/**
 * 正整数规则
 */
export const positiveInteger = (message: string = '请输入正整数', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^[1-9]\d*$/,
  message,
  trigger
})

/**
 * 长度范围规则
 */
export const length = (min: number, max: number, message?: string, trigger: string | string[] = 'blur'): FormItemRule => ({
  min,
  max,
  message: message || `长度在 ${min} 到 ${max} 个字符`,
  trigger
})

/**
 * 最小长度规则
 */
export const minLength = (min: number, message?: string, trigger: string | string[] = 'blur'): FormItemRule => ({
  min,
  message: message || `至少 ${min} 个字符`,
  trigger
})

/**
 * 最大长度规则
 */
export const maxLength = (max: number, message?: string, trigger: string | string[] = 'blur'): FormItemRule => ({
  max,
  message: message || `最多 ${max} 个字符`,
  trigger
})

/**
 * 数值范围规则
 */
export const range = (min: number, max: number, message?: string, trigger: string | string[] = 'blur'): FormItemRule => ({
  type: 'number',
  min,
  max,
  message: message || `数值在 ${min} 到 ${max} 之间`,
  trigger
})

/**
 * 身份证号规则（中国大陆）
 */
export const idCard = (message: string = '请输入正确的身份证号', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  message,
  trigger
})

/**
 * IP 地址规则
 */
export const ip = (message: string = '请输入正确的 IP 地址', trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  message,
  trigger
})

/**
 * 端口号规则
 */
export const port = (message: string = '请输入正确的端口号（1-65535）', trigger: string | string[] = 'blur'): FormItemRule => ({
  validator: (_rule, value, callback) => {
    if (value === '' || value === null || value === undefined) {
      callback()
      return
    }
    const num = Number(value)
    if (isNaN(num) || num < 1 || num > 65535 || !Number.isInteger(num)) {
      callback(new Error(message))
    } else {
      callback()
    }
  },
  trigger
})

/**
 * 自定义正则规则
 */
export const pattern = (regex: RegExp, message: string, trigger: string | string[] = 'blur'): FormItemRule => ({
  pattern: regex,
  message,
  trigger
})

/**
 * 自定义验证器规则
 */
export const validator = (
  validatorFn: (rule: any, value: any, callback: (error?: Error) => void) => void,
  trigger: string | string[] = 'blur'
): FormItemRule => ({
  validator: validatorFn,
  trigger
})

/**
 * 二次确认规则（如密码确认）
 */
export const confirmation = (
  getOriginalValue: () => any,
  message: string = '两次输入不一致',
  trigger: string | string[] = 'blur'
): FormItemRule => ({
  validator: (_rule, value, callback) => {
    if (value === '' || value === null || value === undefined) {
      callback()
      return
    }
    if (value !== getOriginalValue()) {
      callback(new Error(message))
    } else {
      callback()
    }
  },
  trigger
})

/**
 * 组合多个规则
 */
export const combine = (...rules: FormItemRule[]): FormItemRule[] => {
  return rules
}

// 常用规则组合
export const rules = {
  required,
  email,
  phone,
  username,
  password,
  strongPassword,
  url,
  number,
  integer,
  positiveInteger,
  length,
  minLength,
  maxLength,
  range,
  idCard,
  ip,
  port,
  pattern,
  validator,
  confirmation,
  combine
}

// 默认导出
export default rules
