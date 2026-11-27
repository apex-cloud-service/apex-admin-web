/**
 * 密码找回 API（/auth/v2/password-recovery）
 * ------------------------------------------------------------------
 * 后端三步流程（apex-auth-service PasswordRecoveryRouter）：
 * 1. POST /auth/v2/password-recovery/requests       - 提交 channel + contact，返回 recoveryId 与有效期
 * 2. POST /auth/v2/password-recovery/verifications  - 提交 recoveryId + code，返回一次性 confirmToken
 * 3. POST /auth/v2/password-recovery/confirmations  - 提交 recoveryId + confirmToken + newPassword
 *
 * 说明：
 * - channel 仅支持 EMAIL（已验证邮箱）或 SMS（已验证手机号）。
 * - 后端按 IP 与联系方式双维度限流，并对账号是否存在保持同一响应形态。
 * - 确认后返回 sessionRevocation 状态；为 PENDING 时表示会话撤销尚未完成，不能宣称全端已退出。
 */
import { post } from '@/utils/request'

/** 找回通道 */
export type PasswordRecoveryChannel = 'EMAIL' | 'SMS'

/** 发起找回结果 */
export interface PasswordRecoveryInitiateResult {
  /** 恢复单 ID */
  recoveryId: string
  /** 有效期（秒） */
  expiresIn: number
}

/** 校验验证码结果 */
export interface PasswordRecoveryVerifyResult {
  /** 一次性确认令牌 */
  confirmToken: string
  /** 有效期（秒） */
  expiresIn: number
}

/** 确认重设结果 */
export interface PasswordRecoveryConfirmResult {
  /** 处理状态 */
  status?: string
  /** 会话撤销状态（PENDING 表示尚未完成） */
  sessionRevocation?: string
}

/**
 * 发起密码找回申请
 * @param channel 找回通道（EMAIL/SMS）
 * @param contact 已绑定的邮箱或手机号
 * @returns recoveryId 与 expiresIn（秒），用于后续验证码校验
 */
export function initiatePasswordRecovery(
  channel: PasswordRecoveryChannel,
  contact: string,
): Promise<PasswordRecoveryInitiateResult> {
  return post<PasswordRecoveryInitiateResult>('/auth/v2/password-recovery/requests', { channel, contact })
}

/**
 * 校验找回验证码
 * @param recoveryId 恢复单 ID
 * @param code 验证码
 * @returns 一次性 confirmToken 与 expiresIn（秒）；本函数不重设密码
 */
export function verifyPasswordRecovery(
  recoveryId: string,
  code: string,
): Promise<PasswordRecoveryVerifyResult> {
  return post<PasswordRecoveryVerifyResult>('/auth/v2/password-recovery/verifications', {
    recoveryId,
    code,
  })
}

/**
 * 确认重设密码
 * @param recoveryId 恢复单 ID
 * @param confirmToken 一次性确认令牌
 * @param newPassword 新密码
 * @returns 重设处理状态；sessionRevocation=PENDING 表示会话撤销尚未完成，不是重设失败
 */
export function confirmPasswordRecovery(
  recoveryId: string,
  confirmToken: string,
  newPassword: string,
): Promise<PasswordRecoveryConfirmResult> {
  return post<PasswordRecoveryConfirmResult>('/auth/v2/password-recovery/confirmations', {
    recoveryId,
    confirmToken,
    newPassword,
  })
}
