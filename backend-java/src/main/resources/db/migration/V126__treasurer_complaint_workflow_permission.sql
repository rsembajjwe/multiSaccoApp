-- Financial complaints can be referred to the treasurer, so the treasurer must
-- be able to respond and add routing notes after referral.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_treasurer', 'complaints:manage'
WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions
    WHERE role_id = 'role_green_treasurer'
      AND permission_id = 'complaints:manage'
);
