/**
 * 全局类型定义
 * ------------------------------------------------------------------
 * 与后端统一响应/分页/各业务 DTO 对应的 TypeScript 类型。
 * 字段命名与后端 JSON 保持完全一致（camelCase）。
 *
 * 字段口径已与后端（apex-scaffold）逐项核对：
 * - 统一响应 Result{code,msg,data,traceId}，成功 code=0
 * - 分页响应 PageResponse{list,total,pageNum,pageSize,pages,hasNext}
 * - 后台用户字段为 nickname（非 nickName）、无 username
 * - 部门字段为 name/orderNum（非 deptName/sort）
 * - 菜单 status: 0=停用 1=正常；visible: 0=隐藏 1=显示
 */

/** 后端统一响应结构（Result<T>） */
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
  traceId?: string
}

/** 统一分页响应结构（与后端 PageResponse 对齐） */
export interface PageResponse<T = unknown> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
  hasNext?: boolean
}

/** 分页查询基础参数（后台管理接口统一 page/size） */
export interface PageQuery {
  page: number
  size: number
}

/** 图形验证码（GET /api/v1/auth/captcha，image 不含 data: 前缀） */
export interface CaptchaVO {
  captchaId: string
  image: string
}

/** 登录响应（POST /api/v1/auth/login） */
export interface LoginResult {
  accessToken: string
  refreshToken?: string
  tokenType?: string
  expiresIn?: number
  /** 当前租户 ID（认证中心登录链路返回；单体登录暂不返回） */
  tenantId?: string
  openId?: string
  unionId?: string
  isNewUser?: boolean
  /** 登录后分流动作：AUTHENTICATED / REGISTER_REQUIRED / PHONE_BIND_REQUIRED */
  nextAction?: string
  authTicket?: string
  authTicketExpiresIn?: number
  userInfo?: LoginUserInfo
}

/** 登录响应内嵌用户信息 */
export interface LoginUserInfo {
  nickName?: string
  avatarUrl?: string
  gender?: number
  phone?: string
  birthday?: string
}

/**
 * 当前登录用户身份（GET /api/v1/user/info → UserDTO）
 * 由前端 store 合并：UserDTO 基础字段 + 角色码 + 权限码
 */
export interface UserIdentity {
  id: number
  openId?: string
  unionId?: string
  nickName?: string
  avatarUrl?: string
  gender?: number
  birthday?: string
  phone?: string
  status?: number
  lastLoginTime?: string
  createTime?: string
  /** 兼容旧字段（部分页面仍引用） */
  username?: string
  nickname?: string
  /** 由 GET /api/v1/auth/roles/my 合并 */
  roles?: string[]
  /** 由 GET /api/v1/auth/permissions/my 合并 */
  permissions?: string[]
  /** 当前租户 ID（登录响应返回 tenantId 时合并，仅作展示/透传，租户作用域由后端令牌决定） */
  tenantId?: string
}

/** 后台用户列表项（AdminUserSummaryResponse，id 序列化为字符串） */
export interface AdminUser {
  id: string
  nickname: string
  avatarUrl?: string
  gender?: number
  phone?: string
  status?: number
  onboardingStatus?: string
  activityStatus?: string
  lastLoginTime?: string
  createdAt?: string
  roles?: AdminRole[]
}

/** 后台用户详情（AdminUserDetailResponse） */
export interface AdminUserDetail extends AdminUser {
  birthday?: string
  country?: string
  province?: string
  city?: string
  language?: string
  lastHeartbeatTime?: string
  updatedAt?: string
  profile?: Record<string, unknown>
  profileDetails?: Record<string, unknown>
}

/** 后台角色摘要（AdminRoleResponse） */
export interface AdminRole {
  id: string
  name: string
  code: string
}

/** 后台可分配角色（/admin-api/v1/staff-roles） */
export interface StaffRole {
  id: string
  name: string
  code: string
}

/** 菜单节点（/admin-api/v1/menus，树形） */
export interface MenuNode {
  id: number
  parentId: number
  menuName: string
  /** 0=目录 1=菜单 2=按钮 */
  menuType: number
  path?: string
  component?: string
  perms?: string
  icon?: string
  sort?: number
  /** 0=隐藏 1=显示 */
  visible?: number
  /** 0=停用 1=正常 */
  status: number
  createTime?: string
  children?: MenuNode[]
}

/** 部门节点（/admin-api/v1/depts，树形，字段为 name/orderNum） */
export interface DeptNode {
  id: number
  parentId: number
  name: string
  orderNum?: number
  leader?: string
  phone?: string
  email?: string
  status?: number
  children?: DeptNode[]
}

/** 字典类型（/admin-api/v1/dict/types） */
export interface DictType {
  id: number
  dictName: string
  dictType: string
  remark?: string
  /** 0=停用 1=正常 */
  status: number
  createTime?: string
}

/** 字典数据项（/admin-api/v1/dict/data） */
export interface DictData {
  id: number
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort?: number
  isDefault?: number
  remark?: string
  /** 0=停用 1=正常 */
  status: number
}

/** 系统参数（/admin-api/v1/configs） */
export interface SysConfig {
  id: number
  configName: string
  configKey: string
  configValue: string
  /** 0=系统内置 1=自定义 */
  configType?: number
  /** 0=停用 1=正常 */
  status: number
  remark?: string
  createTime?: string
}

/** 定时任务（/admin-api/v1/jobs） */
export interface SysJob {
  id: number
  jobName: string
  jobGroup?: string
  invokeTarget: string
  cronExpression: string
  misfirePolicy?: number
  concurrent?: number
  /** 0=停用 1=正常 */
  status: number
  remark?: string
  createTime?: string
}

/** 定时任务执行日志（/admin-api/v1/jobs/{id}/logs） */
export interface JobLog {
  id: number
  jobId?: number
  jobName?: string
  jobGroup?: string
  invokeTarget?: string
  jobMessage?: string
  /** 0=成功 1=失败 2=运行中 */
  status: number
  exceptionInfo?: string
  startTime?: string
  endTime?: string
  duration?: number
}

/** 登录日志（/admin-api/v1/login-logs） */
export interface LoginLog {
  id: number
  username?: string
  ip?: string
  browser?: string
  os?: string
  /** 0=成功 1=失败 */
  status: number
  message?: string
  loginTime?: string
}

/** 审计日志（/admin-api/v1/audit-logs） */
export interface AuditLog {
  id: number
  operatorId?: number
  operatorName?: string
  operatorIp?: string
  module?: string
  operationType?: string
  description?: string
  method?: string
  requestUrl?: string
  requestParams?: string
  responseResult?: string
  duration?: number
  status: 'SUCCESS' | 'FAILED' | string
  createTime?: string
}

/** 文档信息（/admin-api/v1/documents） */
export interface Document {
  id: string
  title: string
  docType: string
  category?: string
  content?: string
  fileUrl?: string
  fileSize?: number
  authorId?: string
  authorName?: string
  status: number
  tags?: string[]
  viewCount?: number
  downloadCount?: number
  createTime?: string
  updateTime?: string
}

/** 图表信息（/admin-api/v1/charts） */
export interface Chart {
  id: string
  chartName: string
  chartType: string
  category?: string
  description?: string
  dataSource?: string
  config?: Record<string, unknown>
  status: number
  creatorId?: string
  creatorName?: string
  viewCount?: number
  createTime?: string
  updateTime?: string
}

/** 图表数据（/admin-api/v1/charts/{id}/data） */
export interface ChartData {
  chartId: string
  chartType: string
  title?: string
  xAxis?: string[]
  series?: ChartSeries[]
  legend?: string[]
  tooltip?: Record<string, unknown>
  grid?: Record<string, unknown>
}

/** 图表数据系列 */
export interface ChartSeries {
  name: string
  type: string
  data: (number | string | null)[]
  itemStyle?: Record<string, unknown>
  lineStyle?: Record<string, unknown>
  areaStyle?: Record<string, unknown>
}

/** API 调用日志（/admin-api/v1/api-call-logs） */
export interface ApiCallLog {
  id: number
  serviceName?: string
  method?: string
  path?: string
  url?: string
  responseStatus?: string
  executionTime?: number
  /** 0=成功 1=客户端错误 2=服务端错误 3=网络异常 */
  status: number
  errorMsg?: string
  traceId?: string
  requestId?: string
  callTime?: string
  createTime?: string
}

/** 在线用户（/admin-api/v1/online-users，分页） */
export interface OnlineUser {
  id?: string
  username?: string
  nickName?: string
  phone?: string
  lastLoginIp?: string
  lastHeartbeatTime?: string
}

/* ==================== 监控大盘类型（/admin-api/v1/monitor/*） ==================== */

/** 监控概览（overview） */
export interface MonitorOverview {
  application: string
  version: string
  status: string
  uptimeSeconds: number
  startTime?: string
  timestamp: number
  /** JVM 堆内存 */
  heapUsed: number
  heapMax: number
  heapUsedPercent: number
  /** 非堆内存 */
  nonHeapUsed: number
  /** CPU 使用率 0~1 */
  cpuUsage: number
  systemCpuUsage: number
  /** 线程 */
  threadCount: number
  /** 活跃会话数（Redis 派生，NaN 表示不可用） */
  activeSessions?: number
  /** 今日请求量（进程启动以来累计） */
  totalRequests: number
  /** 4xx 错误数 */
  error4xx: number
  /** 5xx 错误数 */
  error5xx: number
  /** 平均响应时间（秒） */
  avgResponseTime: number
  /** 网关请求量 */
  gatewayRequests: number
  /** 限流拒绝次数 */
  rateLimitRejected: number
  /** 熔断打开次数 */
  circuitBreakerOpened: number
  /** 登录失败次数 */
  loginFailed: number
  /** 核心业务：登录成功 */
  loginSuccess: number
  /** 核心业务：注册 */
  registerCount: number
  /** 核心业务：上传 */
  uploadCount: number
}

/** 系统资源监控（system）：内存/CPU/磁盘/网络/JVM/线程/GC */
export interface MonitorSystem {
  timestamp: number
  jvm: {
    heapUsed: number
    heapCommitted: number
    heapMax: number
    nonHeapUsed: number
    nonHeapCommitted: number
    heapUsedPercent: number
    gcPauseTotal: number
    gcPauseCount: number
    classLoaded: number
    classUnloaded: number
    bufferUsed: number
  }
  cpu: {
    processUsage: number
    systemUsage: number
    cores: number
    loadAverage?: number
  }
  process: {
    uptimeSeconds: number
    startTime?: string
    residentMemory?: number
    virtualMemory?: number
    openFiles?: number
    maxFiles?: number
  }
  threads: {
    live: number
    peak: number
    daemon: number
  }
  disk: DiskUsage[]
  network: NetworkUsage[]
  /** 阻塞 IO 线程池快照 */
  blockingIo: Record<string, BlockingIoPool>
}

/** 磁盘使用情况 */
export interface DiskUsage {
  mount: string
  type: string
  total: number
  free: number
  usable: number
  usedPercent: number
}

/** 网络使用情况 */
export interface NetworkUsage {
  name: string
  up: boolean
  speedMbps: number
  rxBytes: number
  txBytes: number
  rxBytesPerSec: number
  txBytesPerSec: number
  rxPackets: number
  txPackets: number
  rxErrors: number
  txErrors: number
  rxDropped: number
  txDropped: number
  errorRate: number
  bandwidthUtilization: number
  activeConnections: number
  available: boolean
}

/** 阻塞 IO 线程池快照 */
export interface BlockingIoPool {
  maxThreads: number
  queueCapacity: number
  activeTasks: number
  queuedTasks: number
  completedTasks: number
  saturation: number
  up: boolean
}

/** 中间件监控（middleware）：MySQL/Redis/MQ/SkyWalking */
export interface MonitorMiddleware {
  timestamp: number
  mysql: {
    available: boolean
    driver?: string
    activeConnections: number
    maxConnections: number
    idleConnections: number
    activeConnectionRatio: number
    totalRequests?: number
    totalErrors?: number
    slowSqlCount?: number
  }
  redis: {
    available: boolean
    healthy?: boolean
    nodes?: number
    up?: boolean
    activeSessions?: number
    ipBlacklistSize?: number
    tokenBlacklistSize?: number
    lastSuccessTimestamp?: number
  }
  mq: {
    available: boolean
    type?: string
    nameServer?: string
    producerGroup?: string
    producerStatus?: string
    topics?: number
  }
  tracing: TracingStats
}

/** 链路追踪统计（SkyWalking，对应后端 MonitorMiddlewareResponse.TracingStats） */
export interface TracingStats {
  available: boolean
  type: string
  endpoint: string | null
  samplingRate: number
  spansPending: number
  spansDropped: number
}

/** 治理监控（governance）：Sentinel 熔断/限流 + 网关流量 */
export interface MonitorGovernance {
  timestamp: number
  sentinel: {
    enabled: boolean
    flowRules: SentinelRule[]
    degradeRules: SentinelRule[]
    authorityRules: SentinelRule[]
    paramFlowRules: SentinelRule[]
  }
  security: {
    rateLimitRejected: number
    circuitBreakerOpened: number
    ipBlocked: number
    loginFailed: number
    xssIntercepted: number
    antiReplayRejected: number
    repeatSubmitRejected: number
  }
  circuitBreakers: CircuitBreakerState[]
  gateway: GatewayStats
}

/** Sentinel 规则摘要 */
export interface SentinelRule {
  resource: string
  grade: string
  count: number
  strategy?: string
  controlBehavior?: string
  timeWindow?: number
  enabled: boolean
}

/** 熔断器状态 */
export interface CircuitBreakerState {
  name: string
  state: string
  failureRate?: number
  slowCallRate?: number
  bufferedCalls?: number
  failedCalls?: number
  notPermittedCalls?: number
}

/** 网关统计 */
export interface GatewayStats {
  totalRequests: number
  error4xx: number
  error5xx: number
  avgResponseTime: number
  maxResponseTime: number
  currentQps: number
  currentTps: number
  peakQps: number
  successRate: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  topPaths: PathTraffic[]
}

/** 网关路径流量 */
export interface GatewayPathTraffic {
  path: string
  method?: string
  count: number
  avgTime: number
  maxTime: number
  errorCount: number
  errorRate: number
}

/** 接口路径流量统计（调用量、耗时与错误率） */
export interface PathTraffic {
  path: string
  method?: string
  count: number
  avgTime: number
  maxTime?: number
  errorCount?: number
  errorRate: number
}

/** 核心业务监控（business） */
export interface MonitorBusiness {
  timestamp: number
  metrics: BusinessMetricPoint[]
  trends: BusinessTrend[]
}

/** 业务指标点 */
export interface BusinessMetricPoint {
  key: string
  name: string
  value: number
  unit?: string
}

/** 业务趋势（按时间窗） */
export interface BusinessTrend {
  name: string
  key: string
  points: { time: string; value: number }[]
}

/** 数据库配置（部署配置采集用） */
export interface DatabaseConfig {
  /** 数据库类型 */
  dbType: 'mysql' | 'postgresql'
  /** 主机地址 */
  host: string
  /** 端口 */
  port: number
  /** 数据库名 */
  database: string
  /** 用户名 */
  username: string
  /** 连接参数（可选） */
  connectionParams?: string
  /** 部署环境 */
  environment: 'dev' | 'test' | 'prod'
}

/** 数据库连接测试结果 */
export interface DatabaseTestResult {
  /** 是否成功 */
  success: boolean
  /** 提示信息 */
  message: string
  /** 数据库版本（成功时返回） */
  version?: string
}

/** 部署配置生成结果 */
export interface DeploymentConfigResult {
  /** YAML 格式配置 */
  yaml: string
  /** 环境变量格式配置 */
  env: string
  /** Docker Compose 配置（可选） */
  dockerCompose?: string
}

/** 当前数据库信息 */
export interface CurrentDatabaseInfo {
  /** 数据库类型 */
  type: string
  /** 数据库版本 */
  version: string
  /** 驱动版本 */
  driverVersion?: string
}

/* ==================== 文件上传类型（POST /api/v1/files/*） ==================== */

/**
 * 文件上传结果
 * 对应后端 FileUploadResult
 */
export interface FileUploadResult {
  /** 存储桶名称 */
  bucketName: string
  /** 对象存储路径（含性别目录，如 AF/uuid.jpg） */
  objectName: string
  /** 文件访问URL */
  url: string
  /** URL有效期（秒） */
  expiresIn: number
}

/* ==================== 站内信与消息模板（/api/v1/messages、/admin-api/v1/message-templates） ==================== */

/** 站内信（后端 MessageDTO，inbox/sent 返回纯数组） */
export interface InternalMessage {
  /** 消息 ID */
  id: number
  /** 消息编码 */
  messageCode?: string
  /** 消息主题 */
  subject: string
  /** 消息内容 */
  content: string
  /** 消息类型（SYSTEM/NOTICE/TASK/ALERT） */
  messageType?: string
  /** 优先级（LOW/NORMAL/HIGH/URGENT） */
  priority?: string
  /** 发送人 ID */
  senderId?: number
  /** 发送人姓名 */
  senderName?: string
  /** 发送时间 */
  sendTime?: string
  /** 过期时间 */
  expireTime?: string
  /** 消息状态 */
  status?: string
  /** 当前用户是否已读 */
  readStatus: boolean
  /** 阅读时间 */
  readTime?: string
}

/** 站内信发送请求体（后端 SendMessageRequest，接收人为系统用户 ID 列表） */
export interface SendMessagePayload {
  /** 消息主题（必填，最长 200） */
  subject: string
  /** 消息内容（必填，最长 16000） */
  content: string
  /** 消息类型（SYSTEM/NOTICE/TASK/ALERT，可选） */
  messageType?: string
  /** 优先级（LOW/NORMAL/HIGH/URGENT，可选） */
  priority?: string
  /** 接收人系统用户 ID 列表（必填，最多 100 个） */
  recipientIds: number[]
  /** 过期时间（可选） */
  expireTime?: string
  /** 关联模板 ID（可选） */
  templateId?: number
}

/** 站内信消息模板（后端 MessageTemplateDTO） */
export interface MessageTemplate {
  /** 模板 ID（创建时留空） */
  id?: number
  /** 模板编码（唯一标识） */
  templateCode: string
  /** 模板名称 */
  templateName: string
  /** 模板类型 */
  templateType?: string
  /** 模板内容 */
  templateContent: string
  /** 模板变量 */
  variables?: Record<string, unknown>
  /** 是否启用 */
  enabled: boolean
}

/* ==================== 办公组织同步（/admin-api/v1/org、/api/v1/office/organization） ==================== */

/** 同步部门（后端 DepartmentDTO） */
export interface OrgDepartment {
  id: number
  deptCode: string
  deptName: string
  parentId?: number
  deptPath?: string
  deptLevel?: number
  sortOrder?: number
  leaderId?: number
  leaderName?: string
  phone?: string
  email?: string
  status?: string
  syncSource?: string
  externalId?: string
}

/** 同步员工（后端 EmployeeDTO，userId 为关联的系统用户 ID） */
export interface OrgEmployee {
  id: number
  employeeCode: string
  employeeName: string
  deptId?: number
  deptName?: string
  position?: string
  jobTitle?: string
  mobile?: string
  email?: string
  gender?: string
  birthday?: string
  hireDate?: string
  status?: string
  userId?: number
  syncSource?: string
  externalId?: string
}

/** 组织同步历史（后端 SyncHistoryDTO，duration 单位秒） */
export interface OrgSyncHistory {
  id: number
  syncType: string
  syncSource: string
  syncStatus: string
  startTime?: string
  endTime?: string
  duration?: number
  deptCount?: number
  employeeCount?: number
  errorMessage?: string
}

/** 组织同步任务（后端 OfficeSyncTask 领域对象） */
export interface OrgSyncTask {
  id: number
  platform: string
  state: string
  cursor?: string
  failureMessage?: string
  version?: number
}

/** 平台组织映射（后端 OrganizationMappingResponse，apex 侧 ID 为字符串） */
export interface OrganizationMapping {
  id: number
  platform: string
  externalOrgId?: string
  externalUserId?: string
  apexDeptId?: string
  apexUserId?: string
  createdAt?: string
  updatedAt?: string
}

/** 触发组织同步请求体（后端 SyncOrganizationRequest） */
export interface OrgSyncRequest {
  /** 平台类型（FEISHU/DINGTALK/WECOM） */
  platform: string
  /** 同步对象（DEPARTMENT=部门 / MEMBER=成员） */
  syncType: 'DEPARTMENT' | 'MEMBER'
  /** 是否全量同步 */
  fullSync: boolean
}

/** 触发组织同步响应（后端 SyncOrganizationResponse） */
export interface OrgSyncResult {
  taskId?: number
  syncedCount?: number
  message?: string
  success: boolean
}

/* ==================== 数据源管理（/admin-api/v1/database/datasources） ==================== */

/** 数据源（后端 DataSourceResponse，url/username 已脱敏） */
export interface DataSourceInfo {
  id: number
  name: string
  type: string
  driver: string
  url: string
  username: string
  poolSize?: number
  activeConnections?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

/** 数据源创建/更新请求体（后端 DataSourceRequest） */
export interface DataSourcePayload {
  name: string
  type: string
  driver: string
  url: string
  username: string
  password: string
  minIdle?: number
  maxPoolSize?: number
  connectionTimeout?: number
  idleTimeout?: number
}

/** 数据源连接池指标（后端 DataSourceMetricsResponse，时间单位毫秒） */
export interface DataSourceMetrics {
  totalConnections?: number
  activeConnections?: number
  idleConnections?: number
  waitingThreads?: number
  averageGetTime?: number
  averageUsageTime?: number
  maxWaitTime?: number
  totalConnectionsCreated?: number
  totalConnectionsFailed?: number
}

/* ==================== 数据脱敏（/api/v1/masking，规则为启动配置只读） ==================== */

/** 脱敏规则（后端 JsonFieldMasker.Rule，type 为 MaskType 枚举名） */
export interface MaskingRule {
  /** 脱敏类型（PHONE/ID_CARD/EMAIL/NAME/BANK_CARD/ADDRESS/IP_ADDRESS/CUSTOM） */
  type: string
  /** 自定义保留区间（仅 CUSTOM 类型有值，其余为 null） */
  customRule?: string | null
}

/** 批量脱敏响应（后端 MaskingBatchData，documents 与入参结构一致、敏感字段已脱敏） */
export interface MaskingBatchResult {
  /** 实际使用的规则版本 */
  version: string
  /** 脱敏后的文档数组 */
  documents: unknown[]
}

/* ==================== 租户管理（/api/v2/platform/tenants，平台运维域） ==================== */

/** 租户（后端 TenantDTO） */
export interface TenantInfo {
  id: number
  /** 租户编码（全局唯一，创建后不可变更） */
  tenantCode: string
  tenantName: string
  /** 租户管理员用户 ID */
  adminUserId?: string
  /** 套餐标识 */
  packageCode?: string
  /** 有效期至 */
  expireTime?: string
  /** 状态：ACTIVE/DISABLED/FROZEN/DEACTIVATED/ARCHIVED */
  status: string
  /** 最大用户数（null 表示不限制） */
  maxUsers?: number | null
  /** 最大存储容量 MB（null 表示不限制） */
  maxStorageMb?: number | null
  remark?: string
  createTime?: string
  /** 乐观锁版本 */
  version?: number
}

/** 租户创建请求（后端 TenantCreateRequest） */
export interface TenantCreatePayload {
  /** 租户编码（1-64 位字母/数字/下划线/短横线，创建后不可变更） */
  tenantCode: string
  /** 租户名称（≤128） */
  tenantName: string
  adminUserId?: string
  packageCode?: string
  maxUsers?: number
  maxStorageMb?: number
  remark?: string
}

/** 租户状态流转动作（后端仅接受这些小写值） */
export type TenantAction = 'disable' | 'enable' | 'freeze' | 'unfreeze' | 'deactivate' | 'archive'

/** 租户生命周期动作请求（后端 TenantActionRequest） */
export interface TenantActionPayload {
  action: TenantAction
  /** 可选乐观锁版本 */
  expectedVersion?: number
}

/** 租户配额更新请求（后端 TenantQuotaUpdateRequest，null 表示不限制） */
export interface TenantQuotaPayload {
  maxUsers?: number | null
  maxStorageMb?: number | null
  expectedVersion?: number
}

/* ==================== 多因素认证 MFA（/api/mfa、/api/v1/mfa，认证中心） ==================== */

/** MFA 类型 */
export type MfaType = 'TOTP' | 'SMS' | 'EMAIL'

/** 用户 MFA 配置（后端 MfaConfig；type/status 为枚举名） */
export interface MfaConfigInfo {
  id?: number
  userId?: string
  tenantId?: string
  type: MfaType | 'BACKUP_CODE'
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'LOCKED'
  secret?: string
  backupCodes?: string
  deviceInfo?: string
  lastVerifiedAt?: string
  failedAttempts?: number
  createdAt?: string
  updatedAt?: string
}

/** TOTP 初始化结果（后端 TotpSetupInfo） */
export interface TotpSetupInfo {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

/** TOTP 激活结果（后端 MfaActivationResult） */
export interface MfaActivationResult {
  success: boolean
  backupCodes: string[]
}

/** 备用码重生成结果（后端 BackupCodesResult） */
export interface BackupCodesResult {
  codes: string[]
}

/* ==================== IP 访问控制（/api/ip-access-control，认证中心） ==================== */

/** IP 访问规则（后端 IpAccessControl） */
export interface IpAccessRule {
  id: number
  tenantId?: string
  /** IP 地址（支持 IP/CIDR/通配符） */
  ipAddress: string
  type: 'WHITELIST' | 'BLACKLIST'
  description?: string
  enabled: boolean
  priority?: number
  /** 过期时间（黑名单可设置有效期） */
  expiresAt?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

/* ==================== 工作流定义管理类型见 types/workflow.ts ==================== */

/* ==================== 运维健康（/api/v2/operations） ==================== */

/** 健康状态 */
export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'

/** 健康报告条目 */
export interface HealthReportItem {
  id: string
  name: string
  status: HealthStatus
  scope?: string
  service?: string
  instance?: string
  sampledAt?: string
  source?: string
  evidence?: string
  recommendation?: string
  ruleVersion?: string
}

/** 健康报告分组 */
export interface HealthReportGroup {
  category: string
  title: string
  status: HealthStatus
  items: HealthReportItem[]
}

/** 健康报告（后端 HealthReportResponse） */
export interface HealthReport {
  generatedAt: string
  service?: string
  instance?: string
  scope?: string
  scopeNotice?: string
  ruleVersion?: string
  overallStatus: HealthStatus
  summary?: string
  counts?: {
    up: number
    degraded: number
    down: number
    unknown: number
    notConfigured: number
  }
  groups?: HealthReportGroup[]
}

/** 健康快照（后端 HealthSnapshotDTO） */
export interface HealthSnapshot {
  id: number
  captureSource?: string
  serviceName?: string
  instanceId?: string
  scope?: string
  ruleVersion?: string
  overallStatus: HealthStatus
  summary?: string
  integrity?: string
  upCount?: number
  degradedCount?: number
  downCount?: number
  unknownCount?: number
  notConfiguredCount?: number
  generatedAt?: string
  createTime?: string
}

/** 健康趋势数据点 */
export interface HealthTrendPoint {
  generatedAt: string
  overallStatus: HealthStatus
  upCount?: number
  degradedCount?: number
  downCount?: number
  unknownCount?: number
  notConfiguredCount?: number
}

/** 健康趋势（后端 HealthTrendDTO） */
export interface HealthTrend {
  from?: string
  to?: string
  sampleCount: number
  ruleVersions?: string[]
  distribution?: Array<{ status: string; count: number }>
  startStatus?: HealthStatus
  endStatus?: HealthStatus
  improving?: boolean
  points?: HealthTrendPoint[]
}

/** 租户健康汇总（后端 TenantHealthSummaryDTO） */
export interface TenantHealthSummary {
  snapshotAt?: string
  overallStatus: HealthStatus
  summary?: string
  scope?: string
  scopeNotice?: string
  riskCounts?: { healthy: number; degraded: number; down: number; unknown: number }
  recentTrend?: Array<{ generatedAt: string; overallStatus: HealthStatus }>
}

/** 健康快照导出任务（后端 HealthExportTaskDTO） */
export interface HealthExportTask {
  id: number
  queryFrom?: string
  queryTo?: string
  queryStatus?: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  attempts?: number
  lastError?: string
  fileName?: string
  rowCount?: number
  completedAt?: string
  createTime?: string
}
