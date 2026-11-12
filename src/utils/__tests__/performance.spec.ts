/**
 * 性能监控工具单元测试
 * ------------------------------------------------------------------
 * 覆盖 SSR 跳过、观察者注册、FCP/LCP/FID 指标计算与 load 上报。
 * 该工具当前未接线（无调用点），此处仅验证纯逻辑。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerformanceMonitor } from '@/utils/monitoring/performance'

/** 记录 observe 调用的桩观察者 */
interface RecordedObserver {
  callback: PerformanceObserverCallback
  entryTypes?: string[]
}

let recorded: RecordedObserver[]
let loadListeners: EventListener[]

/** 构造 PerformanceObserverCallback 的入参列表包装 */
function entryList(entries: Array<Record<string, unknown>>): PerformanceObserverEntryList {
  return {
    getEntries: () => entries as unknown as PerformanceEntry[],
  } as unknown as PerformanceObserverEntryList
}

beforeEach(() => {
  recorded = []
  loadListeners = []
  vi.spyOn(console, 'log').mockImplementation(() => {})

  const ObserverStub = class {
    callback: PerformanceObserverCallback
    constructor(cb: PerformanceObserverCallback) {
      this.callback = cb
    }
    observe(options: PerformanceObserverInit) {
      recorded.push({ callback: this.callback, entryTypes: options.entryTypes as string[] })
    }
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('PerformanceObserver', ObserverStub)

  vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: EventListener) => {
    if (type === 'load') loadListeners.push(listener)
    return undefined
  }) as typeof window.addEventListener)
  vi.spyOn(window, 'removeEventListener').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PerformanceMonitor', () => {
  it('无 window（SSR）时 init 直接跳过', () => {
    vi.stubGlobal('window', undefined)
    expect(() => PerformanceMonitor.init()).not.toThrow()
    expect(recorded).toHaveLength(0)
  })

  it('init 注册 FCP/LCP/FID 三个观察者并监听页面 load', () => {
    PerformanceMonitor.init()

    expect(recorded.map((r) => r.entryTypes)).toEqual([
      ['paint'],
      ['largest-contentful-paint'],
      ['first-input'],
    ])
    expect(loadListeners).toHaveLength(1)
  })

  it('FCP 输出首次内容绘制时间', () => {
    PerformanceMonitor.init()
    recorded[0].callback(entryList([{ name: 'first-contentful-paint', startTime: 123.4 }]), {} as PerformanceObserver)

    expect(console.log).toHaveBeenCalledWith('FCP:', 123.4)
  })

  it('非 FCP 命名的 paint 条目不上报', () => {
    PerformanceMonitor.init()
    recorded[0].callback(entryList([{ name: 'other-paint', startTime: 5 }]), {} as PerformanceObserver)

    expect(console.log).not.toHaveBeenCalledWith('FCP:', 5)
  })

  it('LCP 取最后一条条目', () => {
    PerformanceMonitor.init()
    recorded[1].callback(
      entryList([
        { name: 'largest-contentful-paint', startTime: 10 },
        { name: 'largest-contentful-paint', startTime: 99 },
      ]),
      {} as PerformanceObserver,
    )

    expect(console.log).toHaveBeenCalledWith('LCP:', 99)
  })

  it('FID 按 processingStart - startTime 计算', () => {
    PerformanceMonitor.init()
    recorded[2].callback(
      entryList([{ name: 'first-input', startTime: 100, processingStart: 152 }]),
      {} as PerformanceObserver,
    )

    expect(console.log).toHaveBeenCalledWith('FID:', 52)
  })

  it('无 processingStart 的输入条目不上报 FID', () => {
    PerformanceMonitor.init()
    recorded[2].callback(
      entryList([{ name: 'first-input', startTime: 100 }]),
      {} as PerformanceObserver,
    )

    expect(console.log).not.toHaveBeenCalledWith('FID:', expect.anything())
  })

  it('页面 load 后上报加载耗时（TTFB/DOM 就绪/整体加载）', () => {
    vi.stubGlobal('performance', {
      // happy-dom 的 Event 构造内部会调用 performance.now，桩需一并提供
      now: () => 0,
      timing: {
        navigationStart: 0,
        responseStart: 10,
        domContentLoadedEventEnd: 50,
        loadEventEnd: 120,
      },
    })

    PerformanceMonitor.init()
    loadListeners[0](new Event('load'))

    expect(console.log).toHaveBeenCalledWith('页面加载性能:', {
      pageLoadTime: 120,
      domReadyTime: 50,
      ttfb: 10,
    })
  })
})
