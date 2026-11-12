/**
 * 统一表单校验规则单元测试
 * ------------------------------------------------------------------
 * 覆盖常用规则的形状与正则语义、回调类规则（端口/二次确认）与组合工具。
 */
import { describe, expect, it, vi } from 'vitest'
import type { FormItemRule } from 'element-plus'
import {
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
  combine,
  rules,
} from '@/utils/validate-rules'

/** 调用回调型规则的 validator（cb 收集结果；async-validator 签名含 source/options） */
function runValidator(rule: FormItemRule, value: unknown): ReturnType<typeof vi.fn> {
  const cb = vi.fn()
  rule.validator?.({}, value, cb, {}, {})
  return cb
}

/** 断言规则的 pattern 为 RegExp 并执行匹配（async-validator 的 pattern 允许 string，本模块均为 RegExp） */
function matches(rule: FormItemRule, value: string): boolean {
  if (!(rule.pattern instanceof RegExp)) throw new Error('被测规则未配置 RegExp pattern')
  return rule.pattern.test(value)
}

describe('规则形状与默认值', () => {
  it('required 默认必填 + blur 触发', () => {
    expect(required()).toEqual({ required: true, message: '此项为必填项', trigger: 'blur' })
    expect(required('请输入名称', 'change')).toEqual({ required: true, message: '请输入名称', trigger: 'change' })
  })

  it('email/url/number 走类型校验', () => {
    expect(email().type).toBe('email')
    expect(url().type).toBe('url')
    expect(number().type).toBe('number')
  })

  it('length/minLength/maxLength 默认消息包含边界', () => {
    expect(length(2, 5).message).toBe('长度在 2 到 5 个字符')
    expect(minLength(3).message).toBe('至少 3 个字符')
    expect(maxLength(8).message).toBe('最多 8 个字符')
    expect(range(1, 10).message).toBe('数值在 1 到 10 之间')
    expect(range(1, 10).type).toBe('number')
  })

  it('pattern/validator 包装透传与 combine 组合', () => {
    const regex = /^ab$/
    expect(pattern(regex, '必须为 ab')).toMatchObject({ pattern: regex, message: '必须为 ab' })

    const fn = vi.fn()
    expect(validator(fn).validator).toBe(fn)

    const combined = combine(required(), email())
    expect(combined).toHaveLength(2)

    expect(rules.required).toBe(required)
    expect(rules.combine).toBe(combine)
  })
})

describe('正则语义', () => {
  it('手机号：1[3-9] 开头的 11 位数字', () => {
    const rule = phone()
    expect(matches(rule,'13800138000')).toBe(true)
    expect(matches(rule,'12300138000')).toBe(false)
    expect(matches(rule,'23800138000')).toBe(false)
    expect(matches(rule,'1380013800')).toBe(false)
  })

  it('用户名：4-16 位字母数字下划线', () => {
    const rule = username()
    expect(matches(rule,'abcd')).toBe(true)
    expect(matches(rule,'a_b-c')).toBe(false)
    expect(matches(rule,'abc')).toBe(false)
    expect(matches(rule,'a'.repeat(16))).toBe(true)
    expect(matches(rule,'a'.repeat(17))).toBe(false)
  })

  it('密码：至少 8 位且同时含字母与数字', () => {
    const rule = password()
    expect(matches(rule,'abcd1234')).toBe(true)
    expect(matches(rule,'abcd1234@')).toBe(true)
    expect(matches(rule,'abcdefgh')).toBe(false)
    expect(matches(rule,'12345678')).toBe(false)
    expect(matches(rule,'abcd123')).toBe(false)
  })

  it('强密码：大小写字母、数字与特殊字符缺一不可', () => {
    const rule = strongPassword()
    expect(matches(rule,'Abcdef1!')).toBe(true)
    expect(matches(rule,'abcdef1!')).toBe(false)
    expect(matches(rule,'ABCDEF1!')).toBe(false)
    expect(matches(rule,'Abcdefg1')).toBe(false)
  })

  it('整数与正整数', () => {
    const intRule = integer()
    expect(matches(intRule,'-123')).toBe(true)
    expect(matches(intRule,'12.5')).toBe(false)

    const posRule = positiveInteger()
    expect(matches(posRule,'10')).toBe(true)
    expect(matches(posRule,'0')).toBe(false)
    expect(matches(posRule,'-1')).toBe(false)
  })

  it('身份证号：18 位且月份/日期段有效', () => {
    const rule = idCard()
    expect(matches(rule,'11010119900307775X')).toBe(true)
    expect(matches(rule,'11010119901307775X')).toBe(false)
    expect(matches(rule,'1101011990030775')).toBe(false)
  })

  it('IPv4 地址每段 0-255', () => {
    const rule = ip()
    expect(matches(rule,'192.168.1.1')).toBe(true)
    expect(matches(rule,'0.0.0.0')).toBe(true)
    expect(matches(rule,'256.0.0.1')).toBe(false)
    expect(matches(rule,'1.2.3')).toBe(false)
  })
})

describe('回调型规则', () => {
  it('端口：空值放行，1-65535 整数放行', () => {
    const rule = port()
    expect(runValidator(rule, '').mock.calls[0]).toHaveLength(0)
    expect(runValidator(rule, null).mock.calls[0]).toHaveLength(0)
    expect(runValidator(rule, '8080').mock.calls[0]).toHaveLength(0)
    expect(runValidator(rule, 8080).mock.calls[0]).toHaveLength(0)

    expect(runValidator(rule, '0').mock.calls[0][0]).toBeInstanceOf(Error)
    expect(runValidator(rule, '65536').mock.calls[0][0]).toBeInstanceOf(Error)
    expect(runValidator(rule, '80.5').mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('二次确认：空值放行、与原值一致放行、不一致报错', () => {
    const rule = confirmation(() => 'secret-1')
    expect(runValidator(rule, '').mock.calls[0]).toHaveLength(0)
    expect(runValidator(rule, 'secret-1').mock.calls[0]).toHaveLength(0)
    expect(runValidator(rule, 'other').mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
