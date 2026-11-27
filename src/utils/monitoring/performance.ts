/**
 * 性能监控工具
 * ------------------------------------------------------------------
 * 封装前端性能指标采集，支持页面加载性能监控。
 * 
 * 监控指标：
 *   - FCP (First Contentful Paint) - 首次内容绘制时间
 *   - LCP (Largest Contentful Paint) - 最大内容绘制时间
 *   - FID (First Input Delay) - 首次输入延迟
 *   - TTFB (Time To First Byte) - 首字节时间（随页面 load 上报）
 */

/** 带 processingStart 字段的性能条目（FID 计算需要，标准类型未覆盖） */
interface PerformanceEntryWithProcessing extends PerformanceEntry {
  processingStart?: number
}

/**
 * 前端性能监控器
 * ------------------------------------------------------------------
 * 基于 PerformanceObserver 采集 Web Vitals 关键指标并输出到控制台。
 * 当前未接入：应用入口未调用 init()（仅单元测试引用），需在 main.ts 调用后才会生效。
 * 后续可将 console.log 替换为上报到监控后端（配合 TraceId 链路）。
 */
export class PerformanceMonitor {
  /**
   * 注册 FCP/LCP/FID 观察者与未来的 load 事件回调；无 window 时跳过。
   * 应在 load 前调用一次；不补报已发生的 load，也不保护重复初始化或提供释放入口。
   * 调用方需确认 PerformanceObserver 和所需指标可用，不支持时可能抛错。
   * FCP/LCP 为相对导航起点的毫秒时间，FID 为毫秒延迟；当前仅打印控制台。
   */
  static init(): void {
    if (typeof window === 'undefined') return

    this.observeFCP()
    this.observeLCP()
    this.observeFID()

    window.addEventListener('load', () => {
      this.reportPageLoad()
    })
  }

  /** 监听首次内容绘制（FCP） */
  private static observeFCP(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log('FCP:', entry.startTime)
        }
      }
    })
    observer.observe({ entryTypes: ['paint'] })
  }

  /** 监听最大内容绘制（LCP，取最后一次条目） */
  private static observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      console.log('LCP:', lastEntry.startTime)
    })
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
  }

  /** 监听首次输入延迟（FID = processingStart - startTime） */
  private static observeFID(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const entryWithProcessing = entry as PerformanceEntryWithProcessing
        if (entryWithProcessing.processingStart !== undefined) {
          const fid = entryWithProcessing.processingStart - entry.startTime
          console.log('FID:', fid)
        }
      }
    })
    observer.observe({ entryTypes: ['first-input'] })
  }

  /** 在 load 回调中打印旧版 performance.timing 原始差值（毫秒）；loadEventEnd 可能尚未完成写入。 */
  private static reportPageLoad(): void {
    const timing = performance.timing
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart
    const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart
    const ttfb = timing.responseStart - timing.navigationStart

    console.log('页面加载性能:', {
      pageLoadTime,
      domReadyTime,
      ttfb
    })
  }
}
