-- The SACCO mobile workflow is direct officer entry rather than an approval
-- queue. Keep existing historical records intact, but remove the generic
-- approvals permissions from all roles and grant the officer input rights
-- needed by Chairman/Chairperson, Secretary, and Treasurer.

DELETE FROM role_permissions
WHERE permission_id IN ('approvals:view', 'approvals:decide');

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (VALUES
    ('role_green_chairperson', 'loans:create'),
    ('role_green_secretary', 'loans:create'),
    ('role_green_treasurer', 'loans:create'),
    ('role_green_chairperson', 'fund-types:manage')
) AS grants(role_id, permission_id)
WHERE EXISTS (SELECT 1 FROM roles WHERE id = grants.role_id)
  AND EXISTS (SELECT 1 FROM permissions WHERE id = grants.permission_id)
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = grants.role_id
        AND existing.permission_id = grants.permission_id
  );
