/**
 * 集成中心：连接器与凭据 API
 * ------------------------------------------------------------------
 * 后端接口（apex-integration IntegrationConnectorRouter，前缀 /integration/v1）：
 * - GET    /connectors              - 连接器配置分页（connectorType 过滤，pageNum/pageSize）
 * - POST   /connectors              - 创建连接器配置
 * - PUT    /connectors/{id}         - 更新连接器配置
 * - DELETE /connectors/{id}         - 逻辑删除
 * - GET    /credentials             - 凭据元数据列表（裸数组，不含密文）
 * - POST   /credentials             - 注册凭据（secret 仅上行，AES-256-GCM 加密存储）
 * - PUT    /credentials/{id}/rotate - 轮换凭据（版本递增，旧版本立即失效）
 * - DELETE /credentials/{id}        - 删除凭据
 *
 * 权限码：integration:connector:read/create/update/delete、integration:credential:read/manage。
 */
import { del, get, post, put } from '@/utils/request'
import type {
  ConnectorConfig,
  ConnectorConfigCreatePayload,
  ConnectorConfigUpdatePayload,
  CredentialRegisterPayload,
  IntegrationCredential,
  PageResponse,
} from '@/types'

/** 连接器分页查询参数 */
export interface ConnectorQuery {
  connectorType?: string
  pageNum: number
  pageSize: number
}

/** 连接器类型 → 中文名称（内置类型 + 常见 SPI 类型） */
export const CONNECTOR_TYPE_NAMES: Record<string, string> = {
  HTTP: 'HTTP 通用连接器',
  WEBHOOK: 'Webhook 出站连接器',
  WECHAT: '微信',
  CHUANGLAN: '创蓝短信',
}

/**
 * 分页查询连接器配置
 * @param query 类型过滤与 pageNum/pageSize 分页
 * @returns ConnectorConfig 分页（list 为当前页，total 为匹配总数）
 */
export function listConnectors(query: ConnectorQuery): Promise<PageResponse<ConnectorConfig>> {
  return get<PageResponse<ConnectorConfig>>(
    '/integration/v1/connectors',
    query as unknown as Record<string, unknown>,
  )
}

/**
 * 创建连接器配置
 * @param payload 类型、配置标识与配置 JSON
 */
export function createConnector(payload: ConnectorConfigCreatePayload): Promise<ConnectorConfig> {
  return post<ConnectorConfig>('/integration/v1/connectors', payload)
}

/**
 * 更新连接器配置
 * @param id 配置 ID
 * @param payload 变更字段
 */
export function updateConnector(id: number, payload: ConnectorConfigUpdatePayload): Promise<ConnectorConfig> {
  return put<ConnectorConfig>(`/integration/v1/connectors/${id}`, payload)
}

/**
 * 删除连接器配置（后端逻辑删除）
 * @param id 配置 ID
 */
export function deleteConnector(id: number): Promise<void> {
  return del<void>(`/integration/v1/connectors/${id}`)
}

/**
 * 查询凭据元数据列表（后端返回裸数组，不含密文）
 * @param credentialType 可选类型过滤
 */
export function listCredentials(credentialType?: string): Promise<IntegrationCredential[]> {
  return get<IntegrationCredential[]>(
    '/integration/v1/credentials',
    credentialType ? { credentialType } : undefined,
  )
}

/**
 * 注册租户级外部凭据
 * @param payload 凭据标识、类型与明文（仅上行，不落本地）
 */
export function registerCredential(payload: CredentialRegisterPayload): Promise<IntegrationCredential> {
  return post<IntegrationCredential>('/integration/v1/credentials', payload)
}

/**
 * 轮换凭据（旧版本立即失效）
 * @param id 凭据 ID
 * @param secret 新凭据明文
 */
export function rotateCredential(id: number, secret: string): Promise<IntegrationCredential> {
  return put<IntegrationCredential>(`/integration/v1/credentials/${id}/rotate`, { secret })
}

/**
 * 删除凭据
 * @param id 凭据 ID
 */
export function deleteCredential(id: number): Promise<void> {
  return del<void>(`/integration/v1/credentials/${id}`)
}
