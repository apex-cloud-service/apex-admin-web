#!/usr/bin/env bash
set -euo pipefail

export FRONTEND_ROOT BACKEND_ROOT VERIFY_FRONTEND_IMAGE
FRONTEND_ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
BACKEND_ROOT=$(cd "${BACKEND_ROOT:-$FRONTEND_ROOT/../apex-scaffold}" && pwd -P)
VERIFY_FRONTEND_IMAGE=${VERIFY_FRONTEND_IMAGE:-localhost/apex-admin-web:latest}
project=apex-fe029-verify
case ${VERIFY_BROWSER_MODE:-} in
  ''|--notification-only|--notification-push|--governance-reads|--system-reads|--monitor-reads|--integration-reads) ;;
  *) printf 'Invalid VERIFY_BROWSER_MODE\n' >&2; exit 1 ;;
esac
compose=(podman-compose -p "$project" -f "$FRONTEND_ROOT/scripts/integration/podman-verify.yml")
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
  ((${#config_entries[@]} == 2)) || {
    printf 'Authorization config directory must contain only the YAML config and truststore\n' >&2
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
  if ! "${compose[@]}" down >/dev/null 2>&1 || ! project_is_empty; then
    printf 'Isolated cleanup incomplete\n' >&2
    exit 1
  fi
  printf 'Isolated containers and network removed; no volumes deleted\n'
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

install_cleanup
"${compose[@]}" run --rm --no-deps -T browser timeout 90 node scripts/integration/browser-auth-smoke.mjs --launch-only
"${compose[@]}" up -d mysql redis
exec_in() { podman exec "${project}_${1}_1" "${@:2}"; }
exec_in mysql awk '$2 == "/var/lib/mysql" && $3 == "tmpfs" {ok=1} END {exit !ok}' /proc/mounts
printf 'MySQL data mount is tmpfs\n'
sql() { exec_in mysql timeout 8 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 -Nse "$1"' sh "$1"; }
deadline=$((SECONDS + 120))
until sql 'SELECT 1' >/dev/null 2>&1; do
  ((SECONDS < deadline)) || { printf 'MySQL readiness timeout\n' >&2; exit 1; }
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
