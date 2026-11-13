ALTER TABLE loan_recovery_cases ADD COLUMN recovery_method VARCHAR(40);

UPDATE loan_recovery_cases
SET recovery_method = CASE
    WHEN include_guarantors THEN 'guarantor_shortfall'
    ELSE 'borrower_savings'
END;

ALTER TABLE loan_recovery_cases ALTER COLUMN recovery_method SET NOT NULL;
ALTER TABLE loan_recovery_cases ALTER COLUMN notice_reference DROP NOT NULL;
ALTER TABLE loan_recovery_cases ALTER COLUMN notice_served_at DROP NOT NULL;
ALTER TABLE loan_recovery_cases ALTER COLUMN grace_ends_at DROP NOT NULL;

ALTER TABLE loan_recovery_cases
    ADD CONSTRAINT ck_loan_recovery_method
    CHECK (recovery_method IN ('borrower_savings', 'guarantor_shortfall'));

ALTER TABLE loan_recovery_cases
    ADD CONSTRAINT ck_loan_recovery_guarantor_notice
    CHECK (
        recovery_method <> 'guarantor_shortfall'
        OR (
            notice_reference IS NOT NULL
            AND notice_served_at IS NOT NULL
            AND grace_ends_at IS NOT NULL
        )
    );
