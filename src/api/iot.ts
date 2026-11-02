/**
 * 物联网设备与规则 API
 * ------------------------------------------------------------------
 * 后端接口（apex-integration IotDeviceRouter，前缀 /integration/v1/iot）：
 * - GET    /devices                 - 设备分页（status 过滤，pageNum/pageSize）
 * - POST   /devices                 - 注册设备（响应含一次性明文 secret）
 * - GET    /devices/{id}            - 设备详情（不含凭据）
 * - DELETE /devices/{id}            - 注销设备
 * - GET    /devices/{id}/telemetry  - 遥测历史分页
 * - GET    /devices/{id}/shadow     - 设备影子（desired/reported + version，只读）
 * - GET    /devices/{id}/commands   - 命令历史分页
 * - POST   /devices/{id}/commands   - 命令下发（commandId 幂等键）
 * - GET    /rules                   - 规则分页（keyword/enabled 过滤）
 * - POST   /rules                   - 创建规则
 * - GET    /rules/{id}              - 规则详情
 * - PUT    /rules/{id}/toggle       - 启停规则（enabled 序列化为字符串 "true"/"false"）
 *
 * 权限码：iot:device:read/manage、iot:telemetry:read、iot:command:send、iot:rule:read/manage。
 * 设备影子只读：desired 写接口后端未实现（API 文档 §10），页面不提供影子修改。
 * MQTT 认证钩子为内部端点（/internal/v1/iot/**），不经网关，管理端不调用；
 * 本文件全部端点均为管理端接口，经网关访问。
 */
import { del, get, post, put } from '@/utils/request'
import type {
  CommandDispatchPayload,
  DeviceCommand,
  DeviceRegisterPayload,
  DeviceRegisterResult,
  DeviceShadow,
  DeviceTelemetry,
  IotDevice,
  IotRule,
  IotRuleCreatePayload,
  PageResponse,
} from '@/types'

/** 设备分页查询参数 */
export interface DeviceQuery {
  /** ONLINE / OFFLINE */
  status?: string
  pageNum: number
  pageSize: number
}

/** 规则分页查询参数 */
export interface RuleQuery {
  /** 规则名关键字（模糊） */
  keyword?: string
  /** 启停过滤 */
  enabled?: boolean
  pageNum: number
  pageSize: number
}

/** 设备状态 → 中文名称与标签样式 */
export const DEVICE_STATUS_META: Record<string, { label: string; tag: 'success' | 'info' | 'warning' | 'danger' }> = {
  ONLINE: { label: '在线', tag: 'success' },
  OFFLINE: { label: '离线', tag: 'info' },
  DISABLED: { label: '已停用', tag: 'warning' },
}

/** 规则动作类型 → 中文名称 */
export const RULE_ACTION_NAMES: Record<string, string> = {
  NOTIFY: '发送通知（统一消息门面）',
  WEBHOOK: '回调外部系统（出站 Webhook）',
  EVENT: '转发领域事件',
}

/**
 * 分页查询设备
 * @param query 状态过滤与分页
 */
export function listDevices(query: DeviceQuery): Promise<PageResponse<IotDevice>> {
  return get<PageResponse<IotDevice>>('/integration/v1/iot/devices', query as unknown as Record<string, unknown>)
}

/**
 * 查询设备详情
 * @param id 设备主键
 */
export function getDevice(id: number): Promise<IotDevice> {
  return get<IotDevice>(`/integration/v1/iot/devices/${id}`)
}

/**
 * 注册设备（返回一次性明文 secret）
 * @param payload 设备标识、证书指纹、固件版本与标签
 */
export function registerDevice(payload: DeviceRegisterPayload): Promise<DeviceRegisterResult> {
  return post<DeviceRegisterResult>('/integration/v1/iot/devices', payload)
}

/**
 * 注销设备
 * @param id 设备主键
 */
export function deregisterDevice(id: number): Promise<void> {
  return del<void>(`/integration/v1/iot/devices/${id}`)
}

/**
 * 分页查询设备遥测历史
 * @param id 设备主键
 * @param pageNum 页码
 * @param pageSize 每页条数
 */
export function listDeviceTelemetry(
  id: number,
  pageNum: number,
  pageSize: number,
): Promise<PageResponse<DeviceTelemetry>> {
  return get<PageResponse<DeviceTelemetry>>(`/integration/v1/iot/devices/${id}/telemetry`, { pageNum, pageSize })
}

/**
 * 分页查询物联网规则
 * @param query 规则名关键字、启停过滤与分页
 */
export function listIotRules(query: RuleQuery): Promise<PageResponse<IotRule>> {
  return get<PageResponse<IotRule>>('/integration/v1/iot/rules', query as unknown as Record<string, unknown>)
}

/**
 * 创建物联网规则
 * @param payload 规则名、结构化条件 JSON 与动作
 */
export function createIotRule(payload: IotRuleCreatePayload): Promise<IotRule> {
  return post<IotRule>('/integration/v1/iot/rules', payload)
}

/**
 * 查询规则详情
 * @param id 规则 ID
 */
export function getIotRule(id: number): Promise<IotRule> {
  return get<IotRule>(`/integration/v1/iot/rules/${id}`)
}

/**
 * 启停规则
 * @param id 规则 ID
 * @param enabled 目标状态（后端 RuleToggleRequest.enabled 为字符串 "true"/"false"）
 */
export function toggleIotRule(id: number, enabled: boolean): Promise<void> {
  return put<void>(`/integration/v1/iot/rules/${id}/toggle`, { enabled: String(enabled) })
}

/**
 * 查询设备影子（desired/reported + version 乐观锁）
 * @param id 设备主键
 */
export function getDeviceShadow(id: number): Promise<DeviceShadow> {
  return get<DeviceShadow>(`/integration/v1/iot/devices/${id}/shadow`)
}

/**
 * 分页查询设备命令历史
 * @param id 设备主键
 * @param pageNum 页码
 * @param pageSize 每页条数
 */
export function listDeviceCommands(
  id: number,
  pageNum: number,
  pageSize: number,
): Promise<PageResponse<DeviceCommand>> {
  return get<PageResponse<DeviceCommand>>(`/integration/v1/iot/devices/${id}/commands`, { pageNum, pageSize })
}

/**
 * 向指定设备下发命令（commandId 为幂等键）
 * @param id 设备主键
 * @param payload 命令 ID、载荷与超时窗口
 */
export function dispatchDeviceCommand(id: number, payload: CommandDispatchPayload): Promise<DeviceCommand> {
  return post<DeviceCommand>(`/integration/v1/iot/devices/${id}/commands`, payload)
}
