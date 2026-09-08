ALTER TABLE sacco_profiles ADD COLUMN IF NOT EXISTS loan_interest_rate DECIMAL(9, 4) NOT NULL DEFAULT 1.5000;
ALTER TABLE sacco_profiles ADD COLUMN IF NOT EXISTS logo_data_url TEXT;

UPDATE sacco_profiles
SET loan_interest_rate = 1.5000
WHERE loan_interest_rate IS NULL OR loan_interest_rate < 0;
