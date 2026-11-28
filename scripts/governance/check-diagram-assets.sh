#!/usr/bin/env bash
# 图表资产配对自检：每个 .mmd 必须有同名 .svg
# 前置假设：全部图表源位于 docs/diagrams/（含 _legacy/）；依据规范 §7.5「图表源 → docs/diagrams/」。
#   若未来在 docs 其它子目录放 .mmd，本脚本不会校验其配对，需同步扩展扫描范围。
# 口径：
#   - 现行图：docs/diagrams/*.mmd（不含 _legacy/）
#   - 历史归档件：docs/diagrams/_legacy/*.mmd
#   - 两处都要求 .mmd ↔ .svg 成对，任一缺失即计缺口
# 只读扫描，不改文件；默认警告模式，--strict 时有缺口 exit 1
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

echo "== .mmd → 同名 .svg 配对 =="

total_miss=0
total_all=0

for group in current legacy; do
  if [ "$group" = "current" ]; then
    label="现行图（docs/diagrams/）"
    files=$(find docs/diagrams -maxdepth 1 -type f -name "*.mmd" 2>/dev/null | sort)
  else
    label="历史归档（docs/diagrams/_legacy/）"
    files=$(find docs/diagrams/_legacy -maxdepth 1 -type f -name "*.mmd" 2>/dev/null | sort)
  fi

  t=0; m=0
  if [ -n "$files" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      t=$((t + 1))
      svg="${f%.mmd}.svg"
      if [ ! -f "$svg" ]; then
        m=$((m + 1))
        echo "  [MISS] $f（缺 ${svg##*/}）"
      fi
    done <<< "$files"
  fi
  echo "  ${label} mmd ${t} 张 · 缺失 ${m}"
  total_all=$((total_all + t))
  total_miss=$((total_miss + m))
done

echo "  ---- 合计 mmd ${total_all} 张 · 缺失 ${total_miss}"
if [ "$total_miss" -eq 0 ]; then echo "  [OK] 全部配对"; exit 0; fi
[ "$STRICT" -eq 1 ] && exit 1 || exit 0