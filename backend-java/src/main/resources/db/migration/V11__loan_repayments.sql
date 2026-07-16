CREATE TABLE loan_repayments (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(64) NOT NULL REFERENCES loans(id),
    member_id VARCHAR(64) NOT NULL REFERENCES members(id),
    amount DECIMAL(18, 2) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    reference VARCHAR(96) NOT NULL,
    narration VARCHAR(240),
    received_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loan_repayments_tenant_reference UNIQUE (tenant_id, reference)
);

CREATE INDEX idx_loan_repayments_loan_received ON loan_repayments (loan_id, received_at DESC);
CREATE INDEX idx_loan_repayments_member_received ON loan_repayments (member_id, received_at DESC);

INSERT INTO loan_repayments (
    id,
    tenant_id,
    loan_id,
    member_id,
    amount,
    channel,
    reference,
    narration,
    received_by_user_id,
    received_at
) VALUES (
    'repayment_green_0001',
    'tenant_green',
    'loan_green_0001',
    'member_green_amina',
    850000,
    'cash',
    'LR-GVS-0001-001',
    'Opening repayment history',
    'user_green_admin',
    TIMESTAMP WITH TIME ZONE '2026-07-12 10:00:00+00'
);
