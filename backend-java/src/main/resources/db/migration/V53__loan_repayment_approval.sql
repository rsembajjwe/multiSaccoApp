-- Loan repayments captured through member mobile-money must be approved by a checker
-- (e.g. Treasurer) before the loan balance is reduced. Existing rows (staff-captured and
-- historical imports) remain 'posted' via the column default so their behaviour is unchanged.
--
-- No CHECK constraint is added on status: H2 (PostgreSQL mode) rejects Hibernate parameterized
-- writes against string IN(...) CHECK constraints, so the allowed values are enforced in the
-- application layer instead (see LoanRepayment).

ALTER TABLE loan_repayments ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'posted';
ALTER TABLE loan_repayments ADD COLUMN approved_by_user_id VARCHAR(64);
ALTER TABLE loan_repayments ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_loan_repayments_tenant_status ON loan_repayments (tenant_id, status);
