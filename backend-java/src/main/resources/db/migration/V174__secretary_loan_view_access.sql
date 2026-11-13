-- Secretaries initiate loan applications, and the staff app opens that workflow from
-- the loan book. Grant the corresponding read permission so the list can load.
INSERT INTO role_permissions (role_id, permission_id)
SELECT secretary.id, permission.id
FROM roles secretary
CROSS JOIN permissions permission
WHERE LOWER(TRIM(secretary.name)) = 'secretary'
  AND permission.id = 'loans:view'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = secretary.id
        AND existing.permission_id = permission.id
  );
