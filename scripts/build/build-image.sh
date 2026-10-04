#!/usr/bin/env zsh
set -e

# ============================================================
# Apex Admin Web 前端镜像构建脚本
# ============================================================
# 基于 Dockerfile 多阶段构建（node:18-alpine 构建 + nginx:1.27-alpine 运行）
# 用法:
#   ./scripts/build/build-image.sh                     # 构建 apex-admin-web:latest
#   ./scripts/build/build-image.sh --tag v1.2.0        # 指定镜像标签
#   ./scripts/build/build-image.sh --api-base-url https://api.example.com   # 覆盖后端网关
#   ./scripts/build/build-image.sh --no-cache          # 禁用 Docker 构建缓存
# 说明:
#   - 默认读取 .env.production 的 VITE_API_BASE_URL（生产同域部署通常留空）
#   - --api-base-url 优先级高于 .env.production
#   - 产物: docker image apex-admin-web:<tag>
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

# ---- 参数解析 ----
TAG="latest"
API_BASE_URL=""
NO_CACHE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"; shift 2 ;;
    --api-base-url)
      API_BASE_URL="$2"; shift 2 ;;
    --no-cache)
      NO_CACHE="--no-cache"; shift ;;
    -h|--help)
      echo "用法: ./scripts/build/build-image.sh [--tag <tag>] [--api-base-url <url>] [--no-cache]"
      exit 0 ;;
    *)
      echo "❌ 未知参数: $1"
      echo "用法: ./scripts/build/build-image.sh [--tag <tag>] [--api-base-url <url>] [--no-cache]"
      exit 1 ;;
  esac
done

# ---- 校验 docker 可用 ----
if ! command -v docker &> /dev/null; then
  echo "❌ 未找到 docker，请先安装 Docker（https://docs.docker.com/get-docker/）"
  exit 1
fi

# ---- 确定 VITE_API_BASE_URL（CLI 参数 > .env.production > 留空） ----
if [[ -z "$API_BASE_URL" && -f ".env.production" ]]; then
  API_BASE_URL="$(grep '^VITE_API_BASE_URL=' .env.production | head -1 | cut -d'=' -f2- | tr -d '[:space:]')"
fi

BUILD_ARGS=()
if [[ -n "$API_BASE_URL" ]]; then
  BUILD_ARGS+=(--build-arg "VITE_API_BASE_URL=${API_BASE_URL}")
  echo "🌐 后端网关 VITE_API_BASE_URL: ${API_BASE_URL}"
else
  echo "🌐 后端网关 VITE_API_BASE_URL: (留空，同域部署走 Nginx 反代相对路径)"
fi

# ---- 构建 ----
echo "🚀 开始构建前端镜像 apex-admin-web:${TAG} ..."
docker build ${NO_CACHE} "${BUILD_ARGS[@]}" -t "apex-admin-web:${TAG}" .

# ---- 产物确认 ----
echo "✅ 镜像构建完成"
docker images "apex-admin-web:${TAG}" --format '镜像: {{.Repository}}:{{.Tag}} | 大小: {{.Size}} | 创建: {{.CreatedSince}}'
echo "📦 运行示例: docker run -d --name apex-admin-web -p 80:80 -e API_PROXY_PASS=http://127.0.0.1:8080 apex-admin-web:${TAG}"
