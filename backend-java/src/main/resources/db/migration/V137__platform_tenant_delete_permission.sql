-- Least-privilege permission for permanently deleting a SACCO tenant and all of its data.
-- Deleting a whole SACCO (offboarding / clean-slate reset) is far more destructive than the day-to-day
-- tenants:manage actions (status, collection mode, profile), so it gets its own permission. V137 creates
-- the permission and grants it to the Platform Super Admin; V138 extends the grant to every platform-tenant
-- role that already holds tenants:manage. This migration MUST run before V138, which references the
-- permission created here.
--
-- Idempotent inserts (guarded by NOT EXISTS) so the migration is safe on H2 and PostgreSQL and cannot fail
-- if the permission or grant happens to already exist.
INSERT INTO permissions (id, module, action, description)
SELECT 'tenants:delete', 'tenants', 'delete',
       'Permanently delete a SACCO tenant and every record it owns.'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'tenants:delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_platform_super_admin', 'tenants:delete'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_platform_super_admin' AND permission_id = 'tenants:delete'
);
