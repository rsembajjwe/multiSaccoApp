UPDATE member_subscriptions
SET plan_name = 'Member app annual access',
    amount = 5000.00,
    paid = LEAST(paid, 5000.00),
    billing_period = 'annual',
    expiry = COALESCE(
        (SELECT MAX(subscriptions.expiry)
         FROM subscriptions
         WHERE subscriptions.tenant_id = member_subscriptions.tenant_id),
        member_subscriptions.expiry),
    status = CASE
        WHEN paid >= 5000.00
         AND COALESCE(
                (SELECT MAX(subscriptions.expiry)
                 FROM subscriptions
                 WHERE subscriptions.tenant_id = member_subscriptions.tenant_id),
                member_subscriptions.expiry) >= CURRENT_DATE
        THEN 'active'
        ELSE 'pending_payment'
    END,
    updated_at = CURRENT_TIMESTAMP;
