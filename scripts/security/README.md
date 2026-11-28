# scripts/security（依赖安全扫描）

## 入口

```bash
bash scripts/security/security-scan.sh     # 控制台输出
npm run audit                              # JSON → reports/audit/audit.html
npm run audit:fix                          # npm audit fix
```

## `security-scan.sh` 的三步

| 步骤 | 命令 | 失败处理 |
| --- | --- | --- |
| 生产依赖审计 | `npm audit --production` | `set -e`，有漏洞即整体非零退出 |
| 过期依赖检查 | `npx npm-check-updates`（无条件执行，走 npx 拉取） | 同上 |
| Snyk 扫描 | `snyk test`，**仅当 `command -v snyk` 存在** | 未安装则打印「Snyk 未安装，跳过」并继续 |

## 与 `npm run audit` 的区别

| 项 | `security-scan.sh` | `npm run audit` |
| --- | --- | --- |
| 输出 | 控制台 | `reports/audit/audit.html`（HTML） |
| 覆盖面 | audit + 过期依赖 + Snyk | 仅 `npm audit --json` → HTML |
| 入报告 | 否 | 是（但 `reports/audit/` 默认**不入库**） |

## 退出码

`set -e` 生效：任一步骤失败即非零退出。Snyk 未安装不算失败。

## 注意

- `npm-check-updates` 经 `npx` 无条件拉取最新版，联网环境才能执行。
- 本脚本不修改依赖，不自动修复（修复用 `npm run audit:fix`，需人工复核升级影响）。

## 关联

- [AGENTS.md 附录 A §9](../../AGENTS.md)（命令表）
- [reports/README.md](../../reports/README.md)