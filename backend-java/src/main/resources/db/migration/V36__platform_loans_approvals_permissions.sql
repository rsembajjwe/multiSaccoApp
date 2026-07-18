INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_platform_admin', permission_id
FROM (
    VALUES
        ('loans:view'),
        ('loans:create'),
        ('loans:approve'),
        ('approvals:view'),
        ('approvals:decide')
) AS required_permissions(permission_id)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_platform_admin'
      AND permission_id = required_permissions.permission_id
);
