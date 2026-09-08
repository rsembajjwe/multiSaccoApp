ALTER TABLE loans ADD COLUMN IF NOT EXISTS charge_fee DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE loans
SET status = 'paid',
    stage = CASE WHEN stage IS NULL OR stage = '' OR stage = 'Closed' OR stage = 'Migrated Closed'
                 THEN 'Paid'
                 ELSE stage
            END
WHERE status = 'closed';

UPDATE loans
SET status = 'active',
    stage = CASE WHEN stage IS NULL OR stage = '' OR stage IN ('Credit Appraisal', 'Guarantor Review', 'Ready for Disbursement', 'Awaiting Second Approval', 'Loan Committee')
                 THEN 'Active'
                 ELSE stage
            END,
    balance = CASE WHEN balance <= 0 AND COALESCE(total_payable, 0) > 0
                   THEN total_payable
                   ELSE balance
              END
WHERE status IN ('submitted', 'under_review', 'approved');

CREATE TABLE IF NOT EXISTS loan_extensions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    loan_id VARCHAR(64) NOT NULL REFERENCES loans(id),
    additional_months INTEGER NOT NULL,
    charge_fee DECIMAL(18, 2) NOT NULL DEFAULT 0,
    reason VARCHAR(240),
    requested_by_member BOOLEAN NOT NULL DEFAULT TRUE,
    recorded_by_user_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_extensions_loan_created ON loan_extensions (loan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_extensions_tenant_created ON loan_extensions (tenant_id, created_at DESC);

INSERT INTO permissions (id, module, action, description)
SELECT 'loans:terms', 'loans', 'terms', 'Set loan interest rates and term charges.'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE id = 'loans:terms'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_admin', 'loans:terms'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_admin'
      AND permission_id = 'loans:terms'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'loans:terms'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_id = 'role_green_chairperson'
      AND permission_id = 'loans:terms'
);
