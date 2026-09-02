ALTER TABLE loans ADD COLUMN IF NOT EXISTS application_source VARCHAR(64) NOT NULL DEFAULT 'staff_captured_signed_form';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS signed_form_reference VARCHAR(128);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS signed_form_received_at DATE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS signed_form_file_name VARCHAR(255);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS signed_form_uploaded_by_user_id VARCHAR(64);

UPDATE loans
SET application_source = CASE
        WHEN channel = 'mobile' THEN 'online_member_application'
        WHEN channel = 'migration' THEN 'imported_loan_book'
        ELSE 'staff_captured_signed_form'
    END
WHERE application_source IS NULL
   OR application_source = '';
