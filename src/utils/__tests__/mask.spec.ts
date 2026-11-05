/**
 * 敏感信息脱敏工具单元测试
 * ------------------------------------------------------------------
 * 覆盖手机号/邮箱/身份证/银行卡/姓名/地址/IP/护照/车牌与通用脱敏的边界行为：
 * - 空值与过短输入原样或空串返回
 * - 不同保留策略的掩码位置与长度
 * - 批量脱敏只处理存在字段
 */
import { describe, expect, it } from 'vitest'
import {
  maskAddress,
  maskBankCard,
  maskBatch,
  maskEmail,
  maskGeneral,
  maskIdCard,
  maskIp,
  maskName,
  maskPassport,
  maskPhone,
  maskPlateNumber,
} from '@/utils/mask'

describe('maskPhone', () => {
  it('默认中间脱敏保留前 3 后 4', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
  })

  it('支持开头与结尾脱敏', () => {
    expect(maskPhone('13812345678', 'start')).toBe('****2345678')
    expect(maskPhone('13812345678', 'end')).toBe('1381234****')
  })

  it('忽略空格且过短不脱敏', () => {
    expect(maskPhone('138 1234 5678')).toBe('138****5678')
    expect(maskPhone('12345')).toBe('12345')
    expect(maskPhone('')).toBe('')
  })
})

describe('maskEmail', () => {
  it('保留域名并隐藏本地部分', () => {
    expect(maskEmail('alice@example.com')).toBe('al***@example.com')
    expect(maskEmail('ab@example.com')).toBe('a***@example.com')
  })

  it('无 @ 或空值返回空串', () => {
    expect(maskEmail('invalid')).toBe('')
    expect(maskEmail('')).toBe('')
  })
})

describe('maskIdCard', () => {
  it('15 位与 18 位分别保留首尾', () => {
    expect(maskIdCard('110101900101123')).toBe('110101******123')
    expect(maskIdCard('110101199001011234')).toBe('110101********1234')
  })

  it('其他长度原样返回', () => {
    expect(maskIdCard('123')).toBe('123')
    expect(maskIdCard('')).toBe('')
  })
})

describe('maskBankCard', () => {
  it('保留前 4 后 4 并用空格分隔', () => {
    expect(maskBankCard('6222021234567890')).toBe('6222 ******** 7890')
  })

  it('去空格且过短原样返回', () => {
    expect(maskBankCard('6222 0212 3456 7890')).toBe('6222 ******** 7890')
    expect(maskBankCard('1234567')).toBe('1234567')
  })
})

describe('maskName', () => {
  it('按字符数保留姓氏', () => {
    expect(maskName('张')).toBe('张')
    expect(maskName('张三')).toBe('张*')
    expect(maskName('张三丰')).toBe('张**')
  })

  it('空白字符串返回空串', () => {
    expect(maskName('   ')).toBe('')
    expect(maskName('')).toBe('')
  })
})

describe('maskAddress', () => {
  it('保留指定前缀后追加掩码', () => {
    expect(maskAddress('北京市朝阳区建国路88号')).toBe('北京市朝阳区******')
  })

  it('支持自定义保留长度，短地址原样返回', () => {
    expect(maskAddress('北京市朝阳区建国路88号', 3)).toBe('北京市******')
    expect(maskAddress('北京', 6)).toBe('北京')
  })
})

describe('maskIp', () => {
  it('隐藏后两段', () => {
    expect(maskIp('192.168.1.100')).toBe('192.168.*.*')
  })

  it('非四段地址原样返回', () => {
    expect(maskIp('192.168.1')).toBe('192.168.1')
    expect(maskIp('')).toBe('')
  })
})

describe('maskPassport', () => {
  it('保留前 3 后 2 并转大写', () => {
    expect(maskPassport('e12345678')).toBe('E12****78')
  })

  it('过短原样返回', () => {
    expect(maskPassport('E123')).toBe('E123')
  })
})

describe('maskPlateNumber', () => {
  it('保留前 2 后 3', () => {
    expect(maskPlateNumber('京A12345')).toBe('京A***345')
  })

  it('过短原样返回', () => {
    expect(maskPlateNumber('京A1')).toBe('京A1')
  })
})

describe('maskGeneral', () => {
  it('按保留长度生成掩码', () => {
    expect(maskGeneral('abcdefghij', 3, 2)).toBe('abc*****ij')
  })

  it('支持自定义掩码字符且长度不足时原样返回', () => {
    expect(maskGeneral('abcdefgh', 2, 2, '#')).toBe('ab####gh')
    expect(maskGeneral('abc', 2, 2)).toBe('abc')
    expect(maskGeneral('')).toBe('')
  })
})

describe('maskBatch', () => {
  it('按规则处理存在字段并复制其余字段', () => {
    const result = maskBatch(
      { name: '张三', phone: '13812345678', remark: undefined },
      { phone: maskPhone, name: maskName },
    )

    expect(result).toEqual({ name: '张*', phone: '138****5678', remark: undefined })
  })

  it('不修改原对象', () => {
    const source = { phone: '13812345678' }
    maskBatch(source, { phone: maskPhone })
    expect(source.phone).toBe('13812345678')
  })
})
