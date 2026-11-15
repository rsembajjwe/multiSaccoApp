UPDATE subscriptions
SET billable_members = GREATEST(member_count, 0),
    amount = 5000.00 * GREATEST(member_count, 0),
    paid = LEAST(paid, 5000.00 * GREATEST(member_count, 0)),
    tier_label = 'Up to 250 members',
    billing_description = 'UGX 5,000 per registered member annually',
    updated_at = CURRENT_TIMESTAMP
WHERE tier_id = 'per_member'
  AND member_count <= 250;
