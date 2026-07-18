INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'tenants:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin' AND permission_id = 'tenants:view'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'tenants:manage'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin' AND permission_id = 'tenants:manage'
);
