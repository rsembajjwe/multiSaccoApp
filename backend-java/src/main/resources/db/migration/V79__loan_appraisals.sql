-- Credit appraisal recorded by a loans officer before the loan committee decides.
CREATE TABLE loan_appraisals (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(64) NOT NULL REFERENCES loans(id),
    appraised_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    recommendation VARCHAR(20) NOT NULL,
    recommended_amount DECIMAL(18, 2),
    recommended_term_months INT,
    notes VARCHAR(2000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_appraisals_loan ON loan_appraisals (loan_id, created_at);
