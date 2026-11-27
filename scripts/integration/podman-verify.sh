#!/usr/bin/env bash
set -euo pipefail

export FRONTEND_ROOT BACKEND_ROOT VERIFY_FRONTEND_IMAGE
FRONTEND_ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
BACKEND_ROOT=$(cd "${BACKEND_ROOT:-$FRONTEND_ROOT/../apex-scaffold}" && pwd -P)
VERIFY_FRONTEND_IMAGE=${VERIFY_FRONTEND_IMAGE:-localhost/apex-admin-web:latest}
project=apex-fe029-verify
project_lock="${TMPDIR:-/tmp}/apex-fe029-verify.lock"
if ! mkdir "$project_lock" 2>/dev/null; then
  printf 'Another verifier owns the isolated project lock: %s\n' "$project_lock" >&2
  exit 1
fi
release_project_lock() {
  rmdir "$project_lock" 2>/dev/null || true
}
trap release_project_lock EXIT
case ${VERIFY_BROWSER_MODE:-} in
  ''|--notification-only|--notification-push|--governance-reads|--system-reads|--monitor-reads|--integration-reads) ;;
  *) printf 'Invalid VERIFY_BROWSER_MODE\n' >&2; exit 1 ;;
esac
compose=(podman-compose -p "$project" -f "$FRONTEND_ROOT/scripts/integration/podman-verify.yml")

# 受保护链路依赖部署方授权材料：integration/office/workflow 的 Handler 上
# @RequirePermission 由 *SecurityAspect 经 IntegrationPermissionClient 校验，
# 后者要求 shared-user-namespace=true、HTTPS base-url、按租户精确映射的 reader token，
# 任一缺失即抛 AccessDeniedException（HTTP 403）。这些材料只能由部署方通过安全渠道提供，
# 不能用浏览器管理员凭据替代。缺失时在此提前失败，避免跑完整栈才看到 403。
if [[ ${VERIFY_AUTHORIZATION_CONFIG_DIR:-} == '' && ${VERIFY_BROWSER_MODE:-} == '--integration-reads' ]]; then
  {
    printf 'VERIFY_AUTHORIZATION_CONFIG_DIR is not set; this mode cannot pass.\n'
    printf 'Reason: integration handlers require @RequirePermission, verified by\n'
    printf '  IntegrationPermissionClient, which rejects (HTTP 403) unless ALL of:\n'
    printf '    - integration.security.authorization.shared-user-namespace=true\n'
    printf '    - a trusted HTTPS base-url for the authorization center\n'
    printf '    - a per-tenant reader token mapped by exact tenant id\n'
    printf 'Defaults are shared-user-namespace=false, no base-url, empty reader tokens,\n'
    printf 'so the request is denied by design; there is no test/no-auth bypass.\n'
    printf 'To enable: provide a 0700 dir with authorization.yml + truststore.p12 (0600)\n'
    printf 'and export VERIFY_AUTHORIZATION_CONFIG_DIR=<that dir>. See\n'
    printf '  scripts/integration/README.md and docs/guides/deployment.md.\n'
  } >&2
  exit 1
fi
if [[ -n ${VERIFY_AUTHORIZATION_CONFIG_DIR:-} ]]; then
  config_dir=$(cd "$VERIFY_AUTHORIZATION_CONFIG_DIR" && pwd -P) || {
    printf 'Authorization config directory is unavailable\n' >&2
    exit 1
  }
  [[ -f "$config_dir/authorization.yml" && ! -L "$config_dir/authorization.yml" && -r "$config_dir/authorization.yml" && -s "$config_dir/authorization.yml" ]] || {
    printf 'Authorization config file is missing, empty, or a symlink\n' >&2
    exit 1
  }
  [[ -f "$config_dir/truststore.p12" && ! -L "$config_dir/truststore.p12" && -r "$config_dir/truststore.p12" && -s "$config_dir/truststore.p12" ]] || {
    printf 'JVM truststore is missing, empty, or a symlink\n' >&2
    exit 1
  }
  shopt -s nullglob dotglob
  config_entries=("$config_dir"/*)
  shopt -u nullglob dotglob
  # 允许 2 件（authorization.yml + truststore.p12）或 3 件（另含材料脚本生成的 verify-keys.env）
  (( ${#config_entries[@]} == 2 || ${#config_entries[@]} == 3 )) || {
    printf 'Authorization config directory must contain only the YAML config, truststore and optional verify-keys.env\n' >&2
    exit 1
  }
  if [[ $(uname -s) == Darwin ]]; then
    config_mode=$(stat -f '%Lp' "$config_dir")
    file_mode=$(stat -f '%Lp' "$config_dir/authorization.yml")
    truststore_mode=$(stat -f '%Lp' "$config_dir/truststore.p12")
  else
    config_mode=$(stat -c '%a' "$config_dir")
    file_mode=$(stat -c '%a' "$config_dir/authorization.yml")
    truststore_mode=$(stat -c '%a' "$config_dir/truststore.p12")
  fi
  (( (8#$config_mode & 077) == 0 && (8#$file_mode & 077) == 0 && (8#$truststore_mode & 077) == 0 )) || {
    printf 'Authorization config directory and file must not be group/world accessible (chmod 700/600)\n' >&2
    exit 1
  }
  compose+=(-f "$FRONTEND_ROOT/scripts/integration/podman-verify-authorized.yml")
  # 栈内 TLS 终结（授权中心必须 HTTPS）：证书目录与 nginx 配置由材料生成脚本产出
  export VERIFY_AUTHORIZATION_TLS_DIR="${VERIFY_AUTHORIZATION_TLS_DIR:-$FRONTEND_ROOT/.runtime/authorization-tls}"
  export VERIFY_AUTHORIZATION_NGINX_CONF="${VERIFY_AUTHORIZATION_NGINX_CONF:-$FRONTEND_ROOT/scripts/integration/auth-tls.conf}"
  [[ -d $VERIFY_AUTHORIZATION_TLS_DIR ]] || {
    printf 'TLS directory is missing: %s\nRun scripts/integration/prepare-authorization.sh first.\n' "$VERIFY_AUTHORIZATION_TLS_DIR" >&2
    exit 1
  }
  [[ -f $VERIFY_AUTHORIZATION_NGINX_CONF ]] || {
    printf 'TLS nginx config is missing: %s\n' "$VERIFY_AUTHORIZATION_NGINX_CONF" >&2
    exit 1
  }
fi
unset VERIFY_ROCKETMQ_NAMESERVER VERIFY_MQ_CONSUMER_ENABLED VERIFY_SSE_MARKER
if [[ ${VERIFY_BROWSER_MODE:-} == --notification-push ]]; then
  compose+=(--profile rocketmq)
  export VERIFY_ROCKETMQ_NAMESERVER=rocketmq-namesrv:9876 VERIFY_MQ_CONSUMER_ENABLED=true
  VERIFY_SSE_MARKER="FE029-push-$(openssl rand -hex 12)"
  export VERIFY_SSE_MARKER
fi
label="label=io.podman.compose.project=$project"
network="name=^${project}_default$"
project_is_empty() {
  local containers networks
  containers=$(podman ps -aq --filter "$label") || return 2
  networks=$(podman network ls -q --filter "$network") || return 2
  [[ -z $containers && -z $networks ]]
}
if ! project_is_empty; then
  printf 'Cannot confirm that %s has no existing resources\n' "$project" >&2
  exit 1
fi
if (($# > 1)) || [[ $# == 1 && $1 != --frontend-test ]]; then
  printf 'Usage: %s [--frontend-test]\n' "$0" >&2
  exit 1
fi
cleanup() {
  local status=$?
  trap - EXIT
  # 调试保留现场：设置 VERIFY_KEEP_STACK=1 时跳过清理，便于失败后抓取容器日志。
  # 该开关仅供诊断，正式验证不得开启（避免残留资源影响下一次隔离运行）。
  if [[ ${VERIFY_KEEP_STACK:-} == 1 ]]; then
    printf 'VERIFY_KEEP_STACK=1: skipping cleanup for diagnosis (project %s left running)\n' "$project"
    release_project_lock
    exit "$status"
  fi
  # down 会因未启动的服务报 "no such container"；清理结果以实际资源为准，不能因该报错留下容器/网络。
  "${compose[@]}" down >/dev/null 2>&1 || true
  if ! project_is_empty; then
    # 二次清理：按项目标签删除残留容器，再删除专属网络（不删除卷）
    podman ps -aq --filter "$label" | xargs -r podman rm -f >/dev/null 2>&1 || true
    podman network ls -q --filter "$network" | xargs -r podman network rm >/dev/null 2>&1 || true
  fi
  if ! project_is_empty; then
    printf 'Isolated cleanup incomplete\n' >&2
    release_project_lock
    exit 1
  fi
  printf 'Isolated containers and network removed; no volumes deleted\n'
  release_project_lock
  exit "$status"
}
install_cleanup() {
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
}
if [[ ${1:-} == --frontend-test ]]; then
  compose=(podman-compose -p "$project" -f "$FRONTEND_ROOT/scripts/integration/podman-verify.yml" --profile frontend-test)
  install_cleanup
  "${compose[@]}" run --rm --no-deps -T frontend-test
  exit
fi
if [[ -n ${VERIFY_BROWSER_PASSWORD_FILE:-} ]]; then
  printf 'External browser passwords are not accepted by the isolated smoke; use its dedicated fixture account\n' >&2
  exit 1
fi
for service in apex-auth-service apex-system-service apex-office-service apex-workflow-service apex-file-service apex-integration-service apex-gateway; do
  [[ -s "$BACKEND_ROOT/apex-services-bom/$service/target/$service-1.3.1.jar" ]] || { printf 'Missing test JAR for %s\n' "$service" >&2; exit 1; }
done
export VERIFY_DB_PASSWORD VERIFY_JWT VERIFY_CONFIG_KEY VERIFY_AES VERIFY_RSA_PRIVATE VERIFY_RSA_PUBLIC
export VERIFY_BROWSER_PASSWORD=admin123
VERIFY_DB_PASSWORD=$(openssl rand -hex 24)
VERIFY_JWT=$(openssl rand -hex 32)
VERIFY_CONFIG_KEY=$(openssl rand -hex 16)
VERIFY_AES=$(openssl rand -base64 32)
rsa=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null)
VERIFY_RSA_PRIVATE=$(printf '%s\n' "$rsa" | openssl pkcs8 -topk8 -nocrypt -outform DER | openssl base64 -A)
VERIFY_RSA_PUBLIC=$(printf '%s\n' "$rsa" | openssl pkey -pubout -outform DER | openssl base64 -A)
unset rsa
# 授权材料自带固化密钥（prepare-authorization.sh 签发 reader token 所用），优先采用，
# 保证 token 签名与验证栈 JWKS 一致；否则栈随机密钥会让 auth-service 拒绝该 token。
if [[ -f "$config_dir/verify-keys.env" ]]; then
  set -a
  source "$config_dir/verify-keys.env"
  set +a
  printf 'Using fixed verification keys from verify-keys.env (token signature consistency)\n'
fi

install_cleanup
"${compose[@]}" run --rm --no-deps -T browser timeout 90 node scripts/integration/browser-auth-smoke.mjs --launch-only
"${compose[@]}" up -d mysql redis
exec_in() { podman exec "${project}_${1}_1" "${@:2}"; }
exec_in mysql awk '$2 == "/var/lib/mysql" && $3 == "tmpfs" {ok=1} END {exit !ok}' /proc/mounts
printf 'MySQL data mount is tmpfs\n'
sql() { exec_in mysql timeout 8 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 -Nse "$1"' sh "$1"; }
deadline=$((SECONDS + 120))
until sql 'SELECT 1' >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    printf 'MySQL readiness timeout\n' >&2
    podman inspect --format 'state={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' "${project}_mysql_1" >&2 || true
    podman logs --tail 30 "${project}_mysql_1" >&2 || true
    printf 'probe: ' >&2
    sql 'SELECT 1' >&2 || true
    exit 1
  fi
  sleep 3
done
[[ $(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='apex_system'") == 0 ]]
sql 'CREATE DATABASE apex_auth; CREATE DATABASE apex_office; CREATE DATABASE apex_workflow; CREATE DATABASE apex_file; CREATE DATABASE apex_integration'

diagnose() {
  local container="${project}_${1}_1"
  podman inspect --format 'state={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' "$container"
  podman logs "$container" 2>&1 | awk '/Successfully applied/{m++} /Started .* in /{s++} /APPLICATION FAILED TO START/{f++} /Caused by:/ {for(i=1;i<NF;i++) if ($i=="by:" && $(i+1) ~ /^[A-Za-z0-9_.$]+:$/) ex=$(i+1)} END {print "migration_events=" m+0, "started=" s+0, "failed=" f+0, "exception=" ex}'
}
wait_port() {
  local service=$1 port=$2 end=$((SECONDS + 360))
  while ((SECONDS < end)); do
    if exec_in "$service" timeout 4 bash -c 'exec 3<>/dev/tcp/127.0.0.1/$1' bash "$port" 2>/dev/null; then
      printf '%s port %s ready\n' "$service" "$port"
      return 0
    fi
    [[ $(podman inspect --format '{{.State.Status}}' "${project}_${service}_1") == running ]] || break
    sleep 4
  done
  printf '%s port %s not ready\n' "$service" "$port" >&2
  diagnose "$service"
  return 1
}

if [[ -n ${VERIFY_SSE_MARKER:-} ]]; then
  "${compose[@]}" up -d rocketmq-namesrv rocketmq-broker
  deadline=$((SECONDS + 120))
  until exec_in rocketmq-broker timeout 15 sh mqadmin updateTopic -n "$VERIFY_ROCKETMQ_NAMESERVER" -c DefaultCluster -t apex-notification-topic 2>&1 | awk '/create topic to .* success/{ok=1} END {exit !ok}'; do
    ((SECONDS < deadline)) || { printf 'RocketMQ topic not ready\n' >&2; diagnose rocketmq-broker; exit 1; }
    sleep 4
  done
  printf 'Isolated RocketMQ topic ready\n'
fi
"${compose[@]}" up -d apex-system-service apex-auth-service
# 授权材料生效时一并启动栈内 TLS 终结（业务服务查授权快照依赖 https://apex-auth-tls）。
# auth-service 可能未就绪导致 nginx upstream 解析失败，由容器 entrypoint 轮询 + restart 兜底。
if [[ -n ${VERIFY_AUTHORIZATION_CONFIG_DIR:-} ]]; then
  "${compose[@]}" up -d apex-auth-tls
fi
wait_port apex-system-service 8082
wait_port apex-auth-service 8081
if [[ -n ${VERIFY_SSE_MARKER:-} ]]; then
  deadline=$((SECONDS + 45))
  until exec_in rocketmq-broker timeout 12 sh mqadmin consumerConnection -n "$VERIFY_ROCKETMQ_NAMESERVER" \
    -b rocketmq-broker:10911 -g apex-notification-consumer-group 2>&1 | awk '/BROADCASTING/{ok=1} END {exit !ok}'; do
    ((SECONDS < deadline)) || { printf 'RocketMQ notification consumer not registered with broker\n' >&2; exit 1; }
    sleep 3
  done
  printf 'RocketMQ notification broadcast consumer registered\n'
fi
checks=('apex-gateway:远程 JWKS 合并完成' 'apex-system-service:JWKS 公钥快照已更新')
if [[ -z ${VERIFY_SSE_MARKER:-} && ${VERIFY_BROWSER_MODE:-} != --system-reads && ${VERIFY_BROWSER_MODE:-} != --monitor-reads ]]; then
  "${compose[@]}" up -d apex-office-service apex-workflow-service apex-file-service apex-integration-service
  for target in apex-office-service:8084 apex-workflow-service:8093 apex-file-service:8085 apex-integration-service:8094; do
    wait_port "${target%:*}" "${target#*:}"
  done
  wait_port apex-integration-service 8097
  checks+=({apex-workflow-service,apex-file-service,apex-integration-service}':JWKS 公钥快照已更新')
fi
"${compose[@]}" up -d apex-gateway apex-admin-web
wait_port apex-gateway 8080
deadline=$((SECONDS + 120))
until exec_in apex-admin-web wget -q -T 8 -O - http://127.0.0.1/api/v1/health | jq -e '.code == 0 and .data.status == "UP"' >/dev/null &&
  exec_in apex-admin-web wget -q -T 8 -O - http://apex-gateway:8080/.well-known/jwks.json | jq -e '.keys | length > 0' >/dev/null; do
  ((SECONDS < deadline)) || { printf 'Proxied health or JWKS readiness timeout\n' >&2; exit 1; }
  sleep 4
done
deadline=$((SECONDS + 60))
until exec_in apex-admin-web wget -q -T 8 -O - http://127.0.0.1/api/v1/auth/captcha |
  jq -e '.code == 0 and (.data.image | type == "string" and length > 0)' >/dev/null; do
  ((SECONDS < deadline)) || { printf 'Proxied auth captcha readiness timeout\n' >&2; exit 1; }
  sleep 3
done
printf 'Proxied auth captcha ready\n'
for schema in apex_auth apex_system; do
  printf '%s migrations (success, failure): ' "$schema"
  sql "SELECT SUM(success=1), SUM(success=0) FROM $schema.flyway_schema_history"
done
[[ $(sql "SELECT COUNT(*) FROM apex_system.sys_tenant WHERE tenant_code='default' AND status='ACTIVE' AND deleted=0") == 1 ]]
fixture="FROM apex_auth.auth_user a JOIN apex_system.sys_user s ON s.username='admin' AND s.deleted=0 WHERE a.username='admin' AND a.deleted=0 AND a.tenant_id='default' AND s.tenant_id='default'"
[[ $(sql "SELECT COUNT(*) $fixture") == 1 ]]
[[ $(sql "UPDATE apex_auth.auth_user a JOIN apex_system.sys_user s ON s.username='admin' AND s.deleted=0 SET a.account_id=s.id WHERE a.username='admin' AND a.deleted=0 AND a.tenant_id='default' AND s.tenant_id='default' AND a.account_id IS NULL; SELECT ROW_COUNT()") == 1 ]]
[[ $(sql "UPDATE apex_system.sys_user s JOIN apex_auth.auth_user a ON a.username='admin' AND a.tenant_id='default' AND a.deleted=0 SET s.open_id=a.open_id WHERE s.username='admin' AND s.tenant_id='default' AND s.deleted=0 AND BINARY s.open_id<>BINARY a.open_id; SELECT ROW_COUNT()") == 1 ]]
[[ $(sql "SELECT COUNT(*) FROM apex_auth.auth_user a JOIN apex_system.sys_user s ON s.username='admin' AND s.deleted=0 AND BINARY s.open_id=BINARY a.open_id WHERE a.username='admin' AND a.deleted=0 AND a.tenant_id='default' AND s.tenant_id='default'") == 1 ]]
# 补偿后端迁移缺口（仅隔离验证栈）：V83/V85 把 integration:*/iot:* 权限码只写进
# apex_system.sys_permission；开启 auth-center-permission 后，集成服务的
# IntegrationPermissionClient 查询的是 apex_auth.auth_permission，该库仅有 V47 基础
# 权限（20 条），因此集成与 IoT 接口恒 403。这里按后端迁移的同一份权限码在 apex_auth
# 补齐并授予 ADMIN 角色，使验证栈反映「权限登记完整」时的预期行为。
# 该缺口属 apex-scaffold 仓库，本仓库不得修改其后端代码，故只在验证栈内补偿并留痕。
if [[ ${VERIFY_BROWSER_MODE:-} == --integration-reads ]]; then
  sql "INSERT IGNORE INTO apex_auth.auth_permission (id,tenant_id,code,name,resource,action,description,enabled,created_at,updated_at) VALUES
(2810,'default','integration:connector:read','连接器查询','integration-connector','read','查询集成连接器',1,NOW(),NOW()),
(2811,'default','integration:connector:create','连接器创建','integration-connector','create','创建集成连接器',1,NOW(),NOW()),
(2812,'default','integration:connector:update','连接器更新','integration-connector','update','更新集成连接器',1,NOW(),NOW()),
(2813,'default','integration:connector:delete','连接器删除','integration-connector','delete','删除集成连接器',1,NOW(),NOW()),
(2814,'default','integration:credential:read','凭据查询','integration-credential','read','查询租户凭据',1,NOW(),NOW()),
(2815,'default','integration:credential:manage','凭据管理','integration-credential','manage','管理租户凭据',1,NOW(),NOW()),
(2820,'default','iot:device:read','设备查询','iot-device','read','查询物联网设备',1,NOW(),NOW()),
(2821,'default','iot:device:manage','设备管理','iot-device','manage','管理物联网设备',1,NOW(),NOW()),
(2822,'default','iot:telemetry:read','遥测查询','iot-telemetry','read','查询设备遥测',1,NOW(),NOW()),
(2823,'default','iot:rule:manage','规则管理','iot-rule','manage','管理物联网规则',1,NOW(),NOW()),
(2824,'default','iot:rule:read','规则查询','iot-rule','read','查询物联网规则',1,NOW(),NOW()),
(2825,'default','iot:command:send','命令下发','iot-command','send','下发设备命令',1,NOW(),NOW());
INSERT IGNORE INTO apex_auth.auth_role_permission (id,tenant_id,role_id,permission_id,created_at)
SELECT 6300+id,'default',1,id,NOW() FROM apex_auth.auth_permission
WHERE tenant_id='default' AND (code LIKE 'integration:%' OR code LIKE 'iot:%');" >/dev/null || {
    printf 'Isolated auth-center integration permissions fixture failed\n' >&2
    exit 1
  }
  [[ $(sql "SELECT COUNT(*) FROM apex_auth.auth_role_permission WHERE tenant_id='default' AND role_id=1") -ge 49 ]] || {
    printf 'Isolated auth-center integration permissions not granted\n' >&2
    exit 1
  }
  printf 'Isolated auth-center integration/iot permissions fixture confirmed\n'
fi
if [[ ${VERIFY_BROWSER_MODE:-} == --system-reads ]]; then
  [[ $(sql "SELECT COUNT(*) FROM apex_system.sys_user s
JOIN apex_system.sys_user_role ur ON ur.user_id=s.id AND ur.deleted=0
JOIN apex_system.sys_role r ON r.id=ur.role_id AND r.deleted=0 AND r.status=1
WHERE s.username='admin' AND s.tenant_id='default' AND s.deleted=0 AND r.code='SUPER_ADMIN'") == 1 ]] || {
    printf 'Isolated system admin role binding not confirmed\n' >&2
    exit 1
  }
  printf 'Isolated system admin role binding confirmed\n'
  sql "UPDATE apex_system.sys_role r
JOIN apex_system.sys_user_role ur ON ur.role_id=r.id AND ur.deleted=0
JOIN apex_system.sys_user s ON s.id=ur.user_id AND s.username='admin' AND s.tenant_id='default' AND s.deleted=0
SET r.data_scope=1 WHERE r.deleted=0 AND r.status=1 AND r.data_scope IS NULL" >/dev/null
  [[ $(sql "SELECT COUNT(*) FROM apex_system.sys_user s
JOIN apex_system.sys_user_role ur ON ur.user_id=s.id AND ur.deleted=0
JOIN apex_system.sys_role r ON r.id=ur.role_id AND r.deleted=0 AND r.status=1
WHERE s.username='admin' AND s.tenant_id='default' AND s.deleted=0 AND r.data_scope=1") -gt 0 ]] || {
    printf 'Isolated system admin data scope fixture not confirmed\n' >&2
    exit 1
  }
  printf 'Isolated system admin data scope fixture confirmed (ALL)\n'
fi
[[ $(sql "INSERT INTO apex_system.biz_system_message (id, user_id, tenant_id, msg_type, content)
SELECT fixture.id, s.id, s.tenant_id, 'FE029', fixture.content
FROM apex_system.sys_user s CROSS JOIN (
  SELECT 29001 AS id, 'FE029 single read fixture' AS content UNION ALL
  SELECT 29002, 'FE029 read all fixture'
) fixture WHERE s.username='admin' AND s.tenant_id='default' AND s.deleted=0; SELECT ROW_COUNT()") == 2 ]]
for check in "${checks[@]}"; do
  deadline=$((SECONDS + 60))
  until podman logs --tail 400 "${project}_${check%%:*}_1" 2>&1 | awk -v marker="${check#*:}" 'index($0,marker) {found=1} END {exit !found}'; do
    ((SECONDS < deadline)) || { printf '%s JWKS sync not confirmed\n' "${check%%:*}" >&2; exit 1; }
    sleep 4
  done
done

# 授权材料生效时，在本栈内以 admin 真实登录签发 reader token，并就地更新 authorization.yml。
# 必须在密钥与数据库就绪后进行：材料脚本预签的 token 依赖当时的 Redis 轮换密钥，
# 栈重建（tmpfs 空库 + 新 Redis）后旧 token 会被 auth-service 以 401 拒绝。
if [[ -n ${VERIFY_AUTHORIZATION_CONFIG_DIR:-} ]]; then
  say_reader_token() { printf '[authorization] %s\n' "$*"; }
  # 登录会话数上限：每个 token 登录会新建一条 ACTIVE 会话（含下面的 reader 登录与浏览器登录）。
  # 栈若在同一 tmpfs 生命周期内被重复验证，残留会话会让后续登录在认证阶段直接 403，
  # 表现为「connectors 403」，实际是登录被拒。此处先作废本栈 admin 的历史活跃会话。
  sql "UPDATE apex_auth.auth_session SET status='EXPIRED' WHERE tenant_id='default' AND status='ACTIVE'" >/dev/null 2>&1 || true
  auth_port_ready() { exec_in apex-auth-service timeout 4 bash -c 'exec 3<>/dev/tcp/127.0.0.1/$1' bash 8081 2>/dev/null; }
  deadline=$((SECONDS + 120))
  until auth_port_ready; do
    ((SECONDS < deadline)) || { printf 'auth-service 8081 not ready for reader login\n' >&2; exit 1; }
    sleep 3
  done
  reader_login_payload='{"username":"admin","password":"admin123","loginType":"PASSWORD"}'
  reader_login_body=$(exec_in apex-auth-service env LOGIN_PAYLOAD="$reader_login_payload" sh -ec \
    'wget -qO- --header="Content-Type: application/json" --post-data="$LOGIN_PAYLOAD" http://127.0.0.1:8081/auth/v1/login') || {
    printf 'reader login request failed\n' >&2; exit 1
  }
  READER_TOKEN=$(printf '%s' "$reader_login_body" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  [[ -n $READER_TOKEN ]] || { printf 'reader token missing in login response\n' >&2; exit 1; }
  READER_ID=$(sql "SELECT id FROM apex_auth.auth_user WHERE username='admin' AND tenant_id='default' AND status=1 AND deleted=0 LIMIT 1")
  [[ -n $READER_ID ]] || { printf 'reader account not found in apex_auth\n' >&2; exit 1; }
  python3 -I - "$config_dir/authorization.yml" "$READER_ID" "$READER_TOKEN" <<'PY'
import re, sys
path, reader_id, token = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path).read()
if f'authorization-reader-user-id: "{reader_id}"' not in text:
    raise SystemExit(f'reader-user-id mismatch: file expects different reader than {reader_id}')
text = re.sub(r'("default":\s*")eyJ[^"]+(")', lambda m: m.group(1) + token + m.group(2), text)
open(path, 'w').write(text)
PY
  say_reader_token "reader token issued inside this stack and written into authorization.yml (tenant default)"
  # 这些服务在启动时读取过一次旧材料（可能只有占位 token），写入新 token 后必须重启才生效
  if podman ps --format '{{.Names}}' | grep -q "${project}_apex-integration-service_1"; then
    "${compose[@]}" restart apex-office-service apex-workflow-service apex-file-service apex-integration-service >/dev/null
    say_reader_token "restarted protected services to reload authorization config"
# 重启窗口内网关到下游的连接可能已失败计数（熔断/连接池），立即请求会拿到 503。
    # 等每个服务端口重新监听后，再经网关探一条无鉴权路由，直到返回 HTTP 200 与 code=0。
    # 注意：不能探 /api/v2/overview 之类受保护路由——无令牌必然 401，等待条件永不成立。
    # 注意：端口必须写各服务自身监听端口（8084/8093/8085/8094），8080 是网关；
    # 写成 8080 会让每个服务白等满 wait_port 的 360s 超时。
    for pair in apex-office-service:8084 apex-workflow-service:8093 apex-file-service:8085 apex-integration-service:8094; do
      wait_port "${pair%:*}" "${pair#*:}" || true
    done
    # 端口监听早于 Spring 完成配置绑定与 JWKS 拉取；此时业务请求会因授权材料尚未生效而 403。
    # 判据不依赖启动日志（podman restart 保留旧日志行，"Started" 会误判已就绪）：
    # 直接用配置中的 reader token 经栈内 TLS 代理确认授权快照可用，且业务端口可服务。
    deadline=$((SECONDS + 300))
    reader_token_in_config=$(sed -n 's/.*"default": "\([^"]*\)".*/\1/p' "$config_dir/authorization.yml" | head -1)
    [[ -n $reader_token_in_config ]] || { printf 'reader token missing from authorization config\n' >&2; exit 1; }
    until exec_in apex-integration-service wget --no-check-certificate -q -O- \
        --header="Authorization: Bearer $reader_token_in_config" \
        "https://apex-auth-tls:8443/auth/v1/authorization/users/${READER_ID}" 2>/dev/null | grep -q '"code":0'; do
      ((SECONDS < deadline)) || { printf 'authorization snapshot not reachable from integration-service after restart\n' >&2; exit 1; }
      sleep 3
    done
    say_reader_token "integration-service authorization snapshot reachable after restart"
    deadline=$((SECONDS + 120))
    until exec_in apex-admin-web wget -q -T 8 -O - 'http://apex-gateway:8080/api/v1/auth/captcha' 2>/dev/null | grep -q '"code":0'; do
      ((SECONDS < deadline)) || { printf 'gateway did not recover after protected-service restart\n' >&2; exit 1; }
      sleep 3
    done
    say_reader_token "gateway recovered after protected-service restart"
  fi
fi
"${compose[@]}" up -d browser
publish_status=0
if [[ -n ${VERIFY_SSE_MARKER:-} ]]; then
  deadline=$((SECONDS + 150))
  while ! exec_in browser test -f /tmp/fe029-sse-ready; do
    if ((SECONDS >= deadline)) || [[ $(podman inspect --format '{{.State.Status}}' "${project}_browser_1") != running ]]; then
      printf 'Browser SSE subscription not ready for publishing\n' >&2
      publish_status=1
      break
    fi
    sleep 2
  done
  if ((publish_status == 0)); then
    recipient=$(sql "SELECT s.id $fixture")
    [[ $recipient =~ ^[1-9][0-9]*$ ]]
    payload=$(jq -nc --arg marker "$VERIFY_SSE_MARKER" --arg recipient "$recipient" \
      '{messageId:$marker,recipient:$recipient,tenantId:"default",content:$marker}')
    export VERIFY_MQ_PAYLOAD=$payload
    send_status=0
    send_output=$("${compose[@]}" run --rm --no-deps rocketmq-publisher 2>&1) || send_status=$?
    unset VERIFY_MQ_PAYLOAD
    if ((send_status == 0)) && [[ $send_output == *SEND_OK* ]]; then
      printf 'RocketMQ fixture publish acknowledged\n'
    else
      printf 'RocketMQ fixture publish not acknowledged (command exit %s)\n' "$send_status" >&2
      printf '%s\n' "$send_output" | awk 'match($0,/(MQClientException|MQBrokerException|Remoting[A-Za-z]+Exception|OutOfMemoryError)/) {print substr($0,RSTART,RLENGTH)}' | sort -u >&2
      publish_status=1
    fi
  fi
fi
browser_status=$(podman wait "${project}_browser_1")
browser_output=$(podman logs "${project}_browser_1" 2>&1)
printf '%s\n' "$browser_output"
trace_id=$(printf '%s\n' "$browser_output" | awk '/system-users trace id: / {print $NF; exit}')
if [[ $trace_id =~ ^[A-Za-z0-9-]{1,80}$ ]]; then
  podman logs "${project}_apex-system-service_1" 2>&1 | awk -v trace_id="$trace_id" '
    index($0, trace_id) && index($0, "请求处理失败:") {
      if (match($0, /type=[A-Za-z0-9_$]+/)) type=substr($0, RSTART+5, RLENGTH-5)
      if (type != "") print "system-users exception type: " type
      found=1
    }
    END {if (!found) print "system-users exception type: unavailable"}
  '
fi
trace_id=$(printf '%s\n' "$browser_output" | awk '/connector trace id: / {print $NF; exit}')
if [[ $trace_id =~ ^[A-Za-z0-9-]{1,80}$ ]]; then
  podman logs "${project}_apex-integration-service_1" 2>&1 | awk -v trace_id="$trace_id" '
    index($0, trace_id) {
      if (match($0, /type=[A-Za-z0-9_$]+/)) type=substr($0, RSTART+5, RLENGTH-5)
      if (type != "") print "connector exception type: " type
      found=1
    }
    END {if (!found) print "connector exception type: unavailable"}
  '
fi
for service in apex-gateway apex-system-service; do
  podman logs "${project}_${service}_1" 2>&1 | awk -v service="$service" '/fallback|聚合门面数据源降级/ {for(i=1;i<=NF;i++) if(match($i,/TimeoutException|CallNotPermittedException|ConnectException|Unauthorized|Forbidden|NotFound/)) counts[substr($i,RSTART,RLENGTH)]++} END {for(k in counts) print service, k, counts[k]}'
done
((publish_status == 0)) || exit "$publish_status"
exit "$browser_status"
