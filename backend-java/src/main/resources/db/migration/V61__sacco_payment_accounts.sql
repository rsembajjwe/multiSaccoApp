-- Per-SACCO collection accounts: each SACCO configures its OWN mobile-money and bank accounts that
-- members pay into directly. Tereka only records/reconciles; funds never pool in a platform account.
--
-- No CHECK constraints on the string columns: H2 (PostgreSQL mode) rejects Hibernate parameterized
-- writes against string IN(...) CHECK constraints, so allowed values (channel/network) are enforced
-- in the application layer.

CREATE TABLE sacco_payment_accounts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    channel VARCHAR(16) NOT NULL,            -- 'mobile_money' | 'bank'
    network VARCHAR(32),                     -- 'mtn' | 'airtel' for mobile money; NULL for bank
    account_name VARCHAR(160) NOT NULL,
    account_number VARCHAR(64) NOT NULL,     -- MSISDN / merchant code (mobile money) or account number (bank)
    bank_name VARCHAR(120),                  -- bank only
    branch VARCHAR(120),                     -- bank only
    swift_code VARCHAR(32),                  -- bank only, optional
    instructions VARCHAR(300),               -- optional "how to pay" note shown to members
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sacco_payment_accounts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_sacco_payment_accounts_tenant_channel ON sacco_payment_accounts (tenant_id, channel);
CREATE INDEX idx_sacco_payment_accounts_tenant_active ON sacco_payment_accounts (tenant_id, active);
