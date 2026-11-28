# scripts/dev（开工预检）

## 用途

开工/提交前的一次性自检，一次跑完分支、工作区、远端、附录 A 完整性、治理脚本、工具链等检查。前后端双仓通用（按 `pom.xml`/`package.json` 自动识别仓库类型）。

## 入口

```bash
bash scripts/dev/apex-preflight.sh            # 全量（含治理脚本与网络）
bash scripts/dev/apex-preflight.sh --fast     # 跳过治理自检与远端 fetch
bash scripts/dev/apex-preflight.sh --commit   # 额外校验记忆台账是否已暂存
bash scripts/dev/apex-preflight.sh --strict   # 有 FAIL 时 exit 1
```

## 检查项（前端仓）

1. 仓类型识别（`package.json` + `src/views` → frontend）
2. 当前分支必须为 `dev`
3. 工作区是否干净（脏则列出前 20 项，仅 WARN）
4. 与 `origin/dev` 对齐（落后即 WARN；`--fast` 跳过）
5. **AGENTS.md 附录 A 完整性**：`tail -n 700 | shasum -a 256` 必须等于
   `9e9f3cda9cd00e8eab7aff3da8eadb95fe998cb12d75931939f6328862611aa3`
6. `origin` 为 SSH 地址且 `core.sshCommand` 固定走 443
7. 记忆台账存在且有条目
8. 治理脚本齐全（`verify-docs.sh`/`check-doc-refs.sh`/`check-memory-sync.sh`/`audit-frontend-rules.sh`）
9. 治理自检结果（`--fast` 跳过）
10. `node` 可用 + `package.json` 有 `build` 脚本

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 无 FAIL（可能含 WARN，需人工确认） |
| 1 | 存在 FAIL（`--strict` 模式下；非 strict 仍 exit 0 但会打印汇总） |

## 关键边界

- 附录 A 哈希校验是**防误改的硬闸**。需要修正附录 A 内容时，改第 0.10 节勘误表，不要动附录 A 正文。
- `--fast` 会跳过治理自检，不可作为提交前唯一依据。

## 关联

- [AGENTS.md 第 0.8 节](../../AGENTS.md)（记忆台账、分支模型、工具链）
- [scripts/governance/README.md](../governance/README.md)