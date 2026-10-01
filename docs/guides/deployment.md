# Apex Admin Web 部署使用指南（迁移后·前后端分离）

> 版本：1.1.4 ｜ 适用：dev / it / prod 全环境
> 本文档面向 **前端独立工程**（`apex-admin-web`，Vue 3 + Vite）的构建与部署，记录前端与后端 [Apex Scaffold](https://github.com/your-org/apex-scaffold)（Spring Boot 3 WebFlux）分离后的部署形态。

---

## 目录

- [1. 迁移背景与部署形态变化](#1-迁移背景与部署形态变化)
- [2. 架构与请求路径](#2-架构与请求路径)
- [3. 前置条件](#3-前置条件)
- [4. 构建与产物](#4-构建与产物)
- [5. 环境变量](#5-环境变量)
- [6. 部署方式一：Nginx 独立部署（推荐生产）](#6-部署方式一nginx-独立部署推荐生产)
- [7. 部署方式二：Docker 容器部署（推荐）](#7-部署方式二docker-容器部署推荐)
- [8. 部署方式三：与后端网关同域部署](#8-部署方式三与后端网关同域部署)
- [9. 开发环境联调](#9-开发环境联调)
- [10. 部署验证清单](#10-部署验证清单)
- [11. 升级与回滚](#11-升级与回滚)
- [12. 常见问题 FAQ](#12-常见问题-faq)
- [13. 命令速查表](#13-命令速查表)

---

## 1. 迁移背景与部署形态变化

本次"前端迁移"将原本内嵌于后端工程 `apex-scaffold` 的静态管理控制台
（`apex-interfaces/src/main/resources/static/admin/` 下的 `index.html` / `app.js` / `styles.css`）
整合到独立的 `apex-admin-web`（Vue 3 + Vite + TS + Pinia + Element Plus）工程。迁移完成后：

| 变更项 | 迁移前 | 迁移后 |
|--------|--------|--------|
| 前端载体 | 后端 `static/admin/` 静态三件套 | 独立工程 `apex-admin-web`，构建产物 `dist/` |
| 后端短入口 `/admin` | 302 重定向至 `/admin/index.html` | 已移除，访问返回 404 |
| 前端托管方式 | 内嵌于后端 jar | Nginx / 静态服务器独立托管，或与后端网关同域 |
| `PUBLIC_PATHS`（公开路径） | 含 `/admin`、`/admin/**` | 已移除（后端不再托管前端静态资源） |
| API 调用日志页面 | 缺失 | 补齐：`monitor/api-call-log` |

**部署影响**：管理后台已从后端直接提供改为**独立源站部署**。若部署后直接访问后端 `/admin`
将得到 404（符合预期），请改为访问前端源站地址（如 `https://admin.example.com`）。

> 后端仅提供业务与管理 REST 接口（`/api/v1`、`/admin-api/v1`），不再托管任何前端静态资源。
> 后端自身的 Java 服务部署见后端工程 `docs/DEPLOYMENT.md`，不在本文档范围。

---

## 2. 架构与请求路径

```
用户浏览器
      │
      ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  Nginx / 静态服务器        │  /api、/admin-api   ┌──────────────────────────┐
│  托管 apex-admin-web dist │ ─────────────────► │  Apex Scaffold 后端 :8080  │
│  静态 + 反向代理           │                     │  （健康检查 /api/v1/health）│
└──────────────────────────┘                     └──────────────────────────┘
```

- **前端页面/静态资源**：由 Nginx（或任意静态服务器）直接返回 `dist/` 内容，走同域相对路径。
- **前端动态数据**：浏览器请求 `/api/*`（业务）与 `/admin-api/*`（管理）前缀，由 Nginx 反向代理到后端。
- **后端接口**：`/admin-api/v1/menus` 返回菜单树并驱动前端动态路由；权限码控制按钮显隐。
- **鉴权**：登录成功返回 `accessToken`，前端以 `Authorization: Bearer <token>` 携带，401 自动跳转登录页。

---

## 3. 前置条件

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 18 | 前端构建（`devDependencies` 声明 `engines.node >= 18`） |
| npm | ≥ 9 | 依赖安装与脚本执行 |
| Nginx | 任意主流版本 | 推荐生产独立部署用；也可使用任意静态服务器 |

> 后端（Apex Scaffold，JDK 17 + MySQL + Redis）需已就绪可用；其部署与健康检查见后端 `docs/DEPLOYMENT.md`。

---

## 4. 构建与产物

```bash
# 1. 安装依赖
npm install

# 2. 生产构建（先生成类型校验 vue-tsc，再执行 vite build）
npm run build
```

产物输出到工程根目录 `dist/`，典型内容：

```
dist/
├── index.html
└── assets/
    ├── index-*.js        # 应用入口（含按路由分包）
    └── index-*.css
```

> 构建命令为 `vue-tsc --noEmit && vite build`，类型错误会导致构建失败。`vite build` 的关键参数
> （见 `vite.config.ts`）：
> - `chunkSizeWarningLimit: 1000`（KB）抑制大 chunk 告警；构建目标跟随 esbuild 默认（`tsconfig.target` 为 `ES2020`）。
> - `minify: 'terser'` 且 `drop_console` / `drop_debugger`：生产产物移除 `console` 与调试语句。
> - `manualChunks` 按 vue/pinia、element-plus、element-icons、echarts、vueuse、axios、其他 vendor 拆分 chunk。
> - `rollup-plugin-visualizer` 构建后输出 `dist/stats.html`，可手动打开分析产物体积。

---

## 5. 环境变量

构建期由 Vite 读取（`.env.production` / `.env.development`），仅 `VITE_` 前缀变量会注入产物。

| 变量 | 生效环境 | 说明 |
|------|---------|------|
| `VITE_API_BASE_URL` | 生产（`.env.production`） | 后端网关地址。**同域部署留空**，走相对路径 `/api`、`/admin-api`；跨域/独立网关时填写完整前缀（如 `https://api.example.com`） |
| `VITE_API_PROXY_TARGET` | 开发（`.env.development`） | Vite dev server 代理目标，默认 `http://127.0.0.1:8080` |

```bash
# 例：跨域部署时指定后端网关
VITE_API_BASE_URL=https://api.example.com npm run build
```

> ⚠️ `VITE_*` 为 build 时静态注入，修改后需**重新构建**，不能通过运行时环境覆盖。

---

## 6. 部署方式一：Nginx 独立部署（推荐生产）

适用：前端由独立域名（或独立端口）提供服务，与后端分离。

### 6.1 上传产物并配置 Nginx

```bash
# 1. 构建
npm run build

# 2. 部署 dist/ 到站点目录（以 /var/www/apex-admin 为例）
mkdir -p /var/www/apex-admin
cp -r dist/* /var/www/apex-admin/
```

### 6.2 最小 Nginx 配置（同域接管静态 + 反向代理）

`/etc/nginx/conf.d/apex-admin.conf`：

```nginx
server {
    listen       80;
    server_name  admin.example.com;

    root /var/www/apex-admin;
    index index.html;

    # 前端单页应用 History 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端业务与管理接口反向代理
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /admin-api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

> **为什么需要 `try_files ... /index.html`**：前端使用 Vue Router「history 模式」，直接刷新
> `/monitor/api-call-log` 等多级路径时需回退到 `index.html` 再让前端路由接管，否则返回 404。
>
> **为什么只需代理 `/api/` 与 `/admin-api/`**：前后端分离后前端所有动态数据请求均带这两组前缀，
> 静态资源与页面由 Nginx 直接返回。

### 6.3 启用 HTTPS（生产建议）

```nginx
server {
    listen 443 ssl;
    server_name admin.example.com;
    ssl_certificate     /etc/nginx/ssl/admin.example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/admin.example.com.key;
    # ... 其余 location 同 6.2
}
server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$host$request_uri;
}
```

---

## 7. 部署方式二：Docker 容器部署（推荐）

适用：需要统一容器化交付、与后端（`apex-scaffold`）编排在同一 Docker 环境时。
本工程提供 `Dockerfile`（多阶段构建）与 `docker-compose.yml` 编排。

### 7.1 目录结构

```
apex-admin-web/
├── Dockerfile                # 多阶段构建：node:18 构建 → nginx:alpine 运行
├── docker-compose.yml        # 前端服务编排
├── .dockerignore
└── docker/
    ├── nginx.conf            # Nginx 站点模板（${API_PROXY_PASS} 占位）
    └── docker-entrypoint.sh  # 容器入口：envsubst 渲染后启动 Nginx
```

### 7.2 镜像设计

- **构建阶段** `node:18-alpine`：`npm install` → `npm run build`（含 vue-tsc 类型校验），
  产物 `dist/`；`VITE_API_BASE_URL` 通过 `--build-arg` 注入（默认空 = 同域相对路径）。
- **运行阶段** `nginx:1.27-alpine`：仅含静态产物与 Nginx，镜像小、启动快；
  内置 `HEALTHCHECK`（`wget http://127.0.0.1/`）供编排探活。
- **反代地址可配置**：容器启动时由 `docker-entrypoint.sh` 用 `envsubst` 将模板中的
  `${API_PROXY_PASS}` 渲染为实际后端地址（环境变量 `API_PROXY_PASS`，默认
  `http://apex-scaffold:8080`，即与后端 compose 同网络直连）。

### 7.3 构建镜像

工程提供一键构建脚本 `scripts/build/build-image.sh`（风格与后端 `scripts/build/build.sh` 一致）：

```bash
cd /path/to/apex-admin-web

# 1. 构建镜像（同域部署留空 VITE_API_BASE_URL，默认读取 .env.production）
./scripts/build/build-image.sh

# 指定版本标签 / 后端网关 / 禁用缓存
./scripts/build/build-image.sh --tag v1.1.4
./scripts/build/build-image.sh --api-base-url https://api.example.com
./scripts/build/build-image.sh --no-cache

# 等价的原生 docker 命令（脚本内部执行）：
docker build [--build-arg VITE_API_BASE_URL=<url>] -t apex-admin-web:latest .
```

脚本特性：参数解析（`--tag/--api-base-url/--no-cache`）、自动读取 `.env.production`
的 `VITE_API_BASE_URL`、构建完成后打印镜像与运行示例。

### 7.4 独立运行

```bash
# 运行（独立部署时把反代指向宿主后端：macOS/Windows 用 172.17.0.1，Linux 用宿主 IP）
docker run -d --name apex-admin-web -p 80:80   -e API_PROXY_PASS=http://172.17.0.1:8080   apex-admin-web:latest

# 验证
curl -s http://localhost/ | head -5        # 页面
curl -s http://localhost/api/v1/health     # 反代后端健康检查
```

### 7.5 Compose 编排（推荐）

本工程的 `docker-compose.yml` 已声明 **外部网络** `apex-network`
（`name: apex-scaffold_apex-network`，即后端 compose 项目创建的网络），
`API_PROXY_PASS` 默认 `http://apex-scaffold:8080`（后端 compose 服务名）。

```bash
# 前置：确保后端 compose 已先启动（其网络 apex-scaffold_apex-network 必须存在）
cd /path/to/apex-scaffold && docker compose up -d

# 前端接入：一条命令即可，compose 自动将容器挂到后端网络
cd /path/to/apex-admin-web
docker compose up -d --build
docker compose ps    # 等待 healthy
```

### 7.6 接入后端 compose 网络的完整启动命令（端到端）

> 以下命令均已在本工程实际验证通过：前端容器成功挂入 `apex-scaffold_apex-network`，
> 网络内 DNS 可解析后端 compose 服务名 `apex-scaffold`，Nginx 反代正常转发。

#### 方式一（推荐）：Compose 一键启动

前端 `docker-compose.yml` 已内置外部网络声明（`external: true` + `name: apex-scaffold_apex-network`），
唯一前置条件是**后端 compose 网络已创建**（后端 `.env` 中 `COMPOSE_PROJECT_NAME=apex-scaffold` 时网络名为
`apex-scaffold_apex-network`）。

**步骤 ①  启动后端 compose（先建网）**

```bash
cd /path/to/apex-scaffold

# 前置检查：网络是否已存在
docker network ls | grep apex-network
#   建议输出: apex-scaffold_apex-network   bridge   local

# 若不存在，则启动后端 compose 任意一次即可自动创建：
docker compose up -d
```

**步骤 ②  启动前端 compose（自动挂入后端网络）**

```bash
cd /path/to/apex-admin-web

# 一键构建并启动；compose 读取 networks.external 复用后端网络
docker compose up -d --build

# 等待就绪
docker compose ps            # STATUS 应为 running (healthy)
```

**步骤 ③  验证整条链路**

```bash
# 1) 确认容器已挂入后端网络
docker inspect apex-admin-web --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
#   期望包含 apex-scaffold_apex-network

# 2) 确认网络内能解析后端服务名
docker exec apex-admin-web getent hosts apex-scaffold
#   期望输出一行 <IP>  apex-scaffold

# 3) 前端页面
curl -s -o /dev/null -w 'page=%{http_code}\n' http://localhost/

# 4) 经容器内 Nginx 反代到后端健康/接口（需后端应用已运行）
curl -s http://localhost/api/v1/health
# 或在不带登录态时验证反代配置：
docker exec apex-admin-web grep proxy_pass /etc/nginx/conf.d/default.conf
#   期望: proxy_pass http://apex-scaffold:8080;
```

#### 方式二：docker run 直接挂网络（免 compose）

后端 compose 已运行、前端镜像已构建时使用：

```bash
cd /path/to/apex-admin-web
docker build -t apex-admin-web:latest .

docker run -d --name apex-admin-web \
  --network apex-scaffold_apex-network \
  -e API_PROXY_PASS=http://apex-scaffold:8080 \
  -p 80:80 \
  apex-admin-web:latest

docker exec apex-admin-web getent hosts apex-scaffold   # 应解析出后端容器 IP
curl -s http://localhost/api/v1/health
```

#### 方式三：合并进后端 compose（同网络，无需 external）

> 后端 `apex-scaffold/docker-compose.yml` 的 `services` 下**已实际加入** `apex-admin-web` 服务
> （挂在既有 `apex-network`，与 `apex-scaffold` 天然互通，无需声明 `external` 网络）。

```bash
# ① 先构建前端镜像（后端 compose 无法引用前端仓库的 build context，故需预构建）
cd /path/to/apex-admin-web
docker build -t apex-admin-web:latest .

# ② 一次性拉起后端 + 前端
cd /path/to/apex-scaffold
docker compose up -d --build            # 全部拉起
# 单独启前端（不连带后端）：
docker compose up -d apex-admin-web --no-deps

# ③ 验证
docker compose ps                       # apex-admin-web 应为 running (healthy)
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost/   # 200
docker exec apex-admin-web getent hosts apex-scaffold             # 应解析出后端 IP
```

后端 `apex-scaffold/docker-compose.yml` 中对应的 `services` 片段（已合并）：

```yaml
  # ---------------- Apex Admin Web（前端管理后台，可选） ----------------
  apex-admin-web:
    image: apex-admin-web:${TAG:-latest}
    container_name: apex-admin-web
    environment:
      API_PROXY_PASS: ${API_PROXY_PASS:-http://apex-scaffold:8080}
      TZ: ${TZ:-Asia/Shanghai}
    ports:
      - "${WEB_PORT:-80}:80"
    depends_on:
      apex-scaffold:
        condition: service_started
    restart: unless-stopped
    networks:
      - apex-network
```

> **依赖说明**：本片段未给 `apex-scaffold` 添加 `healthcheck`（避免改动后端既有行为），
> 故前端 `depends_on` 用 `service_started`（服务已启动即认为可达），Nginx 就绪后反代自然可用。
> `compose up -d apex-admin-web` 因 `depends_on` 会连带拉起后端 `apex-scaffold`；
> 只想单独启前端则加 `--no-deps`。

#### 常见问题（FAQ）

| 现象 | 原因 | 处理 |
|------|------|------|
| compose up 报 `network ... not found` | 后端网络尚未创建，或项目名不符 | 先 `docker compose up -d` 后端；`docker network ls` 核对网络名，同步调整 `name:` |
| 无法解析 `apex-scaffold` | 前端容器未加入改网络，或不在同网络 | `docker inspect apex-admin-web` 查看 `Networks`；确认挂的是 `apex-scaffold_apex-network` |
| 反代 502/504 | 后端应用未启动或端口不一致 | 确认后端 `APP_PORT`（默认 8080）与 `API_PROXY_PASS` 端口一致；`curl` 后端健康端点 |
| 端口 80 被占用 | 宿主机 80 已被占用 | 启动时改映射 `docker compose run --rm -p 8088:80` 或 `.env` 设 `WEB_PORT=8088` |

> **网络名与 DNS 说明**：后端 compose 项目名 `apex-scaffold` + 网络名 `apex-network` →
> 实际网络 `apex-scaffold_apex-network`。容器间按 **compose 服务名** `apex-scaffold` DNS 解析
> （后端 `container_name` 未固定，由 compose 自动命名）。若用 `docker-compose -p <项目>` 改了项目名，
> 请把两处 `apex-scaffold_apex-network` 替换为 `<项目>_apex-network`。

### 7.7 Docker 部署验证

```bash
# 容器与网络
docker ps | grep apex-admin-web
docker exec apex-admin-web nginx -t

# 页面与接口回路
curl -s http://localhost/ -o /dev/null -w '%{http_code}\n'        # 200
curl -s http://localhost/api/v1/health                             # 反代后端可达
curl -s http://localhost/admin-api/v1/api-call-logs?pageNum=1      # 带登录态可查

# 回滚：重新 build 旧 tag 镜像并重启容器即可
```

---

## 8. 部署方式三：与后端网关同域部署

适用：前端与后端共用同一域名/入口，前端走相对路径，`VITE_API_BASE_URL` 留空（默认行为）。

- 前端 `dist/` 交给由后端统一网关代理的静态目录（例如后端 Nginx/网关的 `/` 根目录）。
- Nginx 依据 URI 前缀分流：`/api/`、`/admin-api/` 反向代理到后端 8080，其余静态返回 `dist/`。
- 该方式在浏览器地址栏访问的是前端入口（非后端 `/admin`），登录后动态路由照常由菜单驱动。

> 迁移后注意：**不要再**把 `dist/` 塞回后端 `static/admin/`（该目录与后端 `/admin` 重定向已删除）。

---

## 9. 开发环境联调

```bash
# 1. 启动后端（Java 服务，端口 8080）
#    （见后端工程 docs/DEPLOYMENT.md）

# 2. 启动前端 dev server
npm install
npm run dev
```

- 默认访问 `http://localhost:5173`。
- Vite dev server 已将 `/api`、`/admin-api` 及 OAuth2 端点（`/oauth2/authorize`、`/oauth2/token`）
  代理到 `http://127.0.0.1:8080`（可通过 `.env.development` 的 `VITE_API_PROXY_TARGET` 调整代理目标）。
- 登录流程：`GET /api/v1/auth/captcha`（拉取验证码）→ 提交账号密码 + 验证码 → 获取 `accessToken`。

---

## 10. 部署验证清单（迁移回归）

部署完成后按下列顺序冒烟，确认迁移不影响任何功能：

| # | 校验项 | 通过标准 |
|---|--------|---------|
| 1 | 页面资源加载 | `GET /` 返回 `index.html`，静态资源 200 |
| 2 | 登录 | 输入账号密码 + 验证码能成功登录跳转工作台 |
| 3 | 系统管理 | 用户 / 角色 / 菜单（树）／部门（树）／字典 / 参数 / 定时任务列表正常 |
| 4 | 监控中心 | 监控大盘、登录日志、操作审计、在线用户正常 |
| 5 | **API 调用日志** | 进入「监控中心 → API 调用日志」，列表可按 `serviceName / status / traceId / path` 查询与重置；状态标签（成功/客户端错误/服务端错误/网络异常）渲染正确 |
| 6 | 个人中心 | 当前用户信息展示正常 |
| 7 | 动态路由 | 侧边栏菜单与后端菜单树一致，点击各页面可达（刷新多级路径不 404） |
| 8 | 按钮权限 | 无权限用户按 `v-permission` 隐藏对应操作按钮 |
| 9 | 接口回路 | 浏览器 Network 中 `/api/*`、`/admin-api/*` 均代理到后端并返回 `Result{code:0}` |
| 10 | 后端回归 | 后端 `GET /api/v1/health` 返回 UP；`GET /admin` 返回 404（符合前后端分离预期） |

---

## 11. 升级与回滚

### 升级

```bash
# 1. 拉取新版本前端代码
cd /Users/work/apex-admin-web && git pull

# 2. 重新构建
npm install
npm run build

# 3. 备份当前站点
cp -r /var/www/apex-admin /var/www/apex-admin.bak.$(date +%Y%m%d%H%M)

# 4. 覆盖发布（建议先清空旧 assets 避免残留）
rm -rf /var/www/apex-admin/assets
cp -r dist/* /var/www/apex-admin/

# 5. 无需重载 Nginx（静态文件即改即生效）；如改动反代配置再 nginx -s reload
```

### 回滚

```bash
rm -rf /var/www/apex-admin
cp -r /var/www/apex-admin.bak.<TIMESTAMP> /var/www/apex-admin
# 刷新浏览器即可
```

> 前端为静态产物，无需与应用协调停机；若后端接口改动（如新增菜单 `component`），需同时
> 在 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 注册对应视图后再构建发布。

---

## 12. 常见问题 FAQ

**Q1：访问后端 `/admin` 返回 404？**
正常。迁移后后端不再重定向 `/admin`，管理后台应访问前端源站（Nginx 托管地址）。

**Q2：登录后页面接口全部 401？**
通常是后端未就绪或反代 `Authorization` 头被剥离。确认 `/api/v1/health` 可达、Nginx 透传了
`Host`/`X-Real-IP` 且未改写 `Authorization`。跨域部署需后端允许对应 Origin 并处理预检。

**Q3：刷新 `/monitor/api-call-log` 等子路径 404？**
Nginx 未配置 `try_files $uri $uri/ /index.html;`，history 模式路由刷新需回退到 `index.html`。

**Q4：`VITE_API_BASE_URL` 改成网关地址后不生效？**
`VITE_*` 是构建期注入，需删除 `dist/` 后重新 `npm run build`；运行时改环境变量无效。

**Q5：新菜单页面没显示？**
后端菜单 `component` 需在 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 注册对应视图路径，
否则动态路由无法映射到视图。API 调用日志（`monitor/api-call-log/index`）已注册。

---

## 13. 命令速查表

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务器（localhost:5173，代理到后端 8080） |
| `npm run build` | 生产构建，输出 `dist/`（含类型校验） |
| `npm run preview` | 本地预览构建产物 |
| `nginx -t && systemctl reload nginx` | 校验并热加载 Nginx 配置 |
| `cp -r dist/* /var/www/apex-admin/` | 发布前端产物到站点目录 |
| `./scripts/build/build-image.sh` | 一键构建前端镜像（或 `docker build -t apex-admin-web:latest .`） |
| `docker run -d -p 80:80 -e API_PROXY_PASS=http://172.17.0.1:8080 apex-admin-web:latest` | 独立运行容器 |
| `docker compose up -d --build` | Compose 一键构建启动 |
| `docker exec apex-admin-web nginx -t` | 容器内校验 Nginx 配置 |
