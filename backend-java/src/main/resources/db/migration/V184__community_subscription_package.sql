INSERT INTO subscription_packages (
    id, name, price, billing_period, min_members, member_limit, tier_label,
    user_limit, branch_limit, modules, status
)
SELECT
    'community', 'Community', 5000.00, 'annual', 0, 250, 'Up to 250 members',
    8, 1, 'Members, savings, shares, reports', 'active'
WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE id = 'community');

UPDATE subscriptions
SET package_id = 'community',
    updated_at = CURRENT_TIMESTAMP
WHERE tier_id = 'per_member';

UPDATE tenants
SET package_id = 'community',
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    SELECT tenant_id
    FROM subscriptions
    WHERE package_id = 'community'
);
