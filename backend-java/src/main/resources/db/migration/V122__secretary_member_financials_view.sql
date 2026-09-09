-- Guarantee the secretary can view members' savings/shares/welfare and loan
-- balances, the same as the chairperson. finance-source:view is the (view-only)
-- permission that unlocks member financial figures on the members list; grant it
-- idempotently in case an environment is missing it.

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_secretary', 'finance-source:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_secretary'
      AND permission_id = 'finance-source:view'
);
