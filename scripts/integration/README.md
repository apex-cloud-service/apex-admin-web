# 前后端联调脚本

仅使用 Podman 工具验证容器化前后端链路。

| 脚本 | 用途 | 用法 |
| --- | --- | --- |
| `api-route-audit.mjs` | 静态对照前端 API 导出、TS 签名/返回类型、请求调用参数、直接页面引用与后端路由源码；不推断 handler 权限、租户规则或线上线级响应 | `node scripts/integration/api-route-audit.mjs [backend-root] [markdown-output]` |
| `podman-smoke.sh` | 检查前端容器内 Nginx 配置、网关 DNS、首页与 system 健康反代 | `bash scripts/integration/podman-smoke.sh` |
| `podman-verify.sh` | 编排专属临时栈并运行真实 Chromium 业务冒烟 | `bash scripts/integration/podman-verify.sh` |
| `podman-verify.sh --frontend-test` | 在同一隔离项目前置检查下运行单测、生产构建与模拟 Chromium E2E | `bash scripts/integration/podman-verify.sh --frontend-test` |
| `browser-auth-smoke.mjs` | 用真实 Chromium 提交登录并核验身份、角色、权限及后端菜单渲染 | 在隔离 `podman-compose` 的 Playwright 服务中运行 `node scripts/integration/browser-auth-smoke.mjs` |
| `browser-auth-smoke.mjs --business` | 扩展工作台聚合、通知 SSE 建连、站内信 WebSocket 心跳、真实刷新与字典读写 | 仅在可销毁的 `podman-compose` 临时库中运行 `node scripts/integration/browser-auth-smoke.mjs --business` |
| `browser-auth-smoke.mjs --business --domains` | 另验工作流待办分页、连接器管理列表、图片 multipart 上传（线上 `fileName` 与页面 `objectName` 一致）及总览三个来源均 `UP` | 同一隔离项目内需启动工作流、文件、集成服务，并将测试文件存储目录挂载为 tmpfs |
| `browser-auth-smoke.mjs --governance-reads` | 通过动态菜单路由验证租户列表和流程定义列表的真实 GET、分页响应及页面表格 | `VERIFY_BROWSER_MODE=--governance-reads bash scripts/integration/podman-verify.sh` |
| `browser-auth-smoke.mjs --system-reads` | 验证用户分页（`page/size`）、部门树和参数列表的真实 GET、响应结构和页面表格；只在已确认 tmpfs 的空库中检查管理员角色绑定并补齐 `ALL` 数据范围夹具，失败时仅输出预定义分类；不触及持久化数据 | `VERIFY_BROWSER_MODE=--system-reads bash scripts/integration/podman-verify.sh` |
| `browser-auth-smoke.mjs --monitor-reads` | 登录后打开监控大盘，验证概览、系统资源、中间件、治理、业务五个接口响应及目标路由挂载；只读，不启动 office/workflow/file/integration 服务 | `VERIFY_BROWSER_MODE=--monitor-reads bash scripts/integration/podman-verify.sh` |
| `browser-auth-smoke.mjs --integration-reads` | 独立验证连接器列表真实 GET 与分页响应；启动完整业务依赖并等待集成服务管理端口就绪 | `VERIFY_BROWSER_MODE=--integration-reads bash scripts/integration/podman-verify.sh` |

直接运行探测或浏览器脚本不会启动、停止或清理服务。使用 `podman-verify.sh` 时，入口会先取得进程间锁，再拒绝复用已有的 `apex-fe029-verify` 资源，避免两个验收脚本并发清理同一项目；随后验证 Chromium 能创建空白页，再启动数据库。确认 MySQL 数据目录为 tmpfs 且 system 库为空后才启动迁移。退出时仅清理专属容器和网络，不删除卷。

隔离栈使用 `podman-verify.yml`，不对宿主发布任何端口。需预先准备 Playwright 镜像对应的仓库依赖、Compose 中的本地镜像和后端 `1.3.1` JAR；`BACKEND_ROOT` 默认指向同级 `apex-scaffold`，默认前端镜像为 `localhost/apex-admin-web:latest`，`VERIFY_FRONTEND_IMAGE` 可覆盖该标签。JAR 复制到容器本地后由 JVM 加载。验证栈中的超时不修改正式编排；工作流、文件和集成使用认证中心 JWKS 的轮换密钥验签，不使用 OAuth2 元数据服务的单公钥覆盖。办公及集成管理的成功场景需要可信 HTTPS 授权中心、已确认的共享身份命名空间和同租户专用 reader；缺项时冒烟测试保留失败，不跳过。

工作流定义管理和知识库管理也依赖授权中心。供部署方核对的配置前缀分别为 `office.security.authorization`、`integration.security.authorization`、`workflow.security.authorization`、`apex.knowledge.security.authorization`；各前缀下的 `base-url` 为 JVM 信任的 HTTPS 地址，`shared-user-namespace` 仅在部署方确认 `userId`、`tenantId` 同源后启用，`reader-tokens` 按精确租户 ID 注入专用读取凭据。授权中心须设置 `AUTH_CENTER_AUTHORIZATION_READER_USER_ID` 为有效的专用读取账号。凭据由安全配置渠道注入，不能用浏览器管理员凭据代替，不输出凭据或展开后的 Compose 配置。工作流待办通过不表示流程定义权限已通过。当前隔离编排未启动知识库 profile，因此不包含知识空间、文档摄取、检索和问答验收。

部署方可在安全渠道将非提交目录提供给验证主机，并通过 `VERIFY_AUTHORIZATION_CONFIG_DIR` 传入该目录路径。目录必须仅当前用户可访问（目录 `0700`、文件 `0600`），且仅包含 `authorization.yml` 与 `truststore.p12`；前端不读取文件内容，Compose 只读挂载目录到需要统一授权的 JVM 服务。`authorization.yml` 按 Spring Boot YAML 属性结构提供 `auth-center.authorization-reader-user-id` 以及各域 `*.security.authorization` 的 HTTPS `base-url`、经确认的 `shared-user-namespace: true` 和按真实 tenant ID 精确映射的 `reader-tokens`。PKCS#12 truststore 使用口令 `changeit`，只含部署方提供的授权中心 CA 链。不要把 reader token 写入仓库、命令参数、日志或报告。未设置该变量时不加载授权覆盖；材料不齐或权限过宽时脚本在启动前拒绝运行。

模拟浏览器回归不需要启动后端。在没有同名隔离项目运行时，从前端仓库执行以下命令。`frontend-test` 服务在 tmpfs 中安装 Linux 依赖、执行全量单测、生产构建和零重试 Chromium 回归；接口由 Playwright 拦截，不计入真实业务联调证据。

```bash
bash scripts/integration/podman-verify.sh --frontend-test
```

依赖安装使用 lockfile 并设置 5 分钟上限；入口预先确认 `apex-fe029-verify` 项目没有已有容器/网络，完成或失败后只清理此项目容器与网络，不删除卷。若 Podman 无法确认资源清单，入口将停止而不启动测试。

浏览器服务需安装仓库依赖及匹配版本的 Chromium，使用独立临时容器和 `/tmp` tmpfs。`BASE_URL` 默认 `http://apex-admin-web`；通过 `TEST_LOGIN_PASSWORD` 环境变量提供隔离测试管理员密码，不使用生产账号。等待 auth/system 迁移、网关就绪及网关、system、workflow、file、integration 的 JWKS 同步后再运行。测试不读取登录响应正文，不导出浏览器状态，不保存截图或追踪；仅打印状态码、业务码和断言结果等非敏感摘要。

业务模式额外要求 office 就绪并与网关使用同一单实例的消息 HTTP/WS 路由。字典测试只创建随机 `fe029_` 前缀记录，并通过页面更新和删除；测试异常时由临时库销毁兜底。刷新触发使用浏览器层一次性模拟 401，刷新请求与列表重放走真实网关，不等同于自然过期测试。SSE 检查 HTTP 200 与流式 Content-Type，WebSocket 检查票据状态和真实 ping/pong，均不等同于应用消息投递验收。

工作台、字典、连接器和上传各自使用独立 Chromium 临时上下文，逐组登录并检查身份及菜单，再验证目标页面。首次业务响应在登录提交前开始采集，但等待上限从业务断言开始计时；一组失败不跳过其他组，任一组失败仍返回非零退出码。

隔离入口还会在临时库为测试管理员创建两条通知夹具，并用单独的浏览器上下文检查收件箱、单条已读、全部已读和角标变化。使用 `VERIFY_BROWSER_MODE=--notification-only` 可仅运行这一组。

使用 `VERIFY_BROWSER_MODE=--notification-push` 只验证 RocketMQ 到 Chromium 的 SSE 投递。预先使用 Podman 准备 `docker.io/apache/rocketmq:5.3.1` 镜像和含消费者装配修复的 system JAR。入口仅启动必需的隔离服务，不发布宿主端口；等待 Broker 创建主题、通知广播消费者注册和浏览器订阅后，再向 `apex-notification-topic` 发布定向夹具。只有 Broker 确认发送且 Chromium 实际收到随机标记的 `notification` 帧，才判定通过。该用例不验证业务事件生产者、通知落库、跨实例扇出或办公站内信 WebSocket 投递。

空库验证时，先确认 MySQL 的 `/var/lib/mysql` 为 tmpfs，再执行迁移。V76 后默认租户为 `default`；确保两个登录租户设置均与之匹配，且测试账号已有同租户 system 账号绑定。仅在本次临时空库补齐未绑定的测试账号，不改变租户归属。先启动 auth/system 并等待 system health UP，再启动网关和前端，避免冷启动探测触发业务熔断。结束后对专属项目执行不带 `-v` 的 `podman-compose down`。

### `--integration-reads` 的前置诊断

`--integration-reads` 依赖部署方授权材料。集成服务的连接器/凭据 Handler 标注 `@RequirePermission`，由 `IntegrationSecurityAspect` 调用 `IntegrationPermissionClient` 校验；该客户端在下列任一条件不满足时**直接拒绝（HTTP 403）**，不缓存、不降级、无测试放行开关：

1. `integration.security.authorization.shared-user-namespace=true`（默认 `false`）；
2. 授权中心的 **HTTPS** `base-url`（默认空）；
3. 按真实租户 ID 精确映射的 **reader token**（默认空映射）。

未设置 `VERIFY_AUTHORIZATION_CONFIG_DIR` 时，`podman-verify.sh` 会在启动栈之前直接失败并打印上述缺失项，避免跑完整栈才看到 403。这不是脚本缺陷，而是最小权限设计；占位或伪造凭据不属于验证手段。
