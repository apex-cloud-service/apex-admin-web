# scripts/build（镜像构建）

## 用途

用 Podman 基于根目录 `Containerfile` 做多阶段构建，产出运行镜像。

- 构建阶段：`node:22-alpine` + `npm ci` + `npm run build`（含 `vue-tsc --noEmit`）
- 运行阶段：`nginx:1.27-alpine`，静态产物 + `container/nginx.conf` 模板

## 入口

```bash
bash scripts/build/build-image.sh                          # apex-admin-web:latest
bash scripts/build/build-image.sh --tag v1.2.0             # 指定标签
bash scripts/build/build-image.sh --api-base-url https://api.example.com
bash scripts/build/build-image.sh --no-cache               # 禁用构建缓存
```

`--api-base-url` 优先级高于 `.env.production` 的 `VITE_API_BASE_URL`；两者都缺省时留空（同域部署走相对路径）。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 构建成功 |
| 1 | 未找到 Podman，或构建失败 |
| 2 | 参数错误（`--tag`/`--api-base-url` 缺值） |

## 关键边界

- **构建期注入**：`VITE_API_BASE_URL` 打进产物，运行期改环境变量不能重写已打包 JS。
- **运行期注入**：只有 `API_PROXY_PASS` 经 `container/container-entrypoint.sh` 的 envsubst 生效。
- 全栈编排唯一入口在后端仓库 `podman-compose.yml`，本仓库不再提供第二份 compose。

## 关联

- [部署指南](../../docs/guides/deployment.md)
- 图：[guides-deployment-02](../../docs/diagrams/guides-deployment-02.svg)（镜像设计与运行期注入）