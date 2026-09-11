-- Split the overloaded finance-source:view permission. It was doing two jobs:
--   1. unlocking members' financial balances on the members list (MemberController)
--      and mobile-money collection balances (MobileMoneyController), and
--   2. unlocking the SACCO capital sources-of-funds register (FundingSourceController).
-- V122 granted the Secretary finance-source:view for (1) -- member balances -- but
-- that silently also gave them (2), the capital register, which V90 had explicitly
-- denied them. Introduce a dedicated funding-source:view for the register only, and
-- grant it to the finance/governance roles that legitimately review capital sources
-- (Admin, Chairperson, Treasurer) -- NOT the Secretary. FundingSourceController's
-- read endpoint moves to this permission; finance-source:view keeps meaning
-- "member/collection balances". Idempotent.

INSERT INTO permissions (id, module, action, description)
SELECT 'funding-source:view', 'funding-source', 'view',
       'View the SACCO capital sources-of-funds register.'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'funding-source:view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, 'funding-source:view'
FROM roles r
WHERE r.id IN ('role_green_admin', 'role_green_chairperson', 'role_green_treasurer')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = 'funding-source:view')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = 'funding-source:view'
  );
