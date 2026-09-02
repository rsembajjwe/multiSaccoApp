UPDATE subscription_packages
SET price = 1200000.00,
    min_members = 251,
    member_limit = 500,
    tier_label = '251-500 members',
    modules = 'Members, savings, shares, reports'
WHERE id = 'starter';

UPDATE subscription_packages
SET price = 2500000.00,
    min_members = 501,
    member_limit = 1000,
    tier_label = '501-1,000 members',
    modules = 'Core finance, loans, approvals, reports'
WHERE id = 'growth';

UPDATE subscription_packages
SET price = 12000000.00,
    min_members = 5001,
    member_limit = 10000,
    tier_label = '5,001-10,000 members',
    modules = 'All modules, API, advanced support'
WHERE id = 'enterprise';

INSERT INTO subscription_packages (id, name, price, billing_period, min_members, member_limit, tier_label, user_limit, branch_limit, modules, status)
SELECT 'scale', 'Scale', 5000000.00, 'annual', 1001, 2500, '1,001-2,500 members', 50, 10, 'Multi-branch SACCO operations, reporting and governance', 'active'
WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE id = 'scale');

INSERT INTO subscription_packages (id, name, price, billing_period, min_members, member_limit, tier_label, user_limit, branch_limit, modules, status)
SELECT 'enterprise_5000', 'Enterprise 5,000', 8000000.00, 'annual', 2501, 5000, '2,501-5,000 members', 75, 20, 'Enterprise support, integrations and audit controls', 'active'
WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE id = 'enterprise_5000');

UPDATE subscription_packages
SET price = 5000000.00,
    billing_period = 'annual',
    min_members = 1001,
    member_limit = 2500,
    tier_label = '1,001-2,500 members',
    user_limit = 50,
    branch_limit = 10,
    modules = 'Multi-branch SACCO operations, reporting and governance',
    status = 'active'
WHERE id = 'scale';

UPDATE subscription_packages
SET price = 8000000.00,
    billing_period = 'annual',
    min_members = 2501,
    member_limit = 5000,
    tier_label = '2,501-5,000 members',
    user_limit = 75,
    branch_limit = 20,
    modules = 'Enterprise support, integrations and audit controls',
    status = 'active'
WHERE id = 'enterprise_5000';

UPDATE subscriptions
SET billable_members = 20,
    amount = 100000.00,
    paid = LEAST(paid, 100000.00),
    tier_label = '20-250 members',
    billing_description = 'UGX 5,000 per member annually, minimum 20 members'
WHERE tier_id = 'per_member' AND member_count < 20;

UPDATE subscriptions
SET tier_label = '20-250 members',
    billing_description = 'UGX 5,000 per member annually, minimum 20 members'
WHERE tier_id = 'per_member' AND member_count >= 20;
