CREATE TABLE suppliers (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(160),
    tax_id VARCHAR(80),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_suppliers_tenant_name UNIQUE (tenant_id, name)
);

CREATE TABLE expenses (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    supplier_id VARCHAR(80),
    account_code VARCHAR(16) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    reference VARCHAR(80) NOT NULL,
    description VARCHAR(500),
    expense_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'posted',
    recorded_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_expenses_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT fk_expenses_account FOREIGN KEY (account_code) REFERENCES chart_of_accounts(code),
    CONSTRAINT fk_expenses_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_expenses_tenant_reference UNIQUE (tenant_id, reference),
    CONSTRAINT ck_expenses_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_suppliers_tenant_status ON suppliers (tenant_id, status);
CREATE INDEX idx_expenses_tenant_date ON expenses (tenant_id, expense_date);
CREATE INDEX idx_expenses_supplier ON expenses (supplier_id);

INSERT INTO suppliers (id, tenant_id, name, phone, email, tax_id, status, created_by_user_id) VALUES
    ('supplier_green_stationery', 'tenant_green', 'Green Valley Stationery', '+256700555100', 'accounts@gvstationery.local', 'TIN-GVS-001', 'active', 'user_green_admin'),
    ('supplier_lake_utilities', 'tenant_lake', 'Lake Utilities Services', '+256700555200', 'billing@lakeutilities.local', 'TIN-LBS-001', 'active', 'user_platform_admin');

INSERT INTO expenses (id, tenant_id, supplier_id, account_code, amount, channel, reference, description, expense_date, status, recorded_by_user_id) VALUES
    ('expense_green_0001', 'tenant_green', 'supplier_green_stationery', '5000', 180000.00, 'cash', 'GVS-EXP-0001', 'Office stationery and receipt books', CURRENT_DATE, 'posted', 'user_green_admin'),
    ('expense_lake_0001', 'tenant_lake', 'supplier_lake_utilities', '5020', 95000.00, 'bank', 'LBS-EXP-0001', 'Monthly utilities', CURRENT_DATE, 'posted', 'user_platform_admin');
