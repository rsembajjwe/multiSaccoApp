CREATE TABLE audit_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    actor_user_id VARCHAR(64),
    actor_name VARCHAR(160) NOT NULL,
    action VARCHAR(240) NOT NULL,
    resource_type VARCHAR(80),
    resource_id VARCHAR(120),
    ip_address VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_tenant_created ON audit_events (tenant_id, created_at DESC);
