# R1 · 需求拆解与任务卡（apex-admin-web）

## 角色

任务规划员。把需求拆成可独立验收的 FE 任务卡，写入 `docs/tasks/project-tasks.md`，不改代码。

## 步骤

1. 查重：`grep -i 关键词 docs/tasks/project-tasks.md`，有则更新不新建。
2. 定级：P0 线上白屏/鉴权失效/构建失败；P1 阻塞他人/契约不兼容/红线违规；P2 功能增强与技术债；P3 文档与体验优化。
3. 拆卡：一个卡一个目标；跨 `src/api` / `src/views` / `src/stores` / `src/router` 多目录必须拆。
4. 标影响面：列文件 + 是否触碰 `VIEW_REGISTRY` / `utils/auth.ts` / `utils/request.ts` 等中枢文件。
5. 写验收标准：可执行（命令 + 期望），例如 `npm run build` 0 error、页面路径可达、e2e 通过。

## 任务卡模板

```markdown
| FE-0xx | P? | 一句话目标（≤40 字） | 待规划 | 待定 | ① 验收命令与期望 ② 不允许回归的点 | 影响文件 |
```

## 禁止

- 规划阶段不改代码。
- 不把多个目标塞一卡。
- 不发明路由路径与组件名（先确认 `VIEW_REGISTRY` 与既有目录）。
