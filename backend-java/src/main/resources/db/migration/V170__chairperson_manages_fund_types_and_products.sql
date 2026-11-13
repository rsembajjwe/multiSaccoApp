-- Fund types and their products are governed by the Chairperson. Other core SACCO officials retain
-- read-only access so they can use the configured catalog in their operational workflows.
INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, 'fund-types:view'
FROM roles role
WHERE role.name IN ('Chairperson', 'SACCO Administrator / Chairperson', 'Secretary', 'Treasurer')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = role.id
        AND existing.permission_id = 'fund-types:view'
  );

DELETE FROM role_permissions
WHERE permission_id = 'fund-types:manage'
  AND role_id IN (
      SELECT role.id
      FROM roles role
      WHERE role.name NOT IN ('Chairperson', 'SACCO Administrator / Chairperson')
  );
