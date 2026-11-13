CREATE TABLE loan_recovery_cases (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(80) NOT NULL REFERENCES loans(id),
    borrower_member_id VARCHAR(80) NOT NULL REFERENCES members(id),
    reference VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    notice_reference VARCHAR(160) NOT NULL,
    notice_served_at DATE NOT NULL,
    grace_ends_at DATE NOT NULL,
    include_guarantors BOOLEAN NOT NULL DEFAULT TRUE,
    outstanding_at_proposal DECIMAL(18, 2) NOT NULL,
    borrower_savings_proposed DECIMAL(18, 2) NOT NULL DEFAULT 0,
    guarantor_savings_proposed DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_proposed DECIMAL(18, 2) NOT NULL DEFAULT 0,
    remaining_after_proposal DECIMAL(18, 2) NOT NULL DEFAULT 0,
    maker_user_id VARCHAR(80) NOT NULL REFERENCES users(id),
    checker_user_id VARCHAR(80) REFERENCES users(id),
    decision_reason VARCHAR(500),
    submitted_at TIMESTAMP WITH TIME ZONE,
    decided_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lock_version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_loan_recovery_reference UNIQUE (tenant_id, reference)
);

CREATE TABLE loan_recovery_allocations (
    id VARCHAR(80) PRIMARY KEY,
    recovery_case_id VARCHAR(80) NOT NULL REFERENCES loan_recovery_cases(id) ON DELETE CASCADE,
    tenant_id VARCHAR(80) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(80) NOT NULL REFERENCES loans(id),
    source_member_id VARCHAR(80) NOT NULL REFERENCES members(id),
    source_type VARCHAR(30) NOT NULL,
    guarantor_id VARCHAR(80) REFERENCES loan_guarantors(id),
    amount DECIMAL(18, 2) NOT NULL,
    available_savings_at_proposal DECIMAL(18, 2) NOT NULL,
    guarantee_limit_at_proposal DECIMAL(18, 2),
    status VARCHAR(30) NOT NULL,
    financial_transaction_id VARCHAR(80) REFERENCES financial_transactions(id),
    loan_repayment_id VARCHAR(80) REFERENCES loan_repayments(id),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_loan_recovery_source UNIQUE (recovery_case_id, source_member_id)
);

CREATE INDEX idx_loan_recovery_cases_loan ON loan_recovery_cases (loan_id, created_at DESC);
CREATE INDEX idx_loan_recovery_cases_queue ON loan_recovery_cases (tenant_id, status, created_at);
CREATE INDEX idx_loan_recovery_allocations_case ON loan_recovery_allocations (recovery_case_id, source_type);
CREATE INDEX idx_loan_recovery_allocations_guarantor ON loan_recovery_allocations (guarantor_id, status);
