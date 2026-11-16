# 02 · 约定与陷阱（apex-admin-web）

> 违反即返工。本文是提炼，**权威原文是 `AGENTS.md`**（§1 约束、§8 编码约定、§10 排障），冲突以其为准。

## 1. 硬约束

1. **菜单驱动页面必须双写**：`src/router/dynamic.ts` 的 `VIEW_REGISTRY` + 后端菜单 `component` 字段，两者键必须完全一致。文件存在 ≠ 路由可用。
2. **接口只走 `src/api/` + `utils/request.ts`**（`request/get/post/put/del`），页面不新建 Axios 实例。Element Plus / XHR 上传是显式特例，不经拦截器。
3. **会话只用 `utils/auth.ts`**，不得自造 `access_token` 等存储键；Pinia 内存态与持久化会话是两个层次。
4. **权限码来源要核对**：菜单可见、按钮可见、后端鉴权是三层；前端 `v-permission` 只移除 DOM，**不是安全边界**。
5. **`VITE_*` 会进产物**：不得写入客户端密钥、数据库口令。
6. **不修改** `src/router/dynamic.ts.bak`，不以其内容为依据。
7. **不越界**：不改后端契约、不修其他模块、不随手升级依赖、不扩大部署变更；除非用户明确要求，不新增注释、不建文档、不提交。

## 2. 分页与响应口径（最容易搞错）

| 场景 | 请求参数 | 响应读取 |
| --- | --- | --- |
| 常规列表 | `page` / `size` | `list` / `total` |
| 工作流实例 | `pageNum` / `pageSize` | `records` / `total` |
| 工作流待办 | `pageNum` / `pageSize` | `PageResponse`，页面读 `list` / `total` |
| 租户台账 | `pageNum` / `pageSize`（**必填**） | 分页对象 |
| 运维快照 | `page` / `size` | 分页对象 |
| 站内信收件箱 / 已发送 | 游标或分页 | **纯数组**，`total` 取数组长度 |
| MFA 配置 / IP 规则 | — | **裸数组**（无 `Result` 包装） |
| 办公绑定 | 两套 | `/bindings` 数组口径；`/bindings/page` 真实分页 + `status` 过滤（`platform` 必选） |

其他响应差异：

- 工作流定义：**写接口**返回领域对象（`workflowCode`/`workflowName`/`dagJson`/`enabled:number`），**查询接口**返回 DTO（`code`/`name`/`enabled:boolean`）——字段名不可混用。
- 租户配额：`null` 表示不限，清空时必须提交 `null`，不能是 `0` 或省略。
- 生命周期动作只接受小写：`disable` / `enable` / `freeze` / `unfreeze` / `deactivate` / `archive`。
- 会议室列表返回 Entity，`equipment` 可能是 JSON 字符串；详情接口才是数组。
- IP 写操作参数走 **query string**，不是 body。

## 3. 编码约定（摘要）

- `<script setup lang="ts">`；别名 `@` → `src/`；组件 PascalCase、变量/函数 camelCase、类型 PascalCase。
- 新增 API 先定 HTTP 方法、路径、query、请求 DTO、响应 DTO，再写返回类型；对象字段可选性以实际契约为准。
- 不无依据用 `any`、双断言或忽略类型错误；历史 `any` 不是先例。
- 查询/提交/删除分别管理 loading，异常分支必须结束加载；取消确认不能显示成接口失败。
- 数字 ID 与字符串 ID 显式转换；日期、枚举、分页字段不按 UI 文案推断。
- Tree（菜单/部门）与普通列表结构不同，复制页面要核对递归 `children`。
- 错误提示优先复用 `showError` 或模块既有处理，保留 `traceId` 能力，避免重复弹窗。
- ECharts 页面在卸载时释放实例与监听。

## 4. 排障表（按现象定位）

| 现象 | 优先核对 |
| --- | --- |
| 菜单页 404 | 后端 `component`、`VIEW_REGISTRY`、有效 `children`、动态注册是否成功 |
| URL 可访问但侧边栏无菜单 | `visible=0` / `meta.hidden`，不是路由缺失 |
| 按钮权限未收敛 | 权限请求是否失败降级为空、Store 是否为空、指令是否已移除节点 |
| 401 后仍未恢复 | `refreshToken`、认证端点排除、`authRetried`、刷新结果是否含 `accessToken` |
| 上传 401 与其它请求不同 | Element Plus / XHR 不经 `request.ts` 拦截器 |
| 工作流待办为空或 404 | 是否用 `/api/v1/workflows/tasks/pending`；办理仅 `complete` + `comment`；任务是否分配给当前用户 |
| 工作流分页为空 | 是否误用 `page/size` 或 `list/total` |
| 工作流定义编辑无数据 | 写/查返回结构不同（`workflowCode` vs `code`；`enabled` 数字 vs 布尔） |
| 站内信收件箱分页异常 | inbox/sent 返回纯数组；接收人须为绑定办公员工的系统用户 ID；网关 office-message 路由 |
| 站内信无实时推送 | WS 升级（vite `ws:true` / nginx 专用 location）、`office.messages.allowed-origins` 含当前 Origin、`ROUTE_OFFICE_WS_URI` 与 HTTP 路由同实例 |
| 通知中心无实时消息 | `GET /api/v1/notifications/stream` 用 `fetch` 带 `Bearer` 头（原生 `EventSource` 不带 Authorization，会被网关 `JwtSignatureFilter` 拒）；请求须带 `Accept: text/event-stream` 才豁免 30s 全局响应超时 |
| 办公审批列表空白 / 400 | 元素字段为 `processName`/`currentNode`/`createdAt`；路径参数 `processInstanceId`；`approverId` 不能空串 |
| 办公绑定分页不符预期 | 审批页走 `/bindings/page`（`platform` 必选 + `status`）；console 页固定 `page=1,size=100`；注意 `version` 乐观锁 |
| 租户页空列表或 400 | `pageNum/pageSize` 必填；动作枚举必须小写 |
| 租户配额无法清空为不限 | 必须提交 `null` |
| MFA / IP 页无数据 | 裸数组响应；IP 写操作走 query |
| 运维健康页 404 | 页面调用的 `health-report`/`snapshots`/`trend` 子路径 + 菜单注册 + 目标环境路由 |
| 组织部门保存后无 ID / 层级为空 | createDepartment 响应不含 `id`（需刷新）；`deptLevel`/`deptPath` 后端照抄不计算 |
| 组织同步页无数据 | `/admin-api/v1/org/**` 与 `/api/v1/office/organization/**`；同步任务 `page/size` 返回数组 |
| 文件分享列表为空 | 先输入文件 ID 查询（`GET /api/v2/files/{fileId}/shares`，仅所有者）；明文 token 只在创建响应返回一次 |
| 会议室设备为空 | `equipment` 可能是 JSON 字符串 |
| 密码找回不可用 | 依赖 `/auth/v2/password-recovery/**` 与已绑邮箱/手机号；`sessionRevocation=PENDING` 不等于失败 |
| OAuth2 回调失败 | sessionStorage 上下文、state 一次性消费、`redirect_uri`、PKCE、token 代理 |
| Docker 首页正常但接口失败 | `API_PROXY_PASS`、外部网络、后端 DNS、代理 location |
| 脱敏页 404 | 后端菜单 `component` = `system/masking/index`、`VIEW_REGISTRY` 登记、`/api/v1/masking/**` 路由 |

## 5. 提交前自检

- [ ] 页面、API、DTO、配置、测试改动范围与需求一致。
- [ ] 动态页面已登记 `VIEW_REGISTRY`，后端 `component` 键一致。
- [ ] API 走统一封装或明确的上传特例；分页字段与响应结构正确。
- [ ] 会话通过 `utils/auth.ts` 管理，无新增存储键。
- [ ] 权限码来源与后端鉴权已核对。
- [ ] 已跑 `npx vue-tsc --noEmit`；涉及构建改动时跑 `npm run build`；相关 `vitest` 通过。
- [ ] 无密钥、产物、无关文件进入变更。
