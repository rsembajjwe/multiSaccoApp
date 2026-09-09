-- Let the treasurer VIEW loans (they could not, lacking loans:view) while
-- keeping all their existing money-movement powers (loans:create, loans:disburse,
-- transactions, savings-transfer) intact. Read-only addition, idempotent.
-- Net loans model: secretary & chairperson create + view; treasurer view (plus
-- their retained money duties).

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_treasurer', 'loans:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_treasurer'
      AND permission_id = 'loans:view'
);
