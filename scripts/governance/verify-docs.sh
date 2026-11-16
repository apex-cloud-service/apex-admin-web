#!/usr/bin/env bash
# 文档治理自检（apex-admin-web）
# 用法：bash scripts/governance/verify-docs.sh [--strict]
# 默认：发现问题仅警告，退出码 0；--strict：发现问题退出码 1（可用于 pre-commit）
set -u

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

FAIL=0
pass() { printf '  [OK]   %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; FAIL=$((FAIL+1)); }

echo "== 1. 标准目录与索引 =="
for d in tasks specs plans records reviews notes; do
  if [ -d "docs/$d" ]; then pass "docs/$d"; else warn "缺少目录 docs/$d"; fi
  if [ -f "docs/$d/README.md" ]; then pass "docs/$d/README.md"; else warn "缺少索引 docs/$d/README.md"; fi
done

echo "== 2. 任务大盘 =="
if [ -s "docs/tasks/project-tasks.md" ]; then
  pass "docs/tasks/project-tasks.md 存在"
  for kw in P0 P1 P2 P3 待规划; do
    grep -q "$kw" docs/tasks/project-tasks.md && pass "任务大盘含 $kw" || warn "任务大盘缺少 $kw 口径"
  done
else
  warn "缺少 docs/tasks/project-tasks.md"
fi

echo "== 3. 治理规范 =="
grep -q "第 0 章 项目治理与任务管理规范" AGENTS.md && pass "AGENTS.md 含治理章节" || warn "AGENTS.md 缺少第 0 章"
grep -q "项目治理与任务管理（2026-11-16 增补）" docs/README.md && pass "docs/README 含治理索引" || warn "docs/README 缺少治理索引"

echo "== 4. 私有目录边界（禁止存放业务文档） =="
for d in .workbuddy/knowledge .zcode/plans .trae/documents .qoder .codex; do
  [ -d "$d" ] || continue
  # 允许：MIGRATED.md 指针、rules/memory/agents 子目录；其余 >10 行的 md 视为业务正文
  bad=$(find "$d" -type f -name "*.md" 2>/dev/null \
    | grep -v -E "MIGRATED\.md$" \
    | grep -v -E "/(memory|agents|rules|rag|automations)/" \
    | while read -r f; do
        lines=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
        if [ "${lines:-0}" -gt 10 ]; then echo "$f"; fi
      done)
  if [ -n "$bad" ]; then warn "私有目录疑似存放业务正文：$(echo "$bad" | tr '\n' ' ')"; else pass "$d 边界合规"; fi
done

echo "== 5. 文档规模快照（含独立图表资产） =="
TOTAL=$(find docs -type f | wc -l | tr -d ' ')
MD=$(find docs -type f -name "*.md" | wc -l | tr -d ' ')
SVG=$(find docs -type f -name "*.svg" | wc -l | tr -d ' ')
MMD=$(find docs -type f -name "*.mmd" | wc -l | tr -d ' ')
echo "  docs 文件总数：${TOTAL} (md=${MD} svg=${SVG} mmd=${MMD})"

echo "== 6. 新增文档索引可达性 =="
if [ -d docs/reference/ai-knowledge ]; then
  [ -f docs/reference/ai-knowledge/README.md ] && pass "ai-knowledge 索引存在" || warn "ai-knowledge 缺少 README"
fi
if [ -d docs/archived/ai-sessions/zcode-plans ]; then
  [ -f docs/archived/ai-sessions/zcode-plans/README.md ] && pass "zcode-plans 索引存在" || warn "zcode-plans 缺少 README"
fi

echo "== 8. 活文档私有路径与断链 =="
REFS=$("$ROOT/scripts/governance/check-doc-refs.sh" 2>&1 | tail -1 | grep -oE '[0-9]+' | head -1)
if [ "${REFS:-0}" -gt 0 ]; then
  warn "check-doc-refs 发现 ${REFS} 项（明细见 bash scripts/governance/check-doc-refs.sh）"
else
  pass "活文档无私有路径残留、无断链"
fi

echo "== 9. 图表资产配对（.mmd ↔ 同名 .svg）=="
if [ -f scripts/governance/check-diagram-assets.sh ]; then
  out=$(bash scripts/governance/check-diagram-assets.sh 2>&1 | tail -2)
  if echo "$out" | grep -q "缺失 0"; then pass "图表配对完整（${out//$'\n'/ }）"; else warn "图表配对有缺口：$(echo "$out" | tr '\n' ' ')"; fi
else
  warn "缺少 scripts/governance/check-diagram-assets.sh"
fi

echo "== 10. 目录结构规范化（docs README / 总览覆盖 / 根目录 / reports 分层）=="
if [ -f scripts/governance/check-doc-layout.sh ]; then
  layout=$(bash scripts/governance/check-doc-layout.sh 2>&1)
  if echo "$layout" | grep -q "自检通过"; then pass "目录结构规范（13 个 docs 一级目录均有 README 且被总览覆盖，reports 已分层）"; else warn "目录结构有问题：$(echo "$layout" | grep '\[WARN\]' | tr '\n' ' ')"; fi
else
  warn "缺少 scripts/governance/check-doc-layout.sh"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 文档治理自检通过（0 项问题）"
  exit 0
else
  echo "⚠️ 发现 ${FAIL} 项问题"
  [ "$STRICT" -eq 1 ] && exit 1
  exit 0
fi
