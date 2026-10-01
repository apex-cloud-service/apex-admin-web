/**
 * 敏感信息脱敏工具
 * 用于在界面上展示敏感数据时进行脱敏处理
 */

/**
 * 手机号脱敏
 * @param phone 手机号
 * @param format 格式：'middle' 中间脱敏（默认）, 'start' 开头脱敏, 'end' 结尾脱敏
 * @returns 脱敏后的手机号，如 138****5678
 */
export function maskPhone(phone: string, format: 'middle' | 'start' | 'end' = 'middle'): string {
  if (!phone) return ''
  
  const phoneStr = String(phone).replace(/\s/g, '')
  
  if (phoneStr.length < 7) {
    return phoneStr // 太短无法脱敏
  }

  switch (format) {
    case 'start':
      return '****' + phoneStr.slice(-7)
    case 'end':
      return phoneStr.slice(0, 7) + '****'
    case 'middle':
    default:
      return phoneStr.slice(0, 3) + '****' + phoneStr.slice(-4)
  }
}

/**
 * 邮箱脱敏
 * @param email 邮箱地址
 * @returns 脱敏后的邮箱，如 ab***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return ''
  
  const [localPart, domain] = email.split('@')
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }
  
  return `${localPart.slice(0, 2)}***@${domain}`
}

/**
 * 身份证号脱敏
 * @param idCard 身份证号
 * @returns 脱敏后的身份证号，如 110101********1234
 */
export function maskIdCard(idCard: string): string {
  if (!idCard) return ''
  
  const idStr = String(idCard)
  
  if (idStr.length === 15) {
    // 15位身份证
    return idStr.slice(0, 6) + '******' + idStr.slice(-3)
  } else if (idStr.length === 18) {
    // 18位身份证
    return idStr.slice(0, 6) + '********' + idStr.slice(-4)
  }
  
  return idStr
}

/**
 * 银行卡号脱敏
 * @param bankCard 银行卡号
 * @returns 脱敏后的银行卡号，如 6222 **** **** 1234
 */
export function maskBankCard(bankCard: string): string {
  if (!bankCard) return ''
  
  const cardStr = String(bankCard).replace(/\s/g, '')
  
  if (cardStr.length < 8) {
    return cardStr
  }
  
  const first = cardStr.slice(0, 4)
  const last = cardStr.slice(-4)
  const middle = '*'.repeat(Math.min(cardStr.length - 8, 12))
  
  return `${first} ${middle} ${last}`
}

/**
 * 姓名脱敏
 * @param name 姓名
 * @returns 脱敏后的姓名，如 张*、欧阳**
 */
export function maskName(name: string): string {
  if (!name) return ''
  
  const nameStr = String(name).trim()
  
  if (nameStr.length === 0) return ''
  if (nameStr.length === 1) return nameStr
  if (nameStr.length === 2) return nameStr[0] + '*'
  
  // 3个字符及以上
  return nameStr[0] + '*'.repeat(nameStr.length - 1)
}

/**
 * 地址脱敏
 * @param address 地址
 * @param keepLength 保留前面的字符数，默认 6
 * @returns 脱敏后的地址，如 北京市朝阳区******
 */
export function maskAddress(address: string, keepLength: number = 6): string {
  if (!address) return ''
  
  const addrStr = String(address).trim()
  
  if (addrStr.length <= keepLength) {
    return addrStr
  }
  
  return addrStr.slice(0, keepLength) + '******'
}

/**
 * IP 地址脱敏
 * @param ip IP 地址
 * @returns 脱敏后的 IP，如 192.168.*.*
 */
export function maskIp(ip: string): string {
  if (!ip) return ''
  
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  
  return `${parts[0]}.${parts[1]}.*.*`
}

/**
 * 护照号码脱敏
 * @param passport 护照号码
 * @returns 脱敏后的护照号码，如 E12****89
 */
export function maskPassport(passport: string): string {
  if (!passport) return ''
  
  const passportStr = String(passport).toUpperCase()
  
  if (passportStr.length < 5) {
    return passportStr
  }
  
  const start = passportStr.slice(0, 3)
  const end = passportStr.slice(-2)
  const middle = '*'.repeat(passportStr.length - 5)
  
  return `${start}${middle}${end}`
}

/**
 * 通用脱敏（保留前后部分，中间用星号替换）
 * @param value 要脱敏的值
 * @param keepStart 保留开头字符数
 * @param keepEnd 保留结尾字符数
 * @param maskChar 脱敏字符，默认 '*'
 * @returns 脱敏后的字符串
 */
export function maskGeneral(
  value: string,
  keepStart: number = 3,
  keepEnd: number = 3,
  maskChar: string = '*'
): string {
  if (!value) return ''
  
  const valueStr = String(value)
  const length = valueStr.length
  
  if (length <= keepStart + keepEnd) {
    return valueStr
  }
  
  const start = valueStr.slice(0, keepStart)
  const end = valueStr.slice(-keepEnd)
  const middle = maskChar.repeat(length - keepStart - keepEnd)
  
  return `${start}${middle}${end}`
}

/**
 * 车牌号脱敏
 * @param plateNumber 车牌号
 * @returns 脱敏后的车牌号，如 京A***123
 */
export function maskPlateNumber(plateNumber: string): string {
  if (!plateNumber) return ''
  
  const plateStr = String(plateNumber).trim()
  
  if (plateStr.length < 6) {
    return plateStr
  }
  
  // 保留前2位和后3位
  return plateStr.slice(0, 2) + '***' + plateStr.slice(-3)
}

/**
 * 批量脱敏
 * @param data 数据对象
 * @param rules 脱敏规则 { 字段名: 脱敏函数 }
 * @returns 脱敏后的数据对象
 */
export function maskBatch<T extends Record<string, any>>(
  data: T,
  rules: Record<string, (value: any) => string>
): T {
  const result = { ...data } as any
  
  for (const [field, maskFn] of Object.entries(rules)) {
    if (result[field]) {
      result[field] = maskFn(result[field])
    }
  }
  
  return result as T
}

/**
 * 常用脱敏规则集合
 */
export const maskRules = {
  phone: maskPhone,
  email: maskEmail,
  idCard: maskIdCard,
  bankCard: maskBankCard,
  name: maskName,
  address: maskAddress,
  ip: maskIp,
  passport: maskPassport,
  plateNumber: maskPlateNumber,
  general: maskGeneral
}

/**
 * 默认导出
 */
export default {
  maskPhone,
  maskEmail,
  maskIdCard,
  maskBankCard,
  maskName,
  maskAddress,
  maskIp,
  maskPassport,
  maskPlateNumber,
  maskGeneral,
  maskBatch,
  maskRules
}
