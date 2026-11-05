/**
 * 多因素认证（MFA）API
 * ------------------------------------------------------------------
 * 后端接口（apex-auth-service；用户/租户取自可信请求属性，多数端点不接收请求体）：
 * - POST   /api/mfa/totp/enable              - 生成 TOTP 密钥与二维码（Result<TotpSetupInfo>）
 * - POST   /api/mfa/totp/activate?code=      - 用动态码激活 TOTP（Result<MfaActivationResult>）
 * - POST   /api/mfa/sms/enable?phoneNumber=  - 启用短信 MFA
 * - POST   /api/mfa/email/enable?email=      - 启用邮箱 MFA
 * - DELETE /api/mfa/{type}                   - 关闭指定类型（TOTP/SMS/EMAIL）
 * - GET    /api/mfa/configs                  - 我的 MFA 配置（⚠️ 裸数组，无 Result 包装）
 * - POST   /api/mfa/backup-codes/regenerate  - 重新生成备用码
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
 * 查询我的 MFA 配置（后端返回裸数组）
 */
export function listMfaConfigs(): Promise<MfaConfigInfo[]> {
  return get<MfaConfigInfo[]>('/api/mfa/configs')
}

/**
 * 重新生成备用恢复码
 */
export function regenerateBackupCodes(): Promise<BackupCodesResult> {
  return post<BackupCodesResult>('/api/mfa/backup-codes/regenerate')
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
