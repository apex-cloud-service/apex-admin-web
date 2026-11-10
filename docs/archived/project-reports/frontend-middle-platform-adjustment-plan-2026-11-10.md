# 前端「通过中台调用后端」整改方案

- 制定日期：2026-11-10
- 依据：[评审报告](./frontend-middle-platform-review-2026-11-10.md)
- 状态：**已按推荐选项实施**（D1=A、D2=A、D3=A、D4=A；T1–T7 全部落地）；`vue-tsc` 与 `vitest` 均通过。

## 1. 目标与边界

目标：让前端配置面与展示面与中台 fail-closed 授权语义一致，并补齐长连接/上传出口的统一性。

边界：

- 只改前端仓库（`apex-admin-web`）；不改后端契约、不加依赖、不引入新状态管理。
- 保持既有 `request.ts` 单一出口、`auth.ts` 会话读写、`showError` 提示风格。
- 不在本轮处理与授权语义无关的历史问题（`useCrud` 未接入、TaskActions 未接入等）。

## 2. 决策点（需先确认）

| 编号 | 决策 | 选项 | 建议 |
| --- | --- | --- | --- |
| D1 | 「全量能力」如何表达 | A. 前端提交能力目录全部编码（不改后端）<br>B. 后端新增显式全量标志（跨仓库） | A：本轮可闭环；新增能力不会自动进入历史套餐，需在页面提示 |
| D2 | 是否允许「仅登记、不绑套餐」租户 | A. 开通向导强制选套餐，列表对存量空套餐租户高亮<br>B. 保持允许，仅修正文案与提示 | A：符合 fail-closed 现状，避免开出不可用租户 |
| D3 | `v-permission` 空集合语义 | A. 保持放行，权限为空时顶部提示<br>B. 改为 fail-closed（空 = 拒绝） | A：B 影响全部页面回归，建议单独立项 |
| D4 | nginx 流式配置与跨域 baseURL 是否纳入本轮 | A. 纳入（T3、T4）<br>B. 生产确定同域，降级为后续待办 | A：改动小、收益明确 |

未确认前只执行 T1、T2（P1 必修），T3/T4 需 D4 通过，T5 需 D3 结论。

## 3. 变更项

### T1（P1-1）套餐「全量能力」改为显式枚举

**改动**

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `src/views/system/tenant-package/index.vue` | L117–L120 | 提示文案改为「开启表示订阅能力目录全部编码（当前 N 项），新增能力需重新保存」 |
| 同上 | `submit` | 载荷改由 `src/utils/tenant-package.ts` 的 `buildPackagePayload` 生成：全量能力显式展开为目录全部编码，其余维度保持空集合 = 全量 |
| `src/utils/tenant-package.ts` | 新增 | 收敛「全量开关 → 后端语义」转换与菜单父链补全，可被单测覆盖 |
| 同上 | `openDialog` | 回填：`allFeatures = row ? caps.length > 0 && row.features.length >= caps.length : true` |
| 同上 | L223–L227 | 拆分展示函数：菜单/权限沿用 `scopeText`（空 = 全量），能力单列 `featureText`（空 = 未订阅，等于目录长度 = 全部） |
| 同上 | L38–L40 | 「能力订阅」列改用 `featureText`，避免空数组显示为「全量」 |

**为什么用目录长度判定**：后端 `PackageScope` 对 `features` 的判定是逐项 `contains`，没有 `unbounded` 兜底，前端必须保证「全量」= 目录全编码。

**验证**

1. 新建套餐勾选「全量能力」保存 → `GET /api/v2/capabilities/subscribed` 返回与目录等长；
2. 用该套餐租户调任一 `/open-api/**` 接口 → 不再返回 403「能力未开通」；
3. 只勾 1 项能力保存 → 列表显示「1 项」，订阅快照仅含该项；
4. 能力目录新增一项后重新打开套餐 → 开关自动为关（避免静默丢失新能力）。

**风险/回滚**：仅影响套餐页面提交与展示；回滚为恢复 `features` 空数组逻辑。

### T2（P1-2）开通向导套餐必填与存量提示（D2 选 A 时）

**改动**

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `src/views/system/tenant/index.vue` | L96–L112 | placeholder 改为「选择套餐（必选：决定该租户的菜单、权限与能力范围）」 |
| 同上 | L223–L232 | `packageCode` 增加 `required` 规则，与管理员账号/密码成对校验（L232–L259）并列 |
| 同上 | L56 | 「套餐」列对空值显示为「未绑定（无授权）」并使用 warning 标签 |

**验证**

1. 不选套餐点击开通 → 表单拦截，不发起 `POST /api/v2/platform/tenants`；
2. 选套餐开通 → 该租户管理员登录后菜单/权限按套餐生效；
3. 存量空套餐租户在列表可见警示。

**风险/回滚**：会使「仅登记租户」的既有流程不可用（D2 若选 B 则不实施）。

### T3（P2-2）SSE 出口统一 + nginx 流式配置

**改动**

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `src/utils/api-base.ts` | 新增 | 提供 `apiBaseUrl()` / `apiUrl(path)`，与 `request.ts` 的 `baseURL` 同一来源（同域为空、跨域取 `VITE_API_BASE_URL` 并去尾部斜杠） |
| `src/utils/notification-stream.ts` | 建连处 | 地址改为 `apiUrl('/api/v1/notifications/stream')`，相对路径时不带 origin |
| `docker/nginx.conf` | `/api/` 之前 | 新增 `location = /api/v1/notifications/stream { proxy_buffering off; proxy_cache off; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }`，转发头与现有一致 |

vite 开发代理已由 `/api` 覆盖，无需变更。

**验证**

1. `curl -N` 经 nginx 访问 stream 端点，30s 内持续收到心跳且不缓冲；
2. 断网 5s→30s 退避重连正常，登录态恢复后自动续连；
3. 跨域 baseURL 场景下 SSE 仍指向 API 域名。

### T4（P2-3）上传出口统一

**改动**

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `src/components/FileUpload.vue` | `uploadUrl` | 改为 `apiUrl('/api/v1/files/generic')` |
| `src/components/FileUploadEnhanced.vue` | `uploadUrl` 及 XHR 上传分支 | 同上；分片上传仍走 `api/file.ts` 的请求层，自动继承 `baseURL` |

前缀取值收敛在 `src/utils/api-base.ts`，SSE 与两个上传组件共用，避免三处各自拼接漂移；`vue-tsc` 与新增单测覆盖同域/跨域两种取值。

**验证**：设置 `VITE_API_BASE_URL` 后普通上传、分片上传、裁剪/粘贴上传均成功且回显正确；同域部署行为不变。

补充（回归中发现并修复）：`docker/nginx.conf` 原未设置请求体上限，Nginx 默认 `1m` 会让 1–10MB 的单发上传在到达网关前直接 413；已加 `client_max_body_size 20m`（覆盖 10MB 文件 + multipart 开销与 5MB 分片块），并经容器 `nginx -t` 校验。

### T5（P3-1）权限空集合提示（D3 选 A 时）

`AdminLayout` 顶部在「身份已初始化且权限码为空」时展示一条可关闭提示：当前账号未获得权限码，按钮可见但操作可能被后端拒绝。不改 `v-permission` 的放行语义。

### T6（P3-2）403 授权类错误提示

`src/utils/request.ts` 的 `showError` 对 `ApiError.code === 403` 且错误文案命中「能力未开通」「scope」时，在原提示与 traceId 之后追加「可在能力运营页查看当前租户订阅」；不改变错误抛出结构，不做全局跳转。

### T7（P2-1）声明同步

实现变更后同步：`src/types/index.ts#L1184-L1189`、`src/api/tenant-package.ts#L10`、`src/api/capability.ts#L36-L38`、`src/views/system/capability/index.vue#L6,L47`、`AGENTS.md#L35`。只改「features 空集合」语义描述，菜单/权限码描述保持不变。

## 4. 执行顺序与验收

1. T1 → T7（同一次提交，避免声明与实现不一致）
2. T2（依赖 D2）
3. T3、T4（依赖 D4）
4. T5（依赖 D3）、T6

统一验收：

- `npx vue-tsc --noEmit` 通过；
- `npx vitest run` 全绿（若新增逻辑有用例，覆盖「全量能力枚举」「能力列展示」两条分支）；
- 手工回归：套餐新建/编辑/列表、租户开通、能力运营订阅状态、通知 SSE、两种上传组件。

## 4.1 三项环境相关项的回归结果

依赖外部环境的三项已用可复现的本地手段验证，不再仅依赖人工点检：

| 项 | 手段 | 结果 |
| --- | --- | --- |
| 套餐保存后订阅接口返回 | `src/utils/__tests__/tenant-package.spec.ts` 断言 `buildPackagePayload`：全量能力输出目录全部编码、非全量保持所选编码、目录为空输出空集合（未订阅） | 通过；后端 `GET /api/v2/capabilities/subscribed` 的最终返回仍需在接入真实租户后确认 |
| 经 nginx 的 SSE 长连接 | 用仓库 `docker/nginx.conf` 渲染 `API_PROXY_PASS` 指向本地 SSE 模拟服务，`nginx:alpine` 容器反代后 `curl -N` | 通过：`200`、首字节 13ms、4s 内收到 19 个事件（200ms 间隔，无缓冲）、访问日志路径未被改写 |
| 跨域 baseURL 下的上传 | `src/utils/__tests__/api-base.spec.ts` 与 `src/components/__tests__/FileUpload.spec.ts` 断言同域/跨域两种取值：相对路径与 `https://api.example.com/api/v1/files/generic` | 通过；真实跨域还需目标网关的 CORS 允许前端 Origin 与 `Authorization` 头 |

## 5. 本轮不做

- 后端新增套餐全量标志或 `PackageScope` 契约调整（D1 选 B 时另立项）；
- `v-permission` 改为 fail-closed；
- 网关路由、能力门禁、开放平台 scope 的任何后端改动。

发布前逐项确认见 [上线前最终检查清单](frontend-middle-platform-go-live-checklist-2026-11-10.md)。
