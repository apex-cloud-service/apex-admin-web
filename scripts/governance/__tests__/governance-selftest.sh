#!/usr/bin/env bash
# 治理脚本集成自测：仅在临时 Git 仓库和子检查夹具中运行，不修改真实仓库。
# 检查完整条目、append-only、末行引用、范围、删除，以及子检查失败不假通过。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEMORY_SCRIPT="$SCRIPT_DIR/check-memory-sync.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
WORK="$TMP/repo"
mkdir -p "$WORK/docs/reference/ai-knowledge" "$WORK/src"
cd "$WORK"
git init -q
git config user.email selftest@example.com
git config user.name selftest
git config core.hooksPath /dev/null
MEMORY=docs/reference/ai-knowledge/04-change-memory.md
printf '# 台账\n\n| 编号 | 日期 | 类型 | 改动 | 提交 | 证据 | 影响 |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | 2026-11-26 | 代码 | 初始数据 | 未提交 | 自测 | 临时库 |\n' > "$MEMORY"
printf 'value = 1\n' > src/example.ts
printf '# 文档\n' > docs/example.md
git add -A
git commit -qm $'fixture\n\nmemory: 04-change-memory.md#1'
BASE="$(git rev-parse HEAD)"
PASS=0
FAIL=0
check() {
  local name=$1 expected=$2
  shift 2
  local actual=0
  "$@" > "$TMP/output" 2>&1 || actual=$?
  if [[ "$actual" == "$expected" ]]; then
    printf '  [OK] %s (exit %s)\n' "$name" "$actual"
    PASS=$((PASS + 1))
  else
    printf '  [FAIL] %s expected=%s actual=%s\n' "$name" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}
run() { bash "$MEMORY_SCRIPT" "$@"; }
reset_fixture() {
  git restore --source=HEAD --staged --worktree .
  rm -f src/new.ts
}
append_two() { printf '| 2 | 2026-11-26 | 代码 | 更新数据 | 未提交 | 自测 | 临时库 |\n' >> "$MEMORY"; }
check 'msg 缺值' 2 run --msg
check 'range 缺值' 2 run --range
check '未知参数' 2 run --unknown
check '非法 range' 2 run --range no-range
check '不存在的 range 端点' 2 run --range HEAD..not-a-ref
check '提交信息文件缺失' 2 run --msg-file "$TMP/missing"
check '无暂存改动' 0 run --strict
check '无内容改动仍检查正确末行' 0 run --strict --msg $'fixture\n\nmemory: 04-change-memory.md#1'
check '无内容改动仍拒绝错误末行' 1 run --strict --msg $'memory: 04-change-memory.md#1\nwrong trailer'
check '错误台账文件名' 1 run --strict --msg $'fixture\n\nmemory: unrelated.md#1'

printf 'value = 2\n' > src/example.ts
git add src/example.ts
check '代码未登记' 1 run --strict
check '默认告警模式' 0 run
reset_fixture
printf '# 文档更新\n' > docs/example.md
git add docs/example.md
check '文档改动也需登记' 1 run --strict
reset_fixture
git rm -q src/example.ts
check '纯删除也需登记' 1 run --strict
reset_fixture

printf 'value = 2\n' > src/example.ts
printf '\n# 仅改了台账注释，没有条目\n' >> "$MEMORY"
git add -A
check '只改台账注释不能充当登记' 1 run --strict
reset_fixture
printf 'value = 2\n' > src/example.ts
printf '| 2 | 不完整 |\n' >> "$MEMORY"
git add -A
check '新增条目字段不完整' 1 run --strict
reset_fixture
printf 'value = 2\n' > src/example.ts
append_two
printf '# 改写了历史正文\n' > "$TMP/history"
printf '| 2 | 2026-11-26 | 代码 | 更新 | 未提交 | 自测 | 临时库 |\n' >> "$TMP/history"
cp "$TMP/history" "$MEMORY"
git add -A
check '禁止改写或删除历史台账' 1 run --strict
reset_fixture
printf 'value = 2\n' > src/example.ts
append_two
printf '| 2 | 2026-11-26 | 代码 | 重复 | 未提交 | 自测 | 临时库 |\n' >> "$MEMORY"
git add -A
check '禁止重复编号' 1 run --strict
reset_fixture
printf 'value = 2\n' > src/example.ts
append_two
git add -A
check '新增完整条目与正确末行' 0 run --strict --msg $'fix\n\nmemory: 04-change-memory.md#2'
check '引用旧条目不能替代新增登记' 1 run --strict --msg $'fix\n\nmemory: 04-change-memory.md#1'
check '引用不存在条目' 1 run --strict --msg $'fix\n\nmemory: 04-change-memory.md#99'
check '标记不在末行' 1 run --strict --msg $'fix\n\nmemory: 04-change-memory.md#2\ntrailer'
check 'n/a 不能豁免内容改动' 1 run --strict --allow-na --msg $'fix\n\nmemory: n/a（格式化）'
reset_fixture
check '无内容变更的兼容 n/a' 0 run --strict --allow-na --msg $'noop\n\nmemory: n/a（无内容变更）'
printf 'new file\n' > src/new.ts
append_two
check '未提交工作区包含未跟踪文件并校验追加' 0 run --strict --worktree
reset_fixture
printf 'value = 2\n' > src/example.ts
append_two
git add -A
git commit -qm $'fix\n\nmemory: 04-change-memory.md#2'
check '合法两点提交范围' 0 run --strict --range "$BASE..HEAD"
check '合法三点提交范围' 0 run --strict --range "$BASE...HEAD"
printf 'value = 3\n' > src/example.ts
git add -A
git commit -qm $'missing ledger\n\nmemory: 04-change-memory.md#2'
check '范围检查每次提交，不能漏登记' 1 run --strict --range "$BASE..HEAD"
printf 'fixture\n\nmemory: 04-change-memory.md#2\n' > "$TMP/message"
check '无暂存时 msg-file 仍可校验' 0 run --strict --msg-file "$TMP/message"

# 模拟子检查退出失败但输出看似通过，验证 verify-docs 不假通过。
GOV="$TMP/governance"
mkdir -p "$GOV/scripts/governance"
cp "$SCRIPT_DIR/verify-docs.sh" "$GOV/scripts/governance/verify-docs.sh"
for dir in tasks specs plans records reviews notes; do
  mkdir -p "$GOV/docs/$dir"
  printf '# 索引\n' > "$GOV/docs/$dir/README.md"
done
printf 'P0 P1 P2 P3 待规划\n' > "$GOV/docs/tasks/project-tasks.md"
printf '第 0 章 项目治理与任务管理规范\n' > "$GOV/AGENTS.md"
printf '项目治理与任务管理（2026-11-16 增补）\n' > "$GOV/docs/README.md"
printf '#!/bin/bash\nprintf "缺失 0\\n"\n' > "$GOV/scripts/governance/check-diagram-assets.sh"
printf '#!/bin/bash\nprintf "自检通过\\n"\n' > "$GOV/scripts/governance/check-doc-layout.sh"
printf '#!/bin/bash\nprintf "== 结果：0 项 ==\\n"\nexit 3\n' > "$GOV/scripts/governance/check-doc-refs.sh"
chmod +x "$GOV/scripts/governance/check-doc-refs.sh"
check '子检查报 0 项但退出失败不能通过' 1 bash "$GOV/scripts/governance/verify-docs.sh" --strict
printf '#!/bin/bash\nexit 0\n' > "$GOV/scripts/governance/check-doc-refs.sh"
check '子检查空输出不能通过' 1 bash "$GOV/scripts/governance/verify-docs.sh" --strict
printf '#!/bin/bash\nprintf "== 结果：0 项 ==\\n"\n' > "$GOV/scripts/governance/check-doc-refs.sh"
check '有效子检查均成功' 0 bash "$GOV/scripts/governance/verify-docs.sh" --strict
printf '#!/bin/bash\nprintf "缺失 0\\n"\nexit 3\n' > "$GOV/scripts/governance/check-diagram-assets.sh"
check '图表子检查失败不能按文本放行' 1 bash "$GOV/scripts/governance/verify-docs.sh" --strict
printf '\n自测结果：通过 %s，失败 %s\n' "$PASS" "$FAIL"
[[ "$FAIL" == 0 ]]
