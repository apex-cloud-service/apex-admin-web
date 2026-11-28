# scripts/database（菜单 SQL 补充）

## 重要边界

本目录的 SQL **不是**后端正式菜单种子。后端 Flyway 迁移位于后端仓库
`apex-system/src/main/resources/db/migration/{mysql,postgresql}/`，那才是菜单与权限码的权威来源。

本目录只用于**手工补齐**特定页面所需菜单行，避免在无法改后端迁移的环境里页面 404。

## 文件

| 文件 | 用途 | 状态 |
| --- | --- | --- |
| `menu-init.sql` | 为数据库配置页（`/system/database`）插入 `sys_menu` 记录 | 手动执行；`parent_id` 需按实际「系统管理」目录 ID 调整 |
| `archive/V999__Add_Generator_Auth_Office_Menus.sql` | 早期手工补的代码生成器 / 认证 / 办公菜单 | **历史件**，已被后端正式迁移取代 |
| `archive/V1000__Add_SSO_Menu.sql` | 早期手工补的 SSO 菜单 | **历史件**，同上 |

## 使用注意

1. 执行前先确认后端迁移是否已包含对应菜单——**优先依赖后端迁移**。
2. `menu-init.sql` 中的 `parent_id` 是示例值（注释写明「假设为 2」），必须按目标库实际 ID 替换。
3. 菜单 `component` 值必须与前端 `src/router/dynamic.ts` 的 `VIEW_REGISTRY` 键**完全一致**，否则页面静默 404（无降级视图）。
4. 手工插入后清一次菜单缓存或重新登录，使前端重新拉取 `/admin-api/v1/menus`。

## 关联

- [AGENTS.md 附录 A §1](../../AGENTS.md)（菜单 path/component 约定与种子脚本位置）
- [features/database-config.md](../../docs/features/database-config.md)