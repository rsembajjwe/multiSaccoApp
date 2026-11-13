CREATE TABLE push_device_registrations (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    owner_type VARCHAR(16) NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    device_token VARCHAR(512) NOT NULL,
    platform VARCHAR(24) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_push_device_owner_type CHECK (owner_type IN ('member', 'staff')),
    CONSTRAINT uq_push_device_token UNIQUE (device_token)
);

CREATE INDEX idx_push_devices_owner
    ON push_device_registrations (tenant_id, owner_type, owner_id);
