-- 代码生成器菜单
INSERT INTO sys_menu (menu_name, parent_id, path, component, menu_type, perms, icon, sort, visible, status, create_time, update_time)
VALUES ('代码生成器', (SELECT id FROM sys_menu WHERE menu_name = '系统管理' LIMIT 1), '/system/generator', 'system/generator/index', 1, 'system:generator:view', 'code', 8, 1, 1, NOW(), NOW());

SET @generator_menu_id = LAST_INSERT_ID();

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('数据源管理', @generator_menu_id, 2, 'system:generator:create', 1, 1, 1, NOW(), NOW()),
('测试连接', @generator_menu_id, 2, 'system:generator:test', 2, 1, 1, NOW(), NOW()),
('编辑数据源', @generator_menu_id, 2, 'system:generator:edit', 3, 1, 1, NOW(), NOW()),
('删除数据源', @generator_menu_id, 2, 'system:generator:delete', 4, 1, 1, NOW(), NOW()),
('查看表', @generator_menu_id, 2, 'system:generator:view', 5, 1, 1, NOW(), NOW()),
('生成配置', @generator_menu_id, 2, 'system:generator:config:create', 6, 1, 1, NOW(), NOW()),
('编辑配置', @generator_menu_id, 2, 'system:generator:config:edit', 7, 1, 1, NOW(), NOW()),
('删除配置', @generator_menu_id, 2, 'system:generator:config:delete', 8, 1, 1, NOW(), NOW()),
('预览代码', @generator_menu_id, 2, 'system:generator:preview', 9, 1, 1, NOW(), NOW()),
('生成代码', @generator_menu_id, 2, 'system:generator:generate', 10, 1, 1, NOW(), NOW()),
('生成历史', @generator_menu_id, 2, 'system:generator:history', 11, 1, 1, NOW(), NOW()),
('回滚代码', @generator_menu_id, 2, 'system:generator:rollback', 12, 1, 1, NOW(), NOW()),
('模板管理', @generator_menu_id, 2, 'system:generator:template', 13, 1, 1, NOW(), NOW()),
('新增模板', @generator_menu_id, 2, 'system:generator:template:create', 14, 1, 1, NOW(), NOW()),
('编辑模板', @generator_menu_id, 2, 'system:generator:template:edit', 15, 1, 1, NOW(), NOW()),
('删除模板', @generator_menu_id, 2, 'system:generator:template:delete', 16, 1, 1, NOW(), NOW());

-- 认证授权配置菜单
INSERT INTO sys_menu (menu_name, parent_id, path, component, menu_type, perms, icon, sort, visible, status, create_time, update_time)
VALUES ('认证授权配置', (SELECT id FROM sys_menu WHERE menu_name = '系统管理' LIMIT 1), '/system/auth', 'system/auth/index', 1, 'system:auth:view', 'lock', 9, 1, 1, NOW(), NOW());

SET @auth_menu_id = LAST_INSERT_ID();

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('JWT配置更新', @auth_menu_id, 2, 'system:auth:jwt:update', 1, 1, 1, NOW(), NOW()),
('OAuth2客户端创建', @auth_menu_id, 2, 'system:auth:oauth2:create', 2, 1, 1, NOW(), NOW()),
('OAuth2客户端编辑', @auth_menu_id, 2, 'system:auth:oauth2:edit', 3, 1, 1, NOW(), NOW()),
('OAuth2客户端删除', @auth_menu_id, 2, 'system:auth:oauth2:delete', 4, 1, 1, NOW(), NOW()),
('OAuth2客户端测试', @auth_menu_id, 2, 'system:auth:oauth2:test', 5, 1, 1, NOW(), NOW()),
('权限码创建', @auth_menu_id, 2, 'system:auth:permission:create', 6, 1, 1, NOW(), NOW()),
('权限码编辑', @auth_menu_id, 2, 'system:auth:permission:edit', 7, 1, 1, NOW(), NOW()),
('权限码删除', @auth_menu_id, 2, 'system:auth:permission:delete', 8, 1, 1, NOW(), NOW()),
('权限码同步', @auth_menu_id, 2, 'system:auth:permission:sync', 9, 1, 1, NOW(), NOW()),
('查看权限角色', @auth_menu_id, 2, 'system:auth:permission:view', 10, 1, 1, NOW(), NOW()),
('强制用户下线', @auth_menu_id, 2, 'system:auth:session:force-logout', 11, 1, 1, NOW(), NOW()),
('批量强制下线', @auth_menu_id, 2, 'system:auth:session:batch-logout', 12, 1, 1, NOW(), NOW()),
('会话配置更新', @auth_menu_id, 2, 'system:auth:session:update', 13, 1, 1, NOW(), NOW()),
('安全策略更新', @auth_menu_id, 2, 'system:auth:security:update', 14, 1, 1, NOW(), NOW()),
('解锁用户', @auth_menu_id, 2, 'system:auth:unlock', 15, 1, 1, NOW(), NOW());

-- 办公平台组织架构同步菜单(更新现有菜单路径)
UPDATE sys_menu SET component = 'office/organization/index' WHERE path = '/office/organization' AND menu_type = 1;

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('组织架构同步', (SELECT id FROM sys_menu WHERE path = '/office/organization' LIMIT 1), 2, 'office:organization:sync', 1, 1, 1, NOW(), NOW()),
('强制全量同步', (SELECT id FROM sys_menu WHERE path = '/office/organization' LIMIT 1), 2, 'office:organization:sync:full', 2, 1, 1, NOW(), NOW()),
('查看组织详情', (SELECT id FROM sys_menu WHERE path = '/office/organization' LIMIT 1), 2, 'office:organization:view', 3, 1, 1, NOW(), NOW());

-- 办公平台消息推送菜单(更新现有菜单路径)
UPDATE sys_menu SET component = 'office/message/index' WHERE path = '/office/message' AND menu_type = 1;

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('发送消息', (SELECT id FROM sys_menu WHERE path = '/office/message' LIMIT 1), 2, 'office:message:send', 1, 1, 1, NOW(), NOW()),
('新增消息模板', (SELECT id FROM sys_menu WHERE path = '/office/message' LIMIT 1), 2, 'office:message:template:create', 2, 1, 1, NOW(), NOW()),
('编辑消息模板', (SELECT id FROM sys_menu WHERE path = '/office/message' LIMIT 1), 2, 'office:message:template:edit', 3, 1, 1, NOW(), NOW()),
('删除消息模板', (SELECT id FROM sys_menu WHERE path = '/office/message' LIMIT 1), 2, 'office:message:template:delete', 4, 1, 1, NOW(), NOW());

-- 办公平台审批流菜单(更新现有菜单路径)
UPDATE sys_menu SET component = 'office/approval/index' WHERE path = '/office/approval' AND menu_type = 1;

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('审批通过', (SELECT id FROM sys_menu WHERE path = '/office/approval' LIMIT 1), 2, 'office:approval:approve', 1, 1, 1, NOW(), NOW()),
('审批拒绝', (SELECT id FROM sys_menu WHERE path = '/office/approval' LIMIT 1), 2, 'office:approval:reject', 2, 1, 1, NOW(), NOW()),
('发起审批', (SELECT id FROM sys_menu WHERE path = '/office/approval' LIMIT 1), 2, 'office:approval:initiate', 3, 1, 1, NOW(), NOW()),
('撤回审批', (SELECT id FROM sys_menu WHERE path = '/office/approval' LIMIT 1), 2, 'office:approval:cancel', 4, 1, 1, NOW(), NOW());

-- 办公平台日历菜单(更新现有菜单路径)
UPDATE sys_menu SET component = 'office/calendar/index' WHERE path = '/office/calendar' AND menu_type = 1;

INSERT INTO sys_menu (menu_name, parent_id, menu_type, perms, sort, visible, status, create_time, update_time)
VALUES 
('创建日历事件', (SELECT id FROM sys_menu WHERE path = '/office/calendar' LIMIT 1), 2, 'office:calendar:create', 1, 1, 1, NOW(), NOW()),
('编辑日历事件', (SELECT id FROM sys_menu WHERE path = '/office/calendar' LIMIT 1), 2, 'office:calendar:edit', 2, 1, 1, NOW(), NOW()),
('删除日历事件', (SELECT id FROM sys_menu WHERE path = '/office/calendar' LIMIT 1), 2, 'office:calendar:delete', 3, 1, 1, NOW(), NOW()),
('查看日历事件', (SELECT id FROM sys_menu WHERE path = '/office/calendar' LIMIT 1), 2, 'office:calendar:view', 4, 1, 1, NOW(), NOW());
