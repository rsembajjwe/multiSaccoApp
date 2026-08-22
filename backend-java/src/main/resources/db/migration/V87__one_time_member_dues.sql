-- One-time membership dues do not expire, so expiry must be nullable.
ALTER TABLE member_subscriptions ALTER COLUMN expiry DROP NOT NULL;

COMMENT ON COLUMN member_subscriptions.billing_period IS 'monthly | annual | once';
