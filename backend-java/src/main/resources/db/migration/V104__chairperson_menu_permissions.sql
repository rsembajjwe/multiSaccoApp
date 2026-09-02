INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'transactions:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'transactions:view'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'notifications:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'notifications:view'
);
