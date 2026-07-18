INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_platform_admin', permission_id
FROM (
    VALUES
        ('transactions:view'),
        ('transactions:create'),
        ('transactions:approve'),
        ('accounting:view'),
        ('accounting:post')
) AS required_permissions(permission_id)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_platform_admin'
      AND permission_id = required_permissions.permission_id
);
