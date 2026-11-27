/**
 * 请求缓存工具
 * ------------------------------------------------------------------
 * 用途：提供按 key 的 TTL 缓存，适用于调用方允许缓存的读取操作，
 * 不检查 HTTP 方法。cachedRequest 可按 dedupe 复用在途请求；
 * prefetchRequest 每次执行，不读取缓存或参与去重。当前无业务调用点。
 *
 * 失效屏障：delete 递增该 key 的 version，clear 递增全局 epoch；
 * 响应返回时核对请求发起前的快照，已失效的响应仍返回给原调用方，
 * 但不回填缓存。delete 不清 pending；clear 清 pending 但不取消网络请求。
 *
 * pending 映射每个 key 仅记录一个 Promise，覆盖不取消旧请求；
 * 旧 Promise 仅在仍是当前记录时清理映射。重新写入会取消旧 TTL 定时器，
 * 定时器到期也核对条目身份，避免误删同 key 的新值。
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  /** 该条目的清理定时器句柄，重新写入或删除时需取消，避免旧定时器淘汰新值 */
  timer?: ReturnType<typeof setTimeout>
}

/**
 * 请求缓存管理器
 */
class RequestCache {
  // 值类型由各方法泛型决定，容器内部按 unknown 保存，读取时由调用方断言为 T
  private cache = new Map<string, CacheItem<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()
  /** 每 key 失效版本，delete 时递增 */
  private versions = new Map<string, number>()
  /** 全局失效纪元，clear 时递增；用于让所有在途请求失效 */
  private epoch = 0

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
      this.clearTimer(key)
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // 先取消旧条目的清理定时器，否则它会按 key 删除刚写入的新值
    this.clearTimer(key)

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    item.timer = setTimeout(() => {
      // 只移除仍是本次写入的条目，避免误删后续写入
      if (this.cache.get(key) === item) {
        this.cache.delete(key)
      }
    }, ttl)
    this.cache.set(key, item)
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.clearTimer(key)
    this.cache.delete(key)
    this.versions.set(key, this.versionOf(key) + 1)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    for (const key of Array.from(this.cache.keys())) {
      this.clearTimer(key)
    }
    this.cache.clear()
    this.pendingRequests.clear()
    this.epoch += 1
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
      this.clearTimer(key)
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 获取待处理的请求
   */
  getPendingRequest<T>(key: string): Promise<T> | null {
    return (this.pendingRequests.get(key) as Promise<T> | undefined) || null
  }

  /**
   * 设置待处理的请求
   */
  setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, promise)

    // 请求完成后清除，但仅当它仍是该 key 的当前请求时。
    // 使用 then(cleanup, cleanup) 而非 finally，避免派生拒绝无人观察。
    const cleanup = () => {
      if (this.pendingRequests.get(key) === promise) {
        this.pendingRequests.delete(key)
      }
    }
    promise.then(cleanup, cleanup)
  }

  /**
   * 记录请求发起时的失效快照，供响应返回前判断是否已被清除。
   */
  snapshot(key: string): { epoch: number; version: number } {
    return { epoch: this.epoch, version: this.versionOf(key) }
  }

  /**
   * 判断快照之后该 key 是否未被删除或整体清空。
   */
  isSnapshotCurrent(key: string, snapshot: { epoch: number; version: number }): boolean {
    return this.epoch === snapshot.epoch && this.versionOf(key) === snapshot.version
  }

  private versionOf(key: string): number {
    return this.versions.get(key) ?? 0
  }

  /**
   * 取消某 key 尚未触发的清理定时器。
   */
  private clearTimer(key: string): void {
    const item = this.cache.get(key)
    if (item?.timer) {
      clearTimeout(item.timer)
      item.timer = undefined
    }
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
  /** 使已存缓存失效（默认 false）；不清 pending，dedupe=true 时仍可能复用旧在途请求 */
  forceRefresh?: boolean
  /** 是否启用请求去重 */
  dedupe?: boolean
}

/**
 * 执行带 TTL 缓存和可选在途去重的请求。
 * @param requestFn 调用方提供的请求函数，本工具不检查 HTTP 方法
 * @param options 缓存配置（可选）；需复用缓存时显式提供 key
 * @returns 缓存命中值或请求结果；null 作为未命中标记，不能可靠缓存为命中值
 * forceRefresh 只失效缓存，dedupe=true 时仍可能复用旧 pending；
 * 失效只阻止旧结果回填，不阻止原调用返回，也不取消网络请求。
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
  // 记录失效快照：期间若被 clearCache/clearAllCache 失效，响应不得回填
  const snapshot = globalCache.snapshot(key)
  const promise = requestFn()

  if (dedupe) {
    globalCache.setPendingRequest(key, promise)
  }

  try {
    const data = await promise
    if (globalCache.isSnapshotCurrent(key, snapshot)) {
      globalCache.set(key, data, ttl)
    }
    return data
  } catch (error) {
    // 请求失败不缓存
    throw error
  }
}

/**
 * 预加载请求，每次执行，不检查缓存或参与在途去重。
 * 同 key 的并发结果在快照仍有效时按完成顺序写入，不能保证发起顺序。
 * @param requestFn 允许预加载的请求函数
 * @param key 缓存键
 * @param ttl 缓存时间（可选，毫秒，默认 5 分钟）
 * @returns 无结果；失败仅记录日志、不抛出、不写缓存，需要感知失败时自行调用 requestFn
 */
export async function prefetchRequest<T>(
  requestFn: () => Promise<T>,
  key: string,
  ttl: number = 5 * 60 * 1000
): Promise<void> {
  try {
    // 与 cachedRequest 一致：预加载在飞行期间若被失效，不得回填
    const snapshot = globalCache.snapshot(key)
    const data = await requestFn()
    if (!globalCache.isSnapshotCurrent(key, snapshot)) {
      return
    }
    globalCache.set(key, data, ttl)
    console.log(`[预加载] 成功: ${key}`)
  } catch (error) {
    console.error(`[预加载] 失败: ${key}`, error)
  }
}

/**
 * 清除指定缓存并使该 key 的在途快照失效。
 * @param key 缓存键
 * 不清 pending 或取消请求；后续去重调用仍可能复用旧请求，但旧结果不会回填。
 */
export function clearCache(key: string): void {
  globalCache.delete(key)
}

/**
 * 清空缓存及 pending 映射，推进全局失效纪元；不取消已发网络请求。
 */
export function clearAllCache(): void {
  globalCache.clear()
}

/**
 * 获取缓存统计。
 * @returns items 中 size 为 JSON 序列化后的字符数（非字节数）、age/ttl 单位毫秒
 * @throws Error 缓存值不能序列化为 JSON 字符串时可能抛错，如循环引用、BigInt 或 undefined
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
