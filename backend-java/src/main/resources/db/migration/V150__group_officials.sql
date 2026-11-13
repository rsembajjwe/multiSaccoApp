CREATE TABLE group_officials (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    member_id VARCHAR(64) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_group_official_role UNIQUE (member_id, role),
    CONSTRAINT chk_group_official_role CHECK (role IN ('chairman', 'secretary', 'treasurer'))
);

CREATE INDEX idx_group_officials_tenant_member
    ON group_officials (tenant_id, member_id);
