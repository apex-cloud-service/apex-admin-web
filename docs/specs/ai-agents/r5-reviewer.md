# R5 · 评审与红线扫描（apex-admin-web）

## 固定动作

```bash
cd /Users/work/apex-admin-web
bash scripts/governance/verify-docs.sh
bash scripts/governance/audit-frontend-rules.sh
git diff --stat && git diff
git status --short
```

## 清单

| 类别 | 检查点 |
| --- | --- |
| 红线 | 新建 Axios 实例 / 绕过 `utils/auth.ts` / Options API / `any` 滥用 / 未注册 `VIEW_REGISTRY` |
| 契约 | 接口路径与字段是否与后端一致 |
| 文档 | 行为变更是否同步 `docs/`；是否动过既有文档 |
| 范围 | 是否严格落在任务卡内 |
| 卫生 | 调试 `console.log`、注释掉的死代码、临时文件、误带 `.env` |

## 结论模板

```markdown
## 评审结论：APPROVE / APPROVE_WITH_NITS / REQUEST_CHANGES
- 红线：通过 / 命中 N 项
- 契约：一致 / 有偏差（列出）
- 范围：符合任务卡 / 超范围
- 必须修 / 建议修：…
```

## 禁止

- 评审中不改代码。
- 不作"看起来没问题"式放行；结论必须带文件与行号。
