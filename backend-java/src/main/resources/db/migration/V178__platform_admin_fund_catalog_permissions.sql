INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_platform_super_admin', permission.id
FROM permissions permission
WHERE permission.id IN ('fund-types:view', 'fund-types:manage')
  AND EXISTS (SELECT 1 FROM roles WHERE id = 'role_platform_super_admin')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = 'role_platform_super_admin'
        AND existing.permission_id = permission.id
  );
