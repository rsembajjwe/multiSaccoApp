CREATE TABLE financial_accounts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    member_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    account_type VARCHAR(40) NOT NULL,
    account_no VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    opened_by_user_id VARCHAR(64) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_financial_accounts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_financial_accounts_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_financial_accounts_product FOREIGN KEY (product_id) REFERENCES financial_products(id),
    CONSTRAINT fk_financial_accounts_opened_by FOREIGN KEY (opened_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_financial_accounts_account_no UNIQUE (tenant_id, account_no),
    CONSTRAINT uk_financial_accounts_member_product UNIQUE (member_id, product_id)
);

CREATE INDEX idx_financial_accounts_tenant_member ON financial_accounts (tenant_id, member_id);
CREATE INDEX idx_financial_accounts_tenant_type ON financial_accounts (tenant_id, account_type);

INSERT INTO financial_accounts (
    id,
    tenant_id,
    member_id,
    product_id,
    account_type,
    account_no,
    status,
    opened_by_user_id,
    opened_at,
    updated_at
) VALUES
    ('account_green_amina_savings', 'tenant_green', 'member_green_amina', 'product_green_savings_ordinary', 'savings', 'GVS-SAV-0001', 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 09:00:00+00'),
    ('account_green_amina_shares', 'tenant_green', 'member_green_amina', 'product_green_shares_standard', 'shares', 'GVS-SHR-0001', 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 09:05:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 09:05:00+00'),
    ('account_green_amina_welfare', 'tenant_green', 'member_green_amina', 'product_green_welfare_family', 'welfare', 'GVS-WEL-0001', 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 09:10:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 09:10:00+00'),
    ('account_green_daniel_savings', 'tenant_green', 'member_green_daniel', 'product_green_savings_ordinary', 'savings', 'GVS-SAV-0002', 'active', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 09:15:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 09:15:00+00');
