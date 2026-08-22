-- Enterprise role separation: funding sources define SACCO capital, grants, borrowings and retained
-- earnings, so access belongs to finance/governance roles only. The Secretary handles membership,
-- governance records and communications, not sources-of-funds administration.
DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id
    FROM roles
    WHERE tenant_id <> 'tenant_platform'
      AND LOWER(name) LIKE '%secretary%'
)
AND permission_id IN ('finance-source:view', 'finance-source:manage');
