/**
 * 表单校验工具单元测试
 * ------------------------------------------------------------------
 * 覆盖 src/utils/validate.ts 的邮箱/手机号校验规则：
 * 合法值通过、非法值按预期返回中文错误信息。
 */
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePhone } from '../validate'

describe('validate utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const callback = (error?: Error) => {
        expect(error).toBeUndefined()
      }
      validateEmail({} as any, 'test@example.com', callback)
    })

    it('should reject invalid email', () => {
      const callback = (error?: Error) => {
        expect(error).toBeDefined()
        expect(error?.message).toBe('请输入正确的邮箱地址')
      }
      validateEmail({} as any, 'invalid-email', callback)
    })
  })

  describe('validatePhone', () => {
    it('should validate correct phone', () => {
      const callback = (error?: Error) => {
        expect(error).toBeUndefined()
      }
      validatePhone({} as any, '13800138000', callback)
    })

    it('should reject invalid phone', () => {
      const callback = (error?: Error) => {
        expect(error).toBeDefined()
        expect(error?.message).toBe('请输入正确的手机号')
      }
      validatePhone({} as any, '12345', callback)
    })
  })
})
