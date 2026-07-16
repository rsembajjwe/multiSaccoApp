CREATE TABLE assets (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(40) NOT NULL,
    asset_account_code VARCHAR(16) NOT NULL,
    cost DECIMAL(18, 2) NOT NULL,
    salvage_value DECIMAL(18, 2) NOT NULL DEFAULT 0,
    useful_life_months INTEGER NOT NULL,
    purchase_date DATE NOT NULL,
    depreciation_start_date DATE NOT NULL,
    channel VARCHAR(40) NOT NULL,
    reference VARCHAR(80) NOT NULL,
    location VARCHAR(160),
    custodian_user_id VARCHAR(80),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    recorded_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_assets_account FOREIGN KEY (asset_account_code) REFERENCES chart_of_accounts(code),
    CONSTRAINT fk_assets_custodian FOREIGN KEY (custodian_user_id) REFERENCES users(id),
    CONSTRAINT fk_assets_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_assets_tenant_reference UNIQUE (tenant_id, reference),
    CONSTRAINT ck_assets_cost_positive CHECK (cost > 0),
    CONSTRAINT ck_assets_salvage_valid CHECK (salvage_value >= 0 AND salvage_value < cost),
    CONSTRAINT ck_assets_life_positive CHECK (useful_life_months > 0)
);

CREATE INDEX idx_assets_tenant_status ON assets (tenant_id, status);
CREATE INDEX idx_assets_purchase_date ON assets (tenant_id, purchase_date);

INSERT INTO assets (id, tenant_id, name, category, asset_account_code, cost, salvage_value, useful_life_months, purchase_date, depreciation_start_date, channel, reference, location, custodian_user_id, status, recorded_by_user_id) VALUES
    ('asset_green_laptop_001', 'tenant_green', 'Branch operations laptop', 'technology', '1300', 2400000.00, 200000.00, 36, DATE '2026-01-15', DATE '2026-02-01', 'bank', 'GVS-AST-0001', 'Green Valley Main Branch', 'user_green_admin', 'active', 'user_green_admin'),
    ('asset_lake_furniture_001', 'tenant_lake', 'Member service furniture', 'furniture', '1300', 1800000.00, 150000.00, 48, DATE '2026-03-10', DATE '2026-04-01', 'bank', 'LBS-AST-0001', 'Lake Branch Office', NULL, 'active', 'user_platform_admin');
