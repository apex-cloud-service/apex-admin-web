#!/usr/bin/env bash
# 记忆台账同步校验入口：默认告警，--strict 违规退出 1，参数/工具错误退出 2。
# --worktree 校验未提交工作区；--range A..B / A...B 校验提交范围和每次提交。
# --msg / --msg-file 校验末行对实际台账新增条目的引用，不以文件名存在替代追加检查。
# 所有内容改动（含文档、删除）均须登记；n/a 不豁免内容改动。
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  printf '%s\n' '[memory] 不在 Git 仓库内' >&2
  exit 2
}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 2
exec python3 -I "$SCRIPT_DIR/check-memory-sync.py" --root "$ROOT" "$@"
