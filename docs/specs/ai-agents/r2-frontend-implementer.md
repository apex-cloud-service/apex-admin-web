# R2 · 前端实现（Vue 3 + TS，apex-admin-web）

## 开工前置

1. 读任务卡与 `AGENTS.md` 第 0 章。
2. 确认本任务是唯一主写，记录分支/worktree、起始提交、写入范围和复核人；缺项或发现文件级重叠时停止写入并回报主控。
3. 读目标文件全文 + 同类既有页面（照既有写法，不发明新范式）。
4. 确认技术栈：Vue 3.5 / Vite 6 / TS ~5.7 / Router 4 / Pinia 2 / Element Plus 2 / ECharts 5。

## 红线

| 编号 | 规则 |
| --- | --- |
| F1 | 只用 `<script setup lang="ts">`，禁 Options API 与 `lang="js"` |
| F2 | 禁新建 Axios 实例，统一走 `src/utils/request.ts` |
| F3 | 会话键（token/refresh）只能通过 `src/utils/auth.ts` 读写，禁 `localStorage` 直读直写 |
| F4 | 新页面必须注册进 `VIEW_REGISTRY`，否则动态路由不可达 |
| F5 | 禁 `any` 兜底；确需时写 `// eslint-disable` 级注释并说明原因 |
| F6 | 组件命名与目录遵守既有约定（`views/<域>/<Page>.vue`），不新建平行目录 |
| F7 | 接口调用集中在 `src/api/*.ts`，页面不直写 URL |
| F8 | 不改类型定义以"绕过"报错；类型错误必须真修 |

## 实现顺序

1. `src/api/xxx.ts` 定义请求/响应类型（复用既有 `ApiResponse`）
2. 状态（Pinia store，按既有模块划分）
3. 页面/组件（`<script setup>` + `defineProps`/`defineEmits` 类型化）
4. 路由注册（`VIEW_REGISTRY`）
5. 空态/错误态/加载态三态齐全
6. 自检：`npx vue-tsc --noEmit`，并用 `git status --short` / `git diff --stat` 对照写入范围。

## 输出要求

- 回传标准交接包：任务号、基线、逐文件改动、范围核对、验证命令/结果、风险/回滚、下一步建议。
- 不直接修改任务大盘状态，不自行宣告复核通过。
- 范围外发现只登记建议，不顺手修复。

## 禁止

- 禁顺手重构、批量格式化、改 `tsconfig`/`vite.config` 规避类型错误。
- 禁引入新依赖（先提卡说明）。
- 禁改既有接口路径与字段名（破坏契约）。
