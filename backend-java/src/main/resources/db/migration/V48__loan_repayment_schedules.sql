ALTER TABLE loans ADD COLUMN interest_rate DECIMAL(9, 4) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN interest_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN total_payable DECIMAL(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN monthly_installment DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE loans
SET interest_rate = CASE
        WHEN product = 'Emergency Loan' THEN 2.0000
        WHEN product = 'Agriculture Loan' THEN 1.2500
        WHEN product = 'School Fees Loan' THEN 1.0000
        ELSE 1.5000
    END,
    interest_amount = ROUND(amount * CASE
        WHEN product = 'Emergency Loan' THEN 2.0000
        WHEN product = 'Agriculture Loan' THEN 1.2500
        WHEN product = 'School Fees Loan' THEN 1.0000
        ELSE 1.5000
    END * repayment_months / 100, 2),
    total_payable = amount + ROUND(amount * CASE
        WHEN product = 'Emergency Loan' THEN 2.0000
        WHEN product = 'Agriculture Loan' THEN 1.2500
        WHEN product = 'School Fees Loan' THEN 1.0000
        ELSE 1.5000
    END * repayment_months / 100, 2),
    monthly_installment = ROUND((amount + ROUND(amount * CASE
        WHEN product = 'Emergency Loan' THEN 2.0000
        WHEN product = 'Agriculture Loan' THEN 1.2500
        WHEN product = 'School Fees Loan' THEN 1.0000
        ELSE 1.5000
    END * repayment_months / 100, 2)) / repayment_months, 2);

CREATE TABLE loan_repayment_schedules (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(64) NOT NULL REFERENCES loans(id),
    installment_no INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(18, 2) NOT NULL,
    interest_due DECIMAL(18, 2) NOT NULL,
    total_due DECIMAL(18, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (loan_id, installment_no)
);

CREATE INDEX idx_loan_repayment_schedules_loan_due ON loan_repayment_schedules (loan_id, due_date);
CREATE INDEX idx_loan_repayment_schedules_tenant_due ON loan_repayment_schedules (tenant_id, due_date);
