INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'subscriptions:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin'
      AND permission_id = 'subscriptions:view'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'subscriptions:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'subscriptions:view'
);
