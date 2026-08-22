-- Routed complaint replies are still written into the same chat thread.
-- Demo SACCO operational roles that can receive a routed complaint need chat visibility.
-- Existing-thread replies are allowed by the chat endpoint with complaints:view; creating and
-- managing complaint records still requires complaints:manage.
INSERT INTO role_permissions (role_id, permission_id)
SELECT v.role_id, v.permission_id
FROM (
    VALUES
        ('role_green_treasurer', 'complaints:view'),
        ('role_green_loans_officer', 'complaints:view')
) AS v(role_id, permission_id)
WHERE EXISTS (SELECT 1 FROM roles r WHERE r.id = v.role_id)
  AND EXISTS (SELECT 1 FROM permissions p WHERE p.id = v.permission_id)
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = v.role_id
        AND rp.permission_id = v.permission_id
  );
