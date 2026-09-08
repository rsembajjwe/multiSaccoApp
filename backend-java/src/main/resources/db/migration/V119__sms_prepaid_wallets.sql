CREATE TABLE sms_wallets (
    tenant_id VARCHAR(80) PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sms_wallets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_sms_wallets_balance CHECK (balance >= 0)
);

CREATE TABLE sms_wallet_ledger (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(19, 4),
    amount NUMERIC(19, 4),
    reference VARCHAR(120),
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sms_wallet_ledger_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_sms_wallet_ledger_direction CHECK (direction IN ('credit', 'debit')),
    CONSTRAINT chk_sms_wallet_ledger_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_sms_wallet_ledger_tenant_created ON sms_wallet_ledger (tenant_id, created_at DESC);
