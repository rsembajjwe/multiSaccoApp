-- Chairpersons govern the fund/product catalog and review member accounts, but do not
-- maintain member records or post/approve financial transactions. Treasurer remains the
-- posting official. Specialist operational roles are intentionally unaffected.
INSERT INTO role_permissions (role_id, permission_id)
SELECT chair.id, permission.id
FROM roles chair
CROSS JOIN permissions permission
WHERE LOWER(TRIM(chair.name)) IN ('chairperson', 'sacco administrator / chairperson')
  AND permission.id IN ('members:view', 'transactions:view', 'fund-types:view', 'fund-types:manage')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = chair.id
        AND existing.permission_id = permission.id
  );

DELETE FROM role_permissions
WHERE permission_id IN (
    'members:create',
    'members:approve',
    'transactions:create',
    'transactions:approve',
    'accounting:post'
)
  AND role_id IN (
      SELECT chair.id
      FROM roles chair
      WHERE LOWER(TRIM(chair.name)) IN ('chairperson', 'sacco administrator / chairperson')
  );

-- V117 gave the seeded Green Valley Chairperson a second administrator role. Remove only
-- that legacy assignment from the user who is actually registered as the Chairperson.
DELETE FROM user_roles
WHERE role_id IN (
    SELECT administrator.id
    FROM roles administrator
    WHERE LOWER(TRIM(administrator.name)) = 'sacco administrator'
)
  AND EXISTS (
      SELECT 1
      FROM sacco_official_assignments official
      JOIN members member ON member.id = official.member_id
      WHERE official.tenant_id = user_roles.tenant_id
        AND official.office = 'chairperson'
        AND member.linked_user_id = user_roles.user_id
  );
