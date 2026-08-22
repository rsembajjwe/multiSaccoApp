ALTER TABLE sacco_profiles ADD COLUMN membership_subscription_amount NUMERIC(19, 2) NOT NULL DEFAULT 5000;

UPDATE sacco_profiles
SET membership_subscription_amount = 5000
WHERE membership_subscription_amount IS NULL OR membership_subscription_amount <= 0;

ALTER TABLE sacco_profiles ADD CONSTRAINT ck_sacco_profiles_membership_subscription_amount_positive
CHECK (membership_subscription_amount > 0);
