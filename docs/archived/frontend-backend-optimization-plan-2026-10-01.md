# Apex 前后端功能匹配评审与优化实施方案

**文档日期：**2026-10-01  
**状态：**待用户确认；本次仅进行静态源码评审和方案编写，未修改业务代码、运行测试、联调第三方或提交 Git。  
**目标：**核对 apex-admin-web 与 apex-scaffold 的功能和契约一致性，修复上线阻断，完善现有业务闭环，分级提出新功能与工程优化。  
**读者：**项目负责人、前后端开发、测试及部署维护人员。  
**范围决策：**用户已确认前后端协同优化、全面盘点并分级建议、优先上线质量与业务闭环。

## 1. 摘要与结论

当前前端需要继续优化，重点首先是恢复现有页面的真实可用性。认证基础、系统常规管理、日志和数据 CRUD 的主要路径较为一致；SSO、办公业务、生成器、上传和部分工作流功能存在明确契约断点。另有后端服务未完成或缺少第三方实现，不能只调整前端请求就宣称业务闭环。

建议按以下顺序执行：

1. 建立验证基线，修复上传、办公配置/绑定、工作流详情、SSO，以及菜单权限与账号切换问题。
2. 完善办公消息、审批、组织同步和数据下载/监控契约，恢复现有业务操作。
3. 完成生成器的生产请求链路，并补齐工作流待办、任务处理和定义管理。
4. 根据已验证的平台能力补齐日历、文档及其他新增管理入口。
5. 推进交互一致性、可访问性、移动布局、性能和持续契约检查。

优先级定义统一如下：P0 为安全状态或既有发布范围的核心闭环阻断；P1 为已展示功能的正确性与完整性问题；P2 为体验、维护性及有明确价值的新增能力；P3 为需单独产品设计的大型扩展。优先级不是耗时估算。生成器、SSO、办公等模块若不在某次发布范围内，可通过能力开关退出该次发布；其缺陷仍保留，不认定为已修复。

## 2. 评审依据、边界与证据规则

前端根目录：`/Users/work/apex-admin-web`，下文使用 F 表示。后端根目录：`/Users/work/apex-scaffold`，下文使用 B 表示。路径均相对对应根目录；行号用于定位本次评审版本，后续修改可能发生变化。

前端为 Vue 3.5、Vite 6、TypeScript、Pinia、Element Plus、Axios、ECharts；后端为 Java 17、Spring Boot 3.5.15、WebFlux、MyBatis-Plus 多模块工程。评审以 Router、Handler、DTO、Service 和前端实际调用为依据，不以历史说明或文件头注释替代执行代码。

- 主应用使用 `apex-interfaces`；独立 `apex-auth-center` 不属于同一 Spring 上下文。认证中心的 MFA、设备信任等能力不直接归入当前主应用已可用能力。
- 匹配包括 HTTP 方法、路径、query/body、请求/响应字段、枚举、ID、分页、权限、菜单和实际页面调用。
- “基本匹配”表示本次静态检查未发现主要契约阻断，不等于每个字段、分支或生产环境已验收。
- “确定差异”有直接源码证据；“未检出执行路由/实现”表示本次仓库搜索未发现，仍须通过运行时装配和测试确认。
- 未读取生产数据库、真实角色授权或第三方凭据；未验证生产菜单是否被人工修正，未测量性能，未运行测试或构建。
- 本方案不是完整后端安全审计。权限、租户隔离及阻塞线程边界在涉及改动的链路中回归验证。

开发约束：复用 F `src/utils/request.ts` 和 `src/utils/auth.ts`；新增菜单页登记 `VIEW_REGISTRY`；不改 `.bak`；后端使用 SDKMAN 指定 Java 和 mvnd，不回退 mvn；不修改已执行的 Flyway 脚本；不暴露密钥；不进行无关依赖升级、后端重构或未经授权的提交。

## 3. 当前功能匹配总览

| 业务域 | 当前状态 | 主要问题 | 处理方向 |
|---|---|---|---|
| 密码登录、验证码、刷新、身份 | 基础契约基本匹配 | 权限失败降级为空后放行；退出未清理动态路由 | 修复会话与权限状态 |
| 标准 OAuth2/PKCE | 核心契约基本匹配 | 客户端编辑缺少可回填配置；部分预留 API 未接入 | 保留 PKCE，完善配置契约 |
| 用户/角色/菜单/部门/字典/参数/任务 | 常规接口基本匹配 | 导航依赖管理菜单权限；分页控件状态；部分写响应类型 | 独立用户菜单、受控分页 |
| 认证配置 | 路径基本匹配 | 菜单组件键、OAuth2 按钮码不一致 | 兼容组件键、统一权限 |
| SSO | 多项确定不匹配 | DTO、分页、动作路径、ID、统计和权限码 | 前后端重建完整契约 |
| 文件上传与辅助接口 | 路径部分匹配 | sex 枚举、辅助路径、独立传输行为 | 统一参数和传輸 |
| 办公配置/绑定 | 主链路部分匹配 | version 位置、解绑方法、platform 读取、真实 total | 修复现有配置审批闭环 |
| 办公消息/审批/组织 | 页面已调用，契约多处不匹配 | 请求路径、身份、DTO、分页、同步参数 | 逐链路恢复 |
| 办公日历/文档 | 页面存在，能力未闭环 | 列表和动作路由、DTO、平台 Client 实现缺失 | 能力开关及逐平台补齐 |
| 工作流监控/实例 | 部分匹配 | 详情后缀、筛选未消费、降级 DTO | 优先恢复现有页面 |
| 工作流定义/待办/处理 | 前端主要为 API 封装 | 多个管理路由未检出；审批语义不能直接适配 complete | 补齐后端契约后接入页面 |
| 代码生成器 | 核心执行链阻断 | 路径错配、Service TODO、预览未注册 | 单独完成生成业务用例 |
| 数据文档/图表 | CRUD 基本匹配 | 下载 URL 被声明 Blob、日期筛选、渲染类型过度声明 | 修正接口与展示模型 |
| 监控与日志 | 日志基本匹配，监控部分差异 | Trace 无实现、指标字段超出后端、在线筛选未消费 | 可用性表达与 DTO 对齐 |
| 搜索 | 查询契约匹配 | 竞态、结果未定位、重建参数位置 | 查询生命周期及导航闭环 |

## 4. 详细问题台账与修复决策

### 4.1 会话、权限、菜单与认证配置

| 编号/级别 | 证据 | 影响与决策 |
|---|---|---|
| AUTH-01/P0 | F `src/stores/user.ts:60`、`src/stores/permission.ts:21` | 权限接口失败转空数组，空权限又直接放行。区分未加载、失败、成功空集；普通空集无权限，失败禁用受控操作并提示重试。超级管理员例外只能来自明确服务端授权，不由空集推断。 |
| AUTH-02/P0 | F `src/router/index.ts:100`、`src/stores/user.ts:95`、`src/router/dynamic.ts` | 登出后动态路由和加载标记未清理。记录 addRoute 返回的移除函数，会话结束统一移除、重置标记和菜单数据。A/B 账号切换须重新初始化。 |
| AUTH-03/P1 | B `.../handler/MenuHandler.java:73`、`apex-application/.../service/MenuService.java:63`；F `src/router/dynamic.ts:100` | 导航调用管理树且要求 system:menu:list。新增 `GET /api/v1/user/menus` 返回当前用户可访问菜单树；父目录保留条件为存在授权后代，按钮不成为导航。管理接口继续服务菜单维护。 |
| AUTH-04/P1 | B MySQL `V41__add_generator_auth_sso_office_tables.sql:282`、`V25__oauth2_authorization_server_schema.sql:229`；F `src/router/dynamic.ts:32,78` | 种子 system/auth-config/index 与注册 system/auth/index 不匹配；独立 OAuth2 组件键未注册。前端添加兼容 loader，OAuth2 旧入口跳转认证配置的客户端标签；新迁移仅规范已确认对应菜单记录。不得修改历史脚本。 |
| AUTH-05/P1 | F `src/views/system/auth/index.vue:63`、`src/views/system/sso/index.vue:19`；B `OAuth2ClientManagementHandler.java:62`、MySQL V50:88、V41:335 | OAuth2 统一 system:oauth2:client:create/update/delete；SSO 统一 system:sso:provider:add/edit/test/remove/metadata、session:revoke。补齐实际 Handler 使用但缺失的 query/stat 权限种子，同步角色授权迁移和拒绝用例。 |
| AUTH-06/P1 | F `src/directives/permission.ts:16`、`src/layouts/AdminLayout.vue:25,120` | 指令删除 DOM 后无法恢复；布局不递归过滤隐藏后代。权限展示改为可恢复的可见性控制，真实鉴权仍在后端；提取递归菜单渲染，逐节点处理 title/hidden 和三级菜单。 |
| AUTH-07/P2 | B `OAuth2ClientResponse.java:43`；F `src/views/system/auth/index.vue:729` | 返回 DTO 缺 PKCE、consent 和有效期，编辑需重新填。返回非敏感设置，编辑完整回填；密钥不回显，密钥变更与普通编辑区分。 |

权限 CRUD 目前还有管理员角色边界，不能因 Handler 无细粒度注解就认定无鉴权。实施时对齐前端按钮码与后端授权模型，并验证默认安全配置。AUTH-03 涉及租户：仅返回当前上下文菜单，禁止客户端传入任意租户获取导航。

### 4.2 文件上传与下载

| 编号/级别 | 证据 | 影响与决策 |
|---|---|---|
| FILE-01/P1 | F `src/api/file.ts:30`、`src/components/FileUpload.vue:77`、`FileUploadEnhanced.vue:201`；B `FileHandler.java:85,329` | 前端 0/1，后端只接受 1=AM、2=AF。前端按后端枚举修改 API、默认值和 Demo，同时修正后端 OpenAPI 残留描述。既有 0 不静默转换，非法值明确报错。 |
| FILE-02/P1 | F `src/api/file.ts:51`；B `ApiRouter.java:2459,2545` | 辅助接口按现行 `/api/v1/file/url`、`/file/delete`、`/file/exists`、`/file/content` 统一；通用上传仍为 `/api/v1/files/generic`。删除 Demo 校验对象路径及操作结果。 |
| FILE-03/P1 | F `FileUploadEnhanced.vue:306,464,673` | XHR 完成未成为 Promise；异步 JSON 异常、timeout/abort、粘贴范围和文件列表状态不完整。用统一上传入口支持进度和取消，保持 Axios 会话与错误语义；对一次性 multipart 请求验证重放行为，不能盲目重试不可重放上传。 |
| FILE-04/P1 | F `src/api/document.ts:109`；B `DocumentHandler.java:170` | 数据文档下载返回 URL 而非 Blob。声明 Promise<string>，页面基于后端受控 URL 下载；校验协议/目标策略，不将任意 URL 当可信导航。对象不存在或签名失效显示失败，不生成伪 Blob。 |

增强上传压缩同时满足宽高上限且不放大；裁剪、粘贴与选择成功均更新统一文件列表。粘贴限启用且聚焦的组件区域，卸载清理事件、在途请求和 Cropper；后端仍独立校验 MIME、大小、文件权限。

### 4.3 SSO

证据入口：F `src/api/sso.ts:30,131,231,271`、`src/views/system/sso/index.vue:603,631,654,685`；B `SsoAdminRouter.java:178`、`SsoProviderRequest.java:36`、`SsoSessionDTO.java:34`、`SsoAuditLogDTO.java:44`、`SsoStatisticsDTO.java:33`。

| 编号/级别 | 当前差异 | 确定采用的方向 |
|---|---|---|
| SSO-01/P0 | name/type/config 与 providerName/protocolType/configJson 不同 | API 类型采用后端 DTO；页面通过显式转换维护表单。协议配置解析失败禁止提交，不能用 as any 绕过。authEndpoint/entityId 按协议完整传入。 |
| SSO-02/P0 | 会话和审计响应为数组，页面读 list/total；页1以 page*size 截取 | 后端统一 1 基页码和数据库分页 `{list,total}`，补准确筛选；前端解析同步。Service 起点 `(page-1)*size`，非法 page/size 返回参数错误。 |
| SSO-03/P1 | 单会话 DELETE+sessionId，而后端 POST+数值 id | 前端采用 `POST /admin-api/v1/sso/sessions/{id}/revoke`，使用数值 DTO id。重复撤销有明确幂等结果。 |
| SSO-04/P1 | 提供商 toggle 无路由；批量 terminate 无路由 | 启停通过既有 provider 更新契约执行，仅提交合法配置与 enabled；批量撤销首阶段并发调用单条 revoke 并报告成功/失败明细，不声称原子事务。新增专用批量服务归后续阶段。 |
| SSO-05/P1 | 统一 statistics 无路由；字段名不一致 | 调用 sessions/statistics 与 audit-logs/statistics，前端转换为有来源的展示模型；提供商数量来自后端可信统计，不由当前页长度推断。 |
| SSO-06/P1 | provider/action/result 查询字段与后端不同；FAILED/FAILURE 不同 | 后端支持 providerId、operationType、result、时间范围；前端采用 FAILED 枚举并集中映射展示文案。会话时间/IP 字段直接按后端 DTO 展示。 |

分页 Service 证据：B `SysSsoProviderService.java:221`、`SysSsoSessionService.java:119`、`SysSsoAuditLogService.java:131`。统一响应涉及兼容变更：保留旧数组调用的兼容版本，管理前端切新版本后再按使用方盘点退役；不能未经盘点直接改变第三方已用接口。

### 4.4 办公配置、登录、消息、审批与组织

| 编号/级别 | 证据 | 修复方案 |
|---|---|---|
| OFF-01/P0 | F `src/api/office-new.ts:166`；B `OfficeAdminHandler.java:173`、`OfficeAdminService.java:99` | 更新 body 增加 version；保持函数参数 version 并构造 `{...request,version}`。服务端校验非负整数、缺失和旧版本，冲突不覆盖新值；页面重载并要求重新确认。 |
| OFF-02/P0 | F `office-new.ts:218`；B `OfficeAdminRouter.java:171` | 解绑改 DELETE，version 保持 query；绑定 review POST/body 已匹配，保留。 |
| OFF-03/P0 | B `OfficeAdminHandler.java:242` 及 platform 解析函数；F `bindings/index.vue:223` | 绑定列表 platform 从 query 读取，不能读不存在的 pathVariable。支持 status，返回真实分页和 total；搜索重置页码，翻页不重置。 |
| OFF-04/P1 | F `office.ts:405,576`；B `OfficeMessageRouter.java:197`、`SendMessageRequest.java:38` | 发送用 POST `/api/office/messages`，字段统一 targetType/userIds/groupIds；显式解析发送结果和部分失败。新增发送记录列表对应页面筛选与分页，不能复用别的消息模块冒充办公发送历史。 |
| OFF-05/P1 | F `approval/index.vue:182,230`、`office.ts:627`；B `OfficeApprovalHandler.java:312`、`InitiateApprovalRequest.java` | 后端从认证用户绑定推导 initiator/approver；无平台绑定返回明确业务错误，不接受空身份或任意身份冒用。请求统一 platform/appId/processDefinitionId/formData，待办/已发起返回分页对象。 |
| OFF-06/P1 | F `office.ts:387`、`organization/index.vue:346`；B `OfficeOrganizationRouter.java:206` | 同步用 POST `/api/v1/office/organization/sync`，传 platform/syncType/fullSync。部门与成员选项分别生成 DEPARTMENT/MEMBER 任务，处理依赖顺序与失败明细；历史查询采用实际 page/size。 |
| OFF-07/P1 | B `OfficeApprovalRouter.java:275`、`OfficeCalendarRouter.java:295`、`OfficeDocumentRouter.java:362` | 将 pending/initiated、range/my/upcoming、folder/my 等静态路径置于 `/{id}` 前面；逐项 WebTestClient 验证确实分派到指定 Handler。 |
| OFF-08/P2 | F `views/login/index.vue`、`views/office/callback.vue`、`office-new.ts` | 登录页接入已启用平台列表与 startOfficeLogin；标准 OAuth2 保留。回调失败清理部分会话，等待审批采用结构化业务码，保留 state 校验；不自动轮询获批登录。 |

OFF-05 的普通“我的”接口由后端确定当前主体，管理员代查使用独立授权参数和审计，避免把第三方用户 ID 选择作为普通审批页面必填项。旧新办公 API 先梳理实际引用，再移除无调用且无可用后端契约的封装；不全局替换分页命名。

### 4.5 办公日历与文档

B `OfficeCalendarService.java:356`、`OfficeDocumentService.java:383` 通过平台名称寻找 Client；当前检索仅发现 CalendarClient/DocumentClient 接口，未找到具体实现。该问题属于能力缺口，不能用 Mock 或前端空列表认定完成。

- CAL-01/P1：F `office.ts:790,892` 根 GET 列表未注册；统一列表接口和分页，allDay 转 isAllDay；组织者由认证绑定得到；校验结束时间、全天时区和重复事件语义。修改 B `OfficeCalendarRouter.java`、`OfficeCalendarHandler.java`、`CreateCalendarEventRequest.java` 及对应 Service。
- DOC-01/P1：F `office.ts:954,1037` 的根 GET、PUT、share 未找到执行路由；创建 parentFolderId 对齐 folderId，文档类型和 owner 身份按后端契约。修改 B `OfficeDocumentRouter.java`、`OfficeDocumentHandler.java`、`CreateDocumentRequest.java`。
- DOC-02/P1：F `office.ts:1054` 的复制/移动参数在 body，B `OfficeDocumentHandler.java:422,478` 读 query。后端统一 body DTO，并校验目标文件夹权限、空目标和同目录操作。
- CAP-01/P1：能力探测响应显式表达每个平台 calendar/document 等支持项；无实现时显示不可用原因、禁止动作，不显示成功假象。
- CAP-02/P2：新增具体平台 Client 必须以平台官方可支持的动作验证。按 FEISHU、DINGTALK、WECOM 顺序独立验收；每个平台形成创建/查询/更新/取消、分享/复制/移动的支持矩阵。平台不支持的动作明确关闭，不能强行要求全部支持。

CAP-02 为可选扩展，确认执行时按平台批准；不在基础契约修复阶段自动扩大三平台开发范围。

### 4.6 工作流

证据：F `src/api/workflow.ts:40,81,90,122,161`、`src/types/workflow.ts`、`src/views/workflow/components/TaskActions.vue`；B `WorkflowRouter.java:185,307,509`、`WorkflowHandler.java:194,252,289,331`。

- WF-01/P0：实例详情改为现行 GET `/admin-api/v1/workflows/instances/{id}`；校验路由 ID 正整数，缺失实例显示 404 业务状态。
- WF-02/P1：列表 initiatorId 后端解析并传递查询 Service；pageNum/pageSize 与 records/total 保持工作流现有约定。PageResponse 的 records 别名不能误判为分页不匹配。
- WF-03/P1：统计和趋势异常分支保持同一 DTO。推荐返回明确错误而非伪装正常零值；若保留降级数据，响应增加可识别的 degraded 标记，页面显示数据暂不可用，禁止使用不同字段集合。
- WF-04/P1：definitions CRUD/list、管理待办、通过/驳回、任务详情当前未检出对应路由。先梳理引擎支持，再新增受控管理契约。保留现有 `/api/v1/workflows/tasks/pending` 和 complete 的兼容行为；不能将 approve/reject 简单映射为只读取 comment 的 complete。
- WF-05/P2：新增工作流定义、我的待办和任务详情入口；后端请求使用明确 APPROVE/REJECT outcome、comment 和并发控制；驳回去向由流程定义和引擎规则决定。未支持驳回的定义返回 unsupported，不擅自终结或回退。
- WF-06/P2：接入 TaskActions，父组件处理 approve/reject，高级操作保留实际对应 API；previousNodes 由后端给出合法目标，监听 prop 变化。验证非处理人、重复操作、已完成/挂起任务和跨租户 ID。

定义管理和引擎扩展归单独实施批次：必须先给出真实支持的图结构、节点配置和版本规则，再设计编辑器；不把可视化拖拽编辑器作为默认新增项。基础批次先修复实例监控、详情、筛选、挂起/恢复。

### 4.7 生成器、系统和数据库

- GEN-01/P0：F `src/api/generator.ts:190`、`src/views/system/generator/index.vue:745` 发往根 generate；B `GeneratorAdminRouter.java:295` 为 configs/{id}/generate。前端采用后端 ID 路径。
- GEN-02/P0：B `CodeGenerationService.java:65,82,96` 的表查询、字段查询、generate 返回 TODO 错误；`GenConfigHandler.java:208`、`CodeGeneratorHandler.java:99` 确实调用该 Service。先完成现有配置/模板持久化到生成的用例；`apex-generator` 独立模块不是当前运行时依赖，不能直接视为已接通。
- GEN-03/P1：新增预览执行路由和返回 GeneratedFile DTO；生成请求是否允许覆盖配置统一成明确 body DTO，Handler 不再忽略请求体。预览只返回代码，生成打包由服务器控制路径，禁止任意文件系统写入和路径穿越。
- SYS-01/P2：F `src/api/system.ts:306,311,316` 的任务删除、执行和状态变更不是实际 void；按 B `JobHandler.java:324,364,398` 修正响应类型，页面按真实执行状态提示。
- DB-01/P2：F `src/types/index.ts:655`、`src/api/database.ts:32` 的 environment 未被 B `DatabaseConfigService.java:69,213,294` 消费。基础方案移除“选择环境会改变结果”的 UI 承诺，保留为明确标签；若后续实现环境模板，另行增加配置差异和验证。不得把数据库密码写入 VITE 配置。

生成器完成标准为：测试数据源读取表/字段、配置保存、模板预览、生成包下载和失败清理真实通过；不能只让 URL 返回 200。生产数据库只读扫描，连接、表名和模板输入均进行授权与参数验证。

### 4.8 数据、监控、日志与搜索

| 编号/级别 | 源码证据 | 处理决策 |
|---|---|---|
| DATA-01/P1 | F `document.ts:19,57`；B `DocumentHandler.java:127` | 后端补 startDate/endDate 读取和数据库过滤，采用含起点、不含下一日终点的时间区间，明确时区；反向范围报错。 |
| DATA-02/P2 | F `types/index.ts:307,319`；B `ChartDataResponse.java:33` | API DTO 不承诺 legend/tooltip/grid 和样式字段；本地 ECharts 展示选项拆为 UI 模型，不强求后端返回全部渲染选项。 |
| MON-01/P1 | F `monitor.ts:37,61`；B `OnlineUserHandler.java:102` | 支持 username 查询并返回真实总数，沿用用户会话撤销的正确 user id。 |
| MON-02/P1 | F `monitor.ts:105`；B `ApiRouter.java:1176` | Trace 详情路由未检出。能力关闭时显示未配置；新增查询接口需后端实际追踪提供商适配和权限，禁止静态伪数据填充。 |
| MON-03/P1 | F `types/index.ts:413,455,522,581`；B `MonitorSystemResponse.java:46,89`、`MonitorMiddlewareResponse.java:67`、`MonitorGovernanceResponse.java:75` | gcPauseTotal 统一 gcPauseTotalMs；网络、Tracing、Gateway 必填字段限定为真实 DTO。缺失或不可采集值显示“不可用”，不默认 0，单位集中定义。 |
| SEARCH-01/P1 | F `GlobalSearch/index.vue:118` | 防抖加请求序号或 AbortSignal，清空、卸载使旧请求失效；旧响应不能改列表和 loading。 |
| SEARCH-02/P1 | F `GlobalSearch/index.vue:144`、`views/system/user/index.vue:378` | 搜索按资源类型路由映射跳转详情或在列表消费 id 打开目标；无权限和已删除给明确提示，不硬编码未存在的动态路径。 |
| SEARCH-03/P2 | F `search.ts:66`；B `UnifiedSearchHandler.java:174` | 索引重建 type 先按后端 query 修正；新增管理入口需权限、范围确认、进度/结果及审计。未调用封装不算现有页面故障。 |

登录/审计/API 日志和 `log.ts` 主要路径参数匹配，暂不安排无证据的重构。监控新增指标必须有真实采集来源和单位，不为满足前端类型编造数据。

## 5. 前端体验、维护性与工程优化

### 5.1 受控分页和请求状态

F `src/components/Pagination.vue:30` 内部维护页码但只接 total；`src/views/system/user/index.vue:225` 搜索重置请求 page 后控件仍可能停留旧页。组件增加受控 page/size 与对应更新事件，逐一迁移现有调用方；普通 page/size 和工作流 pageNum/pageSize 由页面显式适配。搜索回第一页、翻页保留筛选、删除末页最后一条后回退一页；不得因组件同步重复查询。

查询、提交、删除分别管理 loading；写入成功但刷新失败提示“操作成功，列表刷新失败”，避免用户重复提交。确认框取消不作为接口错误。并发操作禁止旧响应覆盖新结果。

### 5.2 composables 接入策略

当前 useCrud/useTableConfig/useFormDraft/useBreakpoint 未发现业务页面调用，不把这些问题描述为所有页面当前故障。

- `src/composables/useCrud.ts:74`：先保留筛选条件，批量删除返回逐项结果并刷新，再从一张现有低风险列表试点；不全仓一键替换。
- `src/composables/useTableConfig.ts:54`：深复制默认配置，校验存储结构，按配置版本迁移，reset 恢复真正默认值。
- `src/composables/useFormDraft.ts:50`：存储成功后才更新时间戳；清除取消防抖；校验时间；键包含用户/租户和表单版本。敏感认证配置不自动保存草稿，退出清理。
- `src/composables/useBreakpoint.ts:30`：在布局接入真实断点，窄屏侧栏抽屉、搜索弹层自适应宽度。
- 将实际使用的 `@vueuse/core` 声明为直接依赖；不依赖偶然存在的传递依赖。

### 5.3 可访问性、性能和部署

F `src/layouts/AdminLayout.vue:53` 的仅 click 图标改可聚焦按钮并提供名称、键盘交互和焦点状态；弹窗、搜索、菜单和上传通过键盘走通。窄屏覆盖 360px、768px 和桌面，表格提供受控横向滚动。

F `src/main.ts:15` 全量图标/Element Plus 是包体来源，先对生产产物记录体积与首屏指标，再按真实收益采用局部图标和按需组件。ECharts 优化复用现有主题/销毁模式。没有测量前不承诺性能改善百分比。

F `vite.config.ts:91` 输出 js/css 等目录，而 `docker/nginx.conf:16` immutable 仅覆盖 assets。规则覆盖带 hash 的 js/css/img/font；index.html 不使用 immutable，History 回退和接口代理单独验证。运行期 API_PROXY_PASS 只影响反代，不重写构建期 VITE_API_BASE_URL。

F `package.json:52`、`Dockerfile:14` 声明/使用 Node18，但安装的 Vitest5 要求更高版本。方案统一 Node22（至少22.12），锁定可复现环境并验证依赖 engines；保留 Vite6/TS5.7，不顺带升级业务框架。补同版本 `@vitest/coverage-v8`；增加非监听 typecheck 和经确认的 lint 配置，已有代码问题单独定基线，禁止格式化整个仓库掩盖业务改动。

## 6. 新功能建议与明确范围

| 功能 | 级别/性质 | 前置依赖 | 验收结果 |
|---|---|---|---|
| 当前用户授权菜单 | P1，现有导航修复 | AUTH-01～03 | 业务角色无需菜单管理权限也能导航 |
| 办公平台登录入口 | P2，已有能力接入 | 配置/绑定闭环、回调错误码 | 启用平台可登录或明确等待审批 |
| 工作流我的待办、任务详情和动作 | P2，业务补齐 | WF-04 引擎契约 | 审批和拒绝语义、权限、刷新一致 |
| 工作流定义管理 | P2，单独子项目 | 定义版本与引擎用例 | 查询/保存/发布可验证；拖拽编辑器另批 |
| 索引重建管理 | P2，已有能力接入 | SEARCH-03、执行进度模型 | 范围确认、权限和结果可追踪 |
| 日历/文档真实平台能力 | P2，可选逐平台扩展 | CAP-01，平台凭据和权限 | 支持矩阵内动作真实联调通过 |
| Trace 详情 | P2，可选后端扩展 | 追踪提供商及数据访问权限 | 按 traceId 查询真实调用链 |
| 表格偏好、表单草稿 | P2，可选体验 | hooks 存储与隔离修复 | reset、跨账号、损坏数据回归通过 |
| 批量任务中心、取消/重试、跨设备偏好 | P3，另行产品设计 | 后端任务与偏好持久化模型 | 单独规格和审批，不纳入基础执行 |
| MFA/可信设备管理 | P3，独立认证中心对接 | 确认运行拓扑和协议 | 不把 auth-center 内部能力当主应用接口 |

无需重复新增在线用户强退、普通用户角色管理、运行/业务日志等已有入口。许可证离线工具、示例模块、内部风控实现不自动暴露为前端管理功能。

## 7. 分阶段实施任务与文件范围

### 阶段 A：验证基线与风险控制

- [ ] 记录两仓库当前分支、工作区变更和工具版本，保留用户已有修改。
- [ ] F 修改 package.json、现有锁文件和 Dockerfile 对齐 Node22；补覆盖率依赖和检查入口。B 核对根 pom.xml、apex-interfaces/pom.xml、apex-auth-center/pom.xml 的测试选择。
- [ ] 将不匹配 Surefire/Failsafe 的 `Knife4jIntegrationContractTest` 归入契约测试入口；Smoke/Live 保持独立显式入口，避免默认测试调用远程系统。
- [ ] 建立契约表驱动用例：方法、路径、参数位置、DTO、权限、菜单键；先覆盖本文阻断项，后续逐域扩展。
- [ ] 对未完成平台能力使用配置开关和清晰 UI 状态，不用 Mock 替代真实完成。

验收：类型检查和当前有效测试基线可复现，报告明确实际执行测试集合；已存在失败保留证据并归入具体修复项。

### 阶段 B：基础闭环修复

- [ ] 实施 AUTH-01～06：F stores/user.ts、stores/permission.ts、directives/permission.ts、router/index.ts、router/dynamic.ts、layouts/AdminLayout.vue；B ApiRouter/MenuHandler/MenuService 及新双数据库权限/菜单迁移。
- [ ] 实施 FILE-01～04：F api/file.ts、两个上传组件、两个 Demo、api/document.ts 及下载调用页；B FileHandler/OpenAPI。
- [ ] 实施 OFF-01～03、OFF-07：F office-new.ts、配置/绑定页；B OfficeAdminHandler、OfficeAdminService、OfficeAdminRouter 和静态路由排序。
- [ ] 实施 WF-01～03：F api/workflow.ts、types/workflow.ts、现有实例/监控页；B WorkflowHandler 和查询 Service。
- [ ] 实施 SSO-01～06：F api/sso.ts、views/system/sso/index.vue；B SsoAdminRouter、对应 Handler/DTO/Service/Repository 和权限迁移。

验收：上传、SSO、配置更新、绑定审批/解绑、实例详情、账号切换和业务角色菜单在隔离环境走通；所有失败场景均无伪成功。

### 阶段 C：完善现有业务

- [ ] 实施 OFF-04～06：F api/office.ts、消息/审批/组织页；B office 下 Router/Handler/DTO、application/office Service 及记录查询。
- [ ] 实施 GEN-01～03：F api/generator.ts、生成器页；B GeneratorAdminRouter、GenConfigHandler、CodeGeneratorHandler、CodeGenerationService 和既有配置/模板领域持久化链。
- [ ] 实施 DATA-01～02、MON-01～03、SEARCH-01～02，统一真实数据与展示状态。
- [ ] 修改 F Pagination.vue 和所有实际调用页，完成受控页码迁移；用第一张列表验证后再扩展。

验收：现有页面中已开放功能具备完整查询、输入、操作、错误和刷新闭环；生成器有真实产物；监控不显示缺失字段为 0。

### 阶段 D：按优先级补齐能力

- [ ] 实施 OFF-08、WF-04～06 和 AUTH-07，新增页面必须登记菜单组件与权限。
- [ ] 实施 CAP-01、CAL-01、DOC-01～02，先完成契约和禁用状态；CAP-02 按用户选择逐平台实施。
- [ ] 可选实施索引重建、Trace、偏好/草稿。每项独立验收，不依赖其他可选项才能发布。

验收：新增能力支持范围与 UI 展示一致；未批准平台和 P3 项不进入实现。

### 阶段 E：质量、体验和性能

- [ ] 修复并试点 composables，接入键盘和窄屏布局。
- [ ] 生产构建测量后实施按需加载、缓存规则和实际图表生命周期优化。
- [ ] 增加 Playwright 配置与关键流程 E2E；CI 运行类型、lint、单元/组件、后端契约和集成测试的明确集合。
- [ ] 按实际变更同步两仓库 AGENTS.md 和已有相关文档；不复制第二套易失同步的 API 清单。

验收：关键浏览器流程、质量检查和生产代理/缓存验证通过；性能比较使用相同构建、机器、数据及登录状态。

## 8. 接口兼容、迁移和发布策略

1. 现有后端路径正确且语义完整时前端适配；后端字段丢失、错误分页、静态路由覆盖和未实现服务直接修后端。
2. 新分页/新动作契约先盘点其他调用方。存在外部调用时新增版本或兼容路由，不对原有数组响应无通知替换；兼容响应不得混合两种不可判定形态。
3. MySQL/PostgreSQL 新建迁移使用执行时仓库下一个可用版本号；不得预写可能冲突的固定版本或改 V41/V50。迁移按实际菜单业务标识匹配，重复部署安全，不强绑种子数值 ID。
4. 先部署可兼容新旧前端的后端，再部署前端；能力开关默认关闭新增平台和大功能，测试通过后逐项开启。
5. 回滚优先回退前端和关闭能力开关；新增数据库字段/权限采用前向修复，不执行破坏性删库回滚。
6. 观察 HTTP404/405、业务400/403、版本冲突、刷新失败、第三方失败和前端异常，使用 traceId 关联；禁止日志输出密码、完整 Token、平台密钥或审批敏感正文。

## 9. 测试与验收矩阵

| 场景 | 数据/操作 | 通过标准 |
|---|---|---|
| 权限 | 成功空集、加载失败、业务角色、管理员 | 空集不放行；失败可重试；无权限写接口返回403 |
| 账号切换 | A退出后同标签页B登录 | A菜单/动态路由消失，B重新初始化 |
| 菜单 | 隐藏子项、三级目录、未知组件 | 正确递归、未知组件有可诊断告警、注册键可校验 |
| 上传 | sex=0/1/2、过期Token、裁剪/粘贴/取消 | 0被拒绝、1/2语义一致、状态和进度最终一致 |
| SSO分页 | 0、1、20、21条及筛选 | 首页含首条，跨页不重叠，total准确 |
| SSO动作 | 数值id撤销、重复、部分批量失败 | 真正调用已注册路由，明细完整 |
| 版本控制 | 两个编辑者使用相同version | 第二次失败，不覆盖，重载后再次确认 |
| 办公静态路由 | pending/range/my/folder/upcoming | 分派到专用Handler，不落入id解析 |
| 身份 | 无绑定、伪造initiator、跨租户目标 | 后端推导主体并拒绝未授权操作 |
| 审批/同步/消息 | 成功、第三方失败、部分成功 | 无伪成功，刷新/历史可追踪 |
| 工作流 | 不存在实例、挂起、重复处理、驳回 | 状态与引擎规则一致，统计降级可识别 |
| 生成器 | 表扫描、预览、下载、非法模板路径 | 真实产物正确，失败无危险写入 |
| 文档与监控 | 下载URL、日期范围、指标缺失 | URL契约正确、筛选生效、未知值不显示0 |
| 搜索与分页 | 乱序响应、清空、卸载、搜索后页码 | 旧响应失效，页码和请求同步，无重复查询 |
| 平台能力 | 未实现、无凭据、成功联调 | UI不冒充可用，支持矩阵与真实动作一致 |
| 部署 | History路由、api代理、js/css缓存 | 首页不immutable，哈希资源缓存，接口能达后端 |

前端沿用 happy-dom/Vitest，新增有业务意义的组件用例；真实 OAuth跳转、剪贴板、Canvas、上传和键盘由 Playwright/人工浏览器验证。后端使用 Router→Handler 的 WebTestClient 契约测试，并用真实数据库/Redis隔离环境验证分页、租户、并发和事务。mock Service 切片不代替端到端验收。

实施阶段命令（本次未执行）：

```bash
# 前端，工作目录 /Users/work/apex-admin-web
node --version
npm ls vitest vite happy-dom @vitest/coverage-v8 @vueuse/core
npx vue-tsc --noEmit
npx vitest run
npm run build
npm run test:coverage -- --run
```

coverage 命令仅在补齐匹配版本 provider 后运行；新增 lint/typecheck 脚本后纳入检查。当前不存在 npm run lint，不记录为已通过。Playwright 配置建立后运行 `npx playwright test`。

```bash
# 后端，工作目录 /Users/work/apex-scaffold
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk env
java -version
mvnd --version
mvnd -pl apex-interfaces help:effective-pom
mvnd -pl apex-auth-center help:effective-pom
mvnd test
mvnd verify
```

根据有效 POM 核对执行报告；remote-it、stress-tests 仅在具备对应环境且明确执行范围后运行。相关 ArchUnit 测试、双数据库 Flyway验证和真实Redis验证列入后端验收。默认 verify 成功不能自动推定所有 Smoke/Live 或远程测试已执行。

## 10. 最终决策与执行门槛

已确定：前后端协同修复；上线质量优先；全面盘点但分阶段执行；常规分页保持 page/size，工作流保持 pageNum/pageSize；不对所有 UI 使用同一响应形态强行改造；历史迁移只读；不提交 Git；不以 Mock 或禁用页面宣称功能修复。

建议本次批准阶段 A～C，并将阶段 D/E 按功能单独选择。若批准全方案，默认执行顺序为 A→B→C→D 的基础接入项→E；CAP-02 三平台、Trace 提供商、拖拽流程设计器及 P3 仍需专项范围批准，不因全方案概览而自动纳入。

执行时尚需的外部资料仅包括隔离测试环境、数据库/Redis/工作流引擎可用性、实际部署认证拓扑和平台测试凭据；从安全配置注入，不写入前端或文档。缺少这些资料仍可完成契约修复及隔离测试，但不能签署真实平台/生产验收。

方案确认前只更新此文档。确认后按所选阶段实施，逐项报告修改、验证结果和阻塞条件；未完成或验证失败的条目不标记完成。
