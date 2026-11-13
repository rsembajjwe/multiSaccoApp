-- The SACCO Administrator role (role_green_admin) needs approval-workflow access for the general
-- approvals feature (e.g. expense approvals) and the ability to resolve/close complaints. V114 removed
-- approvals:view/decide from every role when the loan workflow moved to direct officer entry, and V144
-- only restored them to the Chairperson role; complaints:route (required to resolve or close a complaint)
-- was likewise not held by the administrator. The administrator must retain these on its own role so
-- approval workflows, decisions and complaint resolution remain available.
-- Idempotent: only inserts grants that are not already present, and only for permissions that exist.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', permission_id
FROM (
    SELECT 'approvals:view' AS permission_id
    UNION ALL SELECT 'approvals:decide'
    UNION ALL SELECT 'complaints:route'
) AS grants
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_green_admin')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = grants.permission_id)
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = 'role_green_admin' AND existing.permission_id = grants.permission_id
  );

-- The platform administrator oversees every tenant's approval workflows, but V114 stripped approvals:view/
-- decide from all roles (including the platform role that V145 later merged into "Platform Admin"). Restore
-- them so platform staff can review and decide approvals across tenants.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_platform_super_admin', permission_id
FROM (
    SELECT 'approvals:view' AS permission_id
    UNION ALL SELECT 'approvals:decide'
) AS grants
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_platform_super_admin')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = grants.permission_id)
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = 'role_platform_super_admin' AND existing.permission_id = grants.permission_id
  );

-- Loan officers originate loans and must be able to view (not decide) approval workflows. V114 removed
-- approvals:view from their role too; restore the read permission only.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_loans_officer', 'approvals:view'
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_green_loans_officer')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = 'approvals:view')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = 'role_green_loans_officer' AND existing.permission_id = 'approvals:view'
  );
