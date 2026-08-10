ALTER TABLE members ADD COLUMN privacy_notice_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE members ADD COLUMN sms_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN email_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN mobile_money_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN provider_data_sharing_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN consent_updated_at TIMESTAMP WITH TIME ZONE;

UPDATE members
SET sms_consent = TRUE,
    email_consent = TRUE,
    mobile_money_consent = TRUE,
    provider_data_sharing_consent = TRUE,
    privacy_notice_accepted_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    consent_updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE tenant_id IN ('tenant_green', 'tenant_lake');
