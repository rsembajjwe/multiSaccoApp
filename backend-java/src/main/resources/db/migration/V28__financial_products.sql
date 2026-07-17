CREATE TABLE financial_products (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    product_type VARCHAR(40) NOT NULL,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    contribution_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    minimum_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(7, 4) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_financial_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_financial_products_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_financial_products_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_financial_products_tenant_type ON financial_products (tenant_id, product_type);

INSERT INTO financial_products (
    id,
    tenant_id,
    product_type,
    code,
    name,
    contribution_amount,
    minimum_balance,
    interest_rate,
    status,
    created_by_user_id,
    created_at,
    updated_at
) VALUES
    ('product_green_savings_ordinary', 'tenant_green', 'savings', 'GVS-SAV-ORD', 'Ordinary Savings', 0.00, 10000.00, 2.5000, 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:00:00+00'),
    ('product_green_shares_standard', 'tenant_green', 'shares', 'GVS-SHR-STD', 'Member Shares', 50000.00, 0.00, 0.0000, 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:05:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:05:00+00'),
    ('product_green_welfare_family', 'tenant_green', 'welfare', 'GVS-WEL-FAM', 'Family Welfare Fund', 10000.00, 0.00, 0.0000, 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:10:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:10:00+00'),
    ('product_lake_savings_ordinary', 'tenant_lake', 'savings', 'LFS-SAV-ORD', 'Ordinary Savings', 0.00, 5000.00, 2.0000, 'active', 'user_platform_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:00:00+00');
