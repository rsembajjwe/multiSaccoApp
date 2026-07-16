CREATE TABLE statement_lines (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    account_code VARCHAR(16) NOT NULL REFERENCES chart_of_accounts(code),
    channel VARCHAR(32) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    external_reference VARCHAR(96) NOT NULL,
    description VARCHAR(240),
    statement_date DATE NOT NULL,
    imported_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_statement_lines_tenant_reference UNIQUE (tenant_id, external_reference)
);

CREATE INDEX idx_statement_lines_tenant_date ON statement_lines (tenant_id, statement_date DESC);

INSERT INTO statement_lines (
    id,
    tenant_id,
    account_code,
    channel,
    amount,
    external_reference,
    description,
    statement_date,
    imported_by_user_id
) VALUES
    (
        'statement_green_0001',
        'tenant_green',
        '1020',
        'mobile_money',
        250000,
        'GVS-TX-0001',
        'Mobile money savings collection',
        DATE '2026-07-14',
        'user_green_admin'
    ),
    (
        'statement_green_0002',
        'tenant_green',
        '1020',
        'mobile_money',
        850000,
        'LRP-GVS-0001',
        'Mobile money loan repayment',
        DATE '2026-07-14',
        'user_green_admin'
    ),
    (
        'statement_green_0003',
        'tenant_green',
        '1010',
        'bank',
        -25000,
        'BANK-FEE-0001',
        'Unmatched bank charge awaiting allocation',
        DATE '2026-07-14',
        'user_green_admin'
    );
