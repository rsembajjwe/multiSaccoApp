-- The Reports screen loads its entire body from GET /operations/status, which
-- requires operations:view. The secretary holds reports:view (so the Reports
-- menu item and screen open) but lacked operations:view, so that call returned
-- 403 and the whole Reports screen fell into its error state ("Reports are not
-- loading"). Every section (membership, member funds, loan portfolio,
-- operations) reads that same status payload. Grant operations:view (read-only)
-- to the secretary so Reports loads, matching the chairperson/treasurer.
-- Idempotent.

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_secretary', 'operations:view'
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_green_secretary')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = 'operations:view')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = 'role_green_secretary'
        AND permission_id = 'operations:view'
  );
