# 上线前最终检查清单（apex-admin-web）

- 版本：最终版（2026-11-10）
- 范围：本次中台整改 T1–T7（套餐全量能力语义、租户套餐必填、SSE/上传出口统一、权限空集合提示、403 授权提示、声明同步）、Nginx 上传 413 与静态资源缓存修复、上线后验证脚本
- 依据：[评审报告](./frontend-middle-platform-review-2026-11-10.md)、[整改方案](./frontend-middle-platform-adjustment-plan-2026-11-10.md)、[验证脚本](../../../scripts/verify/post-deploy-check.sh)
- 原则：**任一项未通过即不发布**。标注「环境」的项必须由目标环境负责人确认，本地结果不能替代

## 0. 本仓库已实测的基线（发布前重跑一次）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npx vue-tsc --noEmit` | 退出码 0 |
| 单元测试 | `npx vitest run` | 27 个文件 / 214 个用例全通过 |
| 生产构建 | `npm run build` | 成功，产物 `dist/`（约 34s） |
| Nginx 语法 | `nginx -t`（`nginx:alpine` 容器，渲染 `${API_PROXY_PASS}` 后） | `syntax is ok` / `test is successful` |
| 宿主机示例语法 | 抽取 [deployment.md §6.2](../../guides/deployment.md#L162-L295) 的 `server` 块，`nginx:alpine` 内 `nginx -t` | `syntax is ok` / `test is successful`（补齐 consent、`/auth/v1` `v2`、`/integration/v1`、SSE 后复验） |
| 上传体积边界 | 经 Nginx `POST /api/v1/files/generic` | 5MB → 200、19MB → 200、21MB → 413；同请求直连上游 21MB → 200 |
| 静态资源响应头 | `curl -I /js/<hash>.js` | `X-Content-Type-Options`、`X-Frame-Options`、单一 `Cache-Control: public, max-age=2592000, immutable` |
| 授权同意端点分流 | `GET /oauth2/consent`、`POST /oauth2/consent` | GET 回退 SPA（text/html）、POST 反代到上游且路径未改写 |
| SSE 长连接 | 经 Nginx 反代本地模拟流 | 200、首字节 13ms、4s 内 19 个事件（无缓冲） |
| 上线后验证脚本 | `BASE_URL=<站点> TOKEN=<令牌> npm run verify:deploy` | 本地以真实 `docker/nginx.conf` + `dist/` + 模拟网关演练：18 项通过 / 0 失败 / 跳过 1；异常场景与修复项见 §0.2、§3.1 |

## 0.1 上线后一键验证（发布后立即执行）

脚本：[scripts/verify/post-deploy-check.sh](../../../scripts/verify/post-deploy-check.sh)（`npm run verify:deploy`）

```bash
# 同域部署（TOKEN 可选；提供后才会执行鉴权类与长连接检查）
BASE_URL=https://admin.example.com TOKEN=<管理员令牌> npm run verify:deploy

# 跨域部署
BASE_URL=https://admin.example.com API_BASE=https://api.example.com TOKEN=<令牌> npm run verify:deploy
```

| 检查 | 内容 | 对应章节 |
| --- | --- | --- |
| C1–C4 | 首页可达、安全头、静态资源长缓存与安全头、History 回退 | §3、§7 |
| C5–C7 | 公开接口连通、`/internal/v1/**` 不可达、非法令牌 401 | §3、§4、§7 |
| C8 | 15MB 不被拒、25MB 返回 413（验证 `client_max_body_size`） | §3 |
| C9 | SSE 路由、`text/event-stream`、能否收到数据 | §6、§9 |
| C10 | 当前用户、能力目录、租户订阅（空集合给出告警） | §5 |
| C11 | WebSocket 握手 101（需令牌签发票据） | §6、§9 |
| C12 | 授权同意端点分流：`GET /oauth2/consent` 回退 SPA、`POST` 反代到网关 | §3、§6 |
| C13 | 版本前缀路由落网关：`/auth/v1/**`、`/integration/v1/**` 未回退 SPA | §3、§4 |

- 退出码：`0` 通过或仅告警；`1` 存在失败项（输出失败清单）；`2` 缺少必填参数（打印用法，不发起请求）
- 跨域部署时 C8 自动跳过（无法验证 Nginx 限制）；`SKIP_UPLOAD=1`、`SKIP_WS=1`、`INSECURE=1` 可跳过或放宽单项
- 脚本结果是**必要非充分**条件：§6 的页面级交互仍需人工回归

## 0.2 验证脚本本地演练记录（2026-11-10）

演练方式：`nginx:alpine` 加载真实 [docker/nginx.conf](../../../docker/nginx.conf)（`API_PROXY_PASS` 渲染为同一 docker 网络内的模拟网关容器）+ 真实 `dist/` 产物，脚本按不同入参执行。日志已随临时容器销毁，结论如下。

| 场景 | 入参 | 结果 | 要点 |
| --- | --- | --- | --- |
| 正常链路 | `BASE_URL=http://127.0.0.1:18093 TOKEN=<模拟令牌> SKIP_WS=1` | 通过 18 · 失败 0 · 跳过 1 · 退出码 0 | C3 命中 `/js/index-<hash>.js` 且含 `immutable`；C3b 安全头齐全；C6 判定 `/internal/v1/**` 回退 SPA、内部端点不可达；C8 15MB → 200、C8b 25MB → 413；C9 返回 `text/event-stream` 并收到事件；C12a GET 同意页回退 SPA、C12b POST 反代后 401；C13a/C13b 前缀均落网关（401，非 HTML 回退） |
| 无令牌 | 省略 `TOKEN`（`SKIP_WS=1`） | 通过 15 · 失败 0 · 跳过 2 · 退出码 0 | 无失败项；C10 系列与 C11 跳过；C9 仅验证路由可建连 |
| 上游断链 | 停止模拟网关容器 | 通过 9 · 失败 9 · 退出码 1 | 失败项逐条输出（C5、C7、C9、C10 系列、C12b、C13a、C13b），验证「有失败即阻断」的退出语义 |
| 缺少必填参数 | 不传 `BASE_URL` | 打印用法 | 退出码 2，不产生误判 |
| 上游不可达（复验） | `BASE_URL=http://127.0.0.1:9 SKIP_UPLOAD=1 SKIP_WS=1` | 通过 0 · 失败 12 · 跳过 3 · 退出码 1 | C1–C7、C9、C12a/C12b、C13a/C13b 全部给出「HTTP 000」与排查方向；输出无杂散报错 |
| 未验证项 | C11（WS 101） | 跳过 | 模拟网关无法完成 `101 Switching Protocols`，须在真实环境补测（§9） |

- 演练同时验证了脚本对 bash 3.2（macOS 自带 `/bin/bash`）的兼容性：不使用 `${var,,}` 小写展开，空数组按 `${arr[@]+"${arr[@]}"}` 保护，避免 `set -u` 下 unbound
- 演练中同步修复了脚本自身缺陷：SSE/WS 两项原用 `${INSECURE:+-k}`（`INSECURE` 默认为 `0`，即恒跳过 TLS 校验），改为按 `=1` 判断；连通失败时 `grep` 泄漏的文件不存在报错已静默
- 模拟网关须与前端容器处于同一 docker 网络（本机 docker 为远端引擎，容器内访问 `host.docker.internal` 与宿主机局域网 IP 均被拒）；模拟上游自身放宽 `client_max_body_size`，否则 15MB 会被模拟网关拒绝并误判为前端 Nginx 未生效
- 演练仅覆盖「链路与配置是否成立」，不替代 §6 的页面级交互回归
- 本次演练暴露并修复的 Nginx 配置问题见 §3.1
- 结论：补齐 C12/C13 后正常链路仍为 0 失败，说明 `docker/nginx.conf` 的「consent 仅 POST 反代」与「`/auth/v1`、`/integration/v1` 前缀反代」均已成立；演练环境（前端容器监听 18093 + 同网络模拟网关容器）已随本次记录一并清理，真实环境仍须按 §0.1 重跑

## 1. 代码与变更范围

- [ ] 工作树变更仅含本次整改文件（`api/`、`views/system/{tenant,tenant-package,capability}/`、`components/FileUpload*`、`utils/{api-base,tenant-package,notification-stream,request}.ts`、`layouts/AdminLayout.vue`、`docker/nginx.conf`、`docs/` 与 `AGENTS.md`/`MEMORY-CARD.md`）
- [ ] 无临时脚本、调试代码、mock 开关残留；`git diff` 无 `console.log`
- [ ] `dist/`、`coverage/`、`reports/` 等产物未进入提交
- [ ] 未新增依赖，`package.json`、`package-lock.json` 无非预期变化
- [ ] 仓库内无密钥/口令；`VITE_*` 仅含公开配置

## 2. 构建期配置

- [ ] **同域部署**：`VITE_API_BASE_URL` 留空（请求走相对路径，由 Nginx 反代）
- [ ] **跨域部署**：`VITE_API_BASE_URL` 为网关绝对地址且不带尾部斜杠（`apiUrl()` 会归一化，仍需与网关 CORS 一致）
- [ ] `VITE_OAUTH2_CLIENT_ID` 与目标环境 OAuth2 客户端注册值一致
- [ ] 构建命令已记录：`docker build --build-arg VITE_API_BASE_URL=<值> -t apex-admin-web:<tag> .`
- [ ] 镜像 tag 可追溯到本次提交（禁止用 latest 覆盖发布）

## 3. Nginx 与部署链路

- [ ] 容器入口 `envsubst` 只展开 `${API_PROXY_PASS}`，`$uri`、`$host` 等内置变量未被替换
- [ ] `API_PROXY_PASS` 为**单一网关** upstream，无尾部斜杠（带斜杠会把 `/api/v1/...` 改写为 `/...`）
- [ ] `client_max_body_size 20m` 生效（前端单文件上限 10MB / 分片块 5MB，20m 为余量；Nginx 默认 1m 会让 1–10MB 上传直接 413）
- [ ] 如需更大单文件，三处已同步：`client_max_body_size`、`MAX_UPLOAD_SIZE`、后端 `FILE_MAX_SIZE_BYTES`
- [ ] SSE：`location = /api/v1/notifications/stream` 生效（`proxy_buffering off`、`proxy_cache off`、`Connection ""`、超时 3600s）
- [ ] WS：`location = /api/v1/messages/ws` 保留 `Upgrade`/`Connection "upgrade"` 与 3600s 超时
- [ ] 反代前缀齐全：`/api/`、`/admin-api/`、`/auth/v1/`、`/auth/v2/`、`/integration/v1/`、`/oauth2/(authorize|token)`；`/oauth2/consent` 为精确匹配且仅 POST 反代
- [ ] 上述版本前缀与同意端点的实际分流符合预期：`GET /oauth2/consent` 回退 SPA、`POST /oauth2/consent` 落网关；`/auth/v1/**`、`/integration/v1/**` 返回 JSON 而非 HTML（C12、C13）
- [ ] 静态资源缓存规则覆盖实际产物目录 `js/`、`css/`、`images/`、`fonts/`、`media/`、`assets/`（只写 `/assets/` 会让 js/css 无缓存）
- [ ] 上述目录内重复声明安全头（该 location 存在 `add_header` 时父级声明不继承），且未使用 `expires`（避免与显式 `Cache-Control` 重复输出）
- [ ] History 回退 `try_files $uri $uri/ /index.html` 生效；发布前清空旧静态产物目录（`js/`、`css/`、`images/`、`fonts/`、`media/`、`assets/`）
- [ ] 若使用宿主机 Nginx 而非容器模板，[deployment.md](../../guides/deployment.md#L162-L295) 示例与 `docker/nginx.conf` 保持等价（已含 consent、`/auth/v1|v2/`、`/integration/v1/`、SSE location）

### 3.1 本期 Nginx 修复项与验证证据

| 问题 | 根因 | 修复 | 验证 |
| --- | --- | --- | --- |
| 1–20MB 上传返回 413 | `client_max_body_size` 默认 1m，请求在达到网关前被拒 | 显式 `client_max_body_size 20m` | 5MB/19MB → 200，21MB → 413；同一请求直连上游 21MB → 200，确认限制层为 Nginx（C8/C8b） |
| 哈希 js/css 无长缓存 | 只配 `location /assets/`，而 `vite.config.ts` 实际输出到 `js/`、`css/` 等分目录 | 改为正则 `location ~* ^/(assets\|js\|css\|images\|fonts\|media)/` | `curl -I /js/<hash>.js` 返回 `Cache-Control: public, max-age=2592000, immutable`（C3） |
| 静态资源缺安全头 | `add_header` 不继承：子 location 一旦声明就丢弃父级声明 | 在该 location 内重复声明两个安全头 | `X-Content-Type-Options`、`X-Frame-Options` 均存在（C3b） |
| `Cache-Control` 输出两份 | `expires 30d` 与显式 `add_header Cache-Control` 同时生效 | 去掉 `expires`，只保留显式 `add_header` | 响应头仅一份 `Cache-Control`（§0 基线） |
| `GET /oauth2/consent` 被反代到后端 | 前缀反代同时命中了前端同意页路由 | 改为 `location = /oauth2/consent`，仅 POST 反代，其余 `try_files /index.html =404` | GET 返回 text/html、POST 反代且路径未改写（§0 基线、C12a/C12b） |
| SSE 事件成批到达 | 普通 `/api/` 反代开启响应缓冲 | 精确匹配 SSE 路径 + `proxy_buffering off`、`proxy_cache off`、`Connection ""`、3600s | 首字节 13ms、4s 内 19 个事件（§0 基线、C9） |
| 注释中匹配顺序说法错误 | 误写「WS location 必须写在 `/api/` 之前」 | 更正为「前缀 location 由最长匹配决定、与书写顺序无关；用 `=` 精确匹配保证优先」 | 文档与模板一致 |
| 宿主机示例落后于容器模板 | `deployment.md` §6.2 缺 consent 的 POST 分流、`/auth/v1` `v2`、`/integration/v1/` 与 SSE location | 补齐四处并同步缓存目录、安全头与 `expires` 说明 | 与 `docker/nginx.conf` 逐条对照；抽取示例在 `nginx:alpine` 内 `nginx -t` 通过（§0 基线） |

## 4. 网关与后端连通（环境）

- [ ] 网关已滚动到包含通知流路由、`/api/v2/**` 显式路由、`/integration/v1/**` 的配置
- [ ] `GET /api/v2/capabilities`、`GET /api/v2/capabilities/subscribed` 经网关返回 200（非 404/HTML）
- [ ] `/internal/v1/**` 经网关返回 403/404（浏览器不可直连）
- [ ] 跨域部署时网关 CORS 允许前端 Origin 与 `Authorization`、`X-Tenant-Id`、`Accept`
- [ ] office-service `office.messages.allowed-origins` 含当前站点 Origin；`ROUTE_OFFICE_WS_URI` 与 HTTP 路由同实例
- [ ] 通知流路由为 breaker-free 且带 `response-timeout` metadata
- [ ] 数据库迁移已执行（能力目录、`iot:rule:read`、套餐/权限种子）

## 5. 中台语义专项

- [ ] 套餐「全量能力」保存后，订阅接口返回与能力目录等长的编码集合（**`features` 空集合 = 未订阅**）
- [ ] 套餐列表：能力列空集合显示「未订阅」、全部编码显示「全部（N 项）」；菜单/权限列空集合显示「全量」
- [ ] 能力目录新增编码后，历史「全量」套餐打开时开关为关（已知取舍，需重新保存）
- [ ] 编辑套餐时 `menuIds` 自动补齐父链，保存后对应菜单可见
- [ ] 租户开通未选套餐被前端拦截且不发请求；存量无套餐租户显示「未绑定（无授权）」
- [ ] 无套餐/无能力租户调用受控接口返回 403，提示含「可在能力运营页查看当前租户订阅」
- [ ] 账号权限码为空时顶部提示「未获得权限码」（不改变按钮可见性）
- [ ] `X-Tenant-Id` 仅在登录响应含 `tenantId` 时附带，无可伪造的客户端租户上下文

## 6. 功能回归（按模块勾选）

- [ ] 登录、验证码、MFA 二步（`mfaRequired=true` 走 `/auth/v1/mfa/verify`）
- [ ] 401 自动刷新与单次重放；刷新失败回登录页并保留回跳地址
- [ ] 菜单按套餐渲染；无权限页面表现符合预期
- [ ] 租户列表/详情/生命周期/配额（`null` 表示不限）
- [ ] 能力运营：目录、订阅状态、用量（区间 ≤92 天）
- [ ] 开放平台：创建应用、scope 目录、明文 `clientSecret` 仅返回一次
- [ ] 集成中心连接器/凭据；IoT 设备、规则、命令下发（commandId 幂等）
- [ ] 通知中心 SSE：建连、30s 心跳、断线 5s→30s 退避重连
- [ ] 站内信 WS：推送、未读角标、收件箱/已发送分页
- [ ] 上传：普通、裁剪/粘贴、分片（>10MB 且 ≤500MB）、回显；经 Nginx 无 413
- [ ] 文件分享匿名页 `/share`；OAuth2 同意页未登录先登录后回跳
- [ ] 工作流发起/待办办理、数据总览（DEGRADED 属正常）、运维健康
- [ ] 浏览器控制台无非预期报错；静态资源无 404；接口无 502/504

## 7. 安全与合规

- [ ] 会话仅经 `src/utils/auth.ts` 读写，无自造存储键
- [ ] 无第二 Axios 实例；无页面级绝对地址绕过网关
- [ ] 原生 XHR/SSE 地址统一走 `utils/api-base.ts#apiUrl`，跨域时正确指向 API 域名
- [ ] 上传组件不携带 Cookie（仅 Bearer），跨域不触发 `withCredentials`
- [ ] 匿名页不泄露用户数据；同意提交要求登录主体
- [ ] 无未净化的 `eval`/`innerHTML`；XSS 工具调用点符合预期
- [ ] 响应含 `X-Content-Type-Options`、`X-Frame-Options`（首页与 `js/`、`css/` 等全部静态产物目录，见 §3.1）

## 8. 发布与回滚

- [ ] 发布窗口、值班人、变更单已确认并关联本文档
- [ ] 旧镜像 tag 与旧 `dist` 已保留，回滚命令已演练
- [ ] 发布顺序：数据库迁移 → 网关/后端 → 前端静态产物（前端先行会因网关缺路由而报错）
- [ ] 回滚触发条件：登录不可用、SSE 全量失败、上传 413/失败率超阈值、核心页面 5xx
- [ ] 回滚步骤：恢复上一镜像 tag → 重启容器 → 抽查登录、套餐页、SSE、上传

## 9. 上线后 15 分钟观察

- [ ] 登录成功率、401/403 比例正常（403 突增先查套餐/能力订阅）
- [ ] 网关 5xx/504 比例；Nginx 413 计数为 0
- [ ] SSE 连接数稳定、心跳无中断；WS 建连成功率正常
- [ ] 上传成功率与耗时正常（含大文件与分片）
- [ ] 前端错误监控无新增高频错误（重点关注 `ApiError` 403/500）

## 10. 已知外部确认项（必须由环境负责人确认）

- [ ] 真实租户下「套餐保存 → 订阅接口」返回与能力目录一致（前端载荷已单测覆盖，最终返回依赖后端数据）
- [ ] 跨域部署的网关 CORS 与 `Authorization`/`X-Tenant-Id` 放行
- [ ] 目标环境网关配置已滚动（通知流路由、`/api/v2/**`、`/integration/v1/**`）
- [ ] 目标环境外部 Ingress/SLB 的请求体上限不小于前端单文件上限（若存在多层代理，需逐层确认）

## 签署

| 角色 | 姓名 | 结论 | 时间 |
| --- | --- | --- | --- |
| 前端负责人 |  |  |  |
| 后端/网关负责人 |  |  |  |
| 运维/发布负责人 |  |  |  |
