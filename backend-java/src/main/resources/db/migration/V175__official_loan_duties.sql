-- Loan duty separation for SACCO elected officials:
-- Treasurer captures and disburses loan data, Chairperson decides applications,
-- and Secretary has read-only access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT official.id, permission.id
FROM roles official
CROSS JOIN permissions permission
WHERE LOWER(TRIM(official.name)) IN ('chairperson', 'sacco administrator / chairperson')
  AND permission.id IN ('loans:view', 'loans:approve')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = official.id
        AND existing.permission_id = permission.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT official.id, permission.id
FROM roles official
CROSS JOIN permissions permission
WHERE LOWER(TRIM(official.name)) = 'secretary'
  AND permission.id = 'loans:view'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = official.id
        AND existing.permission_id = permission.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT official.id, permission.id
FROM roles official
CROSS JOIN permissions permission
WHERE LOWER(TRIM(official.name)) = 'treasurer'
  AND permission.id IN ('loans:view', 'loans:create', 'loans:disburse')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = official.id
        AND existing.permission_id = permission.id
  );

DELETE FROM role_permissions
WHERE permission_id IN ('loans:create', 'loans:disburse')
  AND role_id IN (
      SELECT id FROM roles
      WHERE LOWER(TRIM(name)) IN ('chairperson', 'sacco administrator / chairperson', 'secretary')
  );

DELETE FROM role_permissions
WHERE permission_id = 'loans:approve'
  AND role_id IN (
      SELECT id FROM roles
      WHERE LOWER(TRIM(name)) IN ('secretary', 'treasurer')
  );
