/**
 * 接口地址工具测试
 * ------------------------------------------------------------------
 * 覆盖同域（基地址为空）与跨域（VITE_API_BASE_URL，含尾部斜杠）两种部署形态，
 * 以及路径缺少前导斜杠时的归一化。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiBaseUrl, apiUrl } from '../api-base'

describe('apiBaseUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('未配置基地址时返回空串（同域相对路径）', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(apiBaseUrl()).toBe('')
  })

  it('跨域基地址去掉尾部斜杠', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    expect(apiBaseUrl()).toBe('https://api.example.com')
  })
})

describe('apiUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('同域部署返回相对路径', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(apiUrl('/api/v1/files/generic')).toBe('/api/v1/files/generic')
  })

  it('跨域部署拼接完整地址', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    expect(apiUrl('/api/v1/notifications/stream')).toBe(
      'https://api.example.com/api/v1/notifications/stream',
    )
  })

  it('路径缺少前导斜杠时补齐', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    expect(apiUrl('api/v1/files/generic')).toBe('https://api.example.com/api/v1/files/generic')
  })
})
