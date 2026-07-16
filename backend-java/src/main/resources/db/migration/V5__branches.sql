CREATE TABLE branches (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(160) NOT NULL,
    address VARCHAR(240),
    manager_user_id VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branches_tenant_status ON branches (tenant_id, status);

INSERT INTO branches (
    id,
    tenant_id,
    code,
    name,
    address,
    manager_user_id,
    status
) VALUES
    ('branch_green_main', 'tenant_green', 'GV001', 'Mukono Main', 'Mukono Central Division', 'user_green_admin', 'active'),
    ('branch_green_seeta', 'tenant_green', 'GV002', 'Seeta Branch', 'Seeta Trading Centre', NULL, 'active'),
    ('branch_lake_main', 'tenant_lake', 'LF001', 'Jinja Main', 'Jinja Central', NULL, 'active');
