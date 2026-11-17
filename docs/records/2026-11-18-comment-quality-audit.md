# 全仓注释质量评审与整改（2026-11-18）

## 范围

src 全部 220 个 TS/Vue 文件（含根目录构建配置）的注释**质量**评审——此前 `check:comments` 已保证头注与导出符号注释的存在性，本轮按 `docs/reference/comment-style.md` 深化：头注功能清单/权限码与实现一致性、契约注释（端点/分页口径/裸数组/枚举/单位）准确性、魔数来源、复述类冗余注释。

## 审计方法

- 9 组并行只读审计（6 组子代理 + 核心应用层与批 1 目标自审），全部完整读入并与实现交叉核对。
- 枚举/状态语义一律查页面渲染与类型层 ground truth 后才落注释，不凭空推断：
  - `LoginAttempt.status` = **0=成功 1=失败**（auth 页筛选与标签渲染）
  - `BusinessLog.status` = **1=成功 0=失败**（business-log 页渲染，与登录日志口径**相反**）
  - `DictDataPayload.isDefault` = 1=默认 0=否（dict 页 el-switch active-value）
- 审计基线：P1×25、P2×9、P3×31。

## 改动清单（6 批，39 文件 63 处，仅注释行、零逻辑变更）

| 批 | 范围 | 文件 | 处数 | 代表性修正 |
| --- | --- | --- | --- | --- |
| 1 | src/utils | 7 | 12 | `retryRequest` 升级完整式 JSDoc（maxRetries 含首次/退避公式/不可重试码）；`mergeChartOption` 写明浅合并范围；`sanitizeJson` 修正为「转义字符串值与键、失败返 null」；error-handler 规划式裸注释改为说明 401 由 request.ts 统一处理 |
| 2 | src/api | 10 | 14 | `auth-config.ts` 头注读写路径系统性失真修正（OAuth2 写走 `/admin-api/v1/oauth2/clients`、权限码读走 `/auth/config/permissions`、伪分页标注）；`open-app.ts`/`sso.ts` 头注移除未封装端点并补迁移端点；`Permission.type` 改数字枚举（1=菜单 2=按钮 3=接口）；`workflow.ts` 注明 `/api/workflow/**` 前缀属既定契约 |
| 3 | components + composables | 3 | 9 | `FileUpload.vue` 头注移除未实现的「进度展示/预览」；`FileUploadEnhanced.vue` 粘贴监听改为 document 级口径、beforeUpload 补分片分支、CHUNK_SIZE/裁剪 0.9 注来源；`useAgenda` 补「唯一写操作：通知标记已读」 |
| 4 | views 第一组 | 5 | 7 | `FileUploadDemo` 头注组件名修正（实际演示 FileUploadEnhanced）；business-log/runtime-log 冗余重复注释删除、LocalDateTime 注释改确定语义；api-call-log/operations/runtime-log 魔数补来源 |
| 5 | views system/data | 8 | 15 | `auth`/`generator` 两页删除 SFC 顶层错位「影子头注」、权限清单按 15 处 v-permission 实际值重写（原 `system:auth:view/edit` 全仓库不存在）；`tenant-package` 头注 **features 空集合语义修正为「未订阅」**（原写「全量放行」与全仓五处正确契约相抵）；`job/query` 端点路径修正为 `/admin-api/v1/jobs/page` 并删除凑数注释；`database` 修正「密码留空则不修改」矛盾注释；`user`/`tenant` 头注补功能缺失项与权限要求 |
| 6 | views office + 测试 | 6 | 6 | `console` 头注功能清单修正（无消息推送统计）、移除虚构权限码；`calendar` 删除过时规划注释、pageSize 1000 注截断假设；`meeting-room` equipmentText 补 JSON 字符串/数组双口径简注；`platform.test.ts` 头注补第 8 个测试域 |

## 验证证据

- `npx vue-tsc --noEmit` ✅（每批后均通过）
- `npm run check:comments` ✅（220 文件，文件头与导出符号文档注释齐全）
- `npx vitest run` ✅ 全量 **68 文件 / 533 用例全绿**（分批验证：utils 176、api 197、components+composables 92）

## 影响面

- 仅注释行（JSDoc/HTML 头注/行内注释/删除冗余注释），**零逻辑、零类型、零配置变更**；无新增依赖。
- 修正的误导性注释（auth-config 头注、tenant-package features 语义、影子头注权限码）降低后续 AI/人工按错误契约开发的风险。

## 范围外发现（只记录不动，建议主控另立任务）

1. 死 CSS：`login/index.vue`（.github-icon 规则块 + 567-593 重复块）、`monitor/dashboard/index.vue`（5 个无引用规则块）。
2. 死代码弹窗：`system/auth/index.vue` 「关联角色」弹窗绑定状态从未置 true（含 PermissionRole 导入）。
3. `workflow/components/TaskActions.vue` 全文件死代码（全仓无引用，能力已由 PendingTasks.vue 覆盖）。
4. `oauth2/callback.vue` 模板 `el-loading` 用法存疑。
5. `AgendaPanel.vue`「仅展示前 5 条」文案与 `useAgenda.PAGE_SIZE` 数字双写（漂移风险）。
6. `FileUploadDemo.vue` 12 条「示例N」单行注释属复述类（保留作示例编号锚点，可酌情清理）。

## 回滚方式

全部改动均为注释行，单批 `git revert` 即可无损回滚；不影响运行时行为。

---

## 追加段（2026-11-18）：范围外代码修复执行

原「范围外发现」经用户指令「继续执行上述未完成的修复」后逐项取证落地，6 项处置如下（均为删除零引用死代码或修正无效用法）：

| # | 项 | 处置 | 取证/验证 |
| --- | --- | --- | --- |
| 1 | `login/index.vue` 死 CSS：`.github-icon:hover` 规则块（模板无该类，GitHub 图标实际用 `.social-icon`）+ `.social-icon` 系列整段重复定义 | 两段删除，保留首段规则 | 模板类名 grep 复查 |
| 2 | `monitor/dashboard/index.vue` 死 CSS：`.kv-list .ellipsis`、`.gateway-summary`、`.g-item`×3、`.c-warn`、`.c-danger` 共 6 块 | 删除；`.kv-list` 本体在模板有使用（L121/140/158），保留 | 模板/script 类名 grep 复查 |
| 3 | `system/auth/index.vue` 死弹窗：「关联角色」对话框绑定的 `permissionRolesDialogVisible`/`permissionRoles` 从未置 true | 删除对话框模板、两个状态声明与 `PermissionRole` 类型导入 | 引用 grep 复查 |
| 4 | `workflow/components/TaskActions.vue` 全文件死代码（全仓无 import/注册） | 删除文件与空目录；`AGENTS.md` §7.3 改写为「已删除」说明、§7.2 措辞同步 | 全仓 grep 零残留 + `components.d.ts` 无注册 |
| 5 | `oauth2/callback.vue` 无效 `<el-loading>` 元素（Element Plus 无此组件，原写法不渲染任何加载效果） | 改为容器 `v-loading` 指令 + `element-loading-text`，与全仓既有 v-loading 用法一致（vite.config `DIRECTIVE_DIRS` 含 `ElLoadingDirective`） | vue-tsc 通过；加载态由「无效」变实际可见 |
| 6 | `AgendaPanel.vue` 截断文案硬编码「仅展示前 5 条」与 `useAgenda.PAGE_SIZE` 双写 | 文案改「仅展示部分事项」并加注释说明原因 | — |

验证：`vue-tsc --noEmit` ✅、`check:comments` **219 文件** ✅（TaskActions 删除后 220→219）、`npx vitest run` 68 文件 / 533 用例全绿 ✅。

回滚：本段改动含模板/样式/文件删除，按批 `git revert` 即可；`TaskActions.vue` 可经 git 历史恢复。
