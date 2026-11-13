-- Merge all platform staff roles into a single "Platform Admin". The system's role set becomes:
-- Platform Admin, Chairperson, Secretary, Treasurer, Member. Grant the canonical platform role every
-- permission held by any platform-tenant role, rename it to "Platform Admin", and put every platform user
-- on it. Legacy platform roles (Administrator, Operations/Billing/Compliance/Support Officer) are left in
-- place but superseded (not deleted), consistent with the SACCO chair/admin merge (V144).

-- 1. Union every platform-tenant role's permissions into the canonical role.
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT 'role_platform_super_admin', rp.permission_id
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.tenant_id = 'tenant_platform'
  AND rp.role_id <> 'role_platform_super_admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions e
      WHERE e.role_id = 'role_platform_super_admin' AND e.permission_id = rp.permission_id
  );

-- 2. Rename the canonical role to the single platform role name.
UPDATE roles SET name = 'Platform Admin' WHERE id = 'role_platform_super_admin';

-- 3. Put every platform-tenant user on the Platform Admin role (additive; legacy roles retained).
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT DISTINCT ur.user_id, 'role_platform_super_admin', 'tenant_platform'
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE r.tenant_id = 'tenant_platform'
  AND ur.role_id <> 'role_platform_super_admin'
  AND NOT EXISTS (
      SELECT 1 FROM user_roles e
      WHERE e.user_id = ur.user_id
        AND e.role_id = 'role_platform_super_admin'
        AND e.tenant_id = 'tenant_platform'
  );
