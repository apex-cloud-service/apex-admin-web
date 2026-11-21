# 2026-11-19 前后端联调执行记录（FE-029 / BE-043）

## 范围

统一前端镜像构建与全栈运行入口为 Podman / `podman-compose`，对照前端 API 导出与后端路由源码，并记录真实联调证据与边界。

## 改动清单

- 前端镜像构建入口调整为 `Containerfile`、`.containerignore` 和 `container/`；构建脚本只调用 `podman build`。
- 移除前端独立 Compose 定义；通过后端 `podman-compose.yml` 的 `apex-admin-web` 服务接入网关。
- 新增 `scripts/integration/api-route-audit.mjs` 与 `scripts/integration/podman-smoke.sh`。
- 生成 [API 路由静态对照报告](2026-11-19-api-route-matrix.md)，并修正联调方案中的过期 Compose 描述。

## 验证证据

### 2026-11-20 受保护只读路由续测

- 新增 `--governance-reads` 定向模式，使用真实 Chromium 分别打开租户列表和流程定义页；每组验证验证码、登录、身份、角色、权限、动态菜单渲染，并断言目标 HTTP 请求和分页响应形状。使用既有 `apex-fe029-verify` Podman Compose 隔离项目，MySQL `/var/lib/mysql` 为 tmpfs；auth/system Flyway 成功 22/91 条、失败 0。
- 浏览器身份与菜单初始化均通过。`GET /api/v2/platform/tenants` 和 `GET /api/v2/workflow-definitions` 均 HTTP 403；本轮退出码 1。流程待办分页通过不能替代流程定义的独立权限验收。专属容器和网络已清理，未删除卷。
- 静态 API 路由矩阵中 9 个 `NO_STATIC_HTTP_CALL` 和 3 个 `DYNAMIC_ROUTE_REVIEW` 已人工对照前端委托调用及后端 `API_ROUTES.md` / Java Router；细节见矩阵的「人工复核补记」。此静态核对不是运行时成功证据。
- 后端源码及运维配置文档确认，office、integration、workflow、knowledge 均 fail-closed 依赖各域 HTTPS 授权服务地址、部署方确认的共享 user/tenant 命名空间、按租户专用 reader token，以及 auth 的 `AUTH_CENTER_AUTHORIZATION_READER_USER_ID`。本工作区没有可安全用于该隔离环境的这些授权材料；不得替换成管理员令牌或放宽校验。知识库 profile 未启动，因此其空间、文档、检索和问答未联调。
- 新增只读模式的 Bash/Node 语法检查通过。FE-029 / BE-043 仍未达到全量验收，需部署方提供受控 reader 前置条件后继续；不得将 403 路由记为通过。
- 随后按 `podman-compose` 重跑 `frontend-test` 时，临时容器在 `npm ci` 阶段运行超过 5 分钟仍无进展，没有进入 Vitest；仅停止本轮创建的 frontend-test 容器，确认其已自动移除。该轮不计前端回归结果；最近一次已通过的全量前端容器回归仍为 68 个文件/543 条用例、构建/type-check、模拟 Chromium 13/13。

- `node scripts/integration/api-route-audit.mjs ../apex-scaffold docs/records/2026-11-19-api-route-matrix.md` 成功；覆盖 347 个导出函数，报告有 23 条后端源码路径未登记、3 条动态路由待人工核对、9 个无静态 HTTP 调用导出。仅为静态映射。
- `npx vue-tsc --noEmit` 通过；Podman 构建 `apex-admin-web:fe029-20261119` 成功（包括容器内 `npm run build`）。
- `podman-compose -p apex-scaffold -f podman-compose.yml config --services` 通过；Podman Compose 隔离验证中的 `npm test -- --run` 为 68 个文件、533 个用例全部通过。
- 临时项目 `apex-fe029-validation` 的 Nginx 配置测试、`apex-gateway` DNS、首页 HTTP 200、模拟 `/api/v1/health` HTTP 200 与 JSON `code=0/data.status=UP` 检查通过。此模拟仅验证反代/脚本，不是后端真实联调。临时服务已清理，未删除卷。
- 仓库原生 `npm run type-check` 不存在；以 `npx vue-tsc --noEmit` 通过为准。宿主 Node 26 下 Vitest/Sass embedded 运行触发 Dart runtime 崩溃；构建与 533 用例测试均在 Node 22 Podman 镜像中通过。
- `bash scripts/governance/verify-docs.sh` 有 1 项既有断链/私有路径告警；`audit-frontend-rules.sh` 无阻断（既有 `: any` 1 处）；`git diff --check`、Shell/Node 语法检查通过。
- 真实后端网关、登录与业务接口、SSE/WebSocket 尚未验证：本机网关镜像不存在、Podman 镜像库存查询受本机存储路径错误影响；没有启动完整服务栈或触碰数据库卷。

## 影响面

影响本地前端镜像构建及前后端容器联调入口；不改变业务 API 契约。既有独立前端 Compose 文件已移除，调用方应改用后端 Compose 服务。

## 回滚方式

按文件恢复此前的镜像构建路径和 Compose 文档；不删除任何 Podman 容器、网络或数据卷。禁止通过清理既有数据卷完成回滚。

## 后续

此任务仍在执行中，待 Compose 配置与隔离环境可用后完成真实联调；随后由未参与执行的 R5 对最终版本独立复核。

## 2026-11-19 续执行补记

- 修复预检发现的附录 A 哈希偏差：历史部署行恢复为原文，当前 `Containerfile` 与 `podman-compose.yml` 入口说明新增在 `AGENTS.md` 第 0 章。
- Podman VM 中仍有已停止的旧基础设施容器；本次未启动、删除或复用这些容器，也未触碰任何卷。
- 主机 Podman API 的镜像存储路径仍报错；VM 内可见前端镜像和现存停止容器。后端真实联调仍未完成，23 条后端路由索引缺项需要在后端仓库处理。
- 隔离 Podman Compose 使用真实网关 JAR 和临时 Redis/MySQL、现有 system JAR 启动：前端首页 HTTP 200；匿名通知 API 经 Nginx/网关返回 HTTP 401；健康和登录 API 因 system 服务未就绪返回 HTTP 503。日志显示 system 仍连接 `127.0.0.1:3306`，即使 Compose 注入 `DB_HOST`、`SPRING_DATASOURCE_URL`；没有继续处理后端配置。本次只移除了项目 `apex-fe029-core-20261119` 的容器和网络，未删卷、未触碰先前停止的基础设施容器。
- 该真实后端验证暴露了隔离 system 数据库配置覆盖未生效的问题，不能作为通过证据；FE-029 / BE-043 继续执行中。
- 后续只读检查确认 system 开发配置的动态数据源变量为 `DB_MASTER_URL`/`DB_SLAVE_URL`，并要求排除 R2DBC 自动配置；认证服务还需 `TOKEN_ENCRYPTION_KEY`。补齐这些配置后 Compose 启动等待服务健康未能在本轮完成，已中断等待并清理项目 `apex-fe029-verify` 的容器和网络；没有删除卷或旧容器。该尝试不构成服务启动或登录验证通过证据。
- 2026-11-19 再次续跑：按用户授权先清理 `apex-fe029-verify`，确认仅删除该项目 6 个容器及 `apex-fe029-verify_default` 网络，卷未删除，`apex-scaffold`、`apex-dev` 的旧资源状态未变。隔离 Compose 静态核对发现 system 还必须配置 `CONFIG_ENCRYPTION_KEY` 与 `APEX_SECURITY_DATA_ENCRYPTION_KEY`；auth 的 dev profile 必须配置 `AUTH_CENTER_OAUTH2_PRIVATE_KEY`/`AUTH_CENTER_OAUTH2_PUBLIC_KEY`。生成新的临时密钥启动后 auth Flyway 验证 22 个迁移并完成启动；system 缺少 `APEX_SECURITY_DATA_ENCRYPTION_KEY`，Readiness 未就绪。实测前端首页 HTTP 200、匿名受保护通知接口 HTTP 401、system health HTTP 503、登录 HTTP 503；没有真实成功登录或业务读写。补齐 system 配置后，因策略拒绝重建容器以更新环境而停止，不采用其他方式绕过。随后按授权再次清理隔离项目容器/网络，未删除卷、未触碰其他项目。BE-043/FE-029 仍未完成。
- 2026-11-19 再续跑：隔离配置补齐 `APEX_SECURITY_DATA_ENCRYPTION_KEY`，并为 system 提供 `SPRING_MAIL_HOST` 以满足 `JavaMailSender` 自动配置；新建临时数据库后 auth 成功应用 22 个迁移至 v65，`/.well-known/jwks.json` 返回含 RS256 公钥的 HTTP 200；system `GET /api/v1/health` 返回 `code=0`、`data.status=UP`，管理健康检查返回 `status=UP`。尝试启动网关时工具拒绝使用与在运行 auth/system 不同的一组新凭据，故未启动网关、未执行登录和受保护业务请求；没有将服务级健康误记为端到端通过。已按既有授权清理该轮 `apex-fe029-verify` 容器/网络，不删除卷；仍需在一个凭据生命周期内重新创建完整隔离栈并验证 Nginx→网关→auth/system。
- 2026-11-19 本轮续跑：在单一凭据生命周期内以 `podman-compose` 重建隔离 MySQL/Redis、system、auth、gateway 和前端；auth 迁移至 v65，JWKS 同步完成。真实前端 Nginx 入口首页 HTTP 200，`GET /api/v1/health` 经网关返回 HTTP 200，匿名 `GET /api/v1/notifications/unread-count` 返回 HTTP 401，确认代理与鉴权路由生效。首次登录试用 `password123` 返回 HTTP 401，日志确认为密码不匹配；迁移脚本 V64/V65 声明本地 admin 密码为 `admin123`。成功登录后 token 测试因工具要求用户明确授权 token 的临时处理方式而未继续；没有存储或复用 token，没有成功认证业务读写证据。已清理本轮专属容器/网络及临时 Compose 文件，不删卷、不影响其他项目。FE-029/BE-043 未完成。
- 2026-11-19 授权 token 后续跑：使用 `admin123` 发起登录，前端首页及经网关 system health 均 HTTP 200，但登录 HTTP 503，网关 CircuitBreaker 记录 `TimeoutException`；JWKS 公钥已同步。复核 system `application-dev.yml` 确认 dev profile 默认 `spring.flyway.enabled=false`，隔离空数据库没有 `sys_tenant` 等业务表，system 后台任务报告缺表。为创建仅用于本次临时联调的空库 schema，需单独获得启用 Flyway / 执行迁移的授权；当前未启动迁移，也未生成或使用 bearer token，故受保护业务请求未执行。隔离资源已清理；FE-029/BE-043 未完成。
- 2026-11-19 临时库 Flyway 授权执行：仅创建 `apex-fe029-verify` 隔离 Podman Compose 项目，以 MySQL `/var/lib/mysql` tmpfs 作为空库，Flyway `spring.flyway.enabled=true` 且 JDBC URL/user/password 显式指向该容器的 `apex_system` 数据库。system 开发配置还需要同项目临时 Redis，并显式指定 `SPRING_DATA_REDIS_HOST=redis` 才能完成启动。验证 `flyway_schema_history` 共 91 条成功记录、最高版本 V91、失败数 0，`apex_system` 共 102 张表。数据库仅存在于 tmpfs；随后以不带 `-v` 的 `podman-compose down` 移除了该项目的 3 个容器及网络，未删除或访问任何现有持久化数据库/卷，临时 Compose 文件已移除。本次只证实 system schema 可由隔离 Flyway 创建，不代表 auth 登录或受保护 API 联调通过；FE-029/BE-043 仍未完成。
- 2026-11-19 续跑补记：从同项目 tmpfs 空库再次确认 system Flyway 91 条、auth Flyway 22 条迁移成功。首轮仅临时账号 JOIN 因两个 schema collation 不同报错，未执行登录或受保护请求；后续隔离进程在完整输出返回前终止，当前确认项目容器及网络均已清理，且没有任何新增的 token/业务请求成功证据。检查源码和 Compose 配置确认 system 与 gateway 的 `JWKS_REMOTE_URL` 缺省为空，统一认证的远程公钥拉取不会在默认 Compose 拓扑启用；已在后端 `podman-compose.yml` 为这两个服务增加同网络 auth 默认地址（仍允许 `.env` 覆盖），并同步 `.env.example` 与运维配置表。修改后 Compose 解析/服务启动尚待验证；不据此宣称登录或业务链路通过。所有测试资源限定为 `apex-fe029-verify`，MySQL 使用 tmpfs，未删卷或触碰其他项目资源。
- 2026-11-19 续跑验证：两个 schema 的 `username` collation 不同，临时 JOIN 使用显式 UTF-8 collation 后仅更新并核验唯一 `admin` 测试账户一行。auth/system Flyway 分别为 22/91 条成功记录、失败 0；system health UP。前端首页 200、匿名通知 API 401。经前端代理登录 5 次返回 502/503，gateway 日志为 `TimeoutException`；auth 直连登录 200。该 token 只在当前 shell 变量中保留并立即使用一次，经前端 Nginx→gateway→system 读取通知未读数 HTTP 200，JSON `code=0`、`data` 为数字。至此验证了一个真实受保护只读链路，但登录经 gateway 的冷启动/超时问题仍未解决，尚未覆盖全部 API、写入、SSE/WebSocket 或外部依赖功能。隔离资源经不带 `-v` 的 `podman-compose down` 清理，容器与专属网络检查为空，tmpfs 不保留数据；未触碰其他项目资源或持久化数据库。正式 Compose 配置解析成功，并检查 gateway/system 两服务均渲染到同网络 auth JWKS 地址。FE-029/BE-043 保持执行中。

## 登录修复复测与路由核对

- 网关为 `authService` 配置 10 秒 TimeLimiter。固定 JDK 21.0.13 和 mvnd 2.0.0-rc-3 下，`spotless:check` 及 `GatewayApplicationTest` 4/4 通过。使用新网关 JAR 在 `apex-fe029-verify` 实测，网关 readiness 和前端代理 `POST /auth/v1/login` 均返回 HTTP 200。仅采集登录状态码，响应正文直接丢弃。本次未发送新的受保护请求，通知未读数的 HTTP 200 来自上一轮单次授权验证。
- 临时 MySQL 使用 tmpfs，auth/system Flyway 分别迁移 22/91 条，失败数均为 0。`podman-compose down` 退出 0，按项目名过滤检查容器和网络均无残留。后端 Compose 保留 gateway/system 的 JWKS 默认地址，`.env.example` 与运维配置表的早期改动已撤回。
- 后端补齐连接器、凭据、物联网、脱敏及消息票据共 23 条路由索引。重新生成的 [API 路由矩阵](./2026-11-19-api-route-matrix.md) 覆盖 347 个导出函数，335 个自动匹配，3 个动态匹配需人工核对，9 个未提取到直接 HTTP 调用。
- 动态路径已核对。`addIpRule` 按类型 POST `whitelist` 或 `blacklist`，`toggleIpRule` PUT `{ruleId}/enable` 或 `{ruleId}/disable`，`toggleWorkflowDefinition` POST `{definitionId}/enable` 或 `{definitionId}/disable`，后端均有对应注册。其余 9 个导出中，`listIpRules` 用 `listPath` 生成两条 GET 路径，`exchangeToken` 和 `submitConsent` 通过别名调用两个 OAuth2 POST 端点，`buildAuthUrl` 生成 `/oauth2/authorize` 导航地址。`batchForceLogout`、`batchTerminateSSOSessions` 与 `getMyInitiatedApprovals` 转调现有封装，`consumeAuthorization` 和 `verifyState` 在本地操作。
- 完整拓扑、真实浏览器登录及初始化、业务写入、SSE、WebSocket 和外部依赖功能待验证。FE-029/BE-043 保持执行中。
- Playwright 浏览器回归在 `mcr.microsoft.com/playwright:v1.63.0-noble` 临时 Podman 容器中未能越过 Playwright `webServer` 的 120 秒就绪探测，未运行任何 E2E 用例。单独以 `--host 0.0.0.0` 启动 Vite 可在容器内约 2 秒就绪，但 Playwright 子进程仍未能探测；该项记为环境阻塞而非测试通过。浏览器临时项目网络已通过 `podman-compose down` 清理，未删除卷。
- 2026-11-19 浏览器联调续记：容器继承 `HTTP_PROXY`/`HTTPS_PROXY`，Playwright 未把 localhost 回环地址视为代理排除项，导致 `webServer` 探测被送往代理。更新前端 `playwright.config.ts`，统一将 Vite/浏览器基址设为 `127.0.0.1`，并将 `127.0.0.1,localhost` 合并进大小写 `NO_PROXY`。同时首轮 E2E 揭示审批待办测试夹具与执行 API 不一致：`getPendingApprovals` 消费后端裸数组并在前端分页，测试却返回分页对象；修复 `e2e/office-approval.spec.ts` 夹具为裸数组。使用 `podman-compose`、Playwright 1.63.0、单 worker 全量重跑 12/12 通过（1.4 分钟）。
- 本轮容器用 `run --rm` 自动删除；只用不带 `-v` 的 `podman-compose down` 清除专属网络。验证 `apex-fe029-verify` 容器与网络均无残留，未删除卷、未触碰其它项目资源。
- 同一临时 `podman-compose` 环境下 `npm run build` 通过，包含 `vue-tsc --noEmit` 与 Vite 生产构建。真实受保护业务链路仍以此前一次授权请求的通知未读数结果为准。
- 2026-11-19 后续续跑：新建 `apex-fe029-verify` 隔离项目，MySQL `/var/lib/mysql` 经容器挂载表与 `/proc/mounts` 双重确认是 tmpfs；auth/system Flyway 分别成功迁移 22/91 条、失败 0。修正临时启动配置的密钥类型映射后，system health 经前端 Nginx→gateway 返回 HTTP 200、`code=0`、`status=UP`。前端代理 `POST /auth/v1/login` 返回 HTTP 403 且空响应体；未获得 token，未请求身份、角色、权限、菜单及其它受保护 API。退出钩子执行 `podman-compose down`，容器与专属网络均无残留；未删卷或触碰其它项目资源。登录拒绝原因待查，FE-029/BE-043 仍未完成。
- 同日再续跑：核实 auth dev profile 同时使用 JDBC 与 R2DBC，临时配置已将两者对齐至同一 `apex_auth`。auth Flyway 22 条和 system Flyway 91 条成功，auth/system 分别约 120/175 秒才完成 Spring 启动；当前自动健康等待上限为 150 秒，故本轮在 system 启动完成前因 health 等待超时退出，未发登录请求。临时项目容器和网络已清理；此前已到达 system health 200 的运行中，登录仍为 HTTP 403 空响应。需延长就绪等待并定位认证服务对登录的拒绝点，再继续身份初始化。未写入持久化数据库、未删除卷、未触碰其它项目资源。
- 延长就绪窗口至 300 秒并对齐 auth JDBC/R2DBC 后再跑：auth/system Flyway 22/91 条成功，服务最终启动；system health 经前端代理 HTTP 200。登录请求进入 auth `/auth/v1/login`，前端代理返回 HTTP 503、业务码 3007（网关暂不可用降级响应），未取得 token，未调用用户信息/角色/权限/菜单 API。退出清理成功，专属容器和网络无残留，MySQL 仅使用 tmpfs。FE-029/BE-043 仍未完成；需要查明 gateway 对慢启动 auth 登录的熔断/超时配置或请求执行阻塞并继续联调。

## 新网关 JAR 隔离复测

- 使用仓库固定 JDK `21.0.13.0+9-tem` 和 mvnd `2.0.0-rc-3` 执行网关定向测试并重新打包。`GatewayApplicationTest` 4/4 通过，确认 `authService` 的 TimeLimiter 配置为 10 秒。
- `apex-fe029-verify` 以 `podman-compose` 启动临时 MySQL、Redis、auth、system、gateway 和前端。首轮 system 主从数据源密码未注入，补齐 `DB_MASTER_PASSWORD` 与 `DB_SLAVE_PASSWORD` 后从新空库复跑。先确认 `/var/lib/mysql` 为 tmpfs，再启动迁移；auth/system Flyway 成功 22/91 条，失败均为 0。
- 新 JAR 实测：system health 经前端代理返回 `code=0`、`data.status=UP`；网关 JWKS 返回非空公钥列表；前端代理 `POST /auth/v1/login` 返回 HTTP 200。仅记录登录状态码，未读取响应正文或发送新的受保护请求。本轮结果不证明此前 403/503 已在所有拓扑或冷启动条件下消失。
- 退出后确认隔离项目容器及专属网络均无残留，未删除卷或触碰现有持久化数据库。FE-029/BE-043 保持执行中：真实浏览器登录后的身份/菜单初始化、核心写入、SSE、WebSocket 及完整拓扑仍待验证。

### 真实 Chromium 认证与初始化

- 一次性 Playwright 容器经前端 Nginx 提交真实登录表单，不读取登录响应正文或导出会话状态。测试分别检查验证码、登录、身份、角色、权限、菜单端点，并比对页面用户名与 API 身份、至少一个可见侧栏项目与后端菜单；静态工作台不能单独满足断言。
- 首轮浏览器登录 HTTP 200 后，身份、角色和权限均 HTTP 401，菜单未发起。确认网关和 system 均同步 JWKS 后仍可重现。system 需要令牌中的 `accountId` 匹配有效系统账号且租户一致；临时库观察到 auth 种子管理员没有绑定账号。
- 将隔离测试账号和登录配置改为 `apex-default` 后，验证码 HTTP 200、登录 HTTP 401，四项初始化均未发起。脱敏日志定位到认证服务的租户状态回源失败。独立查询记录 V76 成功，`sys_tenant` 的活跃平台租户为 `default`，不能以早期种子文件中的 `apex-default` 配置登录。该轮专属容器及网络已清理，不删卷。
- 对齐两个登录租户配置为 `default`，确认两端均有唯一的同租户测试管理员，仅绑定 tmpfs 中未绑定的 `auth_user.account_id` 并回查一致性。保留远程租户状态检查、验签和 system 租户校验。真实浏览器验证码、登录、身份、角色、权限均返回 HTTP 200；四个非登录响应的有效载荷断言通过。菜单 GET 返回 HTTP 503，未通过动态菜单渲染验收。auth/system Flyway 分别 22/91 条成功、0 条失败；浏览器会话、容器与专属网络已清理，不删卷。
- 临时增加 system 网关 TimeLimiter 后，菜单仍在约 7 毫秒内返回 503；撤回该覆盖。诊断观察到网关降级包含冷启动连接失败及大量熔断拒绝；菜单失败时前端守卫还会重定向到已解析的当前目标并重复加载菜单。后者的修复与回归独立验收。
- 在 `apex-fe029-verify` 中先等待 system health UP，再启动网关和前端；网关和 system 均确认同步 JWKS 后登录。真实 Chromium 验证码、登录、身份、角色、权限及菜单均 HTTP 200，菜单 `code=0`、耗时 224 毫秒；页面用户名与身份 API 一致，至少一个后端动态菜单可见。auth/system 迁移 22/91 条成功、失败 0；专属容器与网络已清理，未删卷或改动现有数据库。未导出令牌或保存浏览器状态。此结果仅覆盖本次认证初始化拓扑，核心写入、SSE、WebSocket、其它服务和独立复核尚未完成。

### 菜单降级与回归

- 菜单首次返回 503 时，静态工作台不再重定向到自身，本次导航只请求一次菜单。下一次导航可以重新加载菜单，侧栏随注册更新；动态页面首次直达可保留 query/hash。
- 首轮开发服务器无重试模拟回归为 10/13：登录夹具在验证码就绪前填写，另两条菜单用例在开发服务器模式超时。夹具改为等待验证码渲染，使用隔离 `podman-compose` 构建并预览生产产物后，单 worker、零重试 Chromium 模拟回归 13/13 通过（17.3 秒），含菜单 503、同会话恢复、菜单点击及带 query/hash 的刷新直达。
- 本轮生产构建通过（含类型检查）；该浏览器回归未启动后端或数据库，不计为真实刷新、业务读写或 SSE/WS 验收。临时容器与专属网络均已清理，未删除卷。FE-029 / BE-043 仍在执行中。

### 扩展真实业务验证

- 首轮验证码、登录 HTTP 200，但身份、角色和权限均 HTTP 503，网关记录 `TimeoutException`，未执行后续业务测试。复测在隔离配置中为 system/office 使用 10 秒 TimeLimiter，认证初始化及动态菜单通过；该覆盖没有改写正式网关超时配置。
- office 在 tmpfs 空库成功执行 10 条迁移，补齐公共配置加密属性后启动。`POST /api/v1/messages/ws-ticket` HTTP 200；用单实例 `ws://` 直连路由时，浏览器 `GET /api/v1/messages/ws` 升级 HTTP 101，未观察到完整 ping/pong。
- `GET /api/v2/overview` HTTP 200，JSON `code=0`，三个未启动上游处于降级；`GET /api/v1/notifications/stream` HTTP 200 且 Content-Type 为 `text/event-stream`，未验证业务事件投递。
- 浏览器拦截首次 `GET /admin-api/v1/dict/types` 注入一次 401，随后真实 `POST /auth/v1/refresh` 和列表重放均 HTTP 200，重放得到有效数组。页面真实 `POST /admin-api/v1/dict/types` 仍为 HTTP 403，未创建记录，也未执行更新或删除。
- 每轮仅操作 `apex-fe029-verify`；只在 tmpfs 库执行迁移，auth/system 22/91 条且无失败。临时浏览器、容器和网络已清理，未删卷或修改现有数据库。未导出令牌或浏览器状态。完整业务验证和独立复核仍待完成。

### CORS 与字典 ID 精度复测

- 精确对齐网关和 system 的前端 Origin 后，字典创建 HTTP 200、`code=0`，页面出现新记录。编辑 HTTP 500、业务码 `4711`；列表中的 ID 与编辑请求路径 ID 不一致。该轮同时确认真实 WebSocket 票据 HTTP 200、升级 101、双向 ping/pong；不等同于业务消息投递。
- 两类字典响应 ID 改为十进制字符串，前端原样透传并拒绝不安全的旧数字 ID。范围不涉及其他 DTO、数据库迁移或请求路径格式。增加前后端精度回归，以及真实浏览器类型、数据项的写操作和路径一致性断言。
- 新镜像首轮复测中，字典类型与数据项创建、编辑均返回 HTTP 200、`code=0`，且编辑路径和列表 ID 一致。数据项停用虽成功，但管理列表过滤了停用项，导致无法重新启用。经独立 R3 确认，后端只移除管理列表的启用状态过滤；浏览器回归覆盖停用、重新启用与删除。
- Podman Compose 内前端全套 Vitest、生产构建及单 worker、零重试模拟 Chromium E2E（13/13）通过；后端字典定向测试 10/10 通过。另一次真实浏览器复测在网关健康探测阶段超时，未执行浏览器用例，对应隔离资源均已清理。
- 2026-11-20：后端 `apex-system` Spotless 检查通过。改为从前端容器内探测网关 JWKS 和同域 system 健康接口后，两项均通过；auth/system 临时库迁移为 22/91 条、失败 0，验证码 HTTP 200。真实表单登录 HTTP 503，认证服务记录租户状态回源超时，网关记录 `TimeoutException`。该轮未执行登录后断言，专属容器和网络已清理，未删除卷。

### 2026-11-20 真实 Chromium 复测

- 隔离环境将 auth 租户状态回源超时设为 12 秒、网关 auth TimeLimiter 设为 24 秒，未修改正式超时配置或绕过租户校验。真实验证码、登录、身份、角色、权限及动态菜单通过；注入一次 401 后，真实令牌刷新及列表重放均为 HTTP 200。
- 字典类型和数据项的创建、更新、停用、重新启用、删除均为 HTTP 200、`code=0`；浏览器写请求逐位保留管理列表返回的十进制字符串 ID。通知收件箱与 SSE 握手通过，未验证事件投递。总览返回 HTTP 200，但三个未部署上游均降级。
- 站内信收件箱、审批待办、日历区间查询均为 HTTP 403。三者都依赖 office 服务端权限查询；隔离环境缺 HTTPS 授权地址、同租户专用 reader 凭据及身份命名空间配置。后端 Compose 更新了非秘密配置映射，真实授权成功及业务读取尚待复验。
- WebSocket 票据 HTTP 200、升级 101，本轮 25 秒窗口内未观察到心跳，不计为通过。冒烟脚本将等待窗口增至 45 秒并补充读取业务码的诊断，仅采集 HTTP 状态和数值业务码，不采集正文、头或票据。
- 专属容器、网络和临时浏览器会话已清理，未删卷或写入现有持久化数据库。工作流、文件、集成、总览非降级及业务事件投递未完成验收。

### 2026-11-20 扩展业务域联调

- 新增 `--business --domains` 断言：工作流待办分页、连接器分页、图片 multipart 上传和总览三源 `UP`。首轮依然通过真实认证初始化、刷新重放、字典写入、通知收件箱和 SSE 握手；WS 票据 200、升级 101，观察到双向心跳，未验证业务投递。
- 工作流、文件、集成均因未绑定 `security.config.encryption.key` 而未启动，对应前端请求均 HTTP 503、`code=3007`，总览 HTTP 200 且三源降级；办公三项读取仍 HTTP 403。后端修正共享环境映射后，使用占位值核验 Compose 为 office、workflow、file、integration 传入正确的属性名。
- 修复后从新 tmpfs 空库复跑，system 本地 8082 在等待期间拒绝连接；未启动新增服务或执行浏览器，不能视为业务复测通过。两轮专属容器及网络均确认已清理，未删除卷或写入既有持久化数据库。

### 隔离栈启动与扩展浏览器复测

- 上轮工具中断留有已停止容器与网络；工作流、文件、集成日志均显示执行了迁移，但未留有 HTTP 就绪或浏览器结果。按专属项目范围清理残留后，将隔离启动与探测固化为 `scripts/integration/podman-verify.sh` 和 `scripts/integration/podman-verify.yml`。JVM 从容器本地副本加载 JAR；不发布宿主端口，验证空库与 tmpfs 后才执行迁移和测试夹具。
- 首轮固化脚本实测 auth/system 迁移 22/91 条、失败 0；office、workflow、file 和 integration 端口全部就绪。Chromium 复验通过登录、身份/角色/权限/菜单初始化、刷新重放、字典类型和数据项 CRUD 及启停、通知收件箱、SSE 握手和 WS 双向心跳。未验证 SSE/WS 业务事件投递。
- 同轮工作流待办和图片上传均 HTTP 503、`code=3007`，网关记录两次 `TimeoutException`；总览 HTTP 200 但三源降级。连接器及办公三项读取 HTTP 403。集成的权限快照和办公一样，需要可信 HTTPS 授权端点、已确认的共享身份命名空间和同租户专用 reader；不能将此结果计为功能通过。资源已清理，不删除卷。
- 第二轮仅在隔离配置内为工作流和文件设置 12 秒网关 TimeLimiter，使用临时 RS256 公钥兜底，将总览单源窗口设为 8 秒。全部后端端口再次就绪，auth/system 迁移 22/91 条、失败 0。浏览器验证码和登录 HTTP 200，但未发出身份、角色、权限或菜单请求，未进入扩展业务用例；不能认定超时调整已修复问题。临时容器和网络已清理，未删卷。后续冒烟记录是否仍停留在登录页、是否显示错误提示，不读取登录正文，不输出提示原文。
- 第三轮登录、身份、角色、权限、菜单及通知收件箱和 SSE 握手通过。工作流待办 HTTP 401，办公三项 HTTP 403；WS 票据 200、升级 101，但本轮未观察到心跳。总览、刷新重放、连接器和上传未获得新通过证据，字典写入未重跑。system 聚合日志出现两次 `Unauthorized`，单凭此摘要不能定位拒绝原因。本轮退出码 1，专属容器、网络已清理，未删除卷。此前已通过的断言保留对应轮次证据，扩展域与实际事件投递仍未完成验收。

### 分组真实浏览器复测

- 工作台、字典、连接器、上传分别登录各自临时 Chromium 上下文；四组均通过登录、身份、角色、权限及菜单初始化。字典刷新与重放均 HTTP 200，类型与数据项的 CRUD、双向启停及 ID 一致性复验通过。通知收件箱与 SSE 握手通过。
- 工作流待办、连接器列表和 multipart 上传分别返回 HTTP 401；办公收件箱、审批待办、日历区间仍为 HTTP 403。总览未观察到响应；WebSocket 票据 HTTP 200、升级 101，本轮 45 秒内未看到心跳。浏览器退出码 1，专属资源已清理，未删卷。
- 源码核对：密码登录以轮换密钥签发访问令牌；测试用静态公钥对应另一套 OAuth2 元数据密钥。工作流、文件和集成在单公钥模式下取静态键，不能命中 JWKS 中按 `kid` 索引的轮换键。已从隔离配置移除三个静态公钥覆盖，增加对应服务的 JWKS 同步等待，未改正式编排或放宽校验。
- JWKS 修正后实测：工作流待办 HTTP 200、`code=0` 且分页断言通过；总览 HTTP 200，文件、工作流、集成三源均 `UP`。再次通过四组认证初始化、字典 CRUD 和双向启停、真实刷新重放、通知收件箱及 SSE 握手、WS 票据 200、升级 101 和双向心跳。连接器与办公三项仍 HTTP 403；上传从 401 变为 HTTP 400、`code=400`，发现前端 `sex=0/1` 与文件服务 `sex=1/2` 不一致，拟修方案待 R3 复核。业务事件投递及其他未执行场景不计入通过。

### 普通上传修复与前端全量回归

- 经 R3 复核，保留调用方 `0=AM`、`1=AF`，在 API 表单、两个组件的 Element Plus 直传、增强组件裁剪和粘贴共用的 XHR 表单统一映射为 `1=AM`、`2=AF`。分片与后端校验不变；增加四条表单路径的双值回归。
- 专属 Podman Compose 的 `frontend-test` 服务：Vitest 68 个文件、541 条用例通过；`npm run build`（含类型检查）通过；模拟 Chromium E2E 13/13，单 worker、零重试。宿主 Node 26 的 Sass embedded 崩溃不影响上述 Linux 验证。Podman 构建新镜像 `localhost/apex-admin-web:fe029-upload-20261120` 成功。
- 使用新前端镜像真实复跑：四组身份及菜单初始化通过，通知收件箱、字典写入与启停、刷新重放、SSE 握手和 WebSocket 心跳通过。上传越过 HTTP 400 参数检查，在插入 `file_record` 时因 `create_time` 为空返回 500；本轮未渲染上传结果。工作流待办、连接器、办公审批返回 503，办公收件箱和日历返回 403，总览三源降级；网关及聚合日志分别记录三次超时。auth/system 迁移 22/91 条成功、失败 0；本轮退出 1，临时容器及网络已清理，未删卷。

### 普通上传响应映射

- 后端补齐 `file_record` 审计字段自动填充后，真实 Chromium 普通上传返回 HTTP 200、`code=0`。旧前端和冒烟断言仍读取 `objectName`，与后端线上 `fileName` 不一致，因此该轮未验收页面对象键。auth/system 临时库迁移 22/91 条成功、失败 0，隔离资源已清理且未删卷。
- 同轮通过四组真实认证初始化、字典类型及数据项 CRUD 与双向启停、刷新重放、工作流待办、通知收件箱、SSE 握手及 WebSocket 双向心跳。办公收件箱、审批、日历和连接器仍 HTTP 403；总览 HTTP 200，workflow/integration `UP`、file 降级，聚合日志记录一次 `TimeoutException`。业务事件投递未验证。
- 经独立 R3 复核，前端四条普通上传路径统一将线上对象键 `fileName` 转为内部 `objectName`，保留其他字段及 `expiresIn=0`；分片契约不变。增加 API、两组件直传、粘贴 XHR 回归；真实 Chromium 断言同时检查 HTTP 响应和页面 JSON 中的对象键一致。

### 上传结果与三源总览复验

- 响应映射变更后，在 Podman Compose `frontend-test` 中通过 68 个测试文件、543 条 Vitest 用例、生产构建及类型检查；模拟 Chromium E2E 13/13，单 worker、零重试。新镜像为 `localhost/apex-admin-web:fe029-upload-result-20261120`。
- 首轮真实复验在登录前因 Chromium 退出，未取得新业务证据。冒烟入口补充 `--launch-only` 空白页预检、60 秒 Chromium 启动时限和失败阶段输出。中断轮次只留下两只已退出的容器及专属网络，确认原进程退出后按授权清理，不删除卷。
- 新一轮空白页检查通过；auth/system 临时 MySQL 分别迁移成功 22/91 条，失败 0。四组 Chromium 均通过验证码、登录、身份、角色、权限及菜单。真实 multipart 上传 HTTP 200、`code=0`，页面 `objectName` 与后端 `fileName` 一致。工作流待办分页、总览三源 `UP`、字典 CRUD／双向启停与 ID 精度、真实刷新重放、通知收件箱、SSE 握手、WebSocket 票据／升级与双向心跳均通过。总览此前曾超时降级，本轮成功不代表稳定性已验收。
- 办公收件箱、审批待办、日历区间及连接器列表仍为 HTTP 403，整轮未通过。正向用例需在隔离环境配置可信 HTTPS 授权端点、同租户专用 reader，并确认共享用户命名空间；不替换为浏览器管理员凭据，也不放宽鉴权。SSE/WS 业务事件投递及其他未执行场景仍待测试；FE-029 / BE-043 不关闭。

### 通知中心真实读写补测

- 隔离 MySQL 通过空库及 tmpfs 检查、完成迁移后写入两条通知夹具，新增真实浏览器单条已读、全部已读、未读角标断言，并支持仅运行通知组。首次扩展轮次的五组认证均通过，上传、字典、刷新、待办、三源总览和 SSE/WS 建连检查均复验通过；办公三项和连接器仍为 HTTP 403。通知组未观察到已读写请求，暂不验收。
- 首轮定向复测在登录页加载或验证码阶段超时，未触发业务用例；已分开记录 DOM 就绪与验证码等待阶段。两轮专属容器和网络已清理，未删除卷。RocketMQ 镜像已通过 Podman 获取，但未启动或注入业务事件；收到真实事件前仍不计为 SSE 投递通过。
- 旧镜像复测确认未读接口 HTTP 200、夹具计数为 2，但打开通知弹层后未加载列表，也未发出已读请求。通知中心改为点击触发的非受控弹层，在 Element Plus `after-enter` 后加载列表，并通过 `before-leave` 同步关闭状态；组件定向测试 11/11 通过，生产镜像构建及类型检查通过。
- 使用 `localhost/apex-admin-web:fe029-notification` 在专属 Podman Compose 栈复测：真实认证初始化通过；单条已读及全部已读均 HTTP 200、业务码 0，分别返回 `true` 和 `1`，角标从 2 变为 1 后消失。运行退出 0；auth/system 临时库迁移 22/91 条成功、失败 0；专属容器和网络已清理，未删除卷。此次仅验收通知读写，不计为 SSE 业务事件投递或其他业务域复测。
- 通知修复后的 Podman Compose `frontend-test` 全量回归通过：68 个测试文件、543 条 Vitest 用例、类型检查和生产构建、13 条模拟 Chromium E2E（单 worker、零重试）。本次模拟回归未启动后端，不计入真实业务验收；专属容器和网络已清理，未删除卷。

### RocketMQ 到 Chromium SSE 投递补测

- 新增隔离 `--notification-push` 定向入口，不发布宿主端口。首轮 Broker 确认发布、Chromium 登录初始化及 SSE HTTP 200，但未收到随机标记。第二轮 Broker 未查到通知广播消费者，浏览器阶段未运行。
- 后端调整 Spring Bean 装配顺序，保留消息队列和消费者开关。新 JAR 已在 Broker 注册为广播消费者，真实 Chromium 登录初始化及 SSE HTTP 200；该轮发布命令未取得回执，也未观察到目标帧。后端 11 条定向测试及消息模块 Spotless 检查通过。上述临时栈已清理，不删除卷。
- 2026-11-20：修正临时发布执行方式后，隔离 `apex-fe029-verify` 实测完成端到端投递：RocketMQ 主题就绪、通知广播消费者注册、随机标记发布收到 Broker 成功回执；真实 Chromium 验证登录/身份/角色/权限/菜单后建立 SSE HTTP 200，并收到带 `event: notification` 的同一随机标记。专项脚本退出码 0；auth/system 临时 tmpfs 库迁移 22/91 条成功、失败 0；退出后专属容器及网络已清理，未删卷、未导出令牌或浏览器状态。该结果只验收本次测试发布到当前 system 实例 SSE 的单实例投递，不代表业务生产者、落库、跨实例扇出或 WebSocket 投递验收。
- 全量联调仍未完成：办公收件箱/审批/日历及连接器管理请求此前持续被权限校验拒绝；代码与运维契约要求可信 HTTPS 授权中心、确认 user/tenant 共享命名空间以及同租户专用 reader JWT。当前工作区未发现可供隔离测试使用的这组授权配置，不以浏览器管理员凭据替代 reader、不写入令牌或放宽鉴权。其余 API 导出项和完整业务写入/读回仍须逐项取得运行证据；FE-029/BE-043 保持执行中。

### 2026-11-20 前端全量回归复跑

- 首次手动调用 frontend-test 未设置 `FRONTEND_ROOT`，容器挂载路径为空，`npm ci` 因找不到 lockfile 立即终止；未进入测试。按 README 显式传入 `FRONTEND_ROOT` 与 `BACKEND_ROOT` 后，隔离 Podman Compose 临时容器从仓库锁文件安装依赖（640 packages），全量 Vitest 68 个文件/543 条用例通过，`npm run build`（含 `vue-tsc --noEmit`）通过，模拟 Chromium E2E 13/13 通过。
- 回归只在 frontend-test 临时容器中执行，无后端和数据库启动。测试容器因 `run --rm` 自动移除；随后只清理本轮 `apex-fe029-frontend-regression` 项目网络，未删除卷。无 Docker/Docker Compose 操作。
- 本次回归覆盖修订后的联调脚本快照，既有业务授权阻断未变化；它是模拟 E2E，不计真实后端业务验收。构建输出有动态与静态导入分包提示，无构建错误。

### 2026-11-20 系统管理只读补测

- 为扩大不依赖远端 reader 的真实浏览器覆盖，新增 `--system-reads` 定向入口，在专属 `apex-fe029-verify` Podman Compose 空库中检查系统用户分页、部门树和参数列表；不执行写入。MySQL `/var/lib/mysql` 为 tmpfs，auth/system 迁移分别 22/91 条成功、失败 0；两轮结束均已清理专属容器及网络，未删除卷。
- 两轮真实 Chromium 均通过验证码、登录、身份、角色、权限和菜单初始化。部门树 `GET /admin-api/v1/depts` 与参数列表 `GET /admin-api/v1/configs` HTTP 200、业务码 0、页面表格渲染通过。用户列表首次请求查询参数错误后复核源码，发现后端契约为 `page/size`，而非通用 `pageNum/pageSize`；测试入口已修正参数并重跑，仍收到 HTTP 409。该 handler 要求 `staff:manage`；隔离管理员权限响应不含此权限，当前拒绝不作业务读取通过，也不修改角色/权限种子。
- 静态约束检查：后端 `AdminUserManagementHandler` 明确要求 `staff:manage` 且 `GET /admin-api/v1/users` 接受 `page/size`。之前 `/api/v2/platform/tenants`、`/api/v2/workflow-definitions` 返回 403；办公/集成授权仍需部署方提供可信 HTTPS reader 配置。知识库 profile 未启动，文档摄取、检索和问答未验收；功能全量验收仍被外部授权前置阻断，FE-029/BE-043 保持执行中。
- 新增系统只读浏览器入口及 README 说明。`node --check`（两份浏览器脚本）、`bash -n scripts/integration/podman-verify.sh`、`git diff --check` 通过；`audit-frontend-rules.sh --strict` 无阻断。`verify-docs.sh` 仍只有既存计划文档私有路径警告；`npm run type-check` 不存在（本仓实际 `build` 脚本包含 `vue-tsc --noEmit`）。未重跑全量前端回归，本轮改动均为测试脚本和文档；最近有效全量回归仍为 Vitest 68 文件/543 用例、构建/type-check、模拟 E2E 13/13 通过。
- 影响面限于隔离联调脚本和文档；无生产配置、后端源码、持久化数据库或正式鉴权逻辑改动。可通过后续独立提交回滚本轮对应脚本和记录增补；本轮未创建提交。

### 2026-11-20 用户列表冲突诊断更正

- 更正上节的初步解释：用户管理处理器服务层校验的是 system `sys_user` 与 `SUPER_ADMIN` 关联，不是 `staff:manage` 操作权限；仅凭权限列表不能解释 HTTP 409。
- 为验证统一身份映射，仅在确认 tmpfs 的临时库内将测试管理员 `sys_user.open_id` 对齐认证中心 `auth_user.open_id`，并增加数据库断言；SQL 使用 `BINARY` 精确比较以规避 MySQL 9 跨库 collation 差异。隔离 Chromium 复测仍为 HTTP 409 / 业务码 -1。脚本仅打印固定分类，得到 `conflict-unclassified`，未输出原始业务消息、token 或浏览器状态。该结果既不证明权限缺失，也不证明后端业务逻辑缺陷。
- 用户列表查询契约确认使用 `page/size`，只读请求已按该参数执行；需后端维护者使用对应 traceId 检查临时 system 服务日志及 Super Admin 数据绑定，确认实际异常来源后再定向修正。部门树与系统参数读取通过。不得把未经诊断的 409 当作联调成功。

### 2026-11-20 全量业务浏览器分组复测

- 使用 `podman-compose` 运行 `scripts/integration/podman-verify.sh`，Podman Engine 5.8.9 / podman-compose 1.6.0。临时 MySQL `/var/lib/mysql` 确认为 tmpfs；auth/system Flyway 分别 22/91 条成功、0 条失败；office、workflow、file、integration、gateway 全部达到端口就绪。测试结束后专属容器及网络清理，不删除卷。
- 真实 Chromium 五个独立会话均通过验证码、登录、身份、角色、权限、菜单和动态菜单渲染。dashboard 中工作流待办、通知收件箱、SSE 握手、WebSocket 票据/101 升级及 ping/pong 心跳通过；总览 HTTP 200 且 file/workflow/integration 三源均 `UP`。真实刷新注入一次 401 后 auth refresh 与列表重放均 HTTP 200。
- 字典类型/数据项真实创建、更新、停用、重新启用、删除全部 HTTP 200 且业务码 0；本轮 multipart 文件上传 HTTP 200 且业务码 0、页面 `objectName` 与服务端 `fileName` 一致；通知单条已读及全部已读 HTTP 200 且业务码 0。上一轮另已取得 RocketMQ 成功发布并由 Chromium 收到匹配随机 `notification` SSE 帧的证据。
- 办公收件箱、审批待办、日历区间和连接器列表均 HTTP 403，因此本轮整体返回非零，不能计为全量通过。隔离 Compose 未配置可信 HTTPS 授权基址、同租户 reader token 和共享 user/tenant 命名空间；源码约束缺项时 fail-closed。不得将浏览器管理员令牌冒充专用 reader 或关闭校验。当前前端及后端 `.env` 示例/工作区配置未提供此类有效授权材料；需要部署方准备专用测试 reader 与可信 HTTPS 地址，且确认身份命名空间后才能正向复验。
- 全前端容器回归通过：Vitest 68 个文件/543 条用例，生产构建（含 `vue-tsc --noEmit`）通过，模拟 Chromium E2E 13/13。静态 API 路由审计覆盖 347 个导出：184 个静态文档匹配、151 个动态文档匹配、9 个非 HTTP helper、3 个需人工审查的动态路径；静态匹配不等同运行时验证，其余未执行 API 不计全量验收。
- `git diff --check`、`bash -n scripts/integration/podman-verify.sh` 通过。`verify-docs.sh` 有一条既存的计划文档私有目录路径警告；`check-memory-sync.sh` 因无暂存改动按脚本设计跳过。FE-029/BE-043 继续执行中，尚未满足 R5 复核和全量功能完成条件。

### 2026-11-20 系统用户列表冲突根因定位与夹具修正

- 更正此前关于用户列表缺少 `staff:manage` 权限导致 409 的推测：管理 handler 的授权检查是 system `SUPER_ADMIN` 角色；本轮在隔离空库确认此角色已绑定。后端 `@DataScope` 还要求角色配置数据范围，安全异常处理器对 `IllegalStateException` 返回 HTTP 409 / 业务码 -1，并只按类型和 traceId 记录日志。
- 为有限诊断，在只读浏览器冒烟输出通过正则校验的 traceId，并在 system 日志中只匹配该 traceId 提取异常类型；本轮观察到 `IllegalStateException`，未输出原始响应消息、令牌或其他日志内容。MySQL 角色种子插入没有设置新增的 `data_scope`，而 V18 将该列定义为 nullable；最终验证前，不把类型信息单独当作完整根因证据。
- 对 `--system-reads` 临时夹具增加限制步骤：仅在脚本确认 MySQL 数据目录为 tmpfs、system 库为空且 `SUPER_ADMIN` 已关联后，将该管理员所关联的启用角色中空 `data_scope` 设为 `ALL`（1）。新的真实 Chromium 会话随后验证 `GET /admin-api/v1/users?page=1&size=20`、部门树和系统参数列表均 HTTP 200、业务码 0，且页面表格渲染通过。这确认缺失数据范围夹具是该隔离读取阻断的原因；未修改后端源码或迁移，也未改动任何持久化库。
- 三轮本地尝试资源均通过专属项目 `apex-fe029-verify` 清理容器及网络，未删除卷。auth/system 临时 Flyway 分别 22/91 条成功、失败 0。修正脚本参数说明重复行；`bash -n`、浏览器脚本 `node --check`、`git diff --check`、严格前端红线扫描通过。治理文档检查仍有既存的一条计划文档私有路径警告。
- FE-029/BE-043 仍未完成：办公、集成与租户/流程定义受保护读仍需部署方可信 HTTPS reader 与共享身份命名空间；知识库未启动；全 API 运行时覆盖与完整写入/读回尚未完成，R5 复核未执行。

### 2026-11-20 治理受保护路由续测

- 使用专属 Podman Compose 空库及真实 Chromium 复测租户与流程定义页。两组均通过登录、身份、角色、权限和菜单初始化；经侧栏菜单导航后租户列表真实请求返回 HTTP 403、业务码非零，归类为 `authorization-denied`。流程定义页面未观察到列表请求，归类为 `request-not-observed`，不记作 HTTP 403 或接口通过。auth/system Flyway 22/91 条成功、失败 0。
- 修正浏览器冒烟分类：区分已观察 HTTP 403、409、其他异常响应及未观察请求；治理页面测试使用侧栏菜单打开并等待表格。浏览器及服务日志只打印有限状态、预定义错误分类和校验过的 traceId，不记录令牌或原始错误正文。
- 本轮入口退出非零并按项目名清理专属容器、网络，未删除卷。静态 API 路由审计仍覆盖 347 个导出，但不作为运行通过证据。办公、集成、租户授权仍缺可信 HTTPS reader 配置；流程定义请求触发尚待诊断；知识库运行依赖与授权未具备，FE-029/BE-043 继续执行中。

### 2026-11-20 治理路由请求观测修复复测

- 修正治理只读冒烟的响应等待：不再要求无查询串的 URL 完全相等，按 origin/path 采集请求与响应，并核验各页面的分页参数；失败分类进一步区分 HTTP 响应、浏览器请求失败、已发请求无响应和未发出请求，同时记录是否发生页面脚本异常。
- 专属 Podman Compose 栈中 auth/system 迁移分别 22/91 条成功、失败 0。真实 Chromium 两组均完成验证码、登录、身份、角色、权限和菜单初始化；租户页 GET 返回 HTTP 403，流程定义页此前“未观察到”的 GET 实际也返回 HTTP 403。两项均为 `authorization-denied`，不得记作通过；本次失败响应无业务码可解析。
- 本轮只读治理页访问没有执行写操作。MySQL 数据目录经检查为 tmpfs；退出时专属容器及网络已清理，未删除卷或触碰其他项目资源。浏览器日志不输出令牌或原始错误正文。
- `node --check`、`git diff --check` 及 `audit-frontend-rules.sh --strict` 通过。租户与流程定义仍需部署方授权 reader 和共享身份命名空间；办公/集成 reader、知识库服务依赖及授权、其余 API 运行覆盖和完整写入/读回尚未完成。FE-029/BE-043 继续执行中，未执行 R5 复核。
- 后续本机质量复跑：`npm run build` 中的 `vue-tsc --noEmit` 通过，但 Vite/Sass 构建阶段宿主 Dart VM 报 `cpuinfo_macos.cc:42` 后，`sass-embedded` 报 `Tried writing to closed dispatcher`，串行重试仍失败；不归类为源码类型错误。直接 `npm test -- --run` 同样触发 Dart VM 崩溃且无进展，已中止。尝试用 Podman Compose `frontend-test` 容器复跑时容器在依赖安装阶段持续无输出，未进入单测/构建；已停止并清理经项目标签确认的唯一临时容器及专属网络，未删除卷。不能用此前通过的容器回归证据替代本轮未完成的重跑。

### 2026-11-20 授权前置与知识库依赖核查

- 复核后端只读源码确认 auth 授权查询端点只允许 `AUTH_CENTER_AUTHORIZATION_READER_USER_ID` 指定的有效 reader，并校验 reader/目标用户处于相同租户；业务服务的各域 reader token 还必须对应各自已经确认的用户与租户命名空间。当前执行环境没有 office、integration、workflow、knowledge 或 auth reader 配置变量。不能安全地自行生成/伪造部署身份，也不能以浏览器管理员令牌代替。
- 后端工作区存在知识库 JAR 和 MySQL/PostgreSQL 迁移文件，正式 `podman-compose.yml` 有可选知识库 profile；当前前端隔离验证编排未接入该服务。检查本机 Podman 缓存未找到 Meilisearch v1.10；尝试通过 Podman 拉取时 registry 连接超时（`registry-1.docker.io:443`），故未启动知识库测试，也未执行迁移。
- 本轮未对任何数据库或业务服务执行读写。全量联调仍待可信 HTTPS auth base URL/JVM 信任链、同租户专用 reader token 和共享命名空间确认；知识库检索需 Meilisearch 镜像可用，问答还需部署方提供兼容模型服务配置。FE-029/BE-043 保持执行中，不宣称全量完成。

### 2026-11-21 前端回归复跑与联调入口加固

- 通过统一脚本 `bash scripts/integration/podman-verify.sh --frontend-test` 在 Podman Compose 临时容器执行全前端回归：依赖按 lockfile 安装 640 packages；Vitest 68 个文件/543 条通过；`npm run build` 中 `vue-tsc --noEmit` 与 Vite 生产构建通过；模拟 Chromium E2E 13/13 通过。该结果不启动后端，不计为真实业务验收。
- 前端测试入口新增 5 分钟依赖安装上限，避免 registry 停滞后无限等待；启动前必须确认隔离项目没有遗留容器/网络，查询失败即停止。结束后通过专属 Compose 项目清理，不删除卷；对 `run --rm` 自动移除的容器不再产生误导性清理告警。脚本语法和资源清理已验证。
- 按名称查询发现 Playwright 镜像可用；Meilisearch `docker.io/getmeili/meilisearch:v1.10` 不在本地，Podman registry 拉取再次因 `registry-1.docker.io:443` 超时失败。未执行知识库服务启动、迁移、摄取或检索。没有 Docker 或 Docker Compose 操作。
- 本轮不具备部署方可信 HTTPS 授权地址/JVM 信任材料、同租户 reader 配置和共享用户/租户命名空间确认；因此未重复发起已知会 403 的受保护接口请求，不以管理员凭据代替 reader。知识库问答模型配置也未提供。待部署方通过安全渠道配置所需材料后，再继续真实受保护读和知识库联调；不得在聊天或记录中粘贴 token。
- FE-029 / BE-043 保持执行中；全量 API 运行覆盖、完整业务写入/读回、知识库链路与独立 R5 复核均未完成，本记录不宣布验收通过。

### 2026-11-21 授权材料安全挂载入口

- 为隔离联调栈增加 opt-in Compose 覆盖文件：只有设置 `VERIFY_AUTHORIZATION_CONFIG_DIR` 才挂载部署方配置；目录内 `authorization.yml` 与 PKCS#12 `truststore.p12` 以只读方式提供给 auth、office、workflow、integration JVM。授权配置不进入脚本参数、Compose 环境变量、日志或报告；缺文件、空文件、符号链接或目录/文件 group/world 权限非零时在启动前拒绝。未设置该变量的默认联调路径不变。
- `authorization.yml` 由部署方安全渠道维护，必须包含有效专用 reader 用户 ID、各业务域可信 HTTPS `base-url`、经部署方确认的共享用户/租户命名空间，以及按准确租户 ID 配置的 reader token 映射。truststore 使用约定口令 `changeit`；不得把 token 或信任材料写入仓库。当前没有可用部署材料，本轮只验证配置文档及 Compose YAML/脚本语法，没有加载、读取或输出真实凭据。
- 新入口不改变后端授权逻辑，不将管理员令牌映射为 reader，也不自动配置知识库服务。Meilisearch 镜像仍需部署方通过安全渠道或可用 registry 预置；全量受保护 API 和知识库链路仍未通过，FE-029/BE-043 继续执行中。
- 默认无秘密前端回归再次通过：Vitest 68 文件/543 用例、`vue-tsc --noEmit` 与生产构建、模拟 Chromium E2E 13/13。项目专属容器和网络已清理，不删卷。
- `bash -n scripts/integration/podman-verify.sh`、两份 Compose YAML 解析、`git diff --check` 和 `audit-frontend-rules.sh --strict` 通过；`verify-docs.sh` 仍报告同一条既有私有路径警告。Podman 运行容器清单查询因审批服务暂时不可用未执行；回归入口自身报告专属资源清理成功。

### 2026-11-21 授权输入与 Meilisearch 再检查

- 用户授权继续处理；授权目录环境变量未设置，未发现本轮可挂载的部署方 reader 配置或 JVM 信任材料。没有访问其他项目配置文件，不使用浏览器管理员凭据替代。
- 经授权重试 `podman pull --retry=0 docker.io/getmeili/meilisearch:v1.10`，registry `registry-1.docker.io:443` 连接超时，退出码 125；镜像仍不可用。此次未启动知识库服务、未运行迁移，未使用 Docker/Docker Compose 命令。
- 因授权输入与镜像两项前置仍缺失，未重放受保护接口；未生成或记录 token。需要部署方把授权 YAML 和 PKCS#12 truststore 安全放入隔离主机目录、设置 `VERIFY_AUTHORIZATION_CONFIG_DIR` 并确认共享身份命名空间，同时预置 Meilisearch 镜像后再执行正向联调。FE-029 / BE-043 保持执行中，R5 复核未完成。

### 2026-11-21 当前工作区版本全栈复验

- 使用 Podman 构建当前前端镜像，并按后端固定 JDK `21.0.13.0+9-tem` / mvnd `2.0.0-rc-3` 重打 system、file、gateway 服务。后端 `-pl :apex-system-service,:apex-file-service,:apex-gateway -am package` BUILD SUCCESS；`apex-system` 1,807 项、`apex-gateway` 169 项测试均零失败。前端镜像构建中的 `npm run build`（含 `vue-tsc --noEmit`）成功。
- 以当前镜像/JAR 运行 `bash scripts/integration/podman-verify.sh`：真实 Chromium 登录、身份/角色/权限/菜单、通知收件箱读取、通知 SSE 握手、站内信 WS 票据/101/ping-pong 通过；字典类型及数据项创建、编辑、停用、重新启用、删除通过；文件 multipart 上传返回 HTTP 200、业务码 0，页面对象键与服务端文件名一致；通知单条已读及全部已读通过。
- 本轮 dashboard 的待办审批、办公日历、站内信请求返回 HTTP 503/业务码 3007；连接器列表 HTTP 503/业务码 3007；总览 file 与 integration 来源降级，workflow 待办亦出现 HTTP 503。网关日志摘要含 5 次 `TimeoutException`，system 含 2 次。验证码、登录、身份、角色、权限和菜单初始化正常。该轮退出非零，不能作为全量通过证据。
- 前端完整容器回归 `bash scripts/integration/podman-verify.sh --frontend-test` 通过：Vitest 68 文件/543 项、`vue-tsc --noEmit` 与 Vite 生产构建、模拟 Chromium E2E 13/13。该回归不启动后端，也不替代真实 API 验收。
- `node scripts/integration/api-route-audit.mjs ../apex-scaffold /tmp/fe029-api-route-matrix.md` 覆盖 347 个导出函数：184 个静态匹配、151 个动态匹配、9 个非 HTTP helper、3 个动态路由需人工复核。此为静态对照，不代表运行时通过。`audit-frontend-rules.sh --strict` 无阻断；`verify-docs.sh` 仍有一条既存断链/私有路径告警。
- 后端 `source scripts/build/init-build-env.sh && mvnd -T4 -B -pl :apex-system-service,:apex-file-service,:apex-gateway -am spotless:check` BUILD SUCCESS；`bash scripts/governance/audit-backend-rules.sh --strict` 无阻断。前端 `bash scripts/governance/audit-frontend-rules.sh --strict` 无阻断，`git diff --check` 通过；记忆同步脚本因无暂存改动按设计跳过。
- `VERIFY_AUTHORIZATION_CONFIG_DIR` 未设置。办公/集成及其它跨服务授权链路仍缺部署方可信 HTTPS auth 地址、专用同租户 reader 凭据与命名空间确认；知识库仍缺 Meilisearch 镜像与授权/模型配置。未关闭鉴权、未伪造 reader、未使用 Docker/Docker Compose。隔离 MySQL 使用 tmpfs；两次联调退出均清理本任务容器及网络、不删卷。FE-029/BE-043 保持执行中，等待前置材料并继续真实接口覆盖及独立 R5 复核。

### 2026-11-21 Podman 前端回归续跑

- 首次在沙箱内调用 `bash scripts/integration/podman-verify.sh --frontend-test` 时，Podman socket 连接被环境策略拒绝；未启动容器。获本轮命令级授权后，在沙箱外重跑同一仓库脚本，仍仅使用 Podman Compose 的 `apex-fe029-verify` 隔离项目。
- 镜像内按 lockfile 安装 640 packages；Vitest 68 个文件/543 条用例通过；`npm run build` 中 `vue-tsc --noEmit` 与 Vite 生产构建通过；模拟 Chromium E2E 13/13 通过。脚本退出码 0，并报告隔离容器和网络已移除、未删除卷。
- 该验证未启动后端、不访问真实业务 API，也不覆盖登录后的受保护业务链路。部署方授权目录/共享命名空间确认、Meilisearch 镜像以及知识库临时空库迁移许可仍缺；FE-029 / BE-043 保持执行中，R5 复核未完成。未执行 Docker 或 Docker Compose 命令。

### 2026-11-21 最新前端镜像全栈复测

- 复测发现隔离脚本默认使用过期标签 `localhost/apex-admin-web:fe029-20261119`，因此先前跑到的并非当前工作区前端；旧镜像导致上传 `sex` 参数仍返回 HTTP 400，通知面板读写断言超时。将默认标签改为当前构建产物 `localhost/apex-admin-web:latest`，并同步脚本说明。另移除下游端口探测失败被 `|| true` 吞掉的行为，确保服务未启动时联调立即失败。
- 使用 `bash scripts/integration/podman-verify.sh` 经 `podman-compose` 重跑专属 `apex-fe029-verify` 栈。真实 Chromium 登录、身份/角色/权限/菜单、通知收件箱、刷新与列表重放、工作流待办、总览及 file/workflow/integration 三源 `UP`、SSE HTTP 200、站内信 WS 票据 HTTP 200/升级 101/ping-pong 均通过；字典类型和数据项创建/编辑/停用/启用/删除均 HTTP 200、业务码 0；普通 multipart 上传 HTTP 200、业务码 0，页面对象键与服务端响应一致；通知单条已读与全部已读 HTTP 200、业务码 0。
- 办公审批、日历、站内信和连接器在本轮返回 HTTP 403；`VERIFY_AUTHORIZATION_CONFIG_DIR` 未设置，符合授权材料缺失时 fail-closed 的预期，不能计为业务通过。之前观察到的网关 503/TimeoutException 本轮未复现；本轮脚本仍因受保护链路失败而退出非零。
- 临时 auth/system Flyway 迁移分别 22/91 条成功、失败 0；MySQL 数据目录为 tmpfs。退出时专属容器与网络清理成功，未删除卷、未影响其他项目。前端脚本语法、浏览器脚本语法、`git diff --check` 和 `audit-frontend-rules.sh --strict` 通过；`verify-docs.sh` 仍有一条既存引用告警。FE-029/BE-043 继续执行中，待部署方提供可信 HTTPS reader、同租户凭据/命名空间确认和知识库依赖，再继续受保护 API 与知识库联调及独立 R5 复核。

### 2026-11-21 系统只读页面续测

- 使用 `VERIFY_BROWSER_MODE=--system-reads bash scripts/integration/podman-verify.sh` 通过 Podman Compose 启动隔离栈。真实 Chromium 分别登录后读取系统用户 `GET /admin-api/v1/users?page=1&size=20`、部门树 `GET /admin-api/v1/depts`、系统参数 `GET /admin-api/v1/configs`，均 HTTP 200、业务码 0，且对应管理表格渲染通过。
- 仅在空临时库确认 `SUPER_ADMIN` 已绑定后，为其已关联且启用的角色补齐 `data_scope=ALL` 测试夹具；不修改权限种子或正式数据。迁移仍为 auth/system 22/91 成功、失败 0；MySQL 为 tmpfs。脚本退出 0，专属容器和网络清理成功，未删除卷。
- 该结果补充系统管理只读运行证据，不覆盖用户/部门/参数写操作，也不替代办公、集成、租户、流程定义等 reader 授权链路。FE-029/BE-043 继续执行中，R5 复核未完成。

### 2026-11-21 监控大盘只读续测

- 使用 Podman 构建 `localhost/apex-admin-web:latest`；Containerfile 中 vue-tsc 与 Vite 生产构建成功。通过 `VERIFY_BROWSER_MODE=--monitor-reads bash scripts/integration/podman-verify.sh` 启动专属临时栈，auth/system 迁移 22/91 成功、失败 0，MySQL 使用 tmpfs。
- 真实 Chromium 登录及动态菜单初始化通过；监控大盘概览、系统、中间件、治理、业务五个 GET 均 HTTP 200、业务码 0，目标路由根节点可见，脚本退出码 0。卡片级 DOM 检查因所用选择器与 Element Plus 实际 DOM 不一致而未作为通过条件，故本轮不宣称每个卡片均单独验收。
- 退出后专属 Podman 容器及网络清理完成，未删除卷；未使用 Docker/Docker Compose。FE-029/BE-043 保持执行中；office、integration 等 reader 授权链路、知识库依赖及独立 R5 复核仍待完成。

### 2026-11-21 完整业务组续测

- 完整隔离栈使用 Podman Compose 启动，auth/system 迁移 22/91 成功、失败 0，MySQL 为 tmpfs。增加集成服务管理端口就绪检查、经前端代理的验证码预热，以及仅限测试栈的 `integrationService` 12 秒 TimeLimiter，避免连接器冷启动被默认 TimeLimiter 误报为 503；定向复测后稳定返回 HTTP 403，表明请求已到达授权边界，未绕过 fail-closed。该超时覆盖仅作用于临时验证网关，不代表生产配置变更。
- 真实 Chromium 完整组中登录/身份/角色/权限/菜单通过；工作流待办、总览三个来源 `UP`、通知 SSE 握手、站内信 WS 票据/101/ping-pong、令牌刷新及重放、字典类型和数据 CRUD/状态切换、multipart 上传、通知单条及全部已读均通过。dashboard 的办公审批、日历、站内信以及连接器列表均 HTTP 403；连接器在无测试 TimeLimiter 覆盖时曾为 HTTP 503/`TimeoutException`，已定位为隔离网关遗漏该服务冷启动超时配置。
- 现有 `VERIFY_AUTHORIZATION_CONFIG_DIR` 未设置，故不把办公/集成权限拒绝记作业务通过，也不使用管理员令牌冒充 reader。系统管理只读页和监控只读页各自有前序独立成功证据；本次完整组因授权拒绝退出非零。专属 Podman 容器/网络清理完成，未删卷。
- 知识库仍未执行：Podman 本地没有 `docker.io/getmeili/meilisearch:v1.10`，并且缺少部署方授权/模型材料。前端严格红线、浏览器及 Shell 语法、差异检查通过；文档自检保留一条既有引用告警。FE-029/BE-043 仍执行中，待安全配置、Meilisearch 依赖及独立 R5 复核后继续完成受保护域与知识库验收。

### 2026-11-21 连接器授权边界复测

- 通过 `VERIFY_BROWSER_MODE=--integration-reads bash scripts/integration/podman-verify.sh` 使用 Podman Compose 重启专属临时栈；MySQL `/var/lib/mysql` 为 tmpfs，auth/system Flyway 分别 22/91 条成功、失败 0。真实 Chromium 登录、身份、角色、权限和菜单初始化通过；`GET /integration/v1/connectors` 返回 HTTP 403，属于缺少部署方 reader 配置时的 fail-closed 结果，不计为连接器业务通过。退出码 1 与该预期授权断言失败一致。
- 退出后确认 `apex-fe029-verify` 专属容器和网络均无残留，未删除卷。环境仍未设置 `VERIFY_AUTHORIZATION_CONFIG_DIR` 或知识库模型凭据；Podman 存在 `docker.io/getmeili/meilisearch:v1.12` 镜像对应的停止容器，本轮没有启动或使用它。受保护域和知识库仍需部署方真实授权配置、可用模型配置后复测；独立 R5 复核未完成。
- `apex-preflight.sh --fast` 为 OK=11/WARN=3/FAIL=0；前端严格红线、Shell/Node 语法、`git diff --check` 通过。`verify-docs.sh` 保留一条既有文档引用告警。全程只用 Podman/Podman Compose，未运行 Docker 或 Docker Compose。

### 2026-11-21 监控大盘续测

- 使用 Podman Compose 定向栈，多轮真实 Chromium 访问 `/admin-api/v1/monitor/{overview,system,middleware,governance,business}` 均观测到 HTTP 200、业务码 0；auth/system 迁移 22/91 成功、失败 0，MySQL 为 tmpfs。一次浏览器轮次确认五组卡片值和业务图表 canvas 与接口响应匹配；手动刷新再次触发五个接口并收到 HTTP 200、业务码 0，但增强断言在刷新后卡片比较阶段超时，故该轮脚本退出非零。随后简化为真实响应与组件挂载检查，最新轮因 Chromium 创建 context 失败未进入登录或接口验证，不记作通过。
- Meilisearch v1.10 的 Podman 拉取在 `auth.docker.io` 获取 registry token 时 EOF 失败（退出码 125）。执行环境仍未设置 `VERIFY_AUTHORIZATION_CONFIG_DIR`、知识库 embedding/chat endpoint、model 或 API key；未启动知识库服务或迁移，未伪造授权凭据。连接器真实读取在前序定向轮次仍为 HTTP 403。
- 本轮所有 `apex-fe029-verify` 容器和网络均已清理，不删除卷。联调脚本 `node --check`、前端严格红线及 `git diff --check` 通过。FE-029/BE-043 仍等待部署方 HTTPS reader/truststore/同租户命名空间确认与知识库依赖；受保护业务及知识库验收未完成，独立 R5 复核未执行。

### 2026-11-21 监控冒烟根因修复

- 追查 Chromium context 阶段失败，发现浏览器实际已创建 context，真正异常来自监控冒烟初始化引用未定义的 `monitorPaths`；旧阶段标签将其误报为 context 创建失败。修复为模块级共享监控路径，并在业务冒烟初始化前更新阶段标签；异常报告仅在未登录的 context 创建阶段输出限长错误原因。
- 通过 `VERIFY_BROWSER_MODE=--monitor-reads bash scripts/integration/podman-verify.sh` 使用 Podman Compose 真实复测：Chromium 登录、身份、角色、权限、菜单通过；监控概览、系统、中间件、治理、业务五个 GET 均 HTTP 200/code 0，监控页根节点挂载通过。auth/system Flyway 22/91 成功、失败 0，MySQL 为 tmpfs，最终退出码 0。
- Podman Compose 启动探针通过显式创建/关闭 browser context 与空白页。最终本轮专属容器及网络清理成功，未删除卷；Node/Shell 语法与前端严格红线通过。受保护 office/workflow/integration、知识库外部配置与依赖仍未就绪，FE-029/BE-043 继续执行中，独立 R5 复核未完成。

### 2026-11-21 完整业务组续测

- 使用 Podman Compose 重跑完整隔离业务组。真实 Chromium 登录、身份/角色/权限/菜单、通知收件箱、通知 SSE、工作流待办、总览 file/workflow/integration 三源 `UP`、站内信 WebSocket 票据/101/ping-pong、令牌刷新与重放、字典类型和数据 CRUD/状态切换、multipart 文件上传、通知单条与全部已读均通过。
- 办公审批、办公日历、站内信收件箱和连接器列表返回 HTTP 403；当前未设置 `VERIFY_AUTHORIZATION_CONFIG_DIR`，属于 reader 配置缺失时的 fail-closed 结果，不计为业务通过。脚本退出非零与这些授权断言一致，未观察到本轮网关 503。
- auth/system Flyway 分别 22/91 成功、失败 0；MySQL `/var/lib/mysql` 为 tmpfs。退出时专属 Podman Compose 容器和网络清理成功，未删除卷。知识库仍缺部署方授权/模型材料及可用 Meilisearch v1.10 镜像；FE-029/BE-043 继续执行中，R5 复核未完成。

### 2026-11-21 静态契约与前端回归续测

- 通过 `node scripts/integration/api-route-audit.mjs ../apex-scaffold /tmp/fe029-api-route-matrix-latest.md` 对照 347 个前端 API 导出：184 项静态路径匹配、151 项参数化路径匹配、9 项非 HTTP helper、3 项动态路由需人工复核。人工对照前端调用、后端 router 与 API 路由契约后，IP 规则新增/启停及流程定义启停路径均一致；该审计仅为静态证据，不代表运行时通过。
- 通过 `bash scripts/integration/podman-verify.sh --frontend-test` 在 Podman Compose 隔离容器中执行回归：Vitest 68 个文件/543 条用例通过，`vue-tsc --noEmit` 与 Vite 生产构建成功，模拟 Chromium E2E 13/13 通过。该模式不启动后端，不替代真实接口联调。
- 部署授权目录仍未设置。Podman 确认 `docker.io/getmeili/meilisearch:v1.10` 镜像未缓存；本地仅有停止的 v1.12 容器，版本不符合该集成入口固定依赖，未擅自替换。前端回归容器和网络已清理、未删卷；知识库及受保护域等待部署方材料，FE-029/BE-043 与独立 R5 复核未完成。

### 2026-11-21 系统管理只读再验

- 通过 `VERIFY_BROWSER_MODE=--system-reads bash scripts/integration/podman-verify.sh` 用 Podman Compose 隔离栈再次验证系统用户分页、部门树及系统参数页。真实 Chromium 登录、身份/角色/权限/动态菜单初始化通过；三个 GET 均 HTTP 200、业务码 0，页面表格断言通过，脚本退出码 0。
- auth/system Flyway 分别 22/91 成功、失败 0；MySQL 数据目录为 tmpfs，受限空库夹具确认管理员角色及 `ALL` 数据范围。退出后专属容器与网络清理完成，未删除卷。受保护 office/workflow/integration 与知识库前置仍缺，FE-029/BE-043 继续执行中，独立 R5 复核未完成。

### 2026-11-21 Meilisearch 镜像前置修复

- 通过 Podman 成功拉取项目固定版本 `docker.io/getmeili/meilisearch:v1.10`（镜像内版本 1.10.3），解除此前 registry 拉取失败造成的镜像缺失。使用无持久卷临时容器验证 `/health` 返回 `{"status":"available"}`，之后停止并移除容器，确认无残留。
- 健康探测仅验证 Meilisearch 镜像可运行，不启动或验收知识库服务。`VERIFY_AUTHORIZATION_CONFIG_DIR` 仍未设置，知识库 embedding/chat 模型配置仍缺；未启动知识库数据库迁移、摄取、检索或问答，未创建或记录凭据。受保护域与知识库仍待部署方安全材料及独立 R5 复核，FE-029/BE-043 保持执行中。

### 2026-11-21 系统管理只读复验续跑

- 通过 `VERIFY_BROWSER_MODE=--system-reads bash scripts/integration/podman-verify.sh` 使用 Podman Compose 启动隔离栈。真实 Chromium 登录、身份/角色/权限/菜单初始化通过；用户分页、部门树、系统参数三个 GET 均 HTTP 200、业务码 0，对应页面表格断言通过。auth/system Flyway 分别 22/91 条成功、失败 0，MySQL 数据目录为 tmpfs。
- 脚本正常退出并报告专属容器与网络已移除、未删除卷；本轮仅执行只读页面验收及空库数据范围夹具，不触及持久化业务数据。`git diff --check`、联调入口 Bash 语法及 `audit-frontend-rules.sh --strict` 通过；文档自检仍有一条既有引用告警。
- `VERIFY_AUTHORIZATION_CONFIG_DIR` 与知识库模型配置仍未注入，因此不发起受保护 office/integration 请求、不启动知识库服务。该轮补充只读证据，不代表全量 API 或写入/读回闭环完成；FE-029/BE-043 继续执行中，独立 R5 尚未完成。

### 2026-11-21 监控只读与前端回归续验

- 先用提权只读查询确认 `apex-fe029-verify` 专属容器和网络无残留，再由 Podman Compose 启动监控只读栈。真实 Chromium 登录、身份/角色/权限/菜单初始化通过；监控概览、系统、中间件、治理、业务五个 GET 均 HTTP 200、业务码 0，监控页路由挂载通过。auth/system Flyway 分别 22/91 条成功、失败 0，MySQL 使用 tmpfs；脚本退出码 0 并报告专属容器与网络清理完成、未删除卷。
- 随后通过 `bash scripts/integration/podman-verify.sh --frontend-test` 在 Podman Compose 容器中完成全前端回归：Vitest 68 个文件/543 条用例通过，`vue-tsc --noEmit` 与 Vite 生产构建通过，模拟 Chromium E2E 13/13 通过；退出码 0，专属资源已清理且未删除卷。
- `VERIFY_AUTHORIZATION_CONFIG_DIR` 和知识库 embedding/chat 模型配置仍未设置；本轮未访问受保护域、未启动知识库服务，也未使用 Docker/Docker Compose。FE-029/BE-043 仍未完成全量受保护接口、知识库和业务写入/读回闭环；独立 R5 仍待执行。
