/**
 * 日志查询 API 测试
 * ------------------------------------------------------------------
 * 覆盖：HTTP 方法、路径与关键参数透传（运行时日志与业务日志分页口径不同：运行时日志用 limit、业务日志用 page/size）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import { countRuntimeLogs, queryBusinessLogs, queryRuntimeLogs } from './log'

describe('日志查询 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('运行时日志查询：level/logger/message 与 limit 上限透传', () => {
    queryRuntimeLogs({
      startTime: '2026-01-01 00:00:00',
      endTime: '2026-01-02 00:00:00',
      level: 'ERROR',
      logger: 'com.apex',
      message: 'timeout',
      limit: 100,
    })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/logs/runtime', {
      startTime: '2026-01-01 00:00:00',
      endTime: '2026-01-02 00:00:00',
      level: 'ERROR',
      logger: 'com.apex',
      message: 'timeout',
      limit: 100,
    })
  })

  it('运行时日志计数仅消费 startTime/endTime/level（可省略 endTime）', () => {
    countRuntimeLogs({ startTime: '2026-01-01 00:00:00', level: 'WARN' })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/logs/runtime/count', {
      startTime: '2026-01-01 00:00:00',
      level: 'WARN',
    })
  })

  it('业务日志分页走 page/size（非 pageNum/pageSize），logType 筛选透传', () => {
    queryBusinessLogs({
      logType: 'operation',
      username: 'admin',
      module: 'user',
      startTime: '2026-01-01 00:00:00',
      endTime: '2026-01-02 00:00:00',
      page: 2,
      size: 50,
    })
    expect(request.get).toHaveBeenCalledWith('/admin-api/v1/logs/business', {
      logType: 'operation',
      username: 'admin',
      module: 'user',
      startTime: '2026-01-01 00:00:00',
      endTime: '2026-01-02 00:00:00',
      page: 2,
      size: 50,
    })
  })
})
