# AGENTS.md 更新清单（2026-09-13）

## 📋 快速导航

本次更新共新增 **7 个章节**，补充 **约 550 行**文档内容。

---

## 🎯 新增章节速查

### 高优先级（必读）

| 章节 | 位置 | 关键内容 | 适用场景 |
|------|------|---------|---------|
| **§3.10 环境变量配置** | 540-611 行 | `.env` 配置、Vite 配置、代理设置 | 项目初始化、部署配置 |
| **§3.11 表单校验工具** | 613-699 行 | 14 种内置校验规则、自定义扩展 | 表单开发、数据验证 |
| **§6 Token 刷新机制** | 1376-1420 行 | 双令牌机制、会话管理 API | 登录认证、会话维护 |
| **§4.6 settings.ts 常量** | 1073-1107 行 | 完整常量列表（含新增项） | 常量管理、配置收敛 |

### 中优先级（推荐）

| 章节 | 位置 | 关键内容 | 适用场景 |
|------|------|---------|---------|
| **§3.12 OAuth2 授权流程** | 755-810 行 | 标准授权码流程、第三方登录 | 社交登录集成 |
| **§3.5 错误处理规范** | 379-475 行 | 统一错误提示、错误码规范 | 错误处理、用户体验 |
| **§3.4 Store 设计原则** | 232-333 行 | Store 创建标准、使用规范 | 状态管理、架构设计 |
| **§7 类型安全检查清单** | 1497-1651 行 | TypeScript 规范、类型陷阱 | 代码质量、类型安全 |

---

## 🔍 章节详情

### §3.10 环境变量配置

**解决问题**：如何配置开发和生产环境？  
**核心内容**：
- `.env.development`：开发环境配置（API 代理目标、OAuth2 客户端 ID）
- `.env.production`：生产环境配置（网关地址、客户端 ID）
- Vite 配置要点：路径别名、开发服务器、代理配置、构建选项

**快速使用**：
```bash
# 开发环境（自动代理到后端 8080）
npm run dev

# 生产构建（读取 .env.production）
npm run build
```

---

### §3.11 表单校验工具

**解决问题**：如何统一表单验证规则？  
**核心内容**：
- **14 种内置规则**：手机号、邮箱、密码强度、URL、IP 地址、端口、身份证、银行卡、中文字符、数字范围、正整数、非负数、中文姓名、用户名
- **3 个通用工厂**：validateRequired、validateLength、validateRange
- **扩展规范**：自定义规则的标准写法

**快速使用**：
```typescript
import { validatePhone, validateEmail } from '@/utils/validate'

const rules = {
  phone: [validatePhone()],
  email: [validateEmail()]
}
```

---

### §6 Token 刷新机制

**解决问题**：如何实现安全的会话管理？  
**核心内容**：
- **双令牌机制**：accessToken（短期）+ refreshToken（长期）
- **自动刷新流程**：accessToken 过期时自动使用 refreshToken 刷新
- **统一会话管理**：getToken、setToken、clearSession

**快速使用**：
```typescript
import { getToken, clearSession } from '@/utils/auth'

// 获取 Token
const token = getToken()

// 登出清理会话
clearSession()
```

---

### §3.12 OAuth2 授权流程

**解决问题**：如何集成第三方社交登录？  
**核心内容**：
- **标准授权码流程**：构建授权 URL → 用户授权 → 回调处理 → 换取 Token
- **安全要点**：state 参数校验、授权码一次性使用、Token 安全存储
- **配置要求**：环境变量、后端回调地址、前端路由

**快速使用**：
```typescript
import { buildAuthUrl, handleAuthCallback } from '@/api/oauth2'

// 1. 跳转到授权页面
const authUrl = await buildAuthUrl('github', redirectUri)
window.location.href = authUrl

// 2. 回调处理（在 /oauth2/callback 页面）
const result = await handleAuthCallback(code, state)
```

---

### §3.5 错误处理规范

**解决问题**：如何统一处理和展示错误？  
**核心内容**：
- **统一错误提示**：ElMessage（操作反馈）、ElNotification（重要通知）
- **API 错误处理**：try-catch + showError 统一处理
- **错误码规范**：业务错误码映射、自定义错误码扩展
- **网络异常处理**：超时、断网、服务不可用

**快速使用**：
```typescript
import { showError } from '@/utils/error'

try {
  await createUser(form)
  ElMessage.success('创建成功')
} catch (error) {
  showError(error, '创建用户失败')
}
```

---

### §3.4 Store 设计原则

**解决问题**：何时该创建新 Store？何时不该用 Store？  
**核心内容**：
- **创建 Store 的标准**：跨组件共享、需持久化、依赖其他状态
- **不需要 Store 的场景**：单组件状态、父子传递、一次性数据、纯展示数据
- **Store 使用规范**：storeToRefs 的正确用法、跨 Store 通信
- **避免滥用**：不要把所有状态都放进 Store

**快速使用**：
```typescript
// 判断标准
是否需要跨多个组件共享？           否 → 使用 ref/reactive
是否需要在页面刷新后保留？         否 → 使用 ref/reactive
是否依赖其他状态进行计算？         否 → 使用 ref/reactive
是否有复杂的业务逻辑？             否 → 使用 ref/reactive
                                   是 → 创建 Store
```

---

### §7 类型安全检查清单

**解决问题**：如何确保 TypeScript 严格类型检查？  
**核心内容**：
- **类型定义规范**：接口、API 响应、组件 Props
- **类型断言规范**：避免滥用 as、合理使用 as const
- **常见类型陷阱**：可选链、数组类型守卫、枚举 vs 联合类型
- **CI/CD 要求**：提交前必须通过 vue-tsc --noEmit

**快速使用**：
```bash
# 类型检查
npm run build  # 包含 vue-tsc --noEmit

# 单独检查
npx vue-tsc --noEmit
```

---

## 📊 更新统计

### 文档规模
- **原文档行数**：1,212 行
- **新增行数**：550 行
- **最终行数**：1,762 行
- **增长比例**：45%

### 内容分布
- **新增章节**：7 个
- **代码示例**：15+ 个
- **对比示例**：正确/错误 20+ 组
- **流程图**：1 个

### 质量验证
- ✅ 构建验证通过（2 次）
- ✅ 类型检查通过（vue-tsc）
- ✅ 代码对照验证（12 个 API 文件 + 29 个视图文件）

---

## 🎯 使用建议

### 新人上手
1. 阅读 §1 项目概览 + §2 目录结构（10 分钟）
2. 阅读 §3.10 环境变量配置（5 分钟）
3. 阅读 §5 构建与质量检查（5 分钟）
4. 运行 `npm install && npm run dev`（2 分钟）
5. 阅读 §3.2 动态路由机制（10 分钟）

**总耗时**：约 30 分钟即可搭建开发环境并理解核心机制。

### 日常开发
**遇到问题时，快速查找对应章节**：

| 开发场景 | 推荐章节 |
|---------|---------|
| 新增页面 | §3.2 动态路由 + §6 新增菜单全流程 |
| 表单验证 | §3.11 表单校验工具 |
| 接口调用 | §3.1 请求封装 + §3.5 错误处理规范 |
| 状态管理 | §3.4 Store 设计原则 |
| 文件上传 | §3.8 文件管理 |
| 权限控制 | §3.3 按钮权限指令 |
| 类型报错 | §7 类型安全检查清单 |
| OAuth2 登录 | §3.12 OAuth2 授权流程 |
| 环境配置 | §3.10 环境变量配置 |
| 会话管理 | §6 Token 刷新机制 |

### 代码审查
**审查清单（基于 §7 变更检查清单）**：
- [ ] 构建通过（`npm run build`）
- [ ] 注释完整（文件头 + JSDoc）
- [ ] 请求规范（复用 request.ts）
- [ ] 路由注册（VIEW_REGISTRY）
- [ ] 分页统一（PageQuery/PageResponse）
- [ ] 常量收敛（settings.ts）
- [ ] 组件复用（Pagination）
- [ ] 类型安全（无 any、无强制断言）

---

## 🔗 相关文档

- **[AGENTS.md](../../../AGENTS.md)**：项目开发规范与工程约束（主文档）
- **[AGENTS_CHECK_REPORT.md](agents-check-report-2026-09-13.md)**：完整的检查报告
- **[AGENTS_MD_SUPPLEMENTS.md](agents-supplements-2026-09-13.md)**：补充建议详细内容
- **[AGENTS_UPDATE_SUMMARY.md](agents-update-summary-2026-09-13.md)**：完整更新总结

---

## 📝 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-09-13 | v1.2.0 | 新增 7 个章节，补充 550 行内容 |
| 2026-09-13 | v1.1.0 | 初始版本（原 AGENTS.md） |

---

**文档生成时间**：2026-09-13  
**文档用途**：快速查阅更新内容，定位相关章节  
**推荐阅读**：结合 [AGENTS.md](../../../AGENTS.md) 主文档使用

---

## 💡 反馈与建议

如发现文档与代码不符，或有改进建议，请：
1. 优先以代码为准
2. 及时更新 AGENTS.md
3. 同步更新本清单

**保持文档与代码的一致性是团队协作的基石！** 🚀
