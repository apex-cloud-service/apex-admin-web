-- 数据库配置采集页菜单注册 SQL
-- ------------------------------------------------------------------
-- 将此 SQL 插入到后端数据库的 sys_menu 表中，以在系统管理菜单下显示数据库配置页。
-- 注意：需要根据实际的父菜单 ID（系统管理）调整 parent_id 值。

-- 假设系统管理目录的 ID 为 2（根据实际情况调整）
INSERT INTO sys_menu (
  parent_id,
  menu_name,
  menu_type,
  path,
  component,
  perms,
  icon,
  sort,
  visible,
  status,
  create_time,
  update_time,
  deleted
) VALUES (
  2,                              -- parent_id: 系统管理目录 ID
  '数据库配置',                    -- menu_name
  1,                               -- menu_type: 1=菜单
  '/system/database',              -- path: 路由路径
  'system/database/index',         -- component: 组件路径（对应 VIEW_REGISTRY）
  'system:database:view',          -- perms: 权限码
  'Database',                      -- icon: Element Plus 图标名
  7,                               -- sort: 排序（在系统管理菜单中的位置）
  1,                               -- visible: 1=显示
  1,                               -- status: 1=正常
  NOW(),                           -- create_time
  NOW(),                           -- update_time
  0                                -- deleted: 0=未删除
);

-- 可选：为数据库配置页添加按钮权限
-- 测试连接按钮
INSERT INTO sys_menu (
  parent_id,
  menu_name,
  menu_type,
  perms,
  sort,
  visible,
  status,
  create_time,
  update_time,
  deleted
) VALUES (
  LAST_INSERT_ID(),                -- parent_id: 上面插入的数据库配置菜单 ID
  '测试连接',                      -- menu_name
  2,                               -- menu_type: 2=按钮
  'system:database:test',          -- perms: 权限码
  1,                               -- sort
  1,                               -- visible
  1,                               -- status
  NOW(),                           -- create_time
  NOW(),                           -- update_time
  0                                -- deleted
);

-- 生成配置按钮
INSERT INTO sys_menu (
  parent_id,
  menu_name,
  menu_type,
  perms,
  sort,
  visible,
  status,
  create_time,
  update_time,
  deleted
) VALUES (
  (SELECT id FROM sys_menu WHERE component = 'system/database/index' AND deleted = 0 LIMIT 1),
  '生成配置',                      -- menu_name
  2,                               -- menu_type: 2=按钮
  'system:database:generate',      -- perms: 权限码
  2,                               -- sort
  1,                               -- visible
  1,                               -- status
  NOW(),                           -- create_time
  NOW(),                           -- update_time
  0                                -- deleted
);

-- 查询当前数据库信息按钮
INSERT INTO sys_menu (
  parent_id,
  menu_name,
  menu_type,
  perms,
  sort,
  visible,
  status,
  create_time,
  update_time,
  deleted
) VALUES (
  (SELECT id FROM sys_menu WHERE component = 'system/database/index' AND deleted = 0 LIMIT 1),
  '查询数据库信息',                -- menu_name
  2,                               -- menu_type: 2=按钮
  'system:database:info',          -- perms: 权限码
  3,                               -- sort
  1,                               -- visible
  1,                               -- status
  NOW(),                           -- create_time
  NOW(),                           -- update_time
  0                                -- deleted
);
