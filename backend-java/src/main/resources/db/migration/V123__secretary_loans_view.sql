-- The secretary can view members' loan balances but could not open the loans
-- list/details because that requires loans:view, which the secretary lacked
-- (they only held loans:create). Grant loans:view (read-only) so the secretary
-- can load loans the same as the chairperson. Idempotent.

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_secretary', 'loans:view'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_secretary'
      AND permission_id = 'loans:view'
);
