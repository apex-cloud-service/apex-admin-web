# R2 · 前端实现（Vue 3 + TS，apex-admin-web）

## 开工前置

1. 读任务卡与 `AGENTS.md` 第 0 章。
2. 读目标文件全文 + 同类既有页面（照既有写法，不发明新范式）。
3. 确认技术栈：Vue 3.5 / Vite 6 / TS ~5.7 / Router 4 / Pinia 2 / Element Plus 2 / ECharts 5。

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
6. 自检：`npx vue-tsc --noEmit`

## 输出要求

- 只给改动文件完整片段或精确 diff。
- 每处改动写一句"为什么"。
- 结尾给验证命令与期望结果。

## 禁止

- 禁顺手重构、批量格式化、改 `tsconfig`/`vite.config` 规避类型错误。
- 禁引入新依赖（先提卡说明）。
- 禁改既有接口路径与字段名（破坏契约）。
