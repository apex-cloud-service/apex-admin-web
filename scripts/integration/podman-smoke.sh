#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-apex-scaffold}"
COMPOSE_FILE="${APEX_COMPOSE_FILE:-$PROJECT_ROOT/../apex-scaffold/podman-compose.yml}"
BASE_URL="${BASE_URL:-http://localhost}"
BASE_URL="${BASE_URL%/}"

command -v podman >/dev/null || { echo "podman is required" >&2; exit 2; }
command -v podman-compose >/dev/null || { echo "podman-compose is required" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

COMPOSE=(podman-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE")
"${COMPOSE[@]}" ps
"${COMPOSE[@]}" exec -T apex-admin-web nginx -t
"${COMPOSE[@]}" exec -T apex-admin-web getent hosts apex-gateway

CURL=(curl --silent --show-error --max-time 15)
page_status="$("${CURL[@]}" --output /dev/null --write-out '%{http_code}' "$BASE_URL/")"
printf 'GET / HTTP %s\n' "$page_status"
[[ "$page_status" == 200 ]] || { echo "frontend page did not return HTTP 200" >&2; exit 1; }

health="$("${CURL[@]}" --write-out '\n%{http_code}' "$BASE_URL/api/v1/health")"
health_status="${health##*$'\n'}"
printf 'GET /api/v1/health HTTP %s\n' "$health_status"
[[ "$health_status" == 200 ]] || { echo "proxied system health endpoint did not return HTTP 200" >&2; exit 1; }
jq -e '.code == 0 and .data.status == "UP"' <<< "${health%$'\n'*}" >/dev/null
