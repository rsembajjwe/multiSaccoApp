ALTER TABLE users ADD COLUMN onboarding_channel VARCHAR(16);
ALTER TABLE users ADD COLUMN onboarding_delivery_status VARCHAR(24);
ALTER TABLE users ADD COLUMN onboarding_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users ADD CONSTRAINT ck_users_onboarding_channel
    CHECK (onboarding_channel IS NULL OR onboarding_channel IN ('email', 'sms'));
ALTER TABLE users ADD CONSTRAINT ck_users_onboarding_delivery_status
    CHECK (onboarding_delivery_status IS NULL OR onboarding_delivery_status IN ('pending', 'sent', 'failed'));

CREATE INDEX idx_users_pending_onboarding
    ON users (onboarding_delivery_status, password_reset_required);
