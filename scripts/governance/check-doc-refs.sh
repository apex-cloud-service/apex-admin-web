#!/usr/bin/env bash
# 活文档指针自检（apex-admin-web）
# 用法：bash scripts/governance/check-doc-refs.sh [--strict]
# 检查 1：受控 Markdown 中仍指向 AI 私有目录的引用（正文应在 docs/）
# 检查 2：Git 跟踪的 Markdown 中指向 .md 的相对行内链接文件是否存在。
# 不校验锚点、图片/源码目标或引用式链接；未跟踪的新文件不进入该检查。
# 豁免：docs/_archive/ 前缀整体豁免；白名单文件；显式标注「原文未入库」的行
# 默认只告警（退出码 0）；--strict 时发现问题退出码 1
set -u
STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec python3 "$ROOT/scripts/governance/check-doc-refs.py" "$ROOT" "$STRICT"
