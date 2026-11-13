-- Make the Chairperson the SACCO administrator. Grant every Chairperson role the full "SACCO Administrator"
-- permission set, and add any user who holds a "SACCO Administrator" role to their SACCO's Chairperson role.
-- The now-superseded "SACCO Administrator" role is intentionally left in place (not deleted) so existing
-- references and Codex's in-flight chair/admin merge are not disturbed.

-- 1. Grant the administrator permission set to every Chairperson role (covers 'Chairperson' and the merged
--    'SACCO Administrator / Chairperson' name). Only permissions that exist are granted; duplicates skipped.
INSERT INTO role_permissions (role_id, permission_id)
SELECT chair.id, p.id
FROM roles chair
CROSS JOIN permissions p
WHERE chair.name IN ('Chairperson', 'SACCO Administrator / Chairperson')
  AND p.id IN (
      'dashboard:view', 'tenants:manage', 'users:view', 'users:create', 'roles:view', 'roles:create',
      'members:view', 'members:create', 'members:approve', 'transactions:view', 'transactions:create',
      'transactions:approve', 'loans:view', 'loans:create', 'loans:approve', 'accounting:view',
      'accounting:post', 'reports:view', 'approvals:view', 'approvals:decide', 'operations:view',
      'notifications:view', 'notifications:manage', 'governance:view', 'governance:manage', 'complaints:view',
      'complaints:manage', 'sacco-profile:manage'
  )
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = chair.id AND existing.permission_id = p.id
  );

-- 2. Any user currently on a 'SACCO Administrator' role is added to their SACCO's Chairperson role, so the
--    person who administered the SACCO now does so as the Chairperson. Additive - the old role is retained.
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT ur.user_id, chair.id, ur.tenant_id
FROM user_roles ur
JOIN roles admin ON admin.id = ur.role_id AND admin.name = 'SACCO Administrator'
JOIN roles chair ON chair.tenant_id = admin.tenant_id
                AND chair.name IN ('Chairperson', 'SACCO Administrator / Chairperson')
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles existing
    WHERE existing.user_id = ur.user_id
      AND existing.role_id = chair.id
      AND existing.tenant_id = ur.tenant_id
);
