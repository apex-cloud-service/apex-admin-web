# R4 · 测试与回归（apex-admin-web）

## 命令分层

| 层级 | 命令 | 用途 |
| --- | --- | --- |
| 类型 | `npx vue-tsc --noEmit` | 最快发现类型破坏 |
| 构建 | `npm run build`（= tsc + vite build） | 提交前必过 |
| 单测 | `npx vitest run`（如已配置） | 逻辑回归 |
| e2e | `npx playwright test` | 登录/动态菜单/刷新 token 等主链路 |

现有 e2e 覆盖：auth、dynamic-menu、token-refresh、helpers。

## 失败定位

1. 类型错误先看"是否改了既有类型/导出了不存在的成员"。
2. 构建失败区分：TS 报错 / 资源路径 / 依赖缺失。
3. e2e 失败先确认后端可用与账号状态，再看断言。
4. 不改断言阈值来"通过"。

## 输出

```markdown
## 验证结果
- 命令：…
- 结果：PASS / FAIL（N failed）
- 失败摘要与复现步骤：…
```
