INSERT INTO branches (
    id,
    tenant_id,
    code,
    name,
    address,
    manager_user_id,
    status
)
SELECT
    CONCAT('branch_default_', t.id),
    t.id,
    CONCAT(t.abbreviation, '-MAIN'),
    'Main Branch',
    t.district,
    NULL,
    'active'
FROM tenants t
WHERE t.id <> 'tenant_platform'
  AND NOT EXISTS (
      SELECT 1
      FROM branches b
      WHERE b.tenant_id = t.id
  );