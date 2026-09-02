ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS signature_reference VARCHAR(160);
ALTER TABLE loan_guarantors ADD COLUMN IF NOT EXISTS signature_recorded_by_user_id VARCHAR(64);

UPDATE loan_guarantors
SET signed_at = TIMESTAMP '2026-01-06 09:10:00',
    signature_reference = 'SIGN-GREE-0002-0001',
    signature_recorded_by_user_id = 'user_green_admin'
WHERE id = 'guarantor_green_0001'
  AND signed_at IS NULL;
