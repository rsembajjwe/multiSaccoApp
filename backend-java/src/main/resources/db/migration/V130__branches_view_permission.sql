-- Harden the Branches directory: it was gated on operations:view, which finance
-- and oversight roles (treasurer, chairperson, accountant, auditor) also hold
-- for Reports -- so Branches leaked onto their dashboards. Give Branches its own
-- permission and grant it only to organisation-admin roles, so re-gating it no
-- longer rides on operations:view. Idempotent.

INSERT INTO permissions (id, module, action, description)
SELECT 'branches:view', 'branches', 'view',
       'View the SACCO branch directory.'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'branches:view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, 'branches:view'
FROM roles r
WHERE r.id IN ('role_green_admin', 'role_platform_admin', 'role_platform_super_admin')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = 'branches:view')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = 'branches:view'
  );
