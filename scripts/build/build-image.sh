#!/usr/bin/env bash
set -e

# ============================================================
# Apex Admin Web 前端镜像构建脚本
# ============================================================
# 基于 Containerfile 多阶段构建（node:22-alpine 构建 + nginx:1.27-alpine 运行）
# 用法:
#   ./scripts/build/build-image.sh                     # 构建 apex-admin-web:latest
#   ./scripts/build/build-image.sh --tag v1.2.0        # 指定镜像标签
#   ./scripts/build/build-image.sh --api-base-url https://api.example.com   # 覆盖后端网关
#   ./scripts/build/build-image.sh --no-cache          # 禁用 Podman 构建缓存
# 说明:
#   - 默认读取 .env.production 的 VITE_API_BASE_URL（生产同域部署通常留空）
#   - --api-base-url 优先级高于 .env.production
#   - 产物: Podman 镜像 apex-admin-web:<tag>
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

# ---- 参数解析 ----
TAG="latest"
BUILD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || { echo "--tag 需要镜像标签" >&2; exit 2; }
      TAG="$2"; shift 2 ;;
    --api-base-url)
      [[ $# -ge 2 && "$2" != --* ]] || { echo "--api-base-url 需要 URL 或显式空字符串" >&2; exit 2; }
      API_BASE_URL="$2"; shift 2 ;;
    --no-cache)
      BUILD_ARGS+=(--no-cache); shift ;;
    -h|--help)
      echo "用法: ./scripts/build/build-image.sh [--tag <tag>] [--api-base-url <url>] [--no-cache]"
      exit 0 ;;
    *)
      echo "❌ 未知参数: $1"
      echo "用法: ./scripts/build/build-image.sh [--tag <tag>] [--api-base-url <url>] [--no-cache]"
      exit 1 ;;
  esac
done

# ---- 校验 Podman 可用 ----
if ! command -v podman &> /dev/null; then
  echo "未找到 Podman，请先安装 Podman" >&2
  exit 1
fi

# ---- 确定 VITE_API_BASE_URL（CLI 参数 > .env.production > 留空） ----
if [[ -z "${API_BASE_URL+x}" && -f ".env.production" ]]; then
  API_BASE_URL="$(grep '^VITE_API_BASE_URL=' .env.production | head -1 | cut -d'=' -f2- | tr -d '[:space:]')"
fi

BUILD_ARGS+=(--build-arg "VITE_API_BASE_URL=${API_BASE_URL:-}")
if [[ -n "${API_BASE_URL:-}" ]]; then
  echo "🌐 后端网关 VITE_API_BASE_URL: ${API_BASE_URL}"
else
  echo "🌐 后端网关 VITE_API_BASE_URL: (留空，同域部署走 Nginx 反代相对路径)"
fi

# ---- 构建 ----
echo "🚀 开始构建前端镜像 apex-admin-web:${TAG} ..."
podman build -f Containerfile "${BUILD_ARGS[@]}" -t "apex-admin-web:${TAG}" .

# ---- 产物确认 ----
echo "✅ 镜像构建完成"
podman images "apex-admin-web:${TAG}" --format '镜像: {{.Repository}}:{{.Tag}} | 大小: {{.Size}} | 创建: {{.CreatedSince}}'
