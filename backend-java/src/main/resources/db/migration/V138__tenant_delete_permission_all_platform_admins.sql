-- V137 granted tenants:delete only to role_platform_super_admin, but the platform administrator account
-- carries role_platform_admin ("Platform Administrator") as its effective platform role, so the permission
-- did not reach it. Grant tenants:delete to every PLATFORM-tenant role that already holds tenants:manage
-- (i.e. the roles trusted to create/manage SACCOs), so whichever platform-admin role is in use can delete.
-- Restricted to tenant_platform roles: SACCO-scoped roles that happen to hold tenants:manage are excluded,
-- and the endpoint additionally enforces isPlatform, so this cannot widen a SACCO user's reach.
-- Idempotent: skips grants that already exist (e.g. role_platform_super_admin from V137).
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, 'tenants:delete'
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.permission_id = 'tenants:manage'
  AND r.tenant_id = 'tenant_platform'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = rp.role_id
        AND existing.permission_id = 'tenants:delete'
  );
