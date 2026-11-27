#!/usr/bin/env bash
# 前端编码红线扫描（apex-admin-web）
# 用法：bash scripts/governance/audit-frontend-rules.sh [--strict]
# 仅报告，不改代码。--strict 时有命中则退出码 1。
# 当前使用文本模式扫描，不等同完整 AST 合规校验；成功提示只覆盖各节匹配范围。
set -u

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

HITS=0
hit() { HITS=$((HITS + 1)); printf '  [HIT]  %s\n' "$1"; }
ok() { printf '  [OK]   %s\n' "$1"; }

echo "== 1. 禁止在页面/组件新建 Axios 实例（只允许 src/utils/request.ts） =="
BAD_AXIOS=$(grep -rln "axios.create(" src 2>/dev/null | grep -v "src/utils/request.ts" || true)
if [ -n "$BAD_AXIOS" ]; then hit "新建 Axios 实例：$(echo "$BAD_AXIOS" | tr '\n' ' ')"; else ok "无越权 Axios 实例"; fi

echo "== 2. 会话存储键必须走 src/utils/auth.ts（只查 localStorage/sessionStorage 直读直写） =="
# 只匹配 Storage 直接调用中的 access_token 字面量前缀，不覆盖全部实际会话键或间接访问。
BAD_TOKEN=$(grep -rn -E "(localStorage|sessionStorage)\.(get|set|remove)Item\(['\"]access_token" src 2>/dev/null | grep -v "src/utils/auth.ts" || true)
if [ -n "$BAD_TOKEN" ]; then
  hit "业务代码直读直写会话键：$(echo "$BAD_TOKEN" | cut -d: -f1 | sort -u | tr '\n' ' ')"
else
  ok "无绕过 auth.ts 的会话键直读直写（OAuth2 协议字段名不计入）"
fi

echo "== 3. any 使用规模（技术债指标，不阻断） =="
ANY=$(grep -rn ": any" src 2>/dev/null | wc -l | tr -d ' ')
echo "  当前 ': any' 命中：${ANY} 处（任务 FE-005 跟踪）"

echo "== 4. 页面脚本形态（应统一 <script setup lang=\"ts\">） =="
# 仅查文件中是否出现 script setup 字符串，排除 App.vue；不验证标签结构或 lang="ts"。
NOVUE=$(grep -rL "script setup" --include="*.vue" src 2>/dev/null | grep -v "App.vue" || true)
if [ -n "$NOVUE" ]; then
  hit "未使用 script setup 的页面/组件：$(echo "$NOVUE" | tr '\n' ' ')"
else
  ok "全部 .vue 使用 script setup"
fi

echo "== 5. 死注释/注释掉的代码抽样（前 10 条） =="
grep -rn "^[[:space:]]*//[[:space:]]*[a-zA-Z]*(" --include="*.ts" --include="*.vue" src 2>/dev/null | head -10 || true

echo
if [ "$HITS" -eq 0 ]; then
  echo "✅ 前端红线扫描无阻断项"
  exit 0
else
  echo "⚠️ 命中 ${HITS} 类问题（默认仅警告）"
  [ "$STRICT" -eq 1 ] && exit 1
  exit 0
fi
