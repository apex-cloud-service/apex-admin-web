/**
 * 全局类型定义
 * ------------------------------------------------------------------
 * 与后端统一响应/分页/各业务 DTO 对应的 TypeScript 类型。
 * 字段命名与后端 JSON 保持完全一致（camelCase）。
 */

/**
 * 后端统一响应结构（Result<T>）
 * - code：错误码（0 表示成功）
 * - msg：提示信息
 * - data：业务数据
 * - traceId：链路追踪 ID，便于问题排查
 */
export interface Result<T = unknown> {
  code: number
  msg: string
  data: T
  traceId?: string
}

/** 统一分页响应结构 */
export interface PageResponse<T = unknown> {
  total: number
  list: T[]
  page?: number
  size?: number
}

/** 分页查询基础参数 */
export interface PageQuery {
  page: number
  size: number
}

/** 图形验证码（GET /api/v1/auth/captcha） */
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
}

/** 当前登录用户身份（GET /api/v1/user/info） */
export interface UserIdentity {
  id: number
  username?: string
  nickName?: string
  nickname?: string
  phone?: string
  avatar?: string
  roles?: string[]
  permissions?: string[]
}

/** 管理后台用户（/admin-api/v1/users） */
export interface AdminUser {
  id: number
  username?: string
  nickName?: string
  phone?: string
  email?: string
  status: number
  deptId?: number
  roleIds?: number[]
  createTime?: string
}

/** 后台角色（/admin-api/v1/staff-roles） */
export interface StaffRole {
  id: number
  name: string
  code: string
  remark?: string
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
  /** 0=显示 1=隐藏 */
  visible?: number
  /** 0=正常 1=停用 */
  status: number
  children?: MenuNode[]
}

/** 部门节点（/admin-api/v1/depts，树形） */
export interface DeptNode {
  id: number
  parentId: number
  deptName: string
  leader?: string
  phone?: string
  status?: number
  sort?: number
  children?: DeptNode[]
}

/** 字典类型（/admin-api/v1/dict/types） */
export interface DictType {
  id: number
  dictName: string
  dictType: string
  remark?: string
  status: number
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
  status: number
  remark?: string
  createTime?: string
}

/** 定时任务（/admin-api/v1/jobs） */
export interface SysJob {
  id: number
  jobName: string
  jobGroup: string
  invokeTarget: string
  cronExpression: string
  /** 0=正常 1=停用 */
  status: number
  remark?: string
}

/** 定时任务执行日志（/admin-api/v1/jobs/{id}/logs） */
export interface JobLog {
  id: number
  jobName?: string
  /** 0=成功 1=失败 2=运行中 */
  status: number
  jobMessage?: string
  duration?: number
  startTime?: string
}

/** 登录日志（/admin-api/v1/login-logs） */
export interface LoginLog {
  id: number
  username?: string
  ip?: string
  /** 0=成功 1=失败 */
  status: number
  message?: string
  loginTime?: string
}

/** 审计日志（/admin-api/v1/audit-logs） */
export interface AuditLog {
  id: number
  operatorName?: string
  operatorId?: number
  module?: string
  operationType?: string
  description?: string
  method?: string
  requestUrl?: string
  status: 'SUCCESS' | 'FAILED' | string
  duration?: number
  createTime?: string
}

/** 在线用户（/admin-api/v1/online-users） */
export interface OnlineUser {
  id?: number
  userId?: number
  username?: string
  ip?: string
  loginTime?: string
  lastActiveTime?: string
}
