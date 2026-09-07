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

/** 中间件监控（middleware）：MySQL/Redis/MQ/Zipkin */
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
  tracing: {
    available: boolean
    type: string
    endpoint?: string
    samplingRate?: number
    spansPending?: number
    spansDropped?: number
  }
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
  gateway: {
    totalRequests: number
    error4xx: number
    error5xx: number
    avgResponseTime: number
    maxResponseTime: number
    topPaths: GatewayPathTraffic[]
  }
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
