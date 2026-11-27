#!/usr/bin/env bash
# 隔离验证用授权材料生成器（仅本地验证栈，不用于生产）
# ------------------------------------------------------------------
# 目的：让 --integration-reads 等受保护链路在隔离栈内可被真实验证。
#
# 前提事实（由后端源码确认，属既有设计，不是绕过）：
#   1. 受保护 Handler 经 *SecurityAspect → *PermissionClient 校验，要求
#      shared-user-namespace=true、HTTPS base-url、按租户精确映射的 reader token；
#   2. reader token 必须由认证中心对“同租户且启用”的 reader 账号签发；
#   3. 缺失材料时后端直接 403，且没有测试放行开关。
#
# 本脚本只做“把同一套 auth-service 的真实能力接入验证栈”：
#   - 用 auth-service 真实登录取得真实 JWT 作为 reader token；
#   - 生成一套自签 CA，签发 nginx TLS 证书，并导出仅含该 CA 的 truststore；
#   - 生成 authorization.yml，指向栈内 TLS 代理。
# 单套 CA 贯穿 TLS 证书与 truststore，避免信任链不匹配。
#
# 产物：
#   <OUT_DIR>/authorization.yml    (0600)
#   <OUT_DIR>/truststore.p12       (0600，口令 changeit)
#   <TLS_DIR>/server.crt|server.key(0600，供栈内 nginx 使用)
# 均不入库；禁止用于生产。
set -euo pipefail

FRONTEND_ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
BACKEND_ROOT=$(cd "${BACKEND_ROOT:-$FRONTEND_ROOT/../apex-scaffold}" && pwd -P)
# podman-verify.yml 的 volumes 引用 ${BACKEND_ROOT}，必须导出供 compose 解析
export FRONTEND_ROOT BACKEND_ROOT
PROJECT=apex-fe029-verify
COMPOSE=(podman-compose -p "$PROJECT" -f "$FRONTEND_ROOT/scripts/integration/podman-verify.yml")

TENANT="${AUTHORIZATION_TENANT:-default}"
READER_USERNAME="${AUTHORIZATION_READER_USERNAME:-admin}"
READER_PASSWORD="${AUTHORIZATION_READER_PASSWORD:-admin123}"
PROXY_HOST="${AUTHORIZATION_PROXY_HOST:-apex-auth-tls}"
PROXY_PORT="${AUTHORIZATION_PROXY_PORT:-8443}"
OUT_DIR="${AUTHORIZATION_OUT_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/apex-authorization.XXXXXX")}"
TLS_DIR="${AUTHORIZATION_TLS_DIR:-$FRONTEND_ROOT/.runtime/authorization-tls}"

say() { printf '[authorization] %s\n' "$*"; }
die() { printf '[authorization] 失败：%s\n' "$*" >&2; exit 1; }

command -v openssl >/dev/null || die '缺少 openssl'
command -v podman >/dev/null || die '缺少 podman'

# 隔离栈初始化（mysql 首次启动需要 root 密码）。
# 密码取会话级随机值，与 podman-verify.sh 的 VERIFY_DB_PASSWORD 语义一致；
# 该栈为 tmpfs 空库、随项目销毁，密码不入库、不打印。
if [[ -z ${VERIFY_DB_PASSWORD:-} ]]; then
  VERIFY_DB_PASSWORD=$(openssl rand -hex 24)
  export VERIFY_DB_PASSWORD
fi
VERIFY_JWT=${VERIFY_JWT:-$(openssl rand -hex 32)}
VERIFY_CONFIG_KEY=${VERIFY_CONFIG_KEY:-$(openssl rand -hex 16)}
VERIFY_AES=${VERIFY_AES:-$(openssl rand -base64 32)}
# auth-service 的 OAuth2 元数据要求 PKCS#8 DER base64 编码的密钥对
# （与 podman-verify.sh 的生成方式一致，避免 Missing key encoding）
rsa=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null)
VERIFY_RSA_PRIVATE=$(printf '%s\n' "$rsa" | openssl pkcs8 -topk8 -nocrypt -outform DER | openssl base64 -A)
VERIFY_RSA_PUBLIC=$(printf '%s\n' "$rsa" | openssl pkey -pubout -outform DER | openssl base64 -A)
export VERIFY_JWT VERIFY_CONFIG_KEY VERIFY_AES VERIFY_RSA_PRIVATE VERIFY_RSA_PUBLIC
unset rsa

# ---------- 1. 单套自签 CA + 服务器证书 ----------
say "准备产物目录：$OUT_DIR"
mkdir -p "$OUT_DIR" "$TLS_DIR"
chmod 700 "$OUT_DIR" "$TLS_DIR"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

say '生成自签 CA'
openssl req -x509 -newkey rsa:2048 -nodes -days 7 \
  -keyout "$WORK/ca.key" -out "$WORK/ca.crt" \
  -subj "/CN=apex-verify-ca" >/dev/null 2>&1 || die '生成 CA 失败'

say "为 $PROXY_HOST 签发 TLS 证书（同一 CA）"
openssl req -newkey rsa:2048 -nodes \
  -keyout "$WORK/server.key" -out "$WORK/server.csr" \
  -subj "/CN=$PROXY_HOST" >/dev/null 2>&1 || die '生成 CSR 失败'
printf 'subjectAltName=DNS:%s\nextendedKeyUsage=serverAuth\n' "$PROXY_HOST" > "$WORK/server.ext"
openssl x509 -req -in "$WORK/server.csr" -CA "$WORK/ca.crt" -CAkey "$WORK/ca.key" \
  -CAcreateserial -days 7 -extfile "$WORK/server.ext" \
  -out "$WORK/server.crt" >/dev/null 2>&1 || die '签发服务器证书失败'

install -m 600 "$WORK/server.key" "$TLS_DIR/server.key"
install -m 600 "$WORK/server.crt" "$TLS_DIR/server.crt"

# ---------- 2. 仅含该 CA 的 truststore ----------
say '导出 truststore.p12（口令 changeit，仅含上述 CA）'
rm -f "$OUT_DIR/truststore.p12"
openssl pkcs12 -export -nokeys -in "$WORK/ca.crt" \
  -out "$OUT_DIR/truststore.p12" -passout pass:changeit >/dev/null 2>&1 \
  || die '生成 truststore.p12 失败'
chmod 600 "$OUT_DIR/truststore.p12"

# ---------- 3. 用 auth-service 真实登录取得 reader token ----------
say '启动依赖服务（mysql/redis/auth/system）以真实签发 reader token'
"${COMPOSE[@]}" up -d mysql redis >/dev/null
exec_in() { podman exec "${PROJECT}_${1}_1" "${@:2}"; }

deadline=$((SECONDS + 180))
until exec_in mysql timeout 6 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 -Nse "SELECT 1"' >/dev/null 2>&1; do
  ((SECONDS < deadline)) || die 'MySQL 未就绪'
  sleep 3
done

"${COMPOSE[@]}" up -d apex-system-service apex-auth-service >/dev/null
# auth 迁移要求 apex_auth 库存在；建库口径与 podman-verify.sh 一致。
# 栈为 tmpfs 空库、随项目销毁，此处只为签发 reader token 提供运行环境。
exec_in mysql sh -ec 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 -Nse \
  "CREATE DATABASE IF NOT EXISTS apex_auth; CREATE DATABASE IF NOT EXISTS apex_system"' \
  || die '创建数据库失败'
# 服务在库缺失期间可能已进入重试循环，重启一次以触发迁移
"${COMPOSE[@]}" restart apex-system-service apex-auth-service >/dev/null
wait_port() {
  local service=$1 port=$2 end=$((SECONDS + 360))
  while ((SECONDS < end)); do
    if exec_in "$service" timeout 4 bash -c 'exec 3<>/dev/tcp/127.0.0.1/$1' bash "$port" 2>/dev/null; then
      return 0
    fi
    sleep 4
  done
  return 1
}
wait_port apex-system-service 8082 || die 'system 服务未就绪'
wait_port apex-auth-service 8081 || die 'auth 服务未就绪'

say "以 ${READER_USERNAME}（租户 ${TENANT}）真实登录签发 reader token"
payload=$(printf '{"username":"%s","password":"%s","loginType":"PASSWORD"}' "$READER_USERNAME" "$READER_PASSWORD")
login_body=$(exec_in apex-auth-service env \
  LOGIN_PAYLOAD="$payload" sh -ec \
  'wget -qO- --header="Content-Type: application/json" --post-data="$LOGIN_PAYLOAD" http://127.0.0.1:8081/auth/v1/login') \
  || die 'reader 登录请求失败'
READER_TOKEN=$(printf '%s' "$login_body" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n $READER_TOKEN ]] || die "未取得 accessToken（响应片段：${login_body:0:200}）"

READER_USER_ID=$(exec_in mysql env \
  READER_USERNAME="$READER_USERNAME" AUTHORIZATION_TENANT="$TENANT" sh -ec '
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 -Nse \
  "SELECT id FROM apex_auth.auth_user WHERE username=\"$READER_USERNAME\" AND tenant_id=\"$AUTHORIZATION_TENANT\" AND status=1 AND deleted=0 LIMIT 1"' 2>/dev/null || true)
[[ -n ${READER_USER_ID:-} ]] || die "未找到可用 reader 账号：$READER_USERNAME / $TENANT"

# ---------- 4. authorization.yml ----------
say '生成 authorization.yml'
cat > "$OUT_DIR/authorization.yml" <<YAML
# 隔离验证用授权材料（本地生成；禁止入库、禁止用于生产）
auth-center:
  authorization-reader-user-id: "$READER_USER_ID"
office:
  security:
    authorization:
      shared-user-namespace: true
      base-url: https://$PROXY_HOST:$PROXY_PORT
      reader-tokens:
        "$TENANT": "$READER_TOKEN"

integration:
  security:
    authorization:
      shared-user-namespace: true
      base-url: https://$PROXY_HOST:$PROXY_PORT
      reader-tokens:
        "$TENANT": "$READER_TOKEN"

workflow:
  security:
    authorization:
      shared-user-namespace: true
      base-url: https://$PROXY_HOST:$PROXY_PORT
      reader-tokens:
        "$TENANT": "$READER_TOKEN"

apex:
  knowledge:
    security:
      authorization:
        shared-user-namespace: true
        base-url: https://$PROXY_HOST:$PROXY_PORT
        reader-tokens:
          "$TENANT": "$READER_TOKEN"
YAML
chmod 600 "$OUT_DIR/authorization.yml"
chmod 700 "$OUT_DIR"

# ---------- 3b. 固化栈密钥，保证 token 签名与后续验证栈一致 ----------
# podman-verify.sh 默认每次运行都随机生成 JWT/RSA 密钥；若材料用旧密钥签发、
# 验证栈用新密钥，auth-service 验签将拒绝 reader token（JWT 签名不匹配 → 403）。
# 因此这里把本次签发 token 所用的密钥固化，podman-verify.sh 会优先读取。
say '固化验证栈密钥到 verify-keys.env（0600，不入库）'
cat > "$OUT_DIR/verify-keys.env" <<ENV
VERIFY_JWT=$VERIFY_JWT
VERIFY_CONFIG_KEY=$VERIFY_CONFIG_KEY
VERIFY_AES=$VERIFY_AES
VERIFY_RSA_PRIVATE=$VERIFY_RSA_PRIVATE
VERIFY_RSA_PUBLIC=$VERIFY_RSA_PUBLIC
ENV
chmod 600 "$OUT_DIR/verify-keys.env"

# ---------- 5. 自检：目录只含两个文件、权限正确 ----------
entries=$(find "$OUT_DIR" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')
[[ $entries == 3 ]] || die "产物目录含 $entries 项，应恰好 3 项（authorization.yml + truststore.p12 + verify-keys.env）"

say "完成"
printf '\n材料目录：%s\nTLS 证书：%s\n\n' "$OUT_DIR" "$TLS_DIR"
printf '下一步（同一条命令内复用该目录）：\n'
printf '  VERIFY_AUTHORIZATION_CONFIG_DIR=%s VERIFY_BROWSER_MODE=--integration-reads \\\n' "$OUT_DIR"
printf '    bash scripts/integration/podman-verify.sh\n'