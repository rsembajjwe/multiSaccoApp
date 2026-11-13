-- Loan recovery deducts member savings and therefore has narrower permissions than
-- ordinary loan approval or transaction approval. Admin and Treasurer may initiate
-- and approve, while the service still requires two different officers.
INSERT INTO permissions (id, module, action, description) VALUES
    ('loan-recovery:create', 'loan-recovery', 'create', 'Open and submit overdue loan recovery cases.'),
    ('loan-recovery:approve', 'loan-recovery', 'approve', 'Approve or reject savings deductions for loan recovery.');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE LOWER(r.name) IN (
        'sacco administrator',
        'sacco administrator / chairperson',
        'chairperson',
        'treasurer',
        'sacco treasurer'
    )
  AND p.id IN ('loan-recovery:create', 'loan-recovery:approve')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions existing
      WHERE existing.role_id = r.id
        AND existing.permission_id = p.id
  );
