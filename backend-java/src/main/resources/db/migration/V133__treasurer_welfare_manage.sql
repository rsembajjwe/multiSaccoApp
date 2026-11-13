-- Grant welfare:manage to the SACCO Treasurer so treasurers can raise and
-- manage welfare claims (previously limited to Admin and Secretary).
-- Idempotent for H2/PostgreSQL parity.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_treasurer', 'welfare:manage'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_treasurer'
      AND permission_id = 'welfare:manage'
);
