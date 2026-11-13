-- Per-scope (platform or a tenant) key/value settings for payment providers
-- (MTN MoMo, Airtel Money). Secret values are stored encrypted (enc:v1:...)
-- via PiiCrypto; non-secret values are stored in plaintext. scope_id is the
-- literal 'platform' for platform-global keys, or a tenant id for a SACCO.
CREATE TABLE integration_provider_credentials (
    id VARCHAR(64) PRIMARY KEY,
    scope_id VARCHAR(64) NOT NULL,
    provider VARCHAR(40) NOT NULL,
    config_key VARCHAR(80) NOT NULL,
    config_value VARCHAR(4000),
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_user_id VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_integration_provider_credentials UNIQUE (scope_id, provider, config_key)
);

CREATE INDEX idx_integration_provider_credentials_scope
    ON integration_provider_credentials (scope_id, provider);
