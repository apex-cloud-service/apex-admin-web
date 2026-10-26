/**
 * 认证工具单元测试
 * ------------------------------------------------------------------
 * 覆盖 src/utils/auth.ts 的租户 ID 会话存取：
 * 记录、读取、清除，以及 clearSession 对租户记录的连带清理。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { getTenantId, setTenantId, removeTenantId, clearSession, setToken, setIdentity } from '../auth'

describe('auth utils tenant session', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty string when tenant not recorded', () => {
    expect(getTenantId()).toBe('')
  })

  it('saves and reads tenant id', () => {
    setTenantId('acme')
    expect(getTenantId()).toBe('acme')
    expect(localStorage.getItem('apex.admin.tenant-id')).toBe('acme')
  })

  it('removes tenant id only', () => {
    setTenantId('acme')
    removeTenantId()
    expect(getTenantId()).toBe('')
  })

  it('clearSession also clears tenant record', () => {
    setToken('token-x')
    setIdentity({ id: 1 } as never)
    setTenantId('acme')
    clearSession()
    expect(getTenantId()).toBe('')
    expect(localStorage.getItem('apex.admin.token')).toBeNull()
    expect(localStorage.getItem('apex.admin.identity')).toBeNull()
  })
})
