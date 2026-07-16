CREATE TABLE financial_transactions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
    member_id VARCHAR(64) NOT NULL REFERENCES members(id),
    type VARCHAR(40) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    reference VARCHAR(80) NOT NULL,
    narration VARCHAR(240),
    maker_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    checker_user_id VARCHAR(64) REFERENCES users(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    rejection_reason VARCHAR(240),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, reference)
);

CREATE INDEX idx_financial_transactions_tenant_status ON financial_transactions (tenant_id, status);
CREATE INDEX idx_financial_transactions_member_created ON financial_transactions (member_id, created_at DESC);

INSERT INTO financial_transactions (
    id,
    tenant_id,
    branch_id,
    member_id,
    type,
    channel,
    amount,
    status,
    reference,
    narration,
    maker_user_id,
    checker_user_id,
    posted_at
) VALUES
    (
        'txn_green_0001',
        'tenant_green',
        'branch_green_main',
        'member_green_amina',
        'savings_deposit',
        'mobile_money',
        250000,
        'posted',
        'GVS-TX-0001',
        'Mobile money savings deposit',
        'user_green_admin',
        'user_green_admin',
        TIMESTAMP WITH TIME ZONE '2026-07-14 09:15:00+00'
    ),
    (
        'txn_green_0002',
        'tenant_green',
        'branch_green_seeta',
        'member_green_daniel',
        'share_purchase',
        'cash',
        100000,
        'posted',
        'GVS-TX-0002',
        'Share capital purchase',
        'user_green_admin',
        'user_green_admin',
        TIMESTAMP WITH TIME ZONE '2026-07-14 11:20:00+00'
    ),
    (
        'txn_green_0003',
        'tenant_green',
        'branch_green_main',
        'member_green_amina',
        'welfare_contribution',
        'bank',
        60000,
        'pending_approval',
        'GVS-TX-0003',
        'Welfare contribution awaiting approval',
        'user_green_admin',
        NULL,
        NULL
    );
