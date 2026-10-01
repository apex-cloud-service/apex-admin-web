-- ============================================================================
-- SSO单点登录配置菜单
-- ============================================================================
-- 说明: 添加SSO单点登录配置相关的菜单项和权限按钮
-- 版本: V1000
-- 日期: 2024-01-01
-- ============================================================================

-- SSO配置管理主菜单（系统管理下的子菜单）
INSERT INTO sys_menu (parent_id, menu_name, menu_type, sort_order, path, component, icon, visible, status, perms, create_time, update_time)
VALUES (
    (SELECT id FROM sys_menu WHERE menu_name = '系统管理' AND menu_type = 0 LIMIT 1),
    'SSO配置',
    1,
    60,
    'sso',
    'system/sso/index',
    'key',
    1,
    1,
    'system:sso:view',
    NOW(),
    NOW()
);

-- 获取刚插入的SSO配置菜单ID
SET @sso_menu_id = LAST_INSERT_ID();

-- SSO配置管理按钮权限
INSERT INTO sys_menu (parent_id, menu_name, menu_type, sort_order, path, component, icon, visible, status, perms, create_time, update_time)
VALUES
    -- 新增SSO提供商
    (@sso_menu_id, '新增提供商', 2, 1, NULL, NULL, NULL, 1, 1, 'system:sso:create', NOW(), NOW()),
    -- 编辑SSO提供商
    (@sso_menu_id, '编辑提供商', 2, 2, NULL, NULL, NULL, 1, 1, 'system:sso:edit', NOW(), NOW()),
    -- 删除SSO提供商
    (@sso_menu_id, '删除提供商', 2, 3, NULL, NULL, NULL, 1, 1, 'system:sso:delete', NOW(), NOW()),
    -- 测试SSO连接
    (@sso_menu_id, '测试连接', 2, 4, NULL, NULL, NULL, 1, 1, 'system:sso:test', NOW(), NOW()),
    -- 查看SSO元数据
    (@sso_menu_id, '查看元数据', 2, 5, NULL, NULL, NULL, 1, 1, 'system:sso:metadata', NOW(), NOW()),
    -- 强制下线会话
    (@sso_menu_id, '强制下线', 2, 6, NULL, NULL, NULL, 1, 1, 'system:sso:session:terminate', NOW(), NOW()),
    -- 查看审计日志
    (@sso_menu_id, '审计日志', 2, 7, NULL, NULL, NULL, 1, 1, 'system:sso:audit:view', NOW(), NOW());

-- ============================================================================
-- 为超级管理员角色分配SSO菜单权限
-- ============================================================================

-- 获取超级管理员角色ID（假设角色名为'超级管理员'或角色编码为'admin'）
SET @admin_role_id = (SELECT id FROM sys_role WHERE role_code = 'admin' OR role_name = '超级管理员' LIMIT 1);

-- 为超级管理员分配SSO配置主菜单权限
INSERT INTO sys_role_menu (role_id, menu_id, create_time)
SELECT @admin_role_id, id, NOW()
FROM sys_menu
WHERE parent_id = (SELECT id FROM sys_menu WHERE menu_name = '系统管理' AND menu_type = 0 LIMIT 1)
  AND menu_name = 'SSO配置'
  AND NOT EXISTS (
      SELECT 1 FROM sys_role_menu WHERE role_id = @admin_role_id AND menu_id = sys_menu.id
  );

-- 为超级管理员分配所有SSO相关按钮权限
INSERT INTO sys_role_menu (role_id, menu_id, create_time)
SELECT @admin_role_id, id, NOW()
FROM sys_menu
WHERE parent_id = @sso_menu_id
  AND NOT EXISTS (
      SELECT 1 FROM sys_role_menu WHERE role_id = @admin_role_id AND menu_id = sys_menu.id
  );

-- ============================================================================
-- 数据字典: SSO类型
-- ============================================================================

-- 检查是否存在sso_type字典类型，不存在则创建
INSERT INTO sys_dict_type (dict_name, dict_type, status, remark, create_time, update_time)
SELECT 'SSO类型', 'sso_type', 1, 'SSO单点登录提供商类型', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'sso_type');

-- 获取sso_type字典类型ID
SET @dict_type_id = (SELECT id FROM sys_dict_type WHERE dict_type = 'sso_type' LIMIT 1);

-- 添加SSO类型字典数据
INSERT INTO sys_dict_data (dict_type_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
VALUES
    (@dict_type_id, 'SAML 2.0', 'SAML', 1, 1, 'SAML 2.0协议', NOW(), NOW()),
    (@dict_type_id, 'CAS', 'CAS', 2, 1, 'CAS协议', NOW(), NOW()),
    (@dict_type_id, 'LDAP', 'LDAP', 3, 1, 'LDAP目录服务', NOW(), NOW()),
    (@dict_type_id, 'OAuth2', 'OAUTH2', 4, 1, 'OAuth 2.0协议', NOW(), NOW()),
    (@dict_type_id, 'OpenID Connect', 'OIDC', 5, 1, 'OpenID Connect协议', NOW(), NOW())
ON DUPLICATE KEY UPDATE update_time = NOW();

-- ============================================================================
-- 完成
-- ============================================================================
