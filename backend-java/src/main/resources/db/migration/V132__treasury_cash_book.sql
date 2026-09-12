-- The Treasurer's cash book. Records cash drawn from the bank into the Treasurer's
-- hand (a bank withdrawal: bank -> cash on hand, direction 'in') and every use of
-- that cash (loan disbursement, expense, member payout, general cash: direction
-- 'out'). The running balance (sum in - sum out) is cash on hand. direction/purpose
-- values are enforced in the application layer, not with CHECK constraints, for
-- H2/PostgreSQL parity (consistent with the other SACCO tables). View is gated on
-- accounting:view and recording on accounting:post -- both already held by the
-- Treasurer, so no new permission is needed.

CREATE TABLE treasury_cash_entries (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    direction VARCHAR(8) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    reference VARCHAR(96),
    description VARCHAR(500),
    member_id VARCHAR(64),
    entry_date DATE NOT NULL,
    recorded_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tce_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_tce_user FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_tce_tenant_date ON treasury_cash_entries (tenant_id, entry_date DESC, created_at DESC);
