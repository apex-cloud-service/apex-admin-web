/**
 * 请求缓存工具
 * 提供请求级别的缓存机制，减少重复请求
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * 请求缓存管理器
 */
class RequestCache {
  private cache = new Map<string, CacheItem<any>>()
  private pendingRequests = new Map<string, Promise<any>>()

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // 设置自动清理
    setTimeout(() => {
      this.cache.delete(key)
    }, ttl)
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 检查是否存在缓存
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取待处理的请求
   */
  getPendingRequest<T>(key: string): Promise<T> | null {
    return this.pendingRequests.get(key) || null
  }

  /**
   * 设置待处理的请求
   */
  setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, promise)
    
    // 请求完成后清除
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }
}

// 全局缓存实例
const globalCache = new RequestCache()

/**
 * 缓存请求配置
 */
export interface CacheOptions {
  /** 缓存键（不提供则每次调用生成随机键，等效于不命中缓存；需命中请显式传键） */
  key?: string
  /** 缓存时间（毫秒），默认 5 分钟 */
  ttl?: number
  /** 是否强制刷新（忽略缓存） */
  forceRefresh?: boolean
  /** 是否启用请求去重 */
  dedupe?: boolean
}

/**
 * 带缓存的请求
 * @param requestFn 请求函数
 * @param options 缓存配置
 */
export async function cachedRequest<T>(
  requestFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    key = `req_${Date.now()}_${Math.random()}`,
    ttl = 5 * 60 * 1000,
    forceRefresh = false,
    dedupe = true
  } = options

  // 强制刷新，清除缓存
  if (forceRefresh) {
    globalCache.delete(key)
  }

  // 检查缓存
  const cached = globalCache.get<T>(key)
  if (cached !== null) {
    console.log(`[请求缓存] 命中: ${key}`)
    return cached
  }

  // 请求去重
  if (dedupe) {
    const pending = globalCache.getPendingRequest<T>(key)
    if (pending) {
      console.log(`[请求去重] 等待进行中的请求: ${key}`)
      return pending
    }
  }

  // 执行请求
  console.log(`[请求缓存] 未命中，发起请求: ${key}`)
  const promise = requestFn()
  
  if (dedupe) {
    globalCache.setPendingRequest(key, promise)
  }

  try {
    const data = await promise
    globalCache.set(key, data, ttl)
    return data
  } catch (error) {
    // 请求失败不缓存
    throw error
  }
}

/**
 * 预加载请求（提前加载并缓存）。
 * 失败语义：仅记录日志不抛出、不写缓存，调用方无法感知失败；需要失败感知时自行调用 requestFn
 */
export async function prefetchRequest<T>(
  requestFn: () => Promise<T>,
  key: string,
  ttl: number = 5 * 60 * 1000
): Promise<void> {
  try {
    const data = await requestFn()
    globalCache.set(key, data, ttl)
    console.log(`[预加载] 成功: ${key}`)
  } catch (error) {
    console.error(`[预加载] 失败: ${key}`, error)
  }
}

/**
 * 清除指定缓存
 */
export function clearCache(key: string): void {
  globalCache.delete(key)
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  globalCache.clear()
}

/**
 * 获取缓存统计。
 * @returns items 中 size 为 JSON 序列化后的字符数（非字节数）、age/ttl 单位毫秒
 */
export function getCacheStats() {
  return {
    size: globalCache.size(),
    items: Array.from(globalCache['cache'].entries()).map(([key, item]) => ({
      key,
      size: JSON.stringify(item.data).length,
      age: Date.now() - item.timestamp,
      ttl: item.ttl
    }))
  }
}

/**
 * 常用数据缓存键
 */
export const CACHE_KEYS = {
  // 字典数据
  DICT: (type: string) => `dict:${type}`,
  DICT_LIST: 'dict:list',
  
  // 用户信息
  USER_INFO: 'user:info',
  USER_ROLES: 'user:roles',
  USER_PERMISSIONS: 'user:permissions',
  
  // 菜单
  MENU_TREE: 'menu:tree',
  MENU_ROUTES: 'menu:routes',
  
  // 部门
  DEPT_TREE: 'dept:tree',
  
  // 配置
  SYS_CONFIG: (key: string) => `config:${key}`,
}

/**
 * 导出全局缓存实例（用于高级操作）
 */
export { globalCache }

/**
 * 默认导出
 */
export default {
  cachedRequest,
  prefetchRequest,
  clearCache,
  clearAllCache,
  getCacheStats,
  CACHE_KEYS,
  globalCache
}
