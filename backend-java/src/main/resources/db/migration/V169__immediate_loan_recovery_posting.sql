-- Loan recoveries are authorized on the signed paper loan agreement. Authorized
-- SACCO administrators and treasurers post savings offsets immediately; a member
-- notice is optional and no grace period or second system approval is required.
ALTER TABLE loan_recovery_cases
    DROP CONSTRAINT IF EXISTS ck_loan_recovery_guarantor_notice;

UPDATE permissions
SET description = 'Post overdue loan recovery from borrower or signed guarantor savings.'
WHERE id = 'loan-recovery:create';

DELETE FROM role_permissions
WHERE permission_id = 'loan-recovery:approve';

DELETE FROM permissions
WHERE id = 'loan-recovery:approve';
