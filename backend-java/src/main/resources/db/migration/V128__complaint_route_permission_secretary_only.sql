-- Only the Secretary drives complaint workflow transitions (refer to treasurer,
-- escalate to chairman, resolve, close). Other staff keep complaints:manage,
-- which lets them reply into the thread and view it, but not route/close.
-- New permission complaints:route is granted to the Secretary role only.

INSERT INTO permissions (id, module, action, description)
SELECT 'complaints:route', 'complaints', 'route',
       'Route, escalate, resolve or close complaints (secretary workflow control).'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'complaints:route');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_secretary', 'complaints:route'
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_green_secretary')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = 'role_green_secretary' AND permission_id = 'complaints:route'
  );
