-- Treasurers need read-only access to member profiles and account summaries while
-- reconciling savings, welfare balances and outstanding loans. Mutation permissions
-- remain separate and are intentionally not granted here.
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, 'members:view'
FROM roles
WHERE LOWER(TRIM(roles.name)) IN ('treasurer', 'sacco treasurer')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = roles.id
        AND existing.permission_id = 'members:view'
  );
