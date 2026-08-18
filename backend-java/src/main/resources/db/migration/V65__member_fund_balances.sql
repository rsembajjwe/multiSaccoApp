-- Per-member, per-fund balance ledger. Members can hold a separate balance for every configured fund
-- (the built-in Savings/Shares/Welfare and any custom fund such as Burial or Education). The three base
-- funds keep their columns on `members` as the source of truth for existing logic (DSR, withdrawals,
-- statements); this ledger mirrors them and additionally records custom-fund balances, giving one
-- unified read model for the member portal.
--
-- No CHECK constraints on the string columns (H2/PostgreSQL parity).

CREATE TABLE member_fund_balances (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    member_id VARCHAR(64) NOT NULL,
    fund_code VARCHAR(40) NOT NULL,           -- savings | shares | welfare | <custom fund code>
    balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_fund_balances_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT uk_member_fund_balances_member_fund UNIQUE (member_id, fund_code)
);

CREATE INDEX idx_member_fund_balances_tenant_member ON member_fund_balances (tenant_id, member_id);

-- Backfill the three base funds for every existing member from their current column balances.
INSERT INTO member_fund_balances (id, tenant_id, member_id, fund_code, balance)
SELECT 'mfb_' || m.id || '_savings', m.tenant_id, m.id, 'savings', m.savings_balance FROM members m
UNION ALL
SELECT 'mfb_' || m.id || '_shares', m.tenant_id, m.id, 'shares', m.shares_balance FROM members m
UNION ALL
SELECT 'mfb_' || m.id || '_welfare', m.tenant_id, m.id, 'welfare', m.welfare_balance FROM members m;
