# ============================================================
# Apex Admin Web - 前端多阶段构建镜像
# ============================================================
# 构建: podman build -f Containerfile [--build-arg VITE_API_BASE_URL=...] -t apex-admin-web:latest .
#   VITE_API_BASE_URL  生产后端网关地址；同域部署（Nginx 反代 /api、/admin-api）留空
#   API_PROXY_PASS     前端 Nginx upstream（默认 http://apex-gateway:8080）
# 运行与联调见 docs/guides/deployment.md §7
# ============================================================

# ------------------------------------------------------------
# 1. Build Stage（安装依赖 + 类型校验 + 打包）
# ------------------------------------------------------------
FROM public.ecr.aws/docker/library/node:22-alpine AS build

# 生产环境变量（build 期注入，默认留空走相对路径）
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

# 先拷贝 package 清单，充分利用镜像层缓存
COPY package*.json ./
RUN npm ci

# 拷贝全部源码并构建
COPY . .
RUN npm run build

# ------------------------------------------------------------
# 2. Runtime Stage（仅含 Nginx + 静态产物）
# ------------------------------------------------------------
FROM public.ecr.aws/docker/library/nginx:1.27-alpine

# 时区
ENV TZ="Asia/Shanghai"

ENV API_PROXY_PASS="http://apex-gateway:8080"

# 用 envsubst 渲染 nginx 模板（仅展开 ${API_PROXY_PASS}，避免误改 $uri 等内置变量）
COPY container/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY container/container-entrypoint.sh /container-entrypoint.sh
RUN chmod +x /container-entrypoint.sh

# 拷贝构建产物到 Nginx 站点根目录
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/container-entrypoint.sh"]
