# 前后端接口对接说明文档

## 概述

数据库配置功能的前后端已完全对接，本文档说明三个接口的对接实现细节。

## 接口对接清单

### 1. 测试数据库连接

#### 前端实现

**API 函数** ([src/api/database.ts](../../src/api/database.ts)):
```typescript
export function testDatabaseConnection(
  config: DatabaseConfig & { password: string }
): Promise<DatabaseTestResult> {
  return post<DatabaseTestResult>('/admin-api/v1/database/test', config)
}
```

**页面调用** ([src/views/system/database/index.vue](../../src/views/system/database/index.vue)):
```typescript
const handleTest = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    testing.value = true

    const result = await testDatabaseConnection(form)

    if (result.success) {
      ElMessage.success(`连接成功！${result.version ? '版本: ' + result.version : ''}`)
    } else {
      ElMessage.error(result.message || '连接失败')
    }
  } catch (error: any) {
    if (error?.constructor?.name !== 'Error') {
      showError(error)
    }
  } finally {
    testing.value = false
  }
}
```

#### 后端实现

**Handler** (DatabaseConfigHandler.java：`apex-scaffold/apex-interfaces/src/main/java/com/apex/scaffold/interfaces/handler/DatabaseConfigHandler.java`):
```java
@RequirePermission("system:database:test")
@Operation(operationId = "testDatabaseConnection", summary = "测试数据库连接")
public Mono<ServerResponse> testConnection(ServerRequest request) {
    return parseBody(request, DatabaseConfigRequest.class)
            .flatMap(databaseConfigService::testConnection)
            .flatMap(this::buildSuccess);
}
```

**路由**: `POST /admin-api/v1/database/test`

#### 数据流转

1. 用户在前端填写数据库配置表单
2. 点击"测试连接"按钮触发 `handleTest()`
3. 前端验证表单（必填字段、端口范围）
4. 调用 `testDatabaseConnection()` 发送 POST 请求
5. 后端 Handler 接收请求并校验权限
6. Service 使用 HikariCP 创建临时连接测试
7. 返回测试结果（成功/失败 + 版本信息）
8. 前端显示成功或失败消息

#### 请求示例

```json
{
  "dbType": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "apex_db",
  "username": "root",
  "password": "password123",
  "connectionParams": "useSSL=false&serverTimezone=Asia/Shanghai",
  "environment": "dev"
}
```

#### 响应示例

**成功**:
```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "success": true,
    "message": "连接成功",
    "version": "MySQL 8.0.35"
  },
  "traceId": "abc123"
}
```

**失败**:
```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "success": false,
    "message": "连接失败: Access denied for user 'root'@'localhost'",
    "version": null
  },
  "traceId": "def456"
}
```

### 2. 生成部署配置

#### 前端实现

**API 函数** ([src/api/database.ts](../../src/api/database.ts)):
```typescript
export function generateDeploymentConfig(
  config: DatabaseConfig & { password: string }
): Promise<DeploymentConfigResult> {
  return post<DeploymentConfigResult>('/admin-api/v1/database/generate-config', config)
}
```

**页面调用** ([src/views/system/database/index.vue](../../src/views/system/database/index.vue)):
```typescript
const handleGenerate = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    generating.value = true

    const result = await generateDeploymentConfig(form)

    exportDialog.yaml = result.yaml
    exportDialog.env = result.env
    exportDialog.dockerCompose = result.dockerCompose || ''
    exportDialog.activeTab = 'yaml'
    exportDialog.visible = true

    ElMessage.success('配置生成成功')
  } catch (error) {
    showError(error)
  } finally {
    generating.value = false
  }
}
```

#### 后端实现

**Handler** (DatabaseConfigHandler.java：`apex-scaffold/apex-interfaces/src/main/java/com/apex/scaffold/interfaces/handler/DatabaseConfigHandler.java`):
```java
@RequirePermission("system:database:generate")
@Operation(operationId = "generateDeploymentConfig", summary = "生成部署配置")
public Mono<ServerResponse> generateConfig(ServerRequest request) {
    return parseBody(request, DatabaseConfigRequest.class)
            .flatMap(databaseConfigService::generateDeploymentConfig)
            .flatMap(this::buildSuccess);
}
```

**路由**: `POST /admin-api/v1/database/generate-config`

#### 数据流转

1. 用户填写完数据库配置后点击"生成配置"
2. 前端验证表单完整性
3. 调用 `generateDeploymentConfig()` 发送 POST 请求
4. 后端 Handler 接收请求并校验权限
5. Service 生成三种格式配置（YAML/env/docker-compose）
6. 返回生成的配置内容
7. 前端弹出对话框展示三种配置
8. 用户可切换查看并一键复制

#### 响应示例

```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "yaml": "spring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/apex_db\n    username: root\n    password: ${DB_PASSWORD}\n    driver-class-name: com.mysql.cj.jdbc.Driver\n    hikari:\n      maximum-pool-size: 20\n      minimum-idle: 5\n      connection-timeout: 30000\n      idle-timeout: 600000\n      max-lifetime: 1800000\n",
    "env": "DB_URL=jdbc:mysql://localhost:3306/apex_db\nDB_USERNAME=root\nDB_PASSWORD=password123\nDB_DRIVER=com.mysql.cj.jdbc.Driver\n",
    "dockerCompose": "version: '3.8'\nservices:\n  database:\n    image: mysql:8.0\n    container_name: apex-database\n    ports:\n      - \"3306:3306\"\n    environment:\n      MYSQL_ROOT_PASSWORD: password123\n      MYSQL_DATABASE: apex_db\n      MYSQL_USER: root\n      MYSQL_PASSWORD: password123\n    volumes:\n      - db_data:/var/lib/mysql\n    networks:\n      - apex-network\n\nvolumes:\n  db_data:\n\nnetworks:\n  apex-network:\n    driver: bridge\n"
  },
  "traceId": "ghi789"
}
```

#### UI 交互

- 配置导出弹窗使用 Element Plus Tabs 组件
- 三个标签页：YAML 配置、环境变量、Docker Compose
- 每个标签页右上角有"复制"按钮
- 使用 `navigator.clipboard.writeText()` 实现一键复制

### 3. 获取当前数据库信息

#### 前端实现

**API 函数** ([src/api/database.ts](../../src/api/database.ts)):
```typescript
export function getCurrentDatabaseInfo(): Promise<CurrentDatabaseInfo> {
  return get<CurrentDatabaseInfo>('/admin-api/v1/database/current')
}
```

**页面调用** ([src/views/system/database/index.vue](../../src/views/system/database/index.vue)):
```typescript
const fetchCurrentDb = async () => {
  try {
    currentDb.value = await getCurrentDatabaseInfo()
  } catch (error) {
    console.error('获取当前数据库信息失败:', error)
  }
}

onMounted(() => {
  fetchCurrentDb()
})
```

#### 后端实现

**Handler** (DatabaseConfigHandler.java：`apex-scaffold/apex-interfaces/src/main/java/com/apex/scaffold/interfaces/handler/DatabaseConfigHandler.java`):
```java
@RequirePermission("system:database:info")
@Operation(operationId = "getCurrentDatabaseInfo", summary = "获取当前数据库信息")
public Mono<ServerResponse> getCurrentInfo(ServerRequest request) {
    return databaseConfigService.getCurrentDatabaseInfo()
            .flatMap(this::buildSuccess);
}
```

**路由**: `GET /admin-api/v1/database/current`

#### 数据流转

1. 页面加载时（`onMounted`）自动调用 `fetchCurrentDb()`
2. 调用 `getCurrentDatabaseInfo()` 发送 GET 请求
3. 后端 Handler 接收请求并校验权限
4. Service 查询应用当前使用的 DataSource 信息
5. 返回数据库类型、版本和驱动版本
6. 前端使用 Element Plus Descriptions 组件展示
7. 失败时静默处理（仅控制台输出）

#### 响应示例

```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "type": "MySQL",
    "version": "8.0.35",
    "driverVersion": "mysql-connector-j-8.0.33 (Revision: 5)"
  },
  "traceId": "jkl012"
}
```

#### UI 展示

```vue
<el-descriptions :column="2" border>
  <el-descriptions-item label="数据库类型">
    <el-tag>{{ currentDb.type }}</el-tag>
  </el-descriptions-item>
  <el-descriptions-item label="数据库版本">
    {{ currentDb.version }}
  </el-descriptions-item>
  <el-descriptions-item v-if="currentDb.driverVersion" label="驱动版本">
    {{ currentDb.driverVersion }}
  </el-descriptions-item>
</el-descriptions>
```

## 类型定义对照

### 前端类型 ([src/types/index.ts](../../src/types/index.ts))

```typescript
export interface DatabaseConfig {
  dbType: 'mysql' | 'postgresql'
  host: string
  port: number
  database: string
  username: string
  connectionParams?: string
  environment: 'dev' | 'test' | 'prod'
}

export interface DatabaseTestResult {
  success: boolean
  message: string
  version?: string
}

export interface DeploymentConfigResult {
  yaml: string
  env: string
  dockerCompose?: string
}

export interface CurrentDatabaseInfo {
  type: string
  version: string
  driverVersion?: string
}
```

### 后端 DTO (apex-application/dto/admin：`apex-scaffold/apex-application/src/main/java/com/apex/scaffold/application/dto/admin`)

```java
// DatabaseConfigRequest.java
public class DatabaseConfigRequest {
    private String dbType;
    private String host;
    private Integer port;
    private String database;
    private String username;
    private String password;
    private String connectionParams;
    private String environment;
}

// DatabaseTestResultDTO.java
public class DatabaseTestResultDTO {
    private Boolean success;
    private String message;
    private String version;
}

// DeploymentConfigResultDTO.java
public class DeploymentConfigResultDTO {
    private String yaml;
    private String env;
    private String dockerCompose;
}

// CurrentDatabaseInfoDTO.java
public class CurrentDatabaseInfoDTO {
    private String type;
    private String version;
    private String driverVersion;
}
```

**类型映射**：前后端类型字段完全一致，遵循 camelCase 命名约定。

## 错误处理

### 前端错误处理

1. **表单验证错误**：
   - Element Plus Form 自动显示字段级验证消息
   - 阻止 API 调用

2. **网络错误**：
   - 使用 `showError(error)` 统一处理
   - 显示友好的错误提示
   - 不会导致页面崩溃

3. **业务错误**：
   - 测试连接失败：显示后端返回的详细错误信息
   - 配置生成失败：显示错误消息
   - 查询数据库信息失败：静默处理（控制台输出）

### 后端错误处理

1. **参数验证错误**：
   - Jakarta Validation 自动验证
   - 返回 400 Bad Request + 详细字段错误

2. **权限错误**：
   - `@RequirePermission` 拦截
   - 返回 403 Forbidden

3. **业务错误**：
   - 连接测试失败：返回 `success: false` + 错误信息
   - 不抛出异常，确保前端能正常处理

## 安全设计

1. **密码传输**：
   - HTTPS 加密传输（生产环境）
   - 密码仅用于一次性操作，不保存

2. **权限控制**：
   - 所有接口需要 `system:database:*` 权限
   - 基于 Spring Security 响应式认证

3. **参数验证**：
   - 前端：Element Plus Form Rules
   - 后端：Jakarta Bean Validation

4. **错误信息**：
   - 不暴露敏感系统信息
   - 连接失败返回适度的错误描述

## 测试建议

### 功能测试

1. **连接测试**：
   - ✅ MySQL 正确配置
   - ✅ PostgreSQL 正确配置
   - ✅ 错误的主机/端口
   - ✅ 错误的用户名/密码
   - ✅ 不存在的数据库

2. **配置生成**：
   - ✅ MySQL 配置导出
   - ✅ PostgreSQL 配置导出
   - ✅ 带连接参数的配置
   - ✅ 不同环境（dev/test/prod）
   - ✅ 三种格式的一键复制

3. **当前数据库信息**：
   - ✅ MySQL 环境查询
   - ✅ PostgreSQL 环境查询
   - ✅ 页面加载自动查询

### 非功能测试

1. **性能**：
   - 连接测试超时时间：5秒
   - 配置生成响应时间：< 1秒

2. **并发**：
   - 多次快速点击测试连接
   - 多个用户同时使用

3. **兼容性**：
   - Chrome/Edge/Firefox
   - 不同数据库版本

## 故障排查

### 前端问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 接口 404 | 路由未注册 | 检查后端 ApiRouter 配置 |
| 接口 403 | 权限不足 | 检查菜单权限配置 |
| 类型错误 | 类型不匹配 | 运行 `vue-tsc --noEmit` 检查 |
| 复制失败 | 浏览器不支持 | 提示手动复制 |

### 后端问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 编译失败 | 依赖缺失 | 检查 HikariCP 依赖 |
| 连接超时 | 网络或防火墙 | 检查数据库网络可达性 |
| 驱动错误 | 驱动不匹配 | 检查 MySQL/PostgreSQL 驱动版本 |

## 总结

✅ **前端**：完整实现三个接口对接  
✅ **后端**：完整实现三个接口服务  
✅ **类型**：前后端类型完全一致  
✅ **错误处理**：统一错误处理机制  
✅ **安全**：权限控制 + 参数验证  
✅ **文档**：完整的使用说明和示例  

前后端接口对接已全部完成并经过验证，可以直接使用！
