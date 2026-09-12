/**
 * 应用级常量与配置
 * ------------------------------------------------------------------
 * 集中管理 Token 存储键、分页默认值、错误码等全局常量，
 * 避免散落在各模块中造成魔法字符串。
 */

/** 会话 Token 的 localStorage 键 */
export const TOKEN_KEY = 'apex.admin.token'

/** 刷新令牌的 localStorage 键 */
export const REFRESH_TOKEN_KEY = 'apex.admin.refresh-token'

/** 用户身份缓存的 localStorage 键 */
export const IDENTITY_KEY = 'apex.admin.identity'

/** 后端业务成功错误码（Result.code） */
export const RESULT_SUCCESS = 0

/** 未认证/会话失效错误码（401 对应 HTTP 状态，此值为业务兜底） */
export const CODE_UNAUTHORIZED = 401

/** 分页默认每页条数 */
export const DEFAULT_PAGE_SIZE = 20

/** 分页可选每页条数 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/** 系统管理标题（布局顶栏/页签展示） */
export const APP_TITLE = 'Apex Scaffold 管理后台'

/** 上传文件大小上限（字节，10MB） */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
