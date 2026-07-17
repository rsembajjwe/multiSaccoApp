ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE mfa_challenges (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    user_id VARCHAR(80) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mfa_challenges_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_mfa_challenges_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_mfa_challenges_user_status ON mfa_challenges (user_id, status, created_at DESC);
