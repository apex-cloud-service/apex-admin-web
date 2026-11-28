# scripts/verify（上线后验证）

## 用途

对**已部署**的前端站点做端到端验证：静态服务、安全头、SPA 回退、接口连通、鉴权、SSE/WS 通道、consent 分流、路由反代。与 E2E 打桩测试互补——这里验的是真实 Nginx 反代与真实后端。

## 入口

```bash
BASE_URL=https://admin.example.com npm run verify:deploy

# 完整参数
BASE_URL=https://admin.example.com \
API_BASE=https://api.example.com \
TOKEN=<管理员令牌> \
TENANT_ID=<租户> \
INSECURE=1 SKIP_UPLOAD=1 SKIP_WS=1 \
bash scripts/verify/post-deploy-check.sh
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `BASE_URL` | **是** | 前端站点根地址（不带尾部斜杠） |
| `API_BASE` | 否 | 接口根地址；跨域部署填网关，缺省等于 `BASE_URL` |
| `TOKEN` | 否 | 管理员令牌；启用 C10 与 WS 票据/握手检查。**非法令牌与 SSE 探测始终执行**，无 TOKEN 时 SSE 401 记告警 |
| `TENANT_ID` | 否 | 随请求附带 `X-Tenant-Id` |
| `INSECURE=1` | 否 | 跳过 TLS 校验（自签证书） |
| `SKIP_UPLOAD=1` | 否 | 跳过请求体边界检查（含大文件，较慢） |
| `SKIP_WS=1` | 否 | 跳过 WebSocket 握手检查 |

## 检查项（C1–C13）

| 编号 | 检查内容 | 是否需令牌 |
| --- | --- | --- |
| C1 | 静态站点返回 200 且含 Vue 挂载节点 `id="app"` | 否 |
| C2 | 首页安全响应头 | 否 |
| C3 | 带 hash 静态资源：200 + 长缓存 + 安全头 | 否 |
| C4 | SPA History 回退 | 否 |
| C5 | 公开接口连通（验证码） | 否 |
| C6 | 内部端点探测（逐个判定不可达） | 否 |
| C7 | 非法令牌必须 401 | 否 |
| C8 | 请求体边界返回 413（仅同源部署检查） | 否 |
| C9 | 通知流 SSE：路由存在、Content-Type 正确、能收到数据 | 否 |
| C10 | 鉴权类接口 | **是** |
| C11 | WebSocket 握手 | **是** |
| C12 | 授权同意端点分流（GET 回退 SPA 同意页，POST 反代） | 否 |
| C13 | 带版本前缀的路由必须落网关，而非回退 SPA | 否 |

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 全部通过或仅告警 |
| 1 | 存在失败项 |
| 2 | 缺少必填参数（`BASE_URL`） |

## 关键边界

- 只能验证**已部署环境**；本地构建产物请用 `npx playwright test`（打桩）或 `vite preview`。
- C8 只在 `API_BASE == BASE_URL` 时执行（跨域无法验同源请求体上限）。
- 无 TOKEN 时 C10/C11 跳过，**不能据此宣称鉴权链路通过**。
- 首个脚本注释引用的「go-live checklist」是 2026-11-10 历史文档，口径以脚本实现为准。

## 关联

- [docs/guides/deployment.md](../../docs/guides/deployment.md) §6/§10
- [AGENTS.md 附录 A §9](../../AGENTS.md)（命令表）