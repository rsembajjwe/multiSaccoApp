CREATE TABLE member_sms_wallets (
    member_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_sms_wallet_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_member_sms_wallet_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_member_sms_wallet_balance CHECK (balance >= 0)
);

CREATE TABLE member_sms_wallet_ledger (
    id VARCHAR(255) PRIMARY KEY,
    member_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(19, 2) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    reference VARCHAR(255) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_sms_ledger_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_member_sms_ledger_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_member_sms_ledger_direction CHECK (direction IN ('credit', 'debit', 'refund')),
    CONSTRAINT chk_member_sms_ledger_quantity CHECK (quantity > 0),
    CONSTRAINT uq_member_sms_ledger_reference UNIQUE (member_id, reference)
);

CREATE INDEX idx_member_sms_ledger_member_created
    ON member_sms_wallet_ledger (member_id, created_at DESC);
