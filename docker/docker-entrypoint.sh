#!/bin/sh
# ============================================================
# Apex Admin Web - 容器入口
# 用 envsubst 渲染 ${API_PROXY_PASS} 到 default.conf，随后启动 Nginx
# ============================================================
set -eu

# 渲染模板：仅展开 API_PROXY_PASS，避免碰到 nginx 内置的 $uri/$host 等变量
envsubst '${API_PROXY_PASS}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# 以前台模式启动 Nginx（容器主进程）
exec nginx -g 'daemon off;'
