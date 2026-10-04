# ============================================================
# Apex Admin Web - 前端多阶段构建镜像
# ============================================================
# 构建: docker build [--build-arg VITE_API_BASE_URL=...] -t apex-admin-web:latest .
#   VITE_API_BASE_URL  生产后端网关地址；同域部署（Nginx 反代 /api、/admin-api）留空
# 运行: docker run -p 80:80 -e API_PROXY_PASS=http://127.0.0.1:8080 apex-admin-web:latest
#   API_PROXY_PASS     前端 Nginx 反代后端的 upstream 地址（默认 http://apex-scaffold:8080）
# 详细说明见 docs/guides/deployment.md §13
# ============================================================

# ------------------------------------------------------------
# 1. Build Stage（安装依赖 + 类型校验 + 打包）
# ------------------------------------------------------------
FROM node:18-alpine AS build

# 生产环境变量（build 期注入，默认留空走相对路径）
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

# 先拷贝 package 清单，充分利用 Docker 层缓存
COPY package*.json ./
RUN npm install

# 拷贝全部源码并构建
COPY . .
RUN npm run build

# ------------------------------------------------------------
# 2. Runtime Stage（仅含 Nginx + 静态产物）
# ------------------------------------------------------------
FROM nginx:1.27-alpine

# 时区
ENV TZ="Asia/Shanghai"

# 容器内默认反代后端地址（compose 网络内为后端服务名；宿主机用 http://172.17.0.1:8080 或宿主 IP）
ENV API_PROXY_PASS="http://apex-scaffold:8080"

# 用 envsubst 渲染 nginx 模板（仅展开 ${API_PROXY_PASS}，避免误改 $uri 等内置变量）
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 拷贝构建产物到 Nginx 站点根目录
COPY --from=build /app/dist /usr/share/nginx/html

# 健康检查：就绪探针
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
