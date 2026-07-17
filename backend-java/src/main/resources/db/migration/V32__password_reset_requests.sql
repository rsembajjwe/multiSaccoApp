CREATE TABLE password_reset_requests (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    user_id VARCHAR(80) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_password_reset_requests_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_password_reset_requests_user_status ON password_reset_requests (user_id, status, created_at DESC);
