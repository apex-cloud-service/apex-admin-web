#!/usr/bin/env bash
# 上线后验证脚本：对应 docs/archived/project-reports/frontend-middle-platform-go-live-checklist-2026-11-10.md 的 §0/§3/§4/§9
#
# 用法：
#   BASE_URL=https://admin.example.com bash scripts/verify/post-deploy-check.sh
#   BASE_URL=https://admin.example.com API_BASE=https://api.example.com TOKEN=<token> bash scripts/verify/post-deploy-check.sh
#
# 环境变量：
#   BASE_URL        必填，前端站点根地址（不带尾部斜杠）
#   API_BASE        选填，接口根地址；跨域部署时填网关地址，缺省等于 BASE_URL
#   TOKEN           选填，管理员访问令牌；启用 C10 与 WS 票据/握手检查。
#                   非法令牌与 SSE 探测始终执行，无 TOKEN 的 SSE 401 记为告警。
#   TENANT_ID       选填，随请求附带 X-Tenant-Id
#   INSECURE=1      选填，跳过 TLS 证书校验（自签证书环境）
#   SKIP_UPLOAD=1   选填，跳过请求体边界检查（含大文件，较慢）
#   SKIP_WS=1       选填，跳过 WebSocket 握手检查
#
# 退出码：0 全部通过或仅告警；1 存在失败项；2 缺少必填参数

set -uo pipefail

BASE_URL="${BASE_URL:-}"
API_BASE="${API_BASE:-$BASE_URL}"
TOKEN="${TOKEN:-}"
TENANT_ID="${TENANT_ID:-}"
INSECURE="${INSECURE:-0}"
# 握手/预检使用的同源 Origin（取 BASE_URL 的 scheme://host[:port]）
ORIGIN="${ORIGIN:-$(printf '%s' "$BASE_URL" | sed -E 's#^(https?://[^/]+).*#\1#')}"
SKIP_UPLOAD="${SKIP_UPLOAD:-0}"
SKIP_WS="${SKIP_WS:-0}"

PASSED=0
FAILED=0
WARNED=0
SKIPPED=0
FAILED_ITEMS=()

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [ -z "$BASE_URL" ]; then
  echo "缺少 BASE_URL，例如：BASE_URL=https://admin.example.com bash $0" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
API_BASE="${API_BASE%/}"

CURL=(curl -sS --max-time 30)
CURL_STREAM=(curl -sS)
if [ "$INSECURE" = "1" ]; then
  CURL+=(-k)
  CURL_STREAM+=(-k)
fi

# 认证与租户头：用长度判断，避免 bash 3.2 在 set -u 下展开空数组报错
HEADERS=()
if [ -n "$TOKEN" ]; then
  HEADERS+=(-H "Authorization: Bearer $TOKEN")
fi
if [ -n "$TENANT_ID" ]; then
  HEADERS+=(-H "X-Tenant-Id: $TENANT_ID")
fi

pass() { printf '\033[32m[PASS]\033[0m %s\n' "$*"; PASSED=$((PASSED + 1)); }
fail() { printf '\033[31m[FAIL]\033[0m %s\n' "$*"; FAILED=$((FAILED + 1)); FAILED_ITEMS+=("$*"); }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; WARNED=$((WARNED + 1)); }
skip() { printf '\033[36m[SKIP]\033[0m %s\n' "$*"; SKIPPED=$((SKIPPED + 1)); }

# 请求封装：$1 方法，$2 URL，其余透传 curl；回显状态码，响应体/头写入 $TMP_DIR
request() {
  local method="$1" url="$2"
  shift 2
  "${CURL[@]}" -X "$method" -o "$TMP_DIR/body" -D "$TMP_DIR/header" \
    -w '%{http_code}' "$@" "$url" 2>"$TMP_DIR/err" || true
}

header_value() {
  grep -i "^$1:" "$TMP_DIR/header" | tail -1 | cut -d' ' -f2- | tr -d '\r'
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

json_ok() {
  grep -qE '"code"[[:space:]]*:[[:space:]]*0' "$TMP_DIR/body"
}

if [ -n "$TOKEN" ]; then
  AUTH_STATE="启用"
else
  AUTH_STATE="跳过（未提供 TOKEN）"
fi

echo "=============================================="
echo " 上线后验证：$BASE_URL"
echo " 接口地址：$API_BASE"
echo " 鉴权检查：$AUTH_STATE"
echo "=============================================="

# ---------------------------------------------------------------------------
# C1 静态站点可访问
# ---------------------------------------------------------------------------
code=$(request GET "$BASE_URL/" -H "Cache-Control: no-cache")
if [ "$code" = "200" ] && grep -q 'id="app"' "$TMP_DIR/body"; then
  pass "C1 静态站点返回 200 且含 Vue 挂载节点"
else
  fail "C1 静态站点异常（HTTP ${code}，未找到 id=\"app\"），检查 Nginx root 与 dist 产物"
fi

# ---------------------------------------------------------------------------
# C2 安全响应头（首页）
# ---------------------------------------------------------------------------
xcto=$(lowercase "$(header_value x-content-type-options)")
xfo=$(header_value x-frame-options)
if [ "$xcto" = "nosniff" ] && [ -n "$xfo" ]; then
  pass "C2 首页安全头齐全（X-Content-Type-Options / X-Frame-Options）"
else
  fail "C2 首页安全头缺失（x-content-type-options='${xcto}'，x-frame-options='${xfo}'），检查 add_header 继承"
fi

# ---------------------------------------------------------------------------
# C3 带 hash 的静态资源：200 + 长缓存 + 安全头
# ---------------------------------------------------------------------------
asset_path=$(grep -oE '(src|href)="/[^"]+\.(js|css)"' "$TMP_DIR/body" 2>/dev/null | head -1 | sed 's/.*"\(.*\)"/\1/')
if [ -z "$asset_path" ]; then
  fail "C3 首页未引用 js/css 产物，构建或静态目录可能不正确"
else
  code=$(request GET "$BASE_URL$asset_path")
  cc=$(header_value cache-control)
  if [ "$code" = "200" ] && printf '%s' "$cc" | grep -q 'immutable'; then
    pass "C3 静态资源 $asset_path 返回 200 且带 immutable 长缓存"
    if [ -n "$(header_value x-content-type-options)" ]; then
      pass "C3b 静态资源保留安全头（add_header 未被覆盖）"
    else
      fail "C3b 静态资源安全头丢失：该 location 存在 add_header，须重复声明父级安全头"
    fi
  else
    fail "C3 静态资源异常（${code}，cache-control='${cc}'），检查 Nginx 缓存规则是否覆盖 ${asset_path%%/*}/ 目录"
  fi
fi

# ---------------------------------------------------------------------------
# C4 SPA History 回退
# ---------------------------------------------------------------------------
code=$(request GET "$BASE_URL/platform/tenant")
if [ "$code" = "200" ] && grep -q 'id="app"' "$TMP_DIR/body"; then
  pass "C4 深链接 /platform/tenant 回退 index.html"
else
  fail "C4 History 回退失效（HTTP ${code}），检查 try_files 与前端路由是否被误反代"
fi

# ---------------------------------------------------------------------------
# C5 公开接口连通（验证码，无需令牌）
# ---------------------------------------------------------------------------
code=$(request GET "$API_BASE/api/v1/auth/captcha")
if [ "$code" = "200" ] && grep -qi 'captcha' "$TMP_DIR/body"; then
  pass "C5 公开接口 /api/v1/auth/captcha 经链路返回 200"
else
  fail "C5 公开接口异常（HTTP ${code}），检查 API_PROXY_PASS、网关路由与后端可用性"
fi

# ---------------------------------------------------------------------------
# C6 逐个探测内部端点，逐条判定是否可达。
# 通过只证明被探测路径在当前 GET 方法下不可达，不证明整个 /internal/v1/** 命名空间。
# 403/404 或回退到 SPA（HTML）视为不可达；HTML 不进一步区分回退来源。
# ---------------------------------------------------------------------------
INTERNAL_PATHS="/internal/v1/overview /internal/v1/notify /internal/v1/iot/devices"
C6_FAIL=0
for path in $INTERNAL_PATHS; do
  code=$(request GET "$API_BASE$path")
  ctype=$(lowercase "$(header_value content-type)")
  if [ "$code" = "403" ] || [ "$code" = "404" ]; then
    pass "C6 ${path} 不可达（HTTP ${code}）"
  elif [ "$code" = "000" ]; then
    fail "C6 ${path} 无法连通（HTTP 000），先确认站点可达"
    C6_FAIL=1
  elif printf '%s' "$ctype" | grep -q 'text/html'; then
    pass "C6 ${path} 未反代到后端（返回 HTML，疑似 SPA 回退）"
  else
    fail "C6 ${path} 返回 HTTP ${code}（content-type=${ctype}），内部端点疑似对外可达"
    C6_FAIL=1
  fi
done
[ "$C6_FAIL" -eq 0 ] && pass "C6 已探测 $(echo $INTERNAL_PATHS | wc -w | tr -d ' ') 条内部路径均不可达（仅为该 GET 探测结论）"

# ---------------------------------------------------------------------------
# C7 非法令牌必须 401
# ---------------------------------------------------------------------------
code=$(request GET "$API_BASE/api/v1/user/info" -H "Authorization: Bearer invalid-token-for-deploy-check")
if [ "$code" = "401" ]; then
  pass "C7 非法令牌返回 401"
else
  fail "C7 非法令牌返回 HTTP ${code}（期望 401），鉴权链路可能未生效"
fi

# ---------------------------------------------------------------------------
# C8 请求体边界（413）：仅 API_BASE 与 BASE_URL 相同时检查。
# 状态码来自整条链路，不能单凭 413 判断拒绝来自 Nginx 或其 20m 配置是否生效。
# ---------------------------------------------------------------------------
if [ "$SKIP_UPLOAD" = "1" ]; then
  skip "C8 请求体边界检查（SKIP_UPLOAD=1）"
elif [ "$API_BASE" != "$BASE_URL" ]; then
  skip "C8 请求体边界检查：API_BASE 与 BASE_URL 不同源，无法验证本仓库 Nginx 层"
else
  server_header() { header_value server; }

  dd if=/dev/zero of="$TMP_DIR/big.bin" bs=1048576 count=15 2>/dev/null
  code=$(request POST "$API_BASE/api/v1/files/generic" -F "file=@$TMP_DIR/big.bin;filename=deploy-check.bin")
  srv="$(server_header)"
  if [ "$code" = "413" ]; then
    # 413 来自整条链路，不能据此断言 Nginx 配置
    fail "C8 15MB 请求返回 413（server=${srv:-未知}），需定位拒绝层；不能单凭状态码断定 Nginx 配置"
  elif [ "$code" = "000" ]; then
    fail "C8 15MB 上传无响应，检查上游与超时"
  else
    pass "C8 15MB 请求未被链路拒绝（HTTP ${code}，server=${srv:-未知}；未鉴权属预期）"

    dd if=/dev/zero of="$TMP_DIR/huge.bin" bs=1048576 count=25 2>/dev/null
    code=$(request POST "$API_BASE/api/v1/files/generic" -F "file=@$TMP_DIR/huge.bin;filename=deploy-check.bin")
    srv="$(server_header)"
    if [ "$code" = "413" ]; then
      pass "C8b 25MB 请求返回 413（server=${srv:-未知}）；仅证明链路存在请求体上限，未确认来自本仓库 Nginx 20m"
    else
      warn "C8b 25MB 请求返回 HTTP ${code}；未出现 413，若上限为 20m 请核对是否经过本仓库 Nginx"
    fi
  fi
  rm -f "$TMP_DIR/big.bin" "$TMP_DIR/huge.bin"
fi

# ---------------------------------------------------------------------------
# C9 通知流 SSE：路由存在、Content-Type 正确、能收到数据
# ---------------------------------------------------------------------------
sse_code=$("${CURL_STREAM[@]}" --max-time 6 -N \
  -o "$TMP_DIR/sse" -D "$TMP_DIR/sse_header" -w '%{http_code}' \
  -H "Accept: text/event-stream" ${HEADERS[@]+"${HEADERS[@]}"} \
  "$API_BASE/api/v1/notifications/stream" 2>/dev/null || true)
sse_type=$(grep -i '^content-type:' "$TMP_DIR/sse_header" 2>/dev/null | tail -1 | cut -d' ' -f2- | tr -d '\r')
if [ "$sse_code" = "200" ]; then
  if printf '%s' "$sse_type" | grep -qi 'text/event-stream'; then
    if [ -s "$TMP_DIR/sse" ]; then
      pass "C9 SSE 建连成功并收到数据（content-type=${sse_type}）"
    else
      warn "C9 SSE 返回 200 但 6s 内无数据，检查网关 response-timeout 与后端心跳"
    fi
  else
    fail "C9 SSE Content-Type 为 '${sse_type}'，需为 text/event-stream（后端可能未识别 Accept）"
  fi
elif [ "$sse_code" = "401" ] && [ -z "$TOKEN" ]; then
  warn "C9 SSE 返回 401（未提供 TOKEN，仅证明路由存在）；提供 TOKEN 可验证流式输出"
else
  fail "C9 SSE 异常（HTTP ${sse_code}），检查 location 精确匹配、proxy_buffering off 与网关路由"
fi

# ---------------------------------------------------------------------------
# C10 鉴权类接口（需 TOKEN）
# ---------------------------------------------------------------------------
if [ -z "$TOKEN" ]; then
  skip "C10 鉴权类接口检查（未提供 TOKEN）"
else
  code=$(request GET "$API_BASE/api/v1/user/info" "${HEADERS[@]}")
  if [ "$code" = "200" ] && json_ok; then
    pass "C10 当前用户 /api/v1/user/info 正常"
  else
    fail "C10 当前用户接口异常（HTTP ${code}），令牌或会话可能无效"
  fi

  code=$(request GET "$API_BASE/api/v2/capabilities" "${HEADERS[@]}")
  if [ "$code" = "200" ]; then
    pass "C10b 能力目录 /api/v2/capabilities 正常"
  elif [ "$code" = "403" ]; then
    fail "C10b 能力目录 403：当前账号缺少 tenant:read 权限"
  else
    fail "C10b 能力目录异常（HTTP ${code}），检查网关是否已放行 /api/v2/**"
  fi

  code=$(request GET "$API_BASE/api/v2/capabilities/subscribed" "${HEADERS[@]}")
  if [ "$code" = "200" ]; then
    if grep -qE '"data"[[:space:]]*:[[:space:]]*\[\]' "$TMP_DIR/body"; then
      warn "C10c 当前租户未订阅任何能力（空集合 = 未订阅），请核对套餐 features"
    else
      pass "C10c 当前租户订阅 /capabilities/subscribed 返回非空"
    fi
  else
    fail "C10c 订阅接口异常（HTTP ${code}），检查套餐与网关路由"
  fi
fi

# ---------------------------------------------------------------------------
# C11 WebSocket 握手（需 TOKEN）。
# 请求携带 BASE_URL 的同源 Origin，以覆盖浏览器来源白名单校验；
# 403 只说明握手被拒，具体原因仍以服务端日志为准。
# ---------------------------------------------------------------------------
if [ "$SKIP_WS" = "1" ]; then
  skip "C11 WebSocket 握手检查（SKIP_WS=1）"
elif [ -z "$TOKEN" ]; then
  skip "C11 WebSocket 握手检查（未提供 TOKEN，无法取得握手票据）"
else
  code=$(request POST "$API_BASE/api/v1/messages/ws-ticket" "${HEADERS[@]}")
  ticket=$(grep -oE '"ticket"[[:space:]]*:[[:space:]]*"[^"]+"' "$TMP_DIR/body" | head -1 | sed 's/.*: *"//; s/"$//')
  if [ "$code" != "200" ] || [ -z "$ticket" ]; then
    fail "C11 无法取得 WS 握手票据（HTTP ${code}），站内信实时推送不可用"
  else
    ws_code=$("${CURL_STREAM[@]}" --max-time 6 -o /dev/null -D "$TMP_DIR/ws_header" -w '%{http_code}' \
      -H "Connection: Upgrade" -H "Upgrade: websocket" \
      -H "Origin: $ORIGIN" \
      -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
      --http1.1 "$API_BASE/api/v1/messages/ws?ticket=$ticket" 2>/dev/null || true)
    status_line=$(head -1 "$TMP_DIR/ws_header" 2>/dev/null | tr -d '\r')
    if printf '%s' "$status_line" | grep -q ' 101 '; then
      pass "C11 WebSocket 握手返回 101"
    elif [ "$ws_code" = "403" ]; then
      warn "C11 WebSocket 握手 403（Origin=${ORIGIN}）：可能为来源白名单、票据或网关路由问题，需查服务端日志"
    else
      fail "C11 WebSocket 握手失败（${status_line:-无响应}），检查 Upgrade/Connection 头与长超时"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# C12 授权同意端点分流（GET 回退 SPA 同意页，POST 反代到后端）
# ---------------------------------------------------------------------------
code=$(request GET "$BASE_URL/oauth2/consent?client_id=verify&scope=read&response_type=code")
ctype=$(lowercase "$(header_value content-type)")
if [ "$code" = "000" ]; then
  fail "C12a GET /oauth2/consent 无法连通（HTTP 000），先确认站点可达"
elif [ "$code" = "200" ] && printf '%s' "$ctype" | grep -q 'text/html'; then
  pass "C12a GET /oauth2/consent 回退 SPA 同意页"
elif [ "$code" = "200" ]; then
  fail "C12a GET /oauth2/consent 返回 ${ctype}（非 html），页面被整体反代到后端，缺少仅 POST 反代的精确匹配"
else
  fail "C12a GET /oauth2/consent 异常（HTTP ${code}），检查 try_files 回退"
fi

code=$(request POST "$BASE_URL/oauth2/consent" -d 'client_id=verify&scope=read&decision=approve')
ctype=$(lowercase "$(header_value content-type)")
if [ "$code" = "000" ]; then
  fail "C12b POST /oauth2/consent 无法连通（HTTP 000）"
elif printf '%s' "$ctype" | grep -q 'text/html'; then
  fail "C12b POST /oauth2/consent 返回 ${code}/text/html，提交接口未反代到后端（落到了 SPA 回退）"
elif [ "$code" = "400" ] || [ "$code" = "401" ] || [ "$code" = "403" ]; then
  pass "C12b POST /oauth2/consent 已反代到后端（HTTP ${code}，未登录或参数非法属预期）"
elif [ "$code" = "200" ] || [ "$code" = "302" ]; then
  warn "C12b POST /oauth2/consent 返回 HTTP ${code}，请确认未登录时是否应放行"
else
  warn "C12b POST /oauth2/consent 返回 HTTP ${code}（非 html 说明已反代，状态码需人工确认）"
fi

# ---------------------------------------------------------------------------
# C13 带版本前缀的路由必须落网关，而不是回退 SPA
# ---------------------------------------------------------------------------
check_prefixed_route() {
  local label="$1" path="$2" code ctype
  code=$(request GET "$API_BASE$path")
  ctype=$(lowercase "$(header_value content-type)")
  if [ "$code" = "000" ]; then
    fail "${label} ${path} 无法连通（HTTP 000），先确认站点可达"
  elif printf '%s' "$ctype" | grep -q 'text/html'; then
    fail "${label} ${path} 回退到 SPA，该前缀未反代到网关"
  elif [ "$code" = "404" ]; then
    fail "${label} ${path} 返回 404，网关未暴露该前缀"
  elif [ "$code" = "200" ]; then
    warn "${label} ${path} 未带令牌却返回 200，确认是否需要鉴权"
  else
    pass "${label} ${path} 已反代到后端（HTTP ${code}）"
  fi
}

check_prefixed_route "C13a" "/auth/v1/sessions/online"
check_prefixed_route "C13b" "/integration/v1/connectors?pageNum=1&pageSize=1"

# ---------------------------------------------------------------------------
# 汇总
# ---------------------------------------------------------------------------
echo "----------------------------------------------"
echo "通过 $PASSED · 失败 $FAILED · 告警 $WARNED · 跳过 $SKIPPED"
if [ "$FAILED" -gt 0 ]; then
  echo "失败项："
  for item in "${FAILED_ITEMS[@]}"; do echo "  - $item"; done
  echo "结论：不通过"
  exit 1
fi
if [ "$WARNED" -gt 0 ]; then
  echo "结论：通过（存在告警，需人工确认）"
else
  echo "结论：通过"
fi
