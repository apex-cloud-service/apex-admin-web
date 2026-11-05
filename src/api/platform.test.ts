/**
 * 租户套餐 / 能力 / 开放应用 / 集成 / IoT / 通知 / 会话 API 测试
 * ------------------------------------------------------------------
 * 断言各新增 api 模块以正确的 HTTP 方法、路径与关键参数调用统一请求层。
 * 重点覆盖易错契约：套餐更新走无路径参数的 PUT、规则启停 enabled 为字符串、
 * 会话终止按会话唯一标识、能力用量 capability 必填、通知模板分页 pageNum/pageSize。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/utils/request', () => request)

import {
  createTenantPackage,
  listTenantPackages,
  updateTenantPackage,
} from './tenant-package'
import { listCapabilities, listSubscribedCapabilities, queryCapabilityUsage } from './capability'
import {
  createOpenApp,
  listOpenAppScopes,
  listOpenApps,
  resetOpenAppSecret,
  updateOpenApp,
} from './open-app'
import {
  createConnector,
  deleteConnector,
  listConnectors,
  listCredentials,
  registerCredential,
  rotateCredential,
} from './integration'
import { listDevices, listDeviceTelemetry, registerDevice, toggleIotRule, listIotRules, getDeviceShadow, listDeviceCommands, dispatchDeviceCommand } from './iot'
import {
  createNotifyTemplate,
  listNotifyRecords,
  listNotifyTemplates,
  updateNotifyTemplate,
} from './notify'
import { listOnlineSessions, listUserSessions, terminateSession, terminateUserSessions } from './session'
import { getCrossDomainOverview } from './overview'

describe('租户套餐 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('列表路径正确', () => {
    listTenantPackages()
    expect(request.get).toHaveBeenCalledWith('/api/v2/tenant-packages')
  })

  it('更新走无路径参数的 PUT（后端按请求体 packageCode 定位）', () => {
    const payload = { packageCode: 'standard', packageName: '标准版', menuIds: [1, 2] }
    updateTenantPackage(payload)
    expect(request.put).toHaveBeenCalledWith('/api/v2/tenant-packages', payload)
  })

  it('创建以 POST 提交完整配置', () => {
    const payload = { packageCode: 'basic', packageName: '基础版', features: ['file-storage'] }
    createTenantPackage(payload)
    expect(request.post).toHaveBeenCalledWith('/api/v2/tenant-packages', payload)
  })
})

describe('能力目录与计量 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('目录与订阅端点分离', () => {
    listCapabilities()
    listSubscribedCapabilities()
    expect(request.get).toHaveBeenCalledWith('/api/v2/capabilities')
    expect(request.get).toHaveBeenCalledWith('/api/v2/capabilities/subscribed')
  })

  it('用量查询透传 capability/tenantId/时间区间与分页', () => {
    queryCapabilityUsage({
      capability: 'file-storage',
      tenantId: 'default',
      from: '2026-10-01',
      to: '2026-10-31',
      pageNum: 2,
      pageSize: 50,
    })
    expect(request.get).toHaveBeenCalledWith('/api/v2/capability-usage', {
      capability: 'file-storage',
      tenantId: 'default',
      from: '2026-10-01',
      to: '2026-10-31',
      pageNum: 2,
      pageSize: 50,
    })
  })
})

describe('开放应用 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('列表使用 page/size（page 从 0 开始）', () => {
    listOpenApps({ page: 0, size: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/open-apps', { page: 0, size: 20 })
  })

  it('创建、更新与重置密钥路径正确', () => {
    createOpenApp({ clientId: 'partner', appName: '合作方' })
    updateOpenApp('partner', { appName: '合作方 V2' })
    resetOpenAppSecret('partner')
    expect(request.post).toHaveBeenCalledWith('/api/v1/open-apps', { clientId: 'partner', appName: '合作方' })
    expect(request.put).toHaveBeenCalledWith('/api/v1/open-apps/partner', { appName: '合作方 V2' })
    expect(request.post).toHaveBeenCalledWith('/api/v1/open-apps/partner/reset-secret')
  })

  it('scope 目录走 system 的 /api/v1/open-apps/scopes（与创建校验同源注册表）', () => {
    listOpenAppScopes()
    expect(request.get).toHaveBeenCalledWith('/api/v1/open-apps/scopes')
  })
})

describe('集成中心 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('连接器分页使用 pageNum/pageSize 与类型过滤', () => {
    listConnectors({ connectorType: 'HTTP', pageNum: 1, pageSize: 20 })
    expect(request.get).toHaveBeenCalledWith('/integration/v1/connectors', {
      connectorType: 'HTTP',
      pageNum: 1,
      pageSize: 20,
    })
  })

  it('连接器创建/删除路径与请求体正确', () => {
    createConnector({ connectorType: 'WEBHOOK', configKey: 'hook', configValue: '{}' })
    deleteConnector(7)
    expect(request.post).toHaveBeenCalledWith('/integration/v1/connectors', {
      connectorType: 'WEBHOOK',
      configKey: 'hook',
      configValue: '{}',
    })
    expect(request.del).toHaveBeenCalledWith('/integration/v1/connectors/7')
  })

  it('凭据列表为裸数组、注册与轮换按契约提交', () => {
    listCredentials('API_KEY')
    registerCredential({ credentialKey: 'feishu', secret: 's3cret' })
    rotateCredential(3, 'new-secret')
    expect(request.get).toHaveBeenCalledWith('/integration/v1/credentials', { credentialType: 'API_KEY' })
    expect(request.post).toHaveBeenCalledWith('/integration/v1/credentials', {
      credentialKey: 'feishu',
      secret: 's3cret',
    })
    expect(request.put).toHaveBeenCalledWith('/integration/v1/credentials/3/rotate', { secret: 'new-secret' })
  })
})

describe('物联网 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('设备分页与遥测分页参数正确', () => {
    listDevices({ status: 'ONLINE', pageNum: 2, pageSize: 10 })
    listDeviceTelemetry(9, 1, 20)
    expect(request.get).toHaveBeenCalledWith('/integration/v1/iot/devices', {
      status: 'ONLINE',
      pageNum: 2,
      pageSize: 10,
    })
    expect(request.get).toHaveBeenCalledWith('/integration/v1/iot/devices/9/telemetry', { pageNum: 1, pageSize: 20 })
  })

  it('注册设备提交标识与标签', () => {
    registerDevice({ deviceKey: 'dev-1', firmwareVersion: '1.0.3', labels: { site: 'sh' } })
    expect(request.post).toHaveBeenCalledWith('/integration/v1/iot/devices', {
      deviceKey: 'dev-1',
      firmwareVersion: '1.0.3',
      labels: { site: 'sh' },
    })
  })

  it('规则启停把 enabled 序列化为字符串', () => {
    toggleIotRule(5, false)
    expect(request.put).toHaveBeenCalledWith('/integration/v1/iot/rules/5/toggle', { enabled: 'false' })
  })

  it('规则分页使用 keyword/enabled 与 pageNum/pageSize', () => {
    listIotRules({ keyword: '温度', enabled: true, pageNum: 2, pageSize: 10 })
    expect(request.get).toHaveBeenCalledWith('/integration/v1/iot/rules', {
      keyword: '温度',
      enabled: true,
      pageNum: 2,
      pageSize: 10,
    })
  })

  it('设备影子与命令端点路径正确', () => {
    getDeviceShadow(7)
    listDeviceCommands(7, 1, 20)
    dispatchDeviceCommand(7, { commandId: 'cmd-1', payload: { on: true }, timeoutSeconds: 30 })
    expect(request.get).toHaveBeenCalledWith('/integration/v1/iot/devices/7/shadow')
    expect(request.get).toHaveBeenCalledWith('/integration/v1/iot/devices/7/commands', { pageNum: 1, pageSize: 20 })
    expect(request.post).toHaveBeenCalledWith('/integration/v1/iot/devices/7/commands', {
      commandId: 'cmd-1',
      payload: { on: true },
      timeoutSeconds: 30,
    })
  })
})

describe('统一通知 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('模板分页使用 pageNum/pageSize', () => {
    listNotifyTemplates({ pageNum: 1, pageSize: 10, channel: 'SMS', keyword: 'ORDER' })
    expect(request.get).toHaveBeenCalledWith('/api/v2/office/notify/templates', {
      pageNum: 1,
      pageSize: 10,
      channel: 'SMS',
      keyword: 'ORDER',
    })
  })

  it('模板创建/更新与留痕查询路径正确', () => {
    createNotifyTemplate({ templateCode: 'ORDER_SHIPPED', channel: 'SMS', body: 'hi ${name}' })
    updateNotifyTemplate(11, { status: 'DISABLED' })
    listNotifyRecords({ pageNum: 1, pageSize: 20, status: 'FAILED' })
    expect(request.post).toHaveBeenCalledWith('/api/v2/office/notify/templates', {
      templateCode: 'ORDER_SHIPPED',
      channel: 'SMS',
      body: 'hi ${name}',
    })
    expect(request.put).toHaveBeenCalledWith('/api/v2/office/notify/templates/11', { status: 'DISABLED' })
    expect(request.get).toHaveBeenCalledWith('/api/v2/office/notify/requests', {
      pageNum: 1,
      pageSize: 20,
      status: 'FAILED',
    })
  })
})

describe('在线会话 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在线列表为裸数组端点', () => {
    listOnlineSessions()
    expect(request.get).toHaveBeenCalledWith('/auth/v1/sessions/online')
  })

  it('用户会话查询与批量下线带 userId', () => {
    listUserSessions(42, 'default')
    terminateUserSessions(42)
    expect(request.get).toHaveBeenCalledWith('/auth/v1/sessions/user/42', { tenantId: 'default' })
    expect(request.del).toHaveBeenCalledWith('/auth/v1/sessions/user/42', undefined)
  })

  it('单会话终止使用会话唯一标识（非数字主键）', () => {
    terminateSession('session_abc123')
    expect(request.del).toHaveBeenCalledWith('/auth/v1/sessions/session_abc123')
  })
})

describe('跨域聚合概览 API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('走业务端 /api/v2/overview（非内部端点）', () => {
    getCrossDomainOverview()
    expect(request.get).toHaveBeenCalledWith('/api/v2/overview')
  })
})
