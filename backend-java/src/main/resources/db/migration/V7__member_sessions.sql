CREATE TABLE member_sessions (
    id VARCHAR(64) PRIMARY KEY,
    member_id VARCHAR(64) NOT NULL REFERENCES members(id),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_member_sessions_member ON member_sessions (member_id, expires_at);
CREATE INDEX idx_member_sessions_token_hash ON member_sessions (token_hash);
