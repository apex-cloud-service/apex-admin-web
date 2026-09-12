# 📘 文档和图表管理功能 - 快速开始指南

## 🚀 快速启动

### 1. 验证数据库迁移
```bash
# 确保 Flyway 迁移已执行
# 检查数据库中是否存在以下表：
# - doc_document
# - doc_chart
```

### 2. 编译项目
```bash
cd /Users/work/apex-scaffold

# 方式 1：使用 Maven（推荐在本地 IDE）
mvn clean install -DskipTests

# 方式 2：仅编译（如果 clean 失败）
mvn compile -DskipTests
```

### 3. 启动应用
```bash
# 开发模式
mvn spring-boot:run

# 或使用 jar 包
java -jar apex-interfaces/target/apex-interfaces-1.2.0.jar
```

### 4. 测试 API

#### 获取访问令牌
```bash
# 登录获取 token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password",
    "loginType": "PASSWORD"
  }'
```

#### 测试文档 API
```bash
# 查询文档列表
curl -X GET 'http://localhost:8080/admin-api/v1/documents?page=1&size=20' \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建文档
curl -X POST http://localhost:8080/admin-api/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文档",
    "docType": "report",
    "category": "tech",
    "content": "这是一个测试文档",
    "status": 1
  }'

# 查询文档详情
curl -X GET http://localhost:8080/admin-api/v1/documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 测试图表 API
```bash
# 查询图表列表
curl -X GET 'http://localhost:8080/admin-api/v1/charts?page=1&size=20' \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建图表
curl -X POST http://localhost:8080/admin-api/v1/charts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chartName": "销售趋势图",
    "chartType": "line",
    "category": "business",
    "description": "月度销售趋势",
    "dataSource": "sales_db",
    "status": 1
  }'

# 查询图表数据
curl -X GET http://localhost:8080/admin-api/v1/charts/1/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 API 端点速查表

### 文档管理
| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/admin-api/v1/documents` | 查询列表 | data:document:query |
| GET | `/admin-api/v1/documents/{id}` | 查询详情 | data:document:query |
| POST | `/admin-api/v1/documents` | 创建文档 | data:document:create |
| PUT | `/admin-api/v1/documents/{id}` | 更新文档 | data:document:update |
| DELETE | `/admin-api/v1/documents/{id}` | 删除文档 | data:document:delete |
| PUT | `/admin-api/v1/documents/{id}/status` | 更新状态 | data:document:update |
| GET | `/admin-api/v1/documents/{id}/download` | 下载文档 | data:document:download |

### 图表管理
| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/admin-api/v1/charts` | 查询列表 | data:chart:query |
| GET | `/admin-api/v1/charts/{id}` | 查询详情 | data:chart:query |
| GET | `/admin-api/v1/charts/{id}/data` | 查询数据 | data:chart:query |
| POST | `/admin-api/v1/charts` | 创建图表 | data:chart:create |
| PUT | `/admin-api/v1/charts/{id}` | 更新图表 | data:chart:update |
| DELETE | `/admin-api/v1/charts/{id}` | 删除图表 | data:chart:delete |
| PUT | `/admin-api/v1/charts/{id}/status` | 更新状态 | data:chart:update |

---

## 🔑 请求参数说明

### DocumentRequest（创建/更新文档）
```json
{
  "title": "文档标题",           // 必填
  "docType": "report",          // 必填：contract/report/proposal/manual/other
  "category": "tech",           // 必填：tech/business/finance/hr
  "content": "文档内容",         // 可选
  "fileUrl": "文件URL",         // 可选
  "fileSize": 1024,            // 可选
  "tags": ["标签1", "标签2"],   // 可选
  "status": 1                  // 可选：0=草稿 1=正常 2=归档
}
```

### ChartRequest（创建/更新图表）
```json
{
  "chartName": "图表名称",       // 必填
  "chartType": "line",          // 必填：line/bar/pie/scatter/radar
  "category": "business",       // 必填：business/tech/operation/finance
  "description": "图表描述",     // 可选
  "dataSource": "数据源",        // 必填
  "config": {},                // 可选：图表配置（JSON对象）
  "status": 1                  // 可选：0=草稿 1=正常
}
```

### 查询参数
```
?keyword=关键词        # 搜索标题/内容
&docType=report       # 文档类型
&chartType=line       # 图表类型
&category=tech        # 分类
&status=1             # 状态
&page=1               # 页码（默认1）
&size=20              # 每页数量（默认20）
```

---

## 🛠️ 故障排查

### 问题 1：编译失败
**现象**：`mvn clean compile` 报错 "Operation not permitted"

**解决**：
```bash
# 不使用 clean，直接编译
mvn compile -DskipTests

# 或在 IDE 中编译
```

### 问题 2：MapStruct 代码未生成
**现象**：找不到 Converter 实现类

**解决**：
```bash
# 确保 Maven 编译成功
mvn clean install -DskipTests

# 检查生成的代码
ls apex-infrastructure/target/generated-sources/annotations/
```

### 问题 3：API 返回 401
**现象**：请求返回未授权

**解决**：
- 确保请求头包含有效的 Bearer Token
- 检查 Token 是否过期
- 确认用户有相应权限

### 问题 4：API 返回 403
**现象**：请求返回禁止访问

**解决**：
- 检查用户是否拥有对应的权限码
- 在后端添加权限码到用户角色
- 权限码格式：`data:document:create` 等

### 问题 5：数据库表不存在
**现象**：启动报错表不存在

**解决**：
```bash
# 检查 Flyway 迁移状态
# 确保 V27 迁移脚本已执行

# 手动执行迁移
mysql -u root -p your_database < apex-interfaces/src/main/resources/db/migration/mysql/V27__create_document_and_chart_tables.sql
```

---

## 📁 文件位置速查

### 后端代码
```
apex-infrastructure/
  └── persistence/
      ├── po/               # 持久化对象
      ├── mapper/           # MyBatis Mapper
      ├── converter/        # PO-Entity 转换器
      └── repository/       # Repository 实现

apex-domain/
  └── repository/          # Repository 接口

apex-application/
  └── service/
      ├── DocumentService.java
      ├── ChartService.java
      └── impl/            # Service 实现

apex-interfaces/
  ├── handler/             # 请求处理器
  └── router/              # 路由配置
```

### 前端代码
```
apex-admin-web/
  ├── src/
  │   ├── api/
  │   │   ├── document.ts    # 文档 API
  │   │   └── chart.ts       # 图表 API
  │   ├── types/
  │   │   └── index.ts       # TypeScript 类型
  │   └── views/data/
  │       ├── document/      # 文档页面
  │       └── chart/         # 图表页面
  └── src/mock/
      └── index.ts           # Mock 数据
```

---

## 📞 获取帮助

### 文档
- 实施进度：`docs/DOCUMENT_CHART_IMPLEMENTATION_PROGRESS.md`
- 完整总结：`/Users/work/SUMMARY_DOCUMENT_CHART_FEATURE.md`
- 完成报告：`/Users/work/IMPLEMENTATION_COMPLETE.md`

### 联系方式
如有问题，请联系开发团队。

---

**最后更新**: 2026-09-12  
**版本**: 1.0
