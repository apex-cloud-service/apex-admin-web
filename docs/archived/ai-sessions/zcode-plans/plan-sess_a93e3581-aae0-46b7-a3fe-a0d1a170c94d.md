## Context
上一批注释评审确认了三项业务缺陷：知识问答 SSE 错误帧格式不统一；刷新令牌重放检测不可达且轮换写入不原子；文档删除不清对象、索引任务未确认且没有删除恢复机制。本次先修复并验证这些问题，再执行下一批注释整改，保留首批全部未提交改动。

进一步核对发现知识索引删除还用了整索引文档删除路径，必须一并改为正确的过滤删除端点。所有验证使用 mock 或隔离测试资源，不对现有数据库、桶、索引执行删除。

用户已选择：**新删除自动清理；历史清理默认关闭且按租户限定，不猜测历史对象位置；接受删除后展示后台清理进度。**

## 1. 统一知识问答 SSE 错误协议
- `KnowledgeChatHandler`、`KnowledgeRequestHandlerUtil` 与 `KnowledgeChatAppService` 统一 `error` 数据为现有兼容结构 `{code: string, message: string}`。
- 业务异常保留安全业务消息，技术异常使用通用提示并仅在后端日志记录细节；任何兜底都返回有效 JSON。
- 聊天页增加局部健壮解析，兼容旧纯文本响应；保留部分答案并追加一次失败提示，不能让答案截断看似正常。
- 终止性错误停止后续事件消费，取消/释放 reader，清理异常不覆盖原始失败。共享 `createSseParser` 仍只做分帧，不加入业务 JSON 逻辑；不扩大为自动重连或宽松令牌刷新。
- 增加聊天页组件测试和后端错误帧契约测试，覆盖分块、部分答案、异常消息不泄漏及生成状态复位。

关键文件：前端 `src/views/knowledge/chat/index.vue` 及其新组件测试；后端 `apex-services-bom/apex-knowledge-service/.../KnowledgeChatHandler.java`、`KnowledgeRequestHandlerUtil.java`；`apex-business-parent/apex-knowledge/.../KnowledgeChatAppService.java` 与相邻测试。

## 2. 刷新令牌安全轮换
- 保持普通 `validateToken()` 拒绝已撤销令牌。抽取验签、声明完整性、可信租户、仓储身份一致性校验，刷新链可读取撤销记录来区分“已消费重放”与普通退出撤销。
- 复用 `JwtKeyMaterialService`、`JdbcTenantScope` 和现有同步 `TransactionTemplate` 模式；JWT 签名/加密在事务前准备，不在 JDBC 事务里等待 Redis 或 `.block()`。
- 新增原子仓储轮换：按可信租户锁定用户行，重新校验旧令牌，以 CAS 消费旧 refresh，并在同一 JDBC 事务插入新 ACCESS/REFRESH。任一插入失败整体回滚，不能通过恢复已提交旧令牌补偿。
- 初始签发的两次保存复用原子保存令牌对，避免部分新令牌残留。
- 新令牌继承 family、previousJti、刷新计数与已验签 clientType，保留 accountId/username 声明。
- 重放维持原有“当前租户下该用户全部令牌撤销”策略，不引入宽松重放窗口。重放撤销与轮换共用用户行锁，避免撤销后并发后代插入漏网；撤销提交后再发出 401，不能抛错导致安全撤销回滚。
- 成功审计在提交后记录，日志失败不恢复旧令牌或把已提交签发伪装成可重试操作；安全撤销不依赖日志成功。
- 保持 `/auth/v1/refresh` 裸 TokenPair 与 HTTP 契约，不直接接入现有未消费的 `RefreshTokenRotationService`。

关键文件：`apex-components-parent/apex-auth/.../TokenServiceImpl.java`、`TokenRepository.java`、`TokenRepositoryImpl.java`、`TokenService.java`，必要的领域结果类型及 TokenMapper 查询；现有服务/仓储测试和新的真实 JDBC 事务并发测试。所需令牌字段已在既有迁移中，不修改历史迁移。

## 3. 持久化文档删除与后台资源清理
### 安全索引操作
- `MeilisearchKnowledgeAdapter.deleteDocumentChunks` 改用 `POST /indexes/{index}/documents/delete`，JSON `filter` 严格限定可信 tenantId 和 documentId；统一过滤值验证/转义，空租户和非法 ID 拒绝，不调用 delete-all。
- 复用 WebClient 实现有界 task 查询：有效 taskUid、succeeded 才完成；failed/canceled、超时、网络异常和畸形响应明确失败/结果未知。
- 索引创建、设置及 upsert 同样确认任务结果，不把提交成功写成索引已生效；只有明确的 index_already_exists/index_not_found 使用对应幂等处理，其他错误不吞。

### 清理凭证与并发边界
- 利用现有软删除主档，新增删除状态/清理凭证与存储定位快照；必要时增加知识域专属清理任务表，不新增通用任务框架、MQ 或 Seata。
- 新上传保存实际 provider、bucket、objectKey 和知识索引目标。删除在短 JDBC 事务内记录意图与快照并隐藏文档，外部网络操作不放进事务。
- 专属后台清理任务按租户、文档有界认领：确认索引删除、删除独占上传对象、清理数据库分块，持久化阶段与失败状态。MANUAL 跳过存储；对象明确已不存在视为幂等完成，权限/网络错误不能吞。
- 摄取、重建、校准与删除使用数据库条件认领/版本检查；待删除文档禁止新摄取，所有状态/分块写入验证操作所有权和 affected rows。独立订阅显式携带捕获的可信租户，不使用租户 `0` 回退。
- 对在途或结果未知的索引写入保留清理待重试；保留删除凭证并做后续定向复核，让晚到写入最终收敛。**完成状态表示最近一次清理已确认，不承诺分布式网络中的瞬时、永久无残留；不自动物理清除恢复凭证。**
- 上传对象写入成功但主档登记失败时清理已知独占对象，失败保留可恢复凭证；不推测或删除共享/未知资源。
- 新任务的扫描使用自身可信租户投影及显式 SQL 限定；沿用 `TenantContext`/JDBC 专用调度器，不修改共享租户白名单或使用 `@InterceptorIgnore`。
- 历史软删除索引清理提供默认关闭、明确租户范围的受控入口，只按现存软删除凭证定向处理；历史 provider/bucket 未知的对象不自动删除，物理主档消失的孤儿不做全索引差集删除。

### API 与页面
- 保持现有删除端点布尔返回表示“删除意图已接受”，不再表示外部资源全部清理。
- 增加同权限域的清理状态分页/详情与手动重试接口（读沿用 kb:doc:read，重试沿用 kb:doc:delete），同步 Router、SpringDoc、前端 API/DTO。
- 文档页增加“删除清理记录”区块，显示待清理/处理中/完成/待重试及安全错误摘要，提供手动刷新和重试，不新增菜单。
- 追加知识库两数据库下一版本迁移，同步 H2 schema 与迁移测试，绝不改写已经执行的 V1。

关键落点：`KnowledgeDocumentAppService`、`IngestionService`、`KnowledgeDocumentRepository/Impl/Mapper/PO`、`KnowledgeDocument`、`KnowledgeProperties`、`MeilisearchKnowledgeAdapter`、知识域清理服务/Job/持久化端口及相邻测试；knowledge-service 的 Handler/Router、两套迁移；前端 `src/api/knowledge.ts`、`src/types/index.ts`、`src/views/knowledge/document/index.vue` 与契约/组件测试。

## 4. 同步说明与下一批注释
- 业务修复同时更新首批被影响的 Javadoc/JSDoc，以及既有 AGENTS/API/配置说明的相关段落，不新建额外报告，不保留已失效的限制文字。
- 三项修复验证完成后，继续下一批 **8 个前端文件，仅改注释**：
  `stores/app.ts`、`stores/office.ts`、`stores/permission.ts`、`composables/useCrud.ts`、`composables/useFormDraft.ts`、`router/index.ts`、`router/dynamic.ts`、`layouts/AdminLayout.vue`。
- 修正系统主题、未接入 Store、权限空集合放行、CRUD 返回/批量语义、草稿非原子写入和菜单非递归等失实描述；不顺手修改这些模块逻辑。完成该批后暂停验收。

## 验证与交付
1. 先补可复现测试，再实现；每项独立复核 diff，不覆盖首批改动、不提交 Git。
2. 后端严格加载指定 JDK 21/mvnd；定向单元/契约测试、真实 JDBC 回滚与独立连接并发测试；MySQL/PostgreSQL 迁移测试在可用容器环境执行，环境缺失明确记为未验证，不用 mock 冒充真实数据库。
3. 索引用 MockWebServer 测试过滤路径、其他租户保护、task 状态与故障恢复；端到端只使用新建隔离测试索引/桶，未经另行确认不接触用户现有资源。
4. 前端运行新增组件测试、API 契约和认证刷新回归、类型检查、注释检查；因 API/UI 改动运行生产构建。
5. 后端运行受影响模块 Spotless 检查、定向 Javadoc 与测试；不全仓格式化、不降低规则掩盖失败。
6. 下一批注释另做非注释内容一致性检查，证明权限、草稿、菜单行为未变。
7. 交付分别列出业务修复、下一批注释文件、实际测试结果与运行条件；失败/跳过如实报告，不宣称无证据的全历史清理或全栈上线成功。