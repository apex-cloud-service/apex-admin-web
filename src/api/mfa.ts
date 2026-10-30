/**
 * 多因素认证（MFA）API
 * ------------------------------------------------------------------
 * 后端接口（apex-auth-service；用户/租户取自可信请求属性，多数端点不接收请求体）：
 * - POST   /api/mfa/totp/enable              - 生成 TOTP 密钥与二维码（Result<TotpSetupInfo>）
 * - POST   /api/mfa/totp/activate?code=      - 用动态码激活 TOTP（Result<MfaActivationResult>）
 * - POST   /api/mfa/sms/enable?phoneNumber=  - 启用短信 MFA
 * - POST   /api/mfa/email/enable?email=      - 启用邮箱 MFA
 * - DELETE /api/mfa/{type}                   - 关闭指定类型（TOTP/SMS/EMAIL）
 * - POST   /api/mfa/verify?code=&type=       - 校验动态码（Result<boolean>）
 * - POST   /api/mfa/send-code?type=          - 发送验证码（SMS/EMAIL）
 * - GET    /api/mfa/configs                  - 我的 MFA 配置（⚠️ 裸数组，无 Result 包装）
 * - GET    /api/mfa/status                   - 是否启用任意 MFA（Result<boolean>）
 * - POST   /api/mfa/backup-codes/regenerate  - 重新生成备用码
 * - POST   /api/mfa/backup-codes/verify?code= - 校验备用码
 * - POST   /api/mfa/unlock?userId=&type=     - 解锁（需管理员）
 *
 * 另有一组需显式传 userId/tenantId 的 /api/v1/mfa/** 契约，管理端不使用。
 */
import { del, get, post } from '@/utils/request'
import type { BackupCodesResult, MfaActivationResult, MfaConfigInfo, MfaType, TotpSetupInfo } from '@/types'

export type { MfaType } from '@/types'

/**
 * 生成 TOTP 密钥与二维码（尚未激活）
 */
export function enableTotp(): Promise<TotpSetupInfo> {
  return post<TotpSetupInfo>('/api/mfa/totp/enable')
}

/**
 * 用动态验证码激活 TOTP
 * @param code 6 位动态码
 */
export function activateTotp(code: string): Promise<MfaActivationResult> {
  return post<MfaActivationResult>(`/api/mfa/totp/activate?code=${encodeURIComponent(code)}`)
}

/**
 * 启用短信 MFA
 * @param phoneNumber 手机号
 */
export function enableSmsMfa(phoneNumber: string): Promise<MfaConfigInfo> {
  return post<MfaConfigInfo>(`/api/mfa/sms/enable?phoneNumber=${encodeURIComponent(phoneNumber)}`)
}

/**
 * 启用邮箱 MFA
 * @param email 邮箱
 */
export function enableEmailMfa(email: string): Promise<MfaConfigInfo> {
  return post<MfaConfigInfo>(`/api/mfa/email/enable?email=${encodeURIComponent(email)}`)
}

/**
 * 关闭指定类型的 MFA
 * @param type MFA 类型
 */
export function disableMfa(type: MfaType): Promise<void> {
  return del<void>(`/api/mfa/${type}`)
}

/**
 * 校验动态验证码
 * @param code 验证码
 * @param type MFA 类型
 */
export function verifyMfaCode(code: string, type: MfaType): Promise<boolean> {
  return post<boolean>(`/api/mfa/verify?code=${encodeURIComponent(code)}&type=${type}`)
}

/**
 * 发送 MFA 验证码
 * @param type SMS 或 EMAIL
 */
export function sendMfaCode(type: Exclude<MfaType, 'TOTP'>): Promise<void> {
  return post<void>(`/api/mfa/send-code?type=${type}`)
}

/**
 * 查询我的 MFA 配置（后端返回裸数组）
 */
export function listMfaConfigs(): Promise<MfaConfigInfo[]> {
  return get<MfaConfigInfo[]>('/api/mfa/configs')
}

/**
 * 查询是否已启用任意 MFA
 */
export function getMfaStatus(): Promise<boolean> {
  return get<boolean>('/api/mfa/status')
}

/**
 * 重新生成备用恢复码
 */
export function regenerateBackupCodes(): Promise<BackupCodesResult> {
  return post<BackupCodesResult>('/api/mfa/backup-codes/regenerate')
}

/**
 * 校验备用恢复码
 * @param code 备用码
 */
export function verifyBackupCode(code: string): Promise<boolean> {
  return post<boolean>(`/api/mfa/backup-codes/verify?code=${encodeURIComponent(code)}`)
}

/**
 * 解锁用户被锁定的 MFA（需管理员权限）
 * @param userId 用户 ID
 * @param type MFA 类型
 */
export function unlockMfa(userId: number, type: MfaType): Promise<void> {
  return post<void>(`/api/mfa/unlock?userId=${userId}&type=${type}`)
}

/** MFA 类型 → 中文名称 */
export const MFA_TYPE_NAMES: Record<string, string> = {
  TOTP: '动态口令（TOTP）',
  SMS: '短信验证码',
  EMAIL: '邮箱验证码',
  BACKUP_CODE: '备用恢复码',
}

/** MFA 配置状态 → 中文名称与标签样式 */
export const MFA_STATUS_META: Record<string, { label: string; tag: 'success' | 'info' | 'warning' | 'danger' }> = {
  ACTIVE: { label: '已启用', tag: 'success' },
  PENDING: { label: '待激活', tag: 'warning' },
  DISABLED: { label: '已关闭', tag: 'info' },
  LOCKED: { label: '已锁定', tag: 'danger' },
}
