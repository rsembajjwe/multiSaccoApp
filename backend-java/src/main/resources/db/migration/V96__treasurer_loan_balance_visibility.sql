-- Treasurer must see repayable loan balances while posting loan repayments in Finance.
-- This is read visibility only; loan approval remains controlled by loans:approve.
INSERT INTO role_permissions (role_id, permission_id)
SELECT id, 'loans:view'
FROM roles
WHERE tenant_id <> 'tenant_platform'
  AND LOWER(name) IN ('treasurer', 'sacco treasurer')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = roles.id
        AND existing.permission_id = 'loans:view'
  );
