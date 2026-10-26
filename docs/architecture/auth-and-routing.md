# 认证与路由架构

> 本文描述登录认证、令牌无感刷新、OAuth2 授权、菜单驱动动态路由四大机制的实现，全部依据 [src/utils/request.ts](../../src/utils/request.ts)、[src/router/index.ts](../../src/router/index.ts)、[src/router/dynamic.ts](../../src/router/dynamic.ts)、[src/stores/user.ts](../../src/stores/user.ts) 当前代码核对。

## 1. 会话数据存储

Token 与身份信息统一由 [src/utils/auth.ts](../../src/utils/auth.ts) 存取，键名收敛于 [src/settings.ts](../../src/settings.ts)：

| 键 | 常量 | 内容 |
|----|------|------|
| `apex.admin.token` | `TOKEN_KEY` | 访问令牌 |
| `apex.admin.refresh-token` | `REFRESH_TOKEN_KEY` | 刷新令牌 |
| `apex.admin.identity` | `IDENTITY_KEY` | 用户身份缓存（UserIdentity） |
| `apex.admin.tenant-id` | `TENANT_ID_KEY` | 当前租户 ID（登录响应返回 `tenantId` 时记录） |
| `apex.admin.sidebarCollapsed` | `SIDEBAR_KEY` | 侧边栏折叠状态 |
| `apex.admin.theme` | `THEME_KEY` | 明暗主题 |

UI 偏好通过 `utils/storage.ts` 读写（app store 不直接触碰 localStorage）。

## 2. 账号密码登录流程

入口 [src/views/login/index.vue](../../src/views/login/index.vue) → [src/stores/user.ts](../../src/stores/user.ts) `login()`。

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant L as 登录页
    participant S as user store
    participant B as 后端

    U->>L: 输入账号/密码
    opt 多租户部署（VITE_AUTH_TENANT_ENABLED=true）
        U->>L: 可选填写租户标识
    end
    L->>B: GET /api/v1/auth/captcha
    B-->>L: CaptchaVO{captchaId, base64 图片}
    U->>L: 提交表单
    L->>S: login({username, password, captchaId, captchaCode, tenantId?})
    S->>B: POST /api/v1/auth/login<br/>(附带 deviceId='apex-admin-web', platform='web'，<br/>tenantId 仅作租户匹配声明，缺省由后端使用 default)
    B-->>S: LoginResult{accessToken, refreshToken, tenantId?}
    S->>S: setToken + setRefreshToken（utils/auth.ts）
    S->>S: removeTenantId 清残留后，<br/>响应含 tenantId 时 setTenantId 记录
    S->>B: 并行拉取三个接口：<br/>GET /api/v1/user/info<br/>GET /api/v1/auth/roles/my<br/>GET /api/v1/auth/permissions/my
    Note over S: roles/permissions 拉取失败时<br/>降级为空数组，不阻塞登录
    S->>S: setIdentity 缓存身份（含 tenantId），initialized=true
    S-->>L: 返回 LoginResult
    L->>L: 跳转 redirect 参数页或 /dashboard
```

登录后请求层（`utils/request.ts`）在会话存在租户 ID 时附带 `X-Tenant-Id` 请求头，仅作匹配声明：租户作用域始终由后端从令牌解析，网关会剥离并重建该头。租户适配的完整评审结论见 [统一权限认证与多租户适配](../guides/auth-tenant-adaptation.md)。

## 3. 路由守卫流程

全局守卫位于 [src/router/index.ts](../../src/router/index.ts)（`router.beforeEach`）。

```mermaid
flowchart TD
    A[路由跳转触发 beforeEach] --> B{to.meta.public?}
    B -- 是 --> Z[放行<br/>login / oauth2/callback]
    B -- 否 --> C{已有 Token?}
    C -- 否 --> D[重定向 /login<br/>携带 redirect=to.fullPath]
    C -- 是 --> E{身份已初始化?<br/>user store initialized}
    E -- 是 --> Z
    E -- 否 --> F[调用 loadIdentity 并构建动态路由]
    F --> G{成功?}
    G -- 是 --> H[replace 回 to.fullPath]
    G -- 否 --> I[静默降级：仅保留静态路由<br/>登录页仍可用]
```

## 4. 令牌无感刷新（已实现）

> 注意：早期文档写"401 直接清会话"，与现状不符。当前 [request.ts](../../src/utils/request.ts) 响应拦截器已实现**单次重放的无感刷新**。

触发条件（同时满足才刷新）：

1. HTTP 状态码 401；
2. 请求未带 `authRetried` 标记（防死循环）；
3. URL 不属于认证端点：`/api/v1/auth/refresh`、`/api/v1/auth/login`、`/oauth2/token`；
4. 本地存在 refreshToken。

```mermaid
sequenceDiagram
    autonumber
    participant C as 业务请求
    participant R as request.ts 拦截器
    participant B as /api/v1/auth/refresh
    participant S as 会话存储

    C->>R: 请求返回 401
    R->>R: 条件校验通过，标记 authRetried
    alt 已有进行中的刷新（refreshPromise 非空）
        Note over R: 并发 401 共享同一个刷新 Promise
    else 首个触发
        R->>B: POST refreshToken(refreshToken)
        B-->>R: LoginResult{accessToken, refreshToken?}
        R->>S: setToken；若返回新 refreshToken 则一并更新
    end
    alt 刷新成功
        R->>R: 重放原请求（更新 Authorization 头）
        R-->>C: 返回重放结果
    else 刷新失败
        R->>S: clearSession()
        R--xC: 跳转 /login?redirect=... 并抛出<br/>ApiError('登录状态已失效，请重新登录')
    end
```

补充：后端也可通过响应头 `x-new-access-token` 主动下发新令牌，拦截器收到后直接 `setToken`（request.ts:64-65）。

## 5. OAuth2 授权码登录

接口封装 [src/api/oauth2.ts](../../src/api/oauth2.ts)，回调页 `/oauth2/callback` 为静态路由（`public: true`）。客户端 ID 来自 `VITE_OAUTH2_CLIENT_ID`（开发 `apex-admin-web-dev` / 生产 `apex-admin-web-prod`）。

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant LP as 登录页
    participant OA as api/oauth2.ts
    participant IdP as 第三方身份提供商
    participant CB as /oauth2/callback
    participant B as 后端

    U->>LP: 点击第三方登录
    LP->>OA: buildAuthUrl(config)
    OA->>OA: 生成 state（一次性）与 codeVerifier<br/>（S256 PKCE），上下文暂存本地
    OA-->>LP: 授权 URL
    LP->>IdP: 跳转授权页
    IdP-->>CB: 回调 ?code=xxx&state=xxx
    CB->>OA: consumeAuthorization(state)<br/>校验 state 并取出 clientId/redirectUri/codeVerifier
    CB->>B: POST /oauth2/token<br/>（表单编码，携带 code + code_verifier，不含 client_secret）
    B-->>CB: LoginResult{accessToken, refreshToken}
    CB->>CB: 保存会话并跳转回跳页或 /dashboard
```

安全要点：

- `state` 一次性消费（`consumeAuthorization` 取出后即失效，`verifyState` 校验）。
- 授权码一次性，后端校验；PKCE（S256）防授权码拦截。
- Token 只入 localStorage，不出现在 URL。

## 6. 办公平台登录（飞书/钉钉/企微）

入口 [src/views/login/index.vue](../../src/views/login/index.vue) → [src/api/office-new.ts](../../src/api/office-new.ts)（登录相关）。

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant L as 登录页
    participant B as 后端
    participant P as 平台(飞书/钉钉/企微)

    L->>B: GET /api/v1/office/status（查询已启用平台）
    B-->>L: OfficePlatform[]（登录页按此渲染入口）
    U->>L: 点击平台按钮
    L->>B: GET /api/v1/office/login?platform=（获取授权跳转地址）
    B-->>L: 平台 OAuth2 授权 URL
    L->>P: 跳转平台授权页
    P-->>L: 回调 /office/callback?code=...&state=...
    L->>B: GET /api/v1/office/callback?platform=&code=&state=
    B-->>L: 换取会话令牌（新用户则生成绑定申请）
    L->>L: 保存会话并进入工作台
```

绑定审批流转（管理员侧）：绑定申请 `PENDING → APPROVED / REJECTED`，见 [office-new.ts](../../src/api/office-new.ts) `reviewBinding()` 与 [绑定管理页](../../src/views/office/bindings/index.vue)。

## 7. 菜单驱动动态路由

实现：[src/router/dynamic.ts](../../src/router/dynamic.ts)。数据源为后端菜单树 `GET /admin-api/v1/menus`。

```mermaid
flowchart TD
    A[登录成功/刷新页面] --> B[GET /admin-api/v1/menus 菜单树]
    B --> C[buildDynamicRoutes 递归遍历]
    C --> D{menuType?}
    D -- "0 目录" --> E[作为分组父节点<br/>继续递归 children]
    D -- "1 菜单" --> F{component 在<br/>VIEW_REGISTRY 中?}
    F -- 是 --> G[注册路由挂到 AdminLayout<br/>meta: title/icon/hidden]
    F -- 否 --> H[跳过并告警<br/>页面不可达 404]
    D -- "2 按钮" --> I[不生成路由<br/>仅作为权限码]
    E & G --> J[router.addRoute 批量注册]
```

### status 与 visible 语义（易踩坑）

| 字段 | 取值 | 路由可达性 | 侧边栏显示 | 说明 |
|------|------|-----------|-----------|------|
| `status` | 0=停用 / 1=正常 | **不受影响** | **不受影响** | 历史种子数据取值与后端枚举不一致，路由生成刻意不按 status 过滤，避免全量菜单丢失 |
| `visible` | 0=隐藏 / 1=显示 | 仍注册、可直接访问 | 仅 `visible=1` 显示 | 隐藏只写 `meta.hidden` |

### VIEW_REGISTRY 全量清单（与 dynamic.ts:21-54 一致）

系统管理：`system/user/index`、`system/role/index`、`system/menu/index`、`system/dept/index`、`system/dict/index`、`system/config/index`、`system/database/index`、`system/job/index`、`system/job/query`、`system/generator/index`、`system/auth/index`、`system/sso/index`

监控：`monitor/loginlog/index`、`monitor/audit/index`、`monitor/api-call-log/index`、`monitor/online/index`、`monitor/dashboard/index`、`monitor/runtime-log/index`、`monitor/business-log/index`

数据管理：`data/document/index`、`data/chart/index`

办公平台：`office/message/index`、`office/approval/index`、`office/config/index`、`office/bindings/index`、`office/console/index`、`office/organization/index`、`office/calendar/index`、`office/document/index`

其他：`profile/index`、`dashboard/index`、`workflow/monitor/index`

> **新增页面三步**：建视图文件 → 在 VIEW_REGISTRY 登记 loader → 后端菜单 `component` 字段同名。缺一步即 404。

## 8. 静态路由清单（不依赖后端菜单）

| 路径 | 组件 | meta | 说明 |
|------|------|------|------|
| `/login` | login/index.vue | `public: true` | 登录页 |
| `/oauth2/callback` | oauth2/callback.vue | `public: true, hidden: true` | OAuth2 回调 |
| `/office/callback` | office/callback.vue | `public: true, hidden: true` | 办公平台（飞书/钉钉/企微）授权回调：用 code/state 调 `GET /api/v1/office/callback` 换会话，未绑定账号时提示等待管理员审批 |
| `/dashboard` | dashboard/index.vue | `title: 工作台` | 工作台 |
| `/workflow/monitor/dashboard` | — | redirect → `/workflow/monitor` | 旧路径兼容 |
| `/workflow/monitor` | workflow/monitor/index.vue | `hidden: true` | 工作流监控 |
| `/workflow/instances/:id` | workflow/monitor/InstanceDetail.vue | `hidden: true, activeMenu: /workflow/monitor` | 流程详情 |
| `/demo/file-upload` | demo/FileUploadDemo.vue | `hidden: true` | 上传演示 |
| `/demo/file-upload-enhanced` | demo/FileUploadEnhancedDemo.vue | `hidden: true` | 增强上传演示 |
| `/:pathMatch(.*)*` | error/NotFound.vue | — | 404 兜底 |

`/office/callback`（办公平台授权回调）为静态路由（public），页面位于 [src/views/office/callback.vue](../../src/views/office/callback.vue)。

## 9. 按钮权限指令

[src/directives/permission.ts](../../src/directives/permission.ts)：

```html
<el-button v-permission="'system:user:create'">新增</el-button>
```

- 基于用户权限码集合控制元素显隐，无权限时**从 DOM 移除**；
- 支持逗号分隔多码，满足其一即放行；
- 空权限集合视为"未配置"，放行。

## 10. 关联文档

- [总体架构](overview.md) · [API 接口目录](../api/README.md)
- [认证集成分析](../analysis/auth-integration.md)（历史分析，含后端权限模型对照）

---

**最后更新**：2026-09-27（依据 src/ 当前实现全量核对；修正"Token 刷新未实现"的过时结论）
