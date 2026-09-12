/**
 * 表单校验规则工具
 * 
 * 提供常用的表单字段校验规则，用于 Element Plus 表单验证
 */

import type { FormItemRule } from 'element-plus'

// 校验回调函数类型
type ValidateCallback = (error?: Error) => void

// 手机号校验
export const validatePhone = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (!value) {
    callback(new Error('请输入手机号'))
  } else if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的手机号格式'))
  } else {
    callback()
  }
}

// 邮箱校验
export const validateEmail = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    callback(new Error('请输入正确的邮箱格式'))
  } else {
    callback()
  }
}

// 密码强度校验
export const validatePassword = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 8) {
    callback(new Error('密码长度至少8位'))
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
    callback(new Error('密码必须包含大小写字母和数字'))
  } else {
    callback()
  }
}

// URL格式校验
export const validateURL = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^https?:\/\/.+/.test(value)) {
    callback(new Error('请输入正确的URL格式(http://或https://)'))
  } else {
    callback()
  }
}

// 端口号校验
export const validatePort = (_rule: FormItemRule, value: number | string, callback: ValidateCallback): void => {
  const port = typeof value === 'string' ? parseInt(value, 10) : value
  if (value && (port < 1 || port > 65535 || isNaN(port))) {
    callback(new Error('端口号范围: 1-65535'))
  } else {
    callback()
  }
}

// 中文姓名校验
export const validateChineseName = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^[\u4e00-\u9fa5]{2,4}$/.test(value)) {
    callback(new Error('请输入2-4个汉字'))
  } else {
    callback()
  }
}

// 身份证号校验
export const validateIDCard = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^\d{17}[\dXx]$/.test(value)) {
    callback(new Error('请输入正确的身份证号'))
  } else {
    callback()
  }
}

// IP地址校验
export const validateIP = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (value && !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    callback(new Error('请输入正确的IP地址格式'))
  } else {
    // 进一步验证每个数字段在 0-255 范围内
    if (value) {
      const segments = value.split('.')
      const isValid = segments.every(segment => {
        const num = parseInt(segment, 10)
        return num >= 0 && num <= 255
      })
      if (!isValid) {
        callback(new Error('IP地址每段范围: 0-255'))
        return
      }
    }
    callback()
  }
}

// 整数校验
export const validateInteger = (_rule: FormItemRule, value: unknown, callback: ValidateCallback): void => {
  if (value !== '' && value !== null && value !== undefined && !Number.isInteger(Number(value))) {
    callback(new Error('请输入整数'))
  } else {
    callback()
  }
}

// 正整数校验
export const validatePositiveInteger = (_rule: FormItemRule, value: unknown, callback: ValidateCallback): void => {
  const num = Number(value)
  if (value !== '' && value !== null && value !== undefined && (!Number.isInteger(num) || num <= 0)) {
    callback(new Error('请输入正整数'))
  } else {
    callback()
  }
}

// 用户名校验（字母、数字、下划线，4-16位）
export const validateUsername = (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (!/^[a-zA-Z0-9_]{4,16}$/.test(value)) {
    callback(new Error('用户名由4-16位字母、数字、下划线组成'))
  } else {
    callback()
  }
}

// 非空校验
export const validateRequired = (message: string) => {
  return (_rule: FormItemRule, value: unknown, callback: ValidateCallback): void => {
    if (value === '' || value === null || value === undefined) {
      callback(new Error(message))
    } else {
      callback()
    }
  }
}

// 长度范围校验
export const validateLength = (min: number, max: number) => {
  return (_rule: FormItemRule, value: string, callback: ValidateCallback): void => {
    if (value && (value.length < min || value.length > max)) {
      callback(new Error(`长度范围: ${min}-${max}个字符`))
    } else {
      callback()
    }
  }
}

// 数字范围校验
export const validateRange = (min: number, max: number) => {
  return (_rule: FormItemRule, value: number | string, callback: ValidateCallback): void => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (value !== '' && value !== null && value !== undefined && (isNaN(num) || num < min || num > max)) {
      callback(new Error(`数值范围: ${min}-${max}`))
    } else {
      callback()
    }
  }
}
