/**
 * 本地存储工具
 * ------------------------------------------------------------------
 * 统一封装 localStorage 读写，业务代码禁止直接调用 localStorage：
 *   1. JSON 序列化/反序列化：readJSON / writeJSON
 *   2. 原始字符串读写：readRaw / writeRaw
 *   3. 统一异常兜底：隐私模式、配额超限、数据损坏时不向调用方抛异常
 *   4. 存在性判断与删除：hasItem / removeItem
 *
 * 使用边界：
 *   - 会话令牌/身份缓存请使用 utils/auth.ts（键：TOKEN_KEY 等）
 *   - UI 偏好类键名（前缀/完整键）统一收敛在 settings.ts 本地存储键分组
 */

/** ========== 原始字符串读写 ========== */

/**
 * 读取原始字符串值
 *
 * @param key 存储键
 * @returns 存储的字符串；键不存在或读写异常时返回 null
 */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`[storage] 读取失败: ${key}`, error)
    return null
  }
}

/**
 * 写入原始字符串值
 *
 * @param key 存储键
 * @param value 字符串值
 * @returns true=写入成功；false=写入失败（如配额超限、隐私模式）
 */
export function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`[storage] 写入失败: ${key}`, error)
    return false
  }
}

/** ========== JSON 读写 ========== */

/**
 * 读取并反序列化 JSON 值
 *
 * @param key 存储键
 * @returns 反序列化后的对象；键不存在、JSON 损坏或读写异常时返回 null
 */
export function readJSON<T>(key: string): T | null {
  const raw = readRaw(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    // 数据损坏视为不存在，交由调用方回退默认值
    console.error(`[storage] JSON 解析失败: ${key}`, error)
    return null
  }
}

/**
 * 序列化并写入 JSON 值
 *
 * @param key 存储键
 * @param value 任意可序列化对象
 * @returns true=写入成功；false=序列化或写入失败
 */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value))
  } catch (error) {
    // 序列化失败（循环引用等）
    console.error(`[storage] JSON 序列化失败: ${key}`, error)
    return false
  }
}

/** ========== 删除与存在性 ========== */

/**
 * 删除指定键（键不存在时静默忽略）
 *
 * @param key 存储键
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`[storage] 删除失败: ${key}`, error)
  }
}

/**
 * 判断指定键是否存在
 *
 * @param key 存储键
 * @returns true=键存在（不校验值内容）
 */
export function hasItem(key: string): boolean {
  return readRaw(key) !== null
}
