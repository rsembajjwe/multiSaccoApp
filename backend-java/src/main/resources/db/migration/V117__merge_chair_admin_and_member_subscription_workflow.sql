INSERT INTO permissions (id, module, action, description)
SELECT 'member-subscription:prompt', 'member-subscription', 'prompt', 'Initiate member subscription mobile-money prompts.'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE id = 'member-subscription:prompt'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', permission_id
FROM role_permissions
WHERE role_id = 'role_green_admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = 'role_green_chairperson'
        AND existing.permission_id = role_permissions.permission_id
  );

INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT 'user_green_chairperson', 'role_green_admin', 'tenant_green'
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = 'user_green_chairperson'
      AND role_id = 'role_green_admin'
      AND tenant_id = 'tenant_green'
);

UPDATE roles
SET name = 'SACCO Administrator / Chairperson'
WHERE id = 'role_green_chairperson';

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'member-subscription:prompt'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin'
      AND permission_id = 'member-subscription:prompt'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'member-subscription:prompt'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'member-subscription:prompt'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_treasurer', 'member-subscription:prompt'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_treasurer'
      AND permission_id = 'member-subscription:prompt'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_secretary', 'member-subscription:prompt'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_secretary'
      AND permission_id = 'member-subscription:prompt'
);

DELETE FROM role_permissions
WHERE role_id = 'role_green_secretary'
  AND permission_id = 'member-subscription:manage';
