INSERT INTO permissions (id, module, action, description)
SELECT permission_id, module_name, action_name, permission_description
FROM (
    VALUES
        ('operations:view', 'operations', 'view', 'View operational health, exception counts, and release-gate status.'),
        ('notifications:view', 'notifications', 'view', 'View notification deliveries and templates.'),
        ('notifications:manage', 'notifications', 'manage', 'Create and update notification templates.'),
        ('governance:view', 'governance', 'view', 'View governance meetings and resolutions.'),
        ('governance:manage', 'governance', 'manage', 'Create governance meetings and resolutions.'),
        ('complaints:view', 'complaints', 'view', 'View staff complaint queues.'),
        ('complaints:manage', 'complaints', 'manage', 'Capture and resolve staff complaints.')
) AS required_permissions(permission_id, module_name, action_name, permission_description)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions
    WHERE id = required_permissions.permission_id
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (
    VALUES
        ('role_platform_admin', 'operations:view'),
        ('role_platform_admin', 'notifications:view'),
        ('role_platform_admin', 'notifications:manage'),
        ('role_platform_admin', 'governance:view'),
        ('role_platform_admin', 'governance:manage'),
        ('role_platform_admin', 'complaints:view'),
        ('role_platform_admin', 'complaints:manage'),
        ('role_green_admin', 'operations:view'),
        ('role_green_admin', 'notifications:view'),
        ('role_green_admin', 'notifications:manage'),
        ('role_green_admin', 'governance:view'),
        ('role_green_admin', 'governance:manage'),
        ('role_green_admin', 'complaints:view'),
        ('role_green_admin', 'complaints:manage')
) AS required_grants(role_id, permission_id)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = required_grants.role_id
      AND permission_id = required_grants.permission_id
);
