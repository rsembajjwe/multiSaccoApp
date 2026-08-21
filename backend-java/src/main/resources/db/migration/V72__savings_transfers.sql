-- Savings transfers: a chairperson moves an amount out of a member's savings to another destination
-- (the member's other fund, their loan, a SACCO income/fee account, or another member). Group deductions
-- create one transfer per selected member sharing a batch_id. Maker-checker: the creator cannot approve
-- their own transfer; posting is atomic and balances are checked. Posted transfers are immutable (reverse,
-- don't delete). No CHECK constraints on string columns (H2/PostgreSQL parity).
CREATE TABLE savings_transfers (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    source_member_id VARCHAR(80) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    destination_type VARCHAR(32) NOT NULL,       -- own_fund | loan_repayment | sacco_income | another_member
    destination_fund_code VARCHAR(48),
    destination_member_id VARCHAR(80),
    loan_id VARCHAR(80),
    batch_id VARCHAR(80),
    reference VARCHAR(120) NOT NULL,
    reason VARCHAR(240),
    status VARCHAR(24) NOT NULL,                  -- pending | posted | rejected
    created_by_user_id VARCHAR(80) NOT NULL,
    decided_by_user_id VARCHAR(80),
    decision_reason VARCHAR(240),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_savings_transfers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_savings_transfers_member FOREIGN KEY (source_member_id) REFERENCES members(id),
    CONSTRAINT uk_savings_transfers_reference UNIQUE (tenant_id, reference)
);

CREATE INDEX idx_savings_transfers_tenant_status ON savings_transfers (tenant_id, status, created_at DESC);
CREATE INDEX idx_savings_transfers_batch ON savings_transfers (batch_id);

INSERT INTO permissions (id, module, action, description) VALUES
    ('savings-transfer:view', 'savings-transfer', 'view', 'View savings transfers and group deductions.'),
    ('savings-transfer:manage', 'savings-transfer', 'manage', 'Create and approve savings transfers and group deductions.');

-- Chairperson is the maker; admin and treasurer act as checkers (maker-checker is enforced in code).
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_chairperson', 'savings-transfer:view'),
    ('role_green_chairperson', 'savings-transfer:manage'),
    ('role_green_admin', 'savings-transfer:view'),
    ('role_green_admin', 'savings-transfer:manage'),
    ('role_green_treasurer', 'savings-transfer:view'),
    ('role_green_treasurer', 'savings-transfer:manage');
