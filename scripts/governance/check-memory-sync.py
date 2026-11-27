#!/usr/bin/env python3
"""校验实际记忆台账追加及提交信息引用，不修改仓库或读取真实环境配置。

默认检查暂存区；--worktree 包含未暂存/未跟踪文件；--range 检查提交范围。
所有内容改动均须追加台账，包括文档和删除；既有条目必须逐字保留。
默认违规告警返回 0，--strict 返回 1，参数或 Git 执行错误返回 2。
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

MEMORIES = (
    'docs/reference/ai-knowledge/04-change-memory.md',
    'docs/reference/ai-knowledge/07-change-memory.md',
)


class GitFailure(RuntimeError):
    """Git 执行失败不能作为空变更或正常告警放行。"""


def git(root, *args, allow_missing=False):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True)
    if result.returncode:
        if allow_missing:
            return b''
        raise GitFailure('Git 命令失败，不能把执行失败作为无变更或检查通过')
    return result.stdout


def paths(root, *args):
    return {p.decode('utf-8') for p in git(root, *args).split(b'\0') if p}


def blob(root, ref, path):
    result = subprocess.run(['git', 'cat-file', '-e', f'{ref}:{path}'], cwd=root, capture_output=True)
    if result.returncode:
        return ''
    return git(root, 'show', f'{ref}:{path}').decode('utf-8')


def entries(text):
    result = {}
    fenced = False
    for line in text.splitlines():
        if line.lstrip().startswith('```'):
            fenced = not fenced
            continue
        if fenced:
            continue
        match = re.match(r'^\|\s*(\d+)\s*\|', line)
        if not match:
            continue
        number = int(match.group(1))
        if number in result:
            raise ValueError(f'台账编号重复：#{number}')
        result[number] = re.split(r'(?<!\\)\|', line.strip())[1:-1]
    return result


def appended(old, new):
    # 允许追加时整理文件末尾空行，不允许更改任何既有正文或表格条目。
    prefix = old.rstrip('\r\n')
    if not new.startswith(prefix) or (prefix and len(new) > len(prefix) and new[len(prefix)] not in '\r\n'):
        raise ValueError('记忆台账不是 append-only：既有正文或条目被改写/删除')
    before = entries(old)
    after = entries(new)
    added = set(after) - set(before)
    if not added:
        raise ValueError('台账文件虽有变更，但没有新增编号条目')
    if min(added) <= max(before, default=0):
        raise ValueError('新增编号须大于现有最大编号')
    for number in added:
        fields = after[number]
        if len(fields) < 6 or any(not field.strip() for field in fields):
            raise ValueError(f'新增条目 #{number} 未填写完整登记字段')
    return after, added


def message_check(message, memory, available, added, changed, allow_na):
    lines = [line.strip() for line in message.splitlines() if line.strip()]
    if not lines:
        raise ValueError('提交信息为空，缺少末行 memory 标记')
    last = lines[-1]
    if re.fullmatch(r'memory:\s*n/a[（(].+[）)]', last):
        if changed or not allow_na:
            raise ValueError('memory: n/a 不豁免任何内容改动；须引用实际新增台账条目')
        return
    match = re.fullmatch(r'memory:\s*([^\s#]+)#([0-9]+)', last)
    if not match:
        raise ValueError('提交信息最后非空行必须引用 memory: <实际台账>#<编号>')
    if match.group(1) not in (memory, Path(memory).name):
        raise ValueError('memory 标记引用的文件名不是本仓实际台账')
    number = int(match.group(2))
    if number not in available:
        raise ValueError(f'引用的条目 #{number} 不存在')
    if changed and number not in added:
        raise ValueError(f'条目 #{number} 不是本次新增条目，不能替代同步登记')


def check(root, memory, old_ref, new_ref, changed, message=None, worktree=False, allow_na=False):
    old = blob(root, old_ref, memory) if old_ref else ''
    if worktree:
        file = root / memory
        new = file.read_text() if file.exists() else ''
    else:
        new = blob(root, new_ref, memory)
    if not new:
        raise ValueError('实际台账缺失或为空')
    available = entries(new)
    added = set()
    if changed:
        if memory not in changed:
            raise ValueError('变更集未包含台账；文档/删除也需要同步登记')
        available, added = appended(old, new)
    if message is not None:
        message_check(message, memory, available, added, bool(changed), allow_na)
    return added


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    parser.add_argument('--strict', action='store_true')
    parser.add_argument('--allow-na', action='store_true', help='仅无内容变更时允许带理由的 n/a')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--worktree', action='store_true')
    group.add_argument('--range')
    messages = parser.add_mutually_exclusive_group()
    messages.add_argument('--msg')
    messages.add_argument('--msg-file')
    return parser.parse_args()


def main():
    args = arguments()
    root = Path(args.root).resolve()
    if args.msg_file:
        try:
            message = Path(args.msg_file).read_text()
        except OSError:
            print('[memory] 提交信息文件不可读取', file=sys.stderr)
            return 2
    else:
        message = args.msg
    existing = [p for p in MEMORIES if (root / p).is_file()]
    if len(existing) != 1:
        print('[memory] 必须存在唯一的前端/后端记忆台账', file=sys.stderr)
        return 2
    memory = existing[0]
    errors = []
    try:
        if args.range:
            match = re.fullmatch(r'([^-].*?)(\.\.\.?)([^-].*)', args.range)
            if not match:
                print('[memory] --range 必须为 A..B 或 A...B', file=sys.stderr)
                return 2
            base = git(root, 'rev-parse', '--verify', f'{match.group(1)}^{{commit}}').decode().strip()
            head = git(root, 'rev-parse', '--verify', f'{match.group(3)}^{{commit}}').decode().strip()
            if match.group(2) == '...':
                base = git(root, 'merge-base', base, head).decode().strip()
            changed = paths(root, 'diff', '--name-only', '-z', base, head)
            check(root, memory, base, head, changed, message, allow_na=args.allow_na)
            commits = git(root, 'rev-list', '--reverse', f'{base}..{head}').decode().splitlines()
            for commit in commits:
                parents = git(root, 'rev-list', '--parents', '-n', '1', commit).decode().split()[1:]
                parent = parents[0] if parents else None
                delta = (paths(root, 'diff', '--name-only', '-z', parent, commit) if parent
                         else paths(root, 'ls-tree', '--name-only', '-r', '-z', commit))
                msg = git(root, 'show', '-s', '--format=%B', commit).decode()
                try:
                    check(root, memory, parent, commit, delta, msg, allow_na=args.allow_na)
                except ValueError as error:
                    errors.append(f'{commit[:8]}: {error}')
            print(f'[memory] 已核对范围快照与 {len(commits)} 次提交，不使用暂存区')
        elif args.worktree:
            changed = paths(root, 'diff', '--name-only', '-z', 'HEAD')
            changed |= paths(root, 'ls-files', '--others', '--exclude-standard', '-z')
            check(root, memory, 'HEAD', None, changed, message, worktree=True, allow_na=args.allow_na)
            print('[memory] 已核对未提交工作区追加；未提供提交信息时不宣称其已校验')
        else:
            changed = paths(root, 'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRDT')
            check(root, memory, 'HEAD', '', changed, message, allow_na=args.allow_na)
            print('[memory] 暂存区已校验' if changed else '[memory] 无暂存改动；若提供提交信息仍单独校验')
    except GitFailure as error:
        print(f'[memory] {error}', file=sys.stderr)
        return 2
    except (ValueError, UnicodeError) as error:
        errors.append(str(error))
    except OSError:
        print('[memory] 工具或文件读取失败，不能判定通过', file=sys.stderr)
        return 2
    for error in errors:
        print(f'[memory] WARN: {error}')
    print(f'[memory] 结果：{len(errors)} 项')
    return 1 if errors and args.strict else 0


if __name__ == '__main__':
    sys.exit(main())
