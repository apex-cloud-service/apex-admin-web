#!/usr/bin/env bash
# 图表资产配对自检：docs/ 下每个 .mmd 必须有同名 .svg（FE-007 口径）
# 只读扫描，不改文件；默认警告模式，--strict 时有缺口 exit 1
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

miss=0; total=0
echo "== .mmd → 同名 .svg 配对 =="
while IFS= read -r f; do
  total=$((total + 1))
  svg="${f%.mmd}.svg"
  if [ ! -f "$svg" ]; then
    miss=$((miss + 1)); echo "  [MISS] $f（缺 ${svg##*/}）"
  fi
done < <(find docs -type f -name "*.mmd" | sort)

echo "  mmd 总数 ${total} · 缺失 ${miss}"
if [ "$miss" -eq 0 ]; then echo "  [OK] 全部配对"; exit 0; fi
[ "$STRICT" -eq 1 ] && exit 1 || exit 0
