# 贡献指南（Contributing）

## 1. 开发环境

```bash
npm install        # Node >= 18
npm run dev        # http://localhost:5173，代理 /api /admin-api /auth/v1|v2 /integration/v1 /oauth2 → VITE_API_PROXY_TARGET（默认 127.0.0.1:8080）
```

联调需要后端 apex-scaffold 已启动（接口模块 8080）；无后端时可启用 Mock（仅开发环境自动加载，见 `src/mock/`）。

## 2. 分支与提交

- 分支：`main` 为默认分支；功能开发建议 `feat/{module}-{topic}`、修复 `fix/{topic}`；
- 提交信息：Conventional Commits（`feat:` `fix:` `docs:` `chore:` `refactor:` `build:`），中英文皆可，正文说明"为什么"；
- 提交前自查清单见 [AGENTS.md](AGENTS.md) §10。

## 3. 质量门（提交前必须全过）

```bash
npm run build      # vue-tsc --noEmit 严格类型检查 + 生产构建，任一失败即不通过
npm run test       # Vitest 单元测试
```

类型红线：禁止 `any`、禁止 `Promise<any>` 返回、严格模式（`strict` + `noUnusedLocals` + `noUnusedParameters`）。

## 4. 代码规范

- 注释按需编写：遵循 AGENTS.md 的克制原则，仅为不自明逻辑、隐式契约和重要约束补充说明；
- 请求必须复用 `src/utils/request.ts` 的 `get/post/put/del`，禁止裸写 axios；
- 新增菜单页面必须在 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 登记；
- 分页请求字段和响应结构按具体 API 类型、页面调用及后端契约核对，不能将普通列表、工作流列表和裸数组响应全局统一；
- 仓库无 ESLint/Prettier，风格以既有代码与 `.editorconfig` 为准（2 空格、LF、UTF-8）。

## 5. 文档同步义务

**文档与代码不一致视为缺陷**。以下改动必须同步更新对应文档：

| 改动 | 必须更新 |
|------|---------|
| 新增/修改接口 | [docs/api/README.md](docs/api/README.md)、AGENTS.md 模块清单 |
| 新增页面/路由 | AGENTS.md（VIEW_REGISTRY、目录树）、[docs/architecture/auth-and-routing.md](docs/architecture/auth-and-routing.md) |
| 认证/请求层行为变更 | [docs/architecture/auth-and-routing.md](docs/architecture/auth-and-routing.md)、AGENTS.md §4/§5 |
| 新增 store/composable/工具 | [docs/reference/toolkit.md](docs/reference/toolkit.md) |
| 测试基础设施变更 | [docs/reference/testing.md](docs/reference/testing.md) |
| 发版 | [CHANGELOG.md](CHANGELOG.md) |
| 文档中心导航 | [docs/README.md](docs/README.md) |

## 6. 新增功能页面的完整流程

1. 后端：Flyway 迁移脚本入 `sys_menu`（`component` 字段指向前端视图路径）；
2. 前端：新建 `src/views/{module}/{page}/index.vue`；
3. 注册：`VIEW_REGISTRY` 登记同名 loader；
4. 权限：后端 Handler 标注权限码，前端按钮用 `v-permission`；
5. 文档：更新 API 目录与 AGENTS.md；
6. 验证：侧边栏出现、路由可达、CRUD 正常、`npm run build` 通过。

## 7. 提交内容边界

- 不提交：`dist/`、`node_modules/`、本地环境文件（`.env.local`）、`*.bak` 备份文件；
- `reports/` 仅提交机器可读结果：`test-results.xml`、`test-results.json`、`coverage/coverage-summary.json`；
  这三份由 `npm run test:report` 生成后经 `scripts/quality/normalize-test-report.mjs` 归一化（绝对路径转仓库相对路径、主机名置为 localhost），提交前不要手工改回；
  HTML、lcov 与 `coverage-final.json` 等生成物不入库（见 `.gitignore`），需要时本地重建；
- 依赖变更需同时提交 `package.json` + `package-lock.json`；
- 涉及密钥/密码的配置一律不进仓库（`VITE_*` 变量会进入前端产物，见 AGENTS.md §1）。
