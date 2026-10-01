/**
 * 表单校验工具函数
 * ------------------------------------------------------------------
 * 封装常用的表单字段校验规则，供 Element Plus 表单验证使用。
 * 
 * 包含的校验规则：
 *   - 手机号、邮箱、用户名、中文姓名、身份证号
 *   - 密码强度、URL、IP 地址、端口号
 *   - 整数、正整数、长度范围、数值范围
 */

import type { FormItemRule } from 'element-plus'

type ValidateCallback = (error?: Error) => void

/**
 * 手机号校验
 * 
 * @description 校验 11 位手机号格式（1 开头）
 */
export const validatePhone = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的手机号'))
  } else {
    callback()
  }
}

/**
 * 邮箱校验
 * 
 * @description 校验邮箱格式
 */
export const validateEmail = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
    callback(new Error('请输入正确的邮箱地址'))
  } else {
    callback()
  }
}

/**
 * 用户名校验
 * 
 * @description 校验用户名格式（4-16 位字母、数字、下划线）
 */
export const validateUsername = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^[a-zA-Z0-9_]{4,16}$/.test(value)) {
    callback(new Error('用户名为 4-16 位字母、数字或下划线'))
  } else {
    callback()
  }
}

/**
 * 中文姓名校验
 * 
 * @description 校验中文姓名（2-4 个汉字）
 */
export const validateChineseName = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^[\u4e00-\u9fa5]{2,4}$/.test(value)) {
    callback(new Error('姓名为 2-4 个汉字'))
  } else {
    callback()
  }
}

/**
 * 身份证号校验
 * 
 * @description 校验 18 位身份证号格式
 */
export const validateIDCard = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^\d{17}[\dXx]$/.test(value)) {
    callback(new Error('请输入正确的身份证号'))
  } else {
    callback()
  }
}

/**
 * 密码强度校验
 * 
 * @description 至少 8 位，包含大小写字母和数字
 */
export const validatePassword = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value)) {
    callback(new Error('密码至少 8 位，包含大小写字母和数字'))
  } else {
    callback()
  }
}

/**
 * URL 校验
 * 
 * @description 校验 http:// 或 https:// 开头的 URL
 */
export const validateURL = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^https?:\/\/.+/.test(value)) {
    callback(new Error('请输入正确的 URL（http:// 或 https://）'))
  } else {
    callback()
  }
}

/**
 * IP 地址校验
 * 
 * @description 校验 IPv4 地址格式（含 0-255 范围校验）
 */
export const validateIP = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value) {
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = value.match(ipPattern)
    if (!match || match.slice(1).some((num) => parseInt(num) > 255)) {
      callback(new Error('请输入正确的 IP 地址'))
    } else {
      callback()
    }
  } else {
    callback()
  }
}

/**
 * 端口号校验
 * 
 * @description 校验端口号范围（1-65535）
 */
export const validatePort = (_rule: FormItemRule, value: number, callback: ValidateCallback): void => {
  if (value && (value < 1 || value > 65535)) {
    callback(new Error('端口号范围为 1-65535'))
  } else {
    callback()
  }
}

/**
 * 整数校验
 * 
 * @description 校验是否为整数
 */
export const validateInteger = (_rule: FormItemRule, value: number, callback: ValidateCallback): void => {
  if (value !== undefined && !Number.isInteger(value)) {
    callback(new Error('请输入整数'))
  } else {
    callback()
  }
}

/**
 * 正整数校验
 * 
 * @description 校验是否为正整数
 */
export const validatePositiveInteger = (_rule: FormItemRule, value: number, callback: ValidateCallback): void => {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    callback(new Error('请输入正整数'))
  } else {
    callback()
  }
}

/**
 * 必填校验工厂函数
 * 
 * @param message 自定义错误提示信息
 * @returns 校验规则对象
 * 
 * @example
 * ```typescript
 * const rules = {
 *   username: [validateRequired('请输入用户名')]
 * }
 * ```
 */
export const validateRequired = (message: string): FormItemRule => ({
  required: true,
  message,
  trigger: 'blur'
})

/**
 * 长度范围校验工厂函数
 * 
 * @param min 最小长度
 * @param max 最大长度
 * @returns 校验函数
 * 
 * @example
 * ```typescript
 * const rules = {
 *   nickname: [{ validator: validateLength(2, 20), trigger: 'blur' }]
 * }
 * ```
 */
export const validateLength = (min: number, max: number) => {
  return (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
    if (value && (value.length < min || value.length > max)) {
      callback(new Error(`长度为 ${min}-${max} 个字符`))
    } else {
      callback()
    }
  }
}

/**
 * 数值范围校验工厂函数
 * 
 * @param min 最小值
 * @param max 最大值
 * @returns 校验函数
 * 
 * @example
 * ```typescript
 * const rules = {
 *   age: [{ validator: validateRange(0, 150), trigger: 'blur' }]
 * }
 * ```
 */
export const validateRange = (min: number, max: number) => {
  return (_rule: FormItemRule, value: number, callback: ValidateCallback): void => {
    if (value !== undefined && (value < min || value > max)) {
      callback(new Error(`值范围为 ${min}-${max}`))
    } else {
      callback()
    }
  }
}
