/**
 * 敏感信息脱敏工具
 * ------------------------------------------------------------------
 * 用途：为界面展示提供字符串掩码与顶层字段批量适配，不验证证件或输入格式。
 * 多种短输入会原样返回；不能仅凭调用本模块保证所有输入均已脱敏。
 */

/**
 * 手机号脱敏
 * @param phone 手机号
 * @param format 格式：'middle' 中间脱敏（默认）, 'start' 开头脱敏, 'end' 结尾脱敏
 * @returns 掩码手机号，如 138****5678；空输入返回空串，去空白后不足 7 位原样返回
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
 * @returns 15/18 位号码的掩码结果；其他长度原样返回，空输入返回空串，不校验身份证有效性
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
 * @returns 掩码卡号，如 6222 ******** 1234；去空白后不足 8 位原样返回，8 位仅插入空格而不隐藏字符
 */
export function maskBankCard(bankCard: string): string {
  if (!bankCard) return ''
  
  const cardStr = String(bankCard).replace(/\s/g, '')
  
  if (cardStr.length < 8) {
    return cardStr
  }
  
  const first = cardStr.slice(0, 4)
  const last = cardStr.slice(-4)
  // 中间星号最多 12 个：超长卡号避免星号段无限拉长
  const middle = '*'.repeat(Math.min(cardStr.length - 8, 12))
  
  return `${first} ${middle} ${last}`
}

/**
 * 姓名脱敏
 * @param name 姓名
 * @returns 去首尾空白后的掩码姓名，如 张*、王**；空输入返回空串，单字符原样返回
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
 * @returns 掩码地址，如 北京市朝阳区******；长度不超过 keepLength 时原样返回
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
 * @returns 点分四段的掩码结果，如 192.168.*.*；非四段原样返回，不处理 IPv6 或验证 IPv4 合法性
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
 * @returns 先转大写再掩码，如 E12****89；不足 5 位返回大写原值，5 位也不隐藏字符
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
 * @param keepStart 保留开头字符数（可选，默认 3）；负数/非有限值归 0，小数向下取整
 * @param keepEnd 保留结尾字符数（可选，默认 3）；负数/非有限值/0 不保留尾部，不会回填原文
 * @param maskChar 脱敏字符，默认 '*'
 * @returns 掩码字符串；保留总数不小于原文长度时原样返回，空输入返回空串
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
  // 归一保留长度：负数与 0 均按 0 处理，避免 slice(-0) 取整段原文
  const startKeep = Number.isFinite(keepStart) ? Math.max(0, Math.floor(keepStart)) : 0
  const endKeep = Number.isFinite(keepEnd) ? Math.max(0, Math.floor(keepEnd)) : 0

  if (startKeep + endKeep >= length) {
    return valueStr
  }

  const start = valueStr.slice(0, startKeep)
  const end = endKeep > 0 ? valueStr.slice(-endKeep) : ''
  const middle = maskChar.repeat(length - startKeep - endKeep)

  return `${start}${middle}${end}`
}

/**
 * 车牌号脱敏
 * @param plateNumber 车牌号
 * @returns 掩码车牌，如 京A***123；去首尾空白后不足 6 位原样返回，不验证车牌格式
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
 * 浅拷贝对象并按规则处理真值的顶层字段，不递归处理嵌套字段。
 * @param data 数据对象，原对象顶层字段不被赋值，嵌套引用仍共享
 * @param rules 自有顶层字段到脱敏函数的映射；真值转为字符串，0/false/空串/null/undefined 跳过
 * @returns 顶层适配后的浅拷贝对象；规则回调异常直接向调用方传播
 */
export function maskBatch<T extends Record<string, unknown>>(
  data: T,
  rules: Record<string, (value: string) => string>
): T {
  const result: Record<string, unknown> = { ...data }

  for (const [field, maskFn] of Object.entries(rules)) {
    const value = result[field]
    if (Object.prototype.hasOwnProperty.call(result, field) && value) {
      result[field] = maskFn(typeof value === 'string' ? value : String(value))
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
