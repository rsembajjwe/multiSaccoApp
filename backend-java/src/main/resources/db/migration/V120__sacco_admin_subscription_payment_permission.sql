INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'subscriptions:manage'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin'
      AND permission_id = 'subscriptions:manage'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'subscriptions:manage'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'subscriptions:manage'
);
