#!/usr/bin/env bash
# 目录规范化自检（apex-admin-web，2026-11-16 新增）
# 断言：
#   1) docs/ 下每个一级目录都有 README.md
#   2) 一级目录在 EXPECTED 白名单内（新增目录须同步本文与总览表）
#   3) docs/README.md「🗂 目录总览」覆盖全部一级目录
#   4) 仓库根目录无散落业务 Markdown（白名单之外报缺）
#   5) reports/ 按类型分层：e2e/ unit/ coverage/ lighthouse/ stress/ audit/ 存在说明件
# 只读；默认警告，--strict exit 1
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
FAIL=0
warn() { echo "  [WARN] $*"; FAIL=$((FAIL + 1)); }
pass() { echo "  [OK]   $*"; }

EXPECTED="api architecture archived diagrams features guides notes plans records reference reviews specs tasks"

echo "== 1. docs 一级目录都有 README =="
miss=""
for d in $(ls -d docs/*/ 2>/dev/null | xargs -n1 basename | sort); do
  [ -f "docs/$d/README.md" ] || miss="$miss $d"
done
if [ -z "${miss}" ]; then pass "全部一级目录有 README"; else warn "缺 README：${miss}"; fi

echo "== 2. 未登记的一级目录 =="
un=""
for d in $(ls -d docs/*/ 2>/dev/null | xargs -n1 basename | sort); do
  case " $EXPECTED " in *" $d "*) : ;; *) un="$un $d" ;; esac
done
if [ -z "$un" ]; then pass "一级目录与登记表一致（$(echo $EXPECTED | wc -w | tr -d ' ') 个）"; else warn "未登记目录：${un}"; fi

echo "== 3. 目录总览表覆盖 =="
noindex=""
for d in $(ls -d docs/*/ 2>/dev/null | xargs -n1 basename | sort); do
  pat=$(printf '%s/' "$d")
  grep -qF "docs/$pat" docs/README.md || noindex="$noindex $d"
done
if [ -z "$noindex" ]; then pass "docs/README.md 总览已覆盖全部一级目录"; else warn "总览未覆盖：${noindex}"; fi

echo "== 4. 根目录无散落业务 Markdown =="
ROOT_ALLOW="AGENTS.md CHANGELOG.md CONTRIBUTING.md MEMORY-CARD.md README.md LICENSE.md"
stray=""
for f in *.md; do
  [ -f "$f" ] || continue
  case " $ROOT_ALLOW " in *" $f "*) : ;; *) stray="$stray $f" ;; esac
done
if [ -z "$stray" ]; then pass "根目录仅门面文档"; else warn "根目录散落：${stray}（应迁入 docs/）"; fi

echo "== 5. reports/ 分层与说明件 =="
missing_sub=""
for sub in e2e unit coverage lighthouse stress; do
  [ -d "reports/$sub" ] || missing_sub="$missing_sub $sub"
done
if [ -n "${missing_sub}" ]; then warn "reports 缺子目录：${missing_sub}（运行对应测试即可生成）"; else pass "reports 子目录齐全（e2e/unit/coverage/lighthouse/stress）"; fi
[ -d reports/audit ] && pass "reports/audit 存在（npm run audit 生成）" || echo "  提示：reports/audit 尚未生成（可选，npm run audit 后出现）"
[ -f reports/README.md ] && pass "reports/README.md 存在" || warn "缺 reports/README.md"

echo
if [ "$FAIL" -eq 0 ]; then echo "  目录结构自检通过（0 项）"; exit 0; fi
echo "  发现 ${FAIL} 项"
[ "$STRICT" -eq 1 ] && exit 1
exit 0
