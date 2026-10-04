# Apex Scaffold 后端待实现功能清单

## 📋 项目信息

**后端项目**：Apex Scaffold  
**前端项目**：Apex Admin Web  
**项目路径**：`/Users/work/apex-scaffold`  
**文档生成时间**：2026-09-26  
**优先级**：P0（核心功能）

---

## 🎯 总体说明

根据前端项目分析，以下功能模块的后端 API 尚未完全实现或需要增强。这些功能对应前端已完成的 UI 界面和 API 调用代码，需要后端提供相应的接口支持。

---

## 一、代码生成器模块（Generator）

### 1.1 功能概述

代码生成器用于根据数据库表结构自动生成实体类、Mapper、Service、Controller 等代码，提高开发效率。

### 1.2 前端已实现

- **API 文件**：`src/api/generator.ts`
- **页面文件**：`src/views/system/generator/index.vue`
- **菜单 SQL**：`sql/V999__Add_Generator_Auth_Office_Menus.sql`

### 1.3 需要实现的后端接口

#### 1.3.1 数据库表列表查询

```http
GET /admin-api/system/generator/tables
```

**请求参数**：
```typescript
{
  page: number          // 页码
  size: number          // 每页大小
  tableName?: string    // 表名筛选（可选）
  tableComment?: string // 表注释筛选（可选）
}
```

**响应**：
```typescript
{
  list: Array<{
    tableName: string       // 表名
    tableComment: string    // 表注释
    engine: string          // 存储引擎
    createTime: string      // 创建时间
  }>
  total: number
}
```

#### 1.3.2 表结构详情查询

```http
GET /admin-api/system/generator/tables/{tableName}
```

**响应**：
```typescript
{
  tableName: string
  tableComment: string
  columns: Array<{
    columnName: string      // 列名
    dataType: string        // 数据类型
    columnComment: string   // 列注释
    columnKey: string       // 主键/索引
    isNullable: string      // 是否可空
    extra: string           // 额外信息（如 auto_increment）
  }>
}
```

#### 1.3.3 代码生成配置保存

```http
POST /admin-api/system/generator/config
```

**请求体**：
```typescript
{
  tableName: string
  packageName: string     // 包名，如 com.apex.example
  moduleName: string      // 模块名，如 user
  author: string          // 作者
  tablePrefix: string     // 表名前缀（去除）
  generateType: string    // 生成类型：entity/mapper/service/controller/all
}
```

#### 1.3.4 代码生成（实时预览）

```http
POST /admin-api/system/generator/preview
```

**请求体**：同 1.3.3

**响应**：
```typescript
{
  files: Array<{
    fileName: string    // 文件名，如 User.java
    filePath: string    // 文件路径
    fileContent: string // 文件内容（代码）
  }>
}
```

#### 1.3.5 代码生成（下载 ZIP）

```http
POST /admin-api/system/generator/download
```

**请求体**：同 1.3.3

**响应**：ZIP 文件流

### 1.4 技术要点

- 使用 JDBC 或 R2DBC 查询数据库元数据（`information_schema.TABLES` 和 `information_schema.COLUMNS`）
- 使用 FreeMarker 或 Velocity 模板引擎生成代码
- 支持 MySQL、PostgreSQL 等多种数据库
- 代码模板应遵循项目的代码规范（DDD 四层架构）

### 1.5 预计工期

**10-15 个工作日**

---

## 二、认证配置管理模块（Auth Config）

### 2.1 功能概述

管理系统的认证配置，包括 JWT 配置、OAuth2 客户端配置、会话管理等。

### 2.2 前端已实现

- **API 文件**：`src/api/auth-config.ts`
- **页面文件**：`src/views/system/auth/index.vue`

### 2.3 需要实现的后端接口

#### 2.3.1 JWT 配置查询

```http
GET /admin-api/system/auth-config/jwt
```

**响应**：
```typescript
{
  algorithm: string       // 签名算法：HS256/HS512/RS256
  secret: string          // 密钥（脱敏显示）
  accessTokenTtl: number  // 访问令牌有效期（秒）
  refreshTokenTtl: number // 刷新令牌有效期（秒）
  issuer: string          // 签发者
}
```

#### 2.3.2 JWT 配置更新

```http
PUT /admin-api/system/auth-config/jwt
```

**请求体**：同 2.3.1 响应

#### 2.3.3 JWT 配置测试

```http
POST /admin-api/system/auth-config/jwt/test
```

**请求体**：
```typescript
{
  payload: object  // 测试载荷
}
```

**响应**：
```typescript
{
  token: string         // 生成的 Token
  decoded: object       // 解码后的 Payload
  isValid: boolean      // 是否有效
  expiresAt: string     // 过期时间
}
```

#### 2.3.4 OAuth2 客户端列表

```http
GET /admin-api/system/auth-config/oauth2/clients
```

**响应**：
```typescript
{
  list: Array<{
    clientId: string
    clientName: string
    grantTypes: string[]      // 授权类型
    redirectUris: string[]    // 重定向 URI
    scopes: string[]          // 权限范围
    accessTokenTtl: number
    refreshTokenTtl: number
    enabled: boolean
  }>
}
```

#### 2.3.5 OAuth2 客户端创建/更新/删除

```http
POST /admin-api/system/auth-config/oauth2/clients
PUT /admin-api/system/auth-config/oauth2/clients/{id}
DELETE /admin-api/system/auth-config/oauth2/clients/{id}
```

#### 2.3.6 会话管理配置

```http
GET /admin-api/system/auth-config/session
PUT /admin-api/system/auth-config/session
```

**配置项**：
```typescript
{
  timeout: number           // 会话超时（分钟）
  maxSessions: number       // 最大并发会话数
  kickoutStrategy: string   // 踢出策略：first/last
  rememberMeDuration: number // 记住我时长（天）
}
```

### 2.4 技术要点

- 配置存储在数据库或配置中心（Nacos）
- 敏感信息（如密钥）需要加密存储
- JWT 测试功能需要使用实际的签名算法
- OAuth2 配置需要符合 RFC 6749 标准

### 2.5 预计工期

**7-10 个工作日**

---

## 三、SSO 配置管理模块（SSO）

### 3.1 功能概述

管理单点登录（SSO）配置，支持 SAML、CAS、LDAP 等协议。

### 3.2 前端已实现

- **API 文件**：`src/api/sso.ts`
- **页面文件**：`src/views/system/sso/index.vue`

### 3.3 需要实现的后端接口

#### 3.3.1 SSO 提供商列表

```http
GET /admin-api/system/sso/providers
```

**响应**：
```typescript
{
  list: Array<{
    id: string
    name: string
    protocol: string        // SAML/CAS/LDAP/OIDC
    enabled: boolean
    config: object          // 协议特定配置
  }>
}
```

#### 3.3.2 SAML 配置管理

```http
POST /admin-api/system/sso/saml
PUT /admin-api/system/sso/saml/{id}
GET /admin-api/system/sso/saml/{id}
DELETE /admin-api/system/sso/saml/{id}
```

**SAML 配置**：
```typescript
{
  entityId: string          // 实体 ID
  ssoUrl: string            // SSO URL
  sloUrl: string            // 单点登出 URL
  certificate: string       // X.509 证书
  signatureAlgorithm: string // 签名算法
  nameIdFormat: string      // Name ID 格式
}
```

#### 3.3.3 SAML 元数据上传

```http
POST /admin-api/system/sso/saml/metadata
```

**请求**：`multipart/form-data`  
**文件字段**：`file`（XML 文件）

**响应**：解析后的配置信息

#### 3.3.4 SAML 元数据导出

```http
GET /admin-api/system/sso/saml/{id}/metadata
```

**响应**：XML 文件（Service Provider 元数据）

#### 3.3.5 CAS 配置管理

```http
POST /admin-api/system/sso/cas
PUT /admin-api/system/sso/cas/{id}
```

**CAS 配置**：
```typescript
{
  serverUrl: string         // CAS 服务器地址
  loginUrl: string          // 登录端点
  validateUrl: string       // 验证端点
  protocol: string          // CAS 1.0/2.0/3.0
}
```

#### 3.3.6 LDAP 配置管理

```http
POST /admin-api/system/sso/ldap
PUT /admin-api/system/sso/ldap/{id}
```

**LDAP 配置**：
```typescript
{
  url: string               // LDAP 地址
  baseDn: string            // Base DN
  userDn: string            // 用户 DN
  password: string          // 密码
  userSearchFilter: string  // 用户搜索过滤器
  groupSearchFilter: string // 组搜索过滤器
}
```

#### 3.3.7 SSO 配置测试

```http
POST /admin-api/system/sso/{protocol}/test
```

**请求体**：对应协议的配置  
**响应**：连接测试结果

### 3.4 技术要点

- SAML：使用 Spring Security SAML 或 OpenSAML 库
- CAS：使用 Apereo CAS Client
- LDAP：使用 Spring Security LDAP
- 证书和密钥需要安全存储
- 元数据解析需要支持标准格式

### 3.5 预计工期

**10-15 个工作日**

---

## 四、数据库配置模块（Database Config）

### 4.1 功能概述

管理数据源配置，支持主从切换、连接池监控等。

### 4.2 前端已实现

- **API 文件**：`src/api/database.ts`
- **页面文件**：`src/views/system/database/index.vue`

### 4.3 需要实现的后端接口

#### 4.3.1 数据源列表

```http
GET /admin-api/system/database/datasources
```

**响应**：
```typescript
{
  list: Array<{
    id: string
    name: string
    type: string            // master/slave
    driver: string          // 驱动类型
    url: string             // 连接 URL（脱敏）
    username: string        // 用户名（脱敏）
    poolSize: number        // 连接池大小
    activeConnections: number // 活跃连接数
    status: string          // ONLINE/OFFLINE
  }>
}
```

#### 4.3.2 数据源配置详情

```http
GET /admin-api/system/database/datasources/{id}
```

#### 4.3.3 数据源创建/更新

```http
POST /admin-api/system/database/datasources
PUT /admin-api/system/database/datasources/{id}
```

**请求体**：
```typescript
{
  name: string
  type: string
  driver: string
  url: string
  username: string
  password: string
  poolConfig: {
    minIdle: number
    maxPoolSize: number
    connectionTimeout: number
    idleTimeout: number
  }
}
```

#### 4.3.4 数据源连接测试

```http
POST /admin-api/system/database/datasources/test
```

**请求体**：同 4.3.3  
**响应**：连接测试结果

#### 4.3.5 数据源删除

```http
DELETE /admin-api/system/database/datasources/{id}
```

#### 4.3.6 连接池监控

```http
GET /admin-api/system/database/datasources/{id}/metrics
```

**响应**：
```typescript
{
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingThreads: number
  averageGetTime: number    // 平均获取连接时间（ms）
  averageUsageTime: number  // 平均使用时间（ms）
}
```

### 4.4 技术要点

- 使用 R2DBC 连接池（r2dbc-pool）
- 密码加密存储（使用 Jasypt 或自定义加密）
- 连接测试需要异步非阻塞
- 支持动态数据源切换

### 4.5 预计工期

**5-7 个工作日**

---

## 五、办公平台增强模块（Office Platform）

### 5.1 功能概述

增强办公平台集成功能，包括流程审批、日历同步、文档协作等。

### 5.2 前端已实现

- **API 文件**：`src/api/office.ts`、`src/api/office-new.ts`、`src/api/office-updated.ts`
- **页面文件**：`src/views/office/` 下 10 个页面组件

### 5.3 需要实现的后端接口

#### 5.3.1 审批流程管理

```http
GET /admin-api/office/approval/list       # 审批列表
GET /admin-api/office/approval/{id}       # 审批详情
POST /admin-api/office/approval/submit    # 提交审批
POST /admin-api/office/approval/approve   # 审批通过
POST /admin-api/office/approval/reject    # 审批拒绝
```

#### 5.3.2 日历事件同步

```http
GET /admin-api/office/calendar/events     # 日历事件列表
POST /admin-api/office/calendar/sync      # 同步日历
```

#### 5.3.3 组织架构同步

```http
GET /admin-api/office/organization/tree   # 组织架构树
POST /admin-api/office/organization/sync  # 同步组织架构
```

#### 5.3.4 消息推送

```http
POST /admin-api/office/message/send       # 发送消息
GET /admin-api/office/message/list        # 消息列表
```

#### 5.3.5 文档管理

```http
GET /admin-api/office/document/list       # 文档列表
POST /admin-api/office/document/upload    # 上传文档
GET /admin-api/office/document/{id}       # 文档详情
```

### 5.4 技术要点

- 对接飞书/钉钉/企业微信等平台 API
- 使用 WebHook 接收平台事件
- 数据同步需要考虑增量更新
- 消息推送需要支持模板和变量

### 5.5 预计工期

**10-15 个工作日**

---

## 六、全局搜索增强模块（Global Search）

### 6.1 功能概述

全局搜索功能增强，支持高级筛选、搜索历史、搜索统计等。

### 6.2 前端已实现

- **API 文件**：`src/api/search.ts`
- **组件文件**：`src/components/GlobalSearch/index.vue`

### 6.3 需要实现的后端接口

#### 6.3.1 全局搜索（增强）

```http
POST /admin-api/search/global
```

**请求体**：
```typescript
{
  keyword: string
  filters: {
    type?: string[]       // 类型筛选：user/role/menu/dict
    dateRange?: [string, string]
    status?: string[]
  }
  sort: {
    field: string
    order: 'asc' | 'desc'
  }
  page: number
  size: number
}
```

**响应**：
```typescript
{
  results: Array<{
    id: string
    type: string
    title: string
    content: string
    highlights: string[]  // 高亮片段
    score: number         // 相关性评分
    metadata: object
  }>
  total: number
  aggregations: {
    byType: Record<string, number>
    byDate: Record<string, number>
  }
}
```

#### 6.3.2 搜索建议

```http
GET /admin-api/search/suggest?q={keyword}
```

**响应**：
```typescript
{
  suggestions: string[]
}
```

#### 6.3.3 搜索历史

```http
GET /admin-api/search/history
DELETE /admin-api/search/history/{id}
```

#### 6.3.4 搜索统计

```http
GET /admin-api/search/stats
```

**响应**：
```typescript
{
  totalSearches: number
  popularKeywords: Array<{
    keyword: string
    count: number
  }>
  searchTrend: Array<{
    date: string
    count: number
  }>
}
```

### 6.4 技术要点

- 使用 Meilisearch 或 Elasticsearch
- 实现中文分词（jieba）
- 搜索历史存储在 Redis
- 搜索统计使用异步聚合

### 6.5 预计工期

**5-7 个工作日**

---

## 七、实施优先级建议

### P0（高优先级，必须实现）

1. **代码生成器**（10-15天）- 提升开发效率的核心工具
2. **认证配置管理**（7-10天）- 安全基础设施
3. **数据库配置**（5-7天）- 系统基础功能

**P0 总工期**：22-32 个工作日（约 4.5-6.5 周）

### P1（中优先级，建议实现）

4. **SSO 配置管理**（10-15天）- 企业级单点登录
5. **办公平台增强**（10-15天）- 提升协作效率
6. **全局搜索增强**（5-7天）- 用户体验优化

**P1 总工期**：25-37 个工作日（约 5-7.5 周）

---

## 八、技术架构建议

### 8.1 响应式编程

所有接口应使用 **Spring WebFlux + Project Reactor**，避免阻塞操作：

```java
@GetMapping("/tables")
public Mono<PageResponse<TableInfo>> getTables(
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
) {
    return generatorService.getTables(page, size);
}
```

### 8.2 统一响应格式

```java
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "traceId": "abc-123-xyz"
}
```

### 8.3 错误处理

```java
{
  "code": 400,
  "message": "参数验证失败",
  "errors": [
    { "field": "tableName", "message": "表名不能为空" }
  ],
  "traceId": "abc-123-xyz"
}
```

### 8.4 安全性

- 所有接口需要 JWT 认证
- 敏感操作需要权限校验（`@PreAuthorize`）
- 敏感信息（密码、密钥）脱敏返回
- SQL 注入防护（使用参数化查询）

---

## 九、测试要求

### 9.1 单元测试

- 每个 Service 方法需要单元测试
- 测试覆盖率 > 80%

### 9.2 集成测试

- 每个接口需要集成测试
- 使用 WebTestClient 测试 WebFlux 接口

### 9.3 测试示例

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class GeneratorControllerTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Test
    void testGetTables() {
        webTestClient.get()
            .uri("/admin-api/system/generator/tables?page=1&size=20")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.code").isEqualTo(200)
            .jsonPath("$.data.list").isArray();
    }
}
```

---

## 十、文档要求

### 10.1 API 文档

使用 **SpringDoc (OpenAPI 3.0)** 生成 API 文档：

```java
@Tag(name = "代码生成器", description = "代码生成器管理接口")
@RestController
@RequestMapping("/admin-api/system/generator")
public class GeneratorController {
    
    @Operation(summary = "查询数据库表列表", description = "分页查询数据库中的所有表")
    @GetMapping("/tables")
    public Mono<PageResponse<TableInfo>> getTables(
        @Parameter(description = "页码", example = "1") @RequestParam int page,
        @Parameter(description = "每页大小", example = "20") @RequestParam int size
    ) {
        // ...
    }
}
```

### 10.2 开发文档

在 `docs/` 目录下补充：

- `guides/code-generator-guide.md` - 代码生成器使用指南
- `guides/auth-config-guide.md` - 认证配置指南
- `guides/sso-config-guide.md` - SSO 配置指南
- `guides/database-config-guide.md` - 数据库配置指南

---

## 十一、数据库设计

### 11.1 代码生成器配置表

```sql
CREATE TABLE sys_generator_config (
  id VARCHAR(64) PRIMARY KEY,
  table_name VARCHAR(128) NOT NULL COMMENT '表名',
  package_name VARCHAR(128) NOT NULL COMMENT '包名',
  module_name VARCHAR(64) NOT NULL COMMENT '模块名',
  author VARCHAR(64) DEFAULT NULL COMMENT '作者',
  table_prefix VARCHAR(32) DEFAULT NULL COMMENT '表前缀',
  generate_type VARCHAR(32) NOT NULL COMMENT '生成类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_table_name (table_name)
) COMMENT='代码生成器配置表';
```

### 11.2 认证配置表

```sql
CREATE TABLE sys_auth_config (
  id VARCHAR(64) PRIMARY KEY,
  config_type VARCHAR(32) NOT NULL COMMENT '配置类型: jwt/oauth2/session',
  config_key VARCHAR(128) NOT NULL COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值(JSON格式)',
  is_encrypted TINYINT(1) DEFAULT 0 COMMENT '是否加密',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_type_key (config_type, config_key)
) COMMENT='认证配置表';
```

### 11.3 SSO 提供商配置表

```sql
CREATE TABLE sys_sso_provider (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL COMMENT '提供商名称',
  protocol VARCHAR(32) NOT NULL COMMENT '协议: SAML/CAS/LDAP/OIDC',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  config TEXT NOT NULL COMMENT '配置(JSON格式)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_protocol (protocol)
) COMMENT='SSO提供商配置表';
```

### 11.4 数据源配置表

```sql
CREATE TABLE sys_datasource (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL COMMENT '数据源名称',
  type VARCHAR(32) NOT NULL COMMENT '类型: master/slave',
  driver VARCHAR(128) NOT NULL COMMENT '驱动类型',
  url VARCHAR(512) NOT NULL COMMENT '连接URL',
  username VARCHAR(128) NOT NULL COMMENT '用户名',
  password VARCHAR(256) NOT NULL COMMENT '密码(加密)',
  pool_config TEXT COMMENT '连接池配置(JSON格式)',
  status VARCHAR(32) DEFAULT 'OFFLINE' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
) COMMENT='数据源配置表';
```

---

## 十二、后续协作建议

### 12.1 前后端对接流程

1. **后端先提供 API 文档**（SpringDoc/Knife4j）
2. **前端根据文档对接接口**
3. **联调测试**
4. **修复问题**
5. **上线验收**

### 12.2 沟通机制

- 每周一次前后端对接会议
- 使用统一的 API 文档（Knife4j）
- 问题通过工单系统跟踪

### 12.3 版本管理

- 使用 Git Flow 分支策略
- API 版本号管理（v1/v2）
- 接口变更需要提前通知

---

## 📞 联系方式

如有疑问，请联系：

- **前端负责人**：查看 `apex-admin-web` 项目
- **后端负责人**：查看 `apex-scaffold` 项目
- **技术支持**：参考项目 README 和 docs 文档

---

**文档版本**：v1.0  
**最后更新**：2026-09-26
