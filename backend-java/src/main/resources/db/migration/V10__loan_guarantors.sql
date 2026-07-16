CREATE TABLE loan_guarantors (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(64) NOT NULL REFERENCES loans(id),
    member_id VARCHAR(64) NOT NULL REFERENCES members(id),
    guaranteed_amount DECIMAL(18, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    requested_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_guarantors_loan_status ON loan_guarantors (loan_id, status);
CREATE INDEX idx_loan_guarantors_member_status ON loan_guarantors (member_id, status);

INSERT INTO loan_guarantors (
    id,
    tenant_id,
    loan_id,
    member_id,
    guaranteed_amount,
    status,
    requested_by_user_id
) VALUES (
    'guarantor_green_0001',
    'tenant_green',
    'loan_green_0002',
    'member_green_amina',
    400000,
    'pending',
    'user_green_admin'
);
