/**
 * 本地存储工具单元测试
 * ------------------------------------------------------------------
 * 覆盖 storage.ts 的原始读写、JSON 读写与异常兜底：
 * - 缺失键返回 null / false
 * - JSON 损坏时返回 null 而不抛异常
 * - 写入异常（配额超限）返回 false
 * - hasItem 与 removeItem 行为
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasItem, readJSON, readRaw, removeItem, writeJSON, writeRaw } from '@/utils/storage'

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('原始字符串读写', () => {
    expect(readRaw('k')).toBeNull()
    expect(writeRaw('k', 'v')).toBe(true)
    expect(readRaw('k')).toBe('v')
  })

  it('JSON 序列化与反序列化', () => {
    expect(writeJSON('obj', { a: 1, b: [2] })).toBe(true)
    expect(readJSON<{ a: number; b: number[] }>('obj')).toEqual({ a: 1, b: [2] })
  })

  it('JSON 损坏时返回 null 且不抛异常', () => {
    localStorage.setItem('broken', '{not-json')
    expect(readJSON('broken')).toBeNull()
  })

  it('删除与存在性判断', () => {
    writeRaw('k', 'v')
    expect(hasItem('k')).toBe(true)
    removeItem('k')
    expect(hasItem('k')).toBe(false)
  })

  it('写入异常时返回 false', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(writeRaw('k', 'v')).toBe(false)
  })

  it('循环引用序列化失败时返回 false', () => {
    const source: Record<string, unknown> = {}
    source.self = source
    expect(writeJSON('cyclic', source)).toBe(false)
  })
})
