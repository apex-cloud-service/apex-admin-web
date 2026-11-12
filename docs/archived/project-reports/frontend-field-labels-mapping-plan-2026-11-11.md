# FIELD_LABELS 联调后映射补充方案

- 编制日期：2026-11-11
- 文档状态：**已执行并完成复核（2026-11-11 执行；2026-11-12 复核，字段依据 apex-scaffold 后端源码契约，见 §4）。未取得联调环境真实响应：本地 compose 栈的 system-service 因 `MailService` 缺 `JavaMailSender` 启动失败，条件化 bean 缺失累计 4 处，已达回退阈值，改以源码契约复核为最终口径**
- 上游方案：[聚合能力优化调整方案（2026-11-11）](frontend-aggregation-optimization-plan-2026-11-11.md) P0-1 第 1 步「字段映射表」的后续补充动作
- 约束：不改后端契约、不猜测后端字段；所有映射登记必须以真实契约为准（本次以本机后端仓库 apex-scaffold 源码为依据，对应本方案 §2 第 5 步）。

## 1. 现状与目标

[dashboard/index.vue](../../../../src/views/dashboard/index.vue) 中：

- `FIELD_LABELS`（L136-141）当前为空骨架 `{ file: {}, workflow: {}, integration: {} }`；
- `flattenSource()`（L169-179）对未登记 key 回退显示原始字段名——这是方案既定的预期回退行为，不是缺陷；
- `formatMetricValue()`（L154-162）只做「数组 → N 项、对象 → 不展示、标量 → 原值字符串」，不做单位换算与数值格式化。

目标：联调环境可用后，抓取 `GET /api/v2/overview` 真实响应中 `sources.{file,workflow,integration}.data` 的实际字段，按 §3 登记规范补全 `FIELD_LABELS`，使概览卡展示中文业务名（单位）。

范围限定：**只补映射表，不改数据获取、不扩展格式化逻辑**。若联调发现值需要单位/百分比/字节换算，按 §5 处理。

## 2. 联调采集步骤

1. dev 启动前端（`npm run dev`），`VITE_API_PROXY_TARGET` 指向联调网关；登录具有 `system:monitor:view` 权限的账号；
2. 打开 `/dashboard`，DevTools → Network 过滤 `overview`，抓取 `GET /api/v2/overview` 响应；
3. 分别摘出 `sources.file.data`、`sources.workflow.data`、`sources.integration.data` 三段，按 §4 模板逐字段登记；
4. 若某源 `status=DEGRADED`，记录其 `error` 文案，并单独核验该源服务健康后重抓（降级源的 `data` 可能为 null，不代表字段全集）；
5. 若后端可访问源码（apex 后端仓库），优先直接核对 `OverviewResponse` 组装实现（各源 data 的写入点），与抓包结果互相印证；以抓包为最终依据；
6. 多租户字段差异：聚合响应按租户上下文组装，若不同租户返回字段集不同（如能力未订阅时缺字段），以「字段超集」登记——缺失字段本就不展示，多登记不影响。

## 3. 登记规范

| 规则 | 说明 |
| --- | --- |
| key → 中文名（单位） | 格式 `字段原名: '中文业务名（单位）'`，如 `totalFiles: '文件总数（个）'`；无单位省略括号 |
| 不猜测 | 仅登记真实响应中出现过的字段；推测字段一律不登记 |
| 数组/嵌套对象不登记 | `formatMetricValue` 对数组显示「N 项」、对象不展示，label 登记与否均会展示/过滤，登记无收益（仍可登记以提供中文标签，如 `devices: '设备列表'`） |
| 布尔/枚举 | 值仍显示原值（`true/false`）；label 只翻译字段名。若某布尔值必须语义化展示（如 `healthy: '健康状态'` 显示 `true` 不可读），按 §5 单独提出 |
| 时间字段 | `generatedAt` 已在卡片头部独立展示；data 内若还有时间字段，label 写中文名即可，值透传原值不做时区换算 |
| 命名一致性 | 同一语义跨源字段统一译名（如两源都有 `total` 分别译为「文件总数」「实例总数」，按源语义区分，不复用同一文案） |

## 4. 样本登记表（2026-11-11 依据 apex-scaffold 后端源码填写）

后端聚合门面 [OverviewFacadeService.java](file:///Users/work/apex-scaffold/apex-system/src/main/java/com/apex/scaffold/application/service/OverviewFacadeService.java) 并行拉取三个下游内部端点，`parseEnvelope` 取 `Result.data` 原样透传（`Record<string, unknown>`），三源 data 均为**单字段**且 Javadoc/`@ApiResponse` 双处标注「契约固定勿改字段名」：

| 源 | 下游端点 | data 字段 | 类型 | 登记译名 | 证据 |
| --- | --- | --- | --- | --- | --- |
| file | `GET /internal/v1/file/stats?tenantId=` | `storageUsageBytes` | number | 已用存储空间（字节） | [FileInternalHandler.java](file:///Users/work/apex-scaffold/apex-file-service/src/main/java/com/apex/scaffold/fileservice/interfaces/handler/FileInternalHandler.java) L27-30、L78-84 |
| workflow | `GET /internal/v1/workflow/stats` | `inProgressInstances` | number | 进行中流程实例（个） | [WorkflowInternalHandler.java](file:///Users/work/apex-scaffold/apex-workflow-service/src/main/java/com/apex/scaffold/workflowservice/interfaces/handler/WorkflowInternalHandler.java) L24-27、L67-73 |
| integration | `GET /internal/v1/iot/devices/stats?tenantId=` | `deviceCount` | number | 设备总数（台） | [IotInternalHandler.java](file:///Users/work/apex-scaffold/apex-integration/src/main/java/com/apex/scaffold/integration/device/interfaces/IotInternalHandler.java) L45-46、L233-272 |

语义疑点备注：

- `storageUsageBytes` 为原始字节数，已按 §5 例外路径另行实现值格式化（[dashboard/index.vue](../../../../src/views/dashboard/index.vue#L149-L167) 新增 `FIELD_FORMATTERS.storageUsageBytes` → `formatBytes`：1024 进制、一位小数去尾零，非有限数值回退原值；label 单位括号已相应去掉），算法边界（0/1023/1024/1.5K/1M/1G/1T/负数/非数值）经脚本核验，vue-tsc 与 vitest 通过。
- 三源均为单字段，字段超集登记原则（§2 第 6 步）本次无实际差异场景。

## 5. 边界与例外处理

- **值格式化需求**（百分比、字节→GB、毫秒→秒等）：不在本方案内实现。登记时在备注列标记，汇总后单独小改 `formatMetricValue`（增加可选值格式化器），不与映射补充混在一次变更；
- **字段语义不明**：宁可不登记（回退原名）也不写错误译名；向 后端/方案 作者确认后补充；
- **后端字段变更**：后续版本后端增删字段时，新增未登记字段会自动回退原字段名（安全），删除字段的无害残留映射应顺手清理；
- **不改类型定义**：`OverviewSourceResult.data` 保持 `Record<string, unknown>`，不为映射收紧类型。

## 6. 验证与验收

1. `npx vue-tsc --noEmit` 通过；
2. dev 环境指向联调网关，`/dashboard` 数据总览卡三源字段全部显示中文业务名，无裸英文字段名残留（除非 §5 判定「语义不明」暂不登记的字段）；
3. 后端新增未登记字段时（可临时改后端或等迭代验证）回退显示原字段名，页面不报错；
4. 数组字段显示「N 项」、对象字段不展示、`null/undefined` 字段不展示，行为与现状一致；
5. 变更范围核对：仅 `dashboard/index.vue` 的 `FIELD_LABELS` 常量（及可能的 `formatMetricValue` 例外小改），无其他文件改动。

## 7. 执行清单

- [x] 依据 apex-scaffold 后端源码核对三源 data 真实字段（联调环境不可用，走 §2 第 5 步源码核对路径）
- [x] 完成三源字段登记表（§4，含单位与语义备注）
- [x] 语义确认：三源字段在下游 Handler Javadoc 与 OpenAPI 注解中均为「契约固定勿改字段名」，无语义不明项
- [x] 转写进 `FIELD_LABELS`（[dashboard/index.vue](../../../../src/views/dashboard/index.vue#L136-L147)），`npx vue-tsc --noEmit` 与 `npx vitest run` 通过
- [x] 联调环境复核三源 data 与登记表一致（未取得联调环境真实响应：本地 compose 栈 system-service 启动失败，改按后端源码契约复核——`FileInternalHandler` L82 `Map.of("storageUsageBytes", usageBytes)`、`WorkflowInternalHandler` L92 `Map.of("inProgressInstances", inProgress)`、`IotInternalHandler` + `DeviceStatsResponse.deviceCount`，并由 `OverviewFacadeServiceTest` L31-34/L97/L103/L109 断言；三源字段与 §4 登记表一致，`FIELD_LABELS`/`formatBytes` 与 `AGENTS.md` 无需变更。后端字段变更时本表仍需同步更新）
- [x] 本文档更新登记表与完成状态；上游方案文档 P0-1 已链接本方案
